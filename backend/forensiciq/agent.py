"""
ForensIQ Claude agent.

Drives the investigation loop via Anthropic tool_use. After each tool
execution it updates the EvidenceGraph and triggers self-correction when
any finding sits below the confidence threshold.
"""

from collections.abc import Callable, Awaitable
from typing import Any

import anthropic
import structlog

from forensiciq.config import settings
from forensiciq.evidence_graph import EvidenceGraph, Finding
from forensiciq.tools import (
    Log2TimelineTool,
    VolatilityTool,
    RegRipperTool,
    SleuthKitTool,
    YaraTool,
    StringsTool,
    FileIdentifyTool,
    HashComputeTool,
)
from forensiciq.tools.base import BaseSIFTTool, ToolSecurityError

log = structlog.get_logger()

BroadcastFn = Callable[[dict[str, Any]], Awaitable[None] | Any]

SYSTEM_PROMPT = """You are ForensIQ, an autonomous Digital Forensics and Incident Response (DFIR) agent
operating on a SANS SIFT Workstation. Your mission is to investigate the provided case data and surface
all indicators of compromise, attack techniques, and malicious artifacts.

INVESTIGATION RULES:
1. Always start with timeline_generate to establish the full chronological picture.
2. Use filesystem_list to find suspicious files, then file_identify and hash_compute on anything suspicious.
3. If a memory dump is present, run memory_analyze with pslist, netscan, and malfind.
4. If registry hives are present, run registry_extract on NTUSER and SYSTEM hives.
5. Run malware_scan on any suspicious executables found.
6. Use string_extract on suspicious binaries to surface IOCs (C2 IPs, domains, paths).
7. Report findings with clear descriptions and the artifact reference (path).
8. When you complete your investigation, call the finish_investigation tool with your summary.

FINDING DESCRIPTIONS: Be specific. Include timestamps, process names, file paths, registry keys,
IP addresses, hashes — anything concrete. Vague findings waste analyst time.

CONFIDENCE: Do not guess confidence levels — the system calculates this from corroboration.
Your job is to run tools and report what they found, accurately."""

FINISH_TOOL = {
    "name": "finish_investigation",
    "description": "Call this when you have completed the investigation. Pass a summary of key findings.",
    "input_schema": {
        "type": "object",
        "properties": {
            "summary": {
                "type": "string",
                "description": "High-level summary of the investigation findings in 2-3 paragraphs.",
            }
        },
        "required": ["summary"],
    },
}


class ForensIQAgent:
    def __init__(
        self,
        investigation_id: str,
        graph: EvidenceGraph,
        broadcast: BroadcastFn,
    ) -> None:
        self.investigation_id = investigation_id
        self.graph = graph
        self.broadcast = broadcast
        client_kwargs = {"api_key": settings.anthropic_api_key}
        if settings.anthropic_base_url:
            client_kwargs["base_url"] = settings.anthropic_base_url
        self.client = anthropic.AsyncAnthropic(**client_kwargs)

        self._tools: dict[str, BaseSIFTTool] = {
            t.name: t
            for t in [
                Log2TimelineTool(),
                VolatilityTool(),
                RegRipperTool(),
                SleuthKitTool(),
                YaraTool(),
                StringsTool(),
                FileIdentifyTool(),
                HashComputeTool(),
            ]
        }
        self._tool_defs = [t.anthropic_tool_definition for t in self._tools.values()] + [FINISH_TOOL]

    async def _emit(self, event: dict[str, Any]) -> None:
        try:
            result = self.broadcast(event)
            if hasattr(result, "__await__"):
                await result
        except Exception as exc:
            log.warning("broadcast_failed", error=str(exc))

    _TOOL_NOT_FOUND_MARKERS = (
        "command not found",
        "no such file or directory",
        "not installed",
        "bash: line",
    )

    def _is_tool_failure(self, output: str) -> bool:
        low = output.lower()
        return any(marker in low for marker in self._TOOL_NOT_FOUND_MARKERS)

    async def _run_tool(self, tool_name: str, tool_input: dict) -> str:
        if tool_name == "finish_investigation":
            return tool_input.get("summary", "Investigation complete.")

        tool = self._tools.get(tool_name)
        if not tool:
            return f"Unknown tool: {tool_name}"

        await self._emit({"type": "tool_start", "tool": tool_name, "params": tool_input})

        try:
            result = await tool.run(**tool_input)
        except ToolSecurityError as exc:
            await self._emit({"type": "tool_error", "tool": tool_name, "error": str(exc)})
            return f"Security violation blocked: {exc}"

        # Treat "command not found" style output as a tool error, not a finding.
        if not result.success and self._is_tool_failure(result.output):
            await self._emit({
                "type": "tool_error",
                "tool": tool_name,
                "error": f"Tool not available on SIFT VM: {tool_name}",
            })
            log.warning("tool_not_available", tool=tool_name)
            return f"TOOL_UNAVAILABLE: {tool_name} is not installed on the SIFT VM. Skip this tool and continue with available tools."

        self.graph.record_tool_call(
            tool_name=tool_name,
            params=tool_input,
            raw_output=result.output,
            duration_ms=result.duration_ms,
            success=result.success,
        )

        await self._emit({
            "type": "tool_complete",
            "tool": tool_name,
            "duration_ms": result.duration_ms,
            "output_hash": result.output_hash,
            "success": result.success,
        })

        log.info("tool_executed", tool=tool_name, duration_ms=result.duration_ms, success=result.success)
        return result.output

    def _build_finding_instruction(self, low: list[Finding]) -> str:
        if not low:
            return ""
        items = "\n".join(
            f"- [{f.id[:8]}] {f.description} (confidence: {f.confidence:.0%}, sources: {f.sources})"
            for f in low
        )
        return (
            f"\n\nSELF-CORRECTION REQUIRED: The following {len(low)} finding(s) have confidence "
            f"below threshold. Run additional tools to corroborate or contradict them:\n{items}"
        )

    async def investigate(self, case_path: str) -> None:
        messages: list[dict] = [
            {
                "role": "user",
                "content": (
                    f"Investigate the case data at: {case_path}\n\n"
                    f"Available artifacts should include disk images, memory dumps, and/or log files "
                    f"at that path. Begin with timeline_generate, then follow the evidence. "
                    f"When done, call finish_investigation."
                ),
            }
        ]

        correction_iteration = 0
        finished = False

        while not finished:
            response = await self.client.messages.create(
                model=settings.claude_model,
                max_tokens=settings.max_tokens,
                system=SYSTEM_PROMPT,
                tools=self._tool_defs,
                messages=messages,
            )

            tool_results: list[dict] = []
            new_finding_ids: list[str] = []

            for block in response.content:
                if block.type == "tool_use":
                    if block.name == "finish_investigation":
                        finished = True
                        output = await self._run_tool(block.name, block.input)
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": output,
                        })
                        continue

                    output = await self._run_tool(block.name, block.input)

                    artifact_ref = (
                        block.input.get("image_path")
                        or block.input.get("memory_path")
                        or block.input.get("hive_path")
                        or block.input.get("target_path")
                        or ""
                    )
                    match = self.graph.find_matching_finding(output)
                    if match is not None:
                        finding = self.graph.corroborate(
                            match.id, tool_name=block.name, raw_output=output
                        )
                        await self._emit({
                            "type": "finding_updated",
                            "finding": finding.to_dict(),
                        })
                    else:
                        finding = self.graph.add_finding(
                            description=f"[{block.name}] {output[:300]}",
                            tool_name=block.name,
                            raw_output=output,
                            artifact_ref=artifact_ref,
                        )
                        await self._emit({"type": "finding_new", "finding": finding.to_dict()})
                    new_finding_ids.append(finding.id)

                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": output,
                    })

            if new_finding_ids:
                await self._emit({
                    "type": "tool_complete",
                    "tool": "batch",
                    "finding_ids": new_finding_ids,
                    "duration_ms": 0,
                })

            low_confidence = self.graph.get_low_confidence_findings(settings.confidence_correction_threshold)

            if (
                low_confidence
                and correction_iteration < settings.max_correction_iterations
                and not finished
            ):
                correction_iteration += 1
                for f in low_confidence:
                    await self._emit({
                        "type": "self_correction",
                        "finding_id": f.id,
                        "reason": f"Confidence {f.confidence:.0%} below {settings.confidence_correction_threshold:.0%} threshold",
                        "current_sources": f.sources,
                    })

                correction_msg = self._build_finding_instruction(low_confidence)
                tool_results_with_correction = [
                    *tool_results,
                    {"type": "text", "text": correction_msg},
                ] if tool_results else [{"type": "text", "text": correction_msg}]

                messages.append({"role": "assistant", "content": response.content})
                messages.append({"role": "user", "content": tool_results_with_correction})

                await self._emit({
                    "type": "iteration_complete",
                    "iteration": correction_iteration,
                    "low_confidence_count": len(low_confidence),
                })
            else:
                if tool_results:
                    messages.append({"role": "assistant", "content": response.content})
                    messages.append({"role": "user", "content": tool_results})

            if response.stop_reason == "end_turn" and not tool_results:
                finished = True

        summary = self.graph.summary()
        await self._emit({"type": "investigation_complete", "summary": summary})
        log.info("investigation_complete", **summary)
