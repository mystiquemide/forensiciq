"""
ForensIQ Claude / Groq agent.

Drives the investigation loop via tool_use (Anthropic) or function calling
(Groq/OpenAI-compatible). Provider is selected via settings.llm_provider.
After each tool execution the EvidenceGraph is updated and self-correction
fires when any finding sits below the confidence threshold.
"""

import json
from collections.abc import Callable, Awaitable
from dataclasses import dataclass, field
from datetime import datetime, timezone
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

FINISH_TOOL_ANTHROPIC = {
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

FINISH_TOOL_OPENAI = {
    "type": "function",
    "function": {
        "name": "finish_investigation",
        "description": "Call this when you have completed the investigation. Pass a summary of key findings.",
        "parameters": {
            "type": "object",
            "properties": {
                "summary": {
                    "type": "string",
                    "description": "High-level summary of the investigation findings in 2-3 paragraphs.",
                }
            },
            "required": ["summary"],
        },
    },
}


@dataclass
class NormalizedToolCall:
    """Provider-agnostic tool call extracted from an LLM response."""
    id: str
    name: str
    input: dict


@dataclass
class NormalizedResponse:
    tool_calls: list[NormalizedToolCall]
    stop_early: bool  # True when LLM returned end_turn/stop with no tool calls
    input_tokens: int = 0
    output_tokens: int = 0


def _anthropic_def_to_openai(tool_def: dict) -> dict:
    """Convert an Anthropic tool definition to OpenAI function-calling format."""
    return {
        "type": "function",
        "function": {
            "name": tool_def["name"],
            "description": tool_def.get("description", ""),
            "parameters": tool_def.get("input_schema", {"type": "object", "properties": {}}),
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

        # Build tool definitions in both formats once
        self._anthropic_tool_defs = (
            [t.anthropic_tool_definition for t in self._tools.values()]
            + [FINISH_TOOL_ANTHROPIC]
        )
        self._openai_tool_defs = (
            [_anthropic_def_to_openai(t.anthropic_tool_definition) for t in self._tools.values()]
            + [FINISH_TOOL_OPENAI]
        )

        # Init the provider client
        if settings.llm_provider == "groq":
            from groq import AsyncGroq
            self._groq = AsyncGroq(api_key=settings.groq_api_key)
            self._anthropic = None
            log.info("llm_provider", provider="groq", model=settings.groq_model)
        else:
            client_kwargs: dict[str, Any] = {"api_key": settings.anthropic_api_key}
            if settings.anthropic_base_url:
                client_kwargs["base_url"] = settings.anthropic_base_url
            self._anthropic = anthropic.AsyncAnthropic(**client_kwargs)
            self._groq = None
            log.info("llm_provider", provider="anthropic", model=settings.claude_model)

    async def _emit(self, event: dict[str, Any]) -> None:
        try:
            result = self.broadcast(event)
            if hasattr(result, "__await__"):
                await result
        except Exception as exc:
            log.warning("broadcast_failed", error=str(exc))

    # --- Provider-specific LLM calls ---

    async def _call_anthropic(self, messages: list[dict]) -> tuple[NormalizedResponse, list]:
        """Call Anthropic, return normalized response + raw content for history."""
        response = await self._anthropic.messages.create(  # type: ignore[union-attr]
            model=settings.claude_model,
            max_tokens=settings.max_tokens,
            system=SYSTEM_PROMPT,
            tools=self._anthropic_tool_defs,
            messages=messages,
        )

        tool_calls = [
            NormalizedToolCall(id=block.id, name=block.name, input=block.input)
            for block in response.content
            if block.type == "tool_use"
        ]
        stop_early = response.stop_reason == "end_turn" and not tool_calls
        return NormalizedResponse(
            tool_calls=tool_calls,
            stop_early=stop_early,
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
        ), response.content

    async def _call_groq(self, messages: list[dict]) -> tuple[NormalizedResponse, Any]:
        """Call Groq, return normalized response + raw message for history."""
        response = await self._groq.chat.completions.create(  # type: ignore[union-attr]
            model=settings.groq_model,
            max_tokens=settings.max_tokens,
            messages=[{"role": "system", "content": SYSTEM_PROMPT}] + messages,
            tools=self._openai_tool_defs,
            tool_choice="auto",
        )

        choice = response.choices[0]
        raw_calls = choice.message.tool_calls or []
        tool_calls = [
            NormalizedToolCall(
                id=tc.id,
                name=tc.function.name,
                input=json.loads(tc.function.arguments),
            )
            for tc in raw_calls
        ]
        stop_early = choice.finish_reason == "stop" and not tool_calls
        usage = response.usage
        return NormalizedResponse(
            tool_calls=tool_calls,
            stop_early=stop_early,
            input_tokens=usage.prompt_tokens if usage else 0,
            output_tokens=usage.completion_tokens if usage else 0,
        ), choice.message

    async def _call_llm(self, messages: list[dict]) -> tuple[NormalizedResponse, Any]:
        if settings.llm_provider == "groq":
            return await self._call_groq(messages)
        return await self._call_anthropic(messages)

    # --- Message history helpers (format differs per provider) ---

    def _append_assistant(self, messages: list[dict], raw: Any) -> None:
        if settings.llm_provider == "groq":
            msg: dict[str, Any] = {"role": "assistant", "content": raw.content}
            if raw.tool_calls:
                msg["tool_calls"] = [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {"name": tc.function.name, "arguments": tc.function.arguments},
                    }
                    for tc in raw.tool_calls
                ]
            messages.append(msg)
        else:
            messages.append({"role": "assistant", "content": raw})

    def _append_tool_results(
        self, messages: list[dict], results: list[tuple[str, str]]
    ) -> None:
        """results is a list of (tool_call_id, output) pairs."""
        if settings.llm_provider == "groq":
            for call_id, output in results:
                messages.append({"role": "tool", "tool_call_id": call_id, "content": output})
        else:
            messages.append({
                "role": "user",
                "content": [
                    {"type": "tool_result", "tool_use_id": call_id, "content": output}
                    for call_id, output in results
                ],
            })

    def _append_correction_hint(self, messages: list[dict], hint: str) -> None:
        if settings.llm_provider == "groq":
            messages.append({"role": "user", "content": hint})
        else:
            messages.append({"role": "user", "content": [{"type": "text", "text": hint}]})

    # --- Tool execution ---

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

    # --- Self-correction ---

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

    # --- Main loop ---

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
            normalized, raw = await self._call_llm(messages)

            model = settings.groq_model if settings.llm_provider == "groq" else settings.claude_model
            await self._emit({
                "type": "llm_call",
                "model": model,
                "provider": settings.llm_provider,
                "iteration": correction_iteration,
                "input_tokens": normalized.input_tokens,
                "output_tokens": normalized.output_tokens,
                "total_tokens": normalized.input_tokens + normalized.output_tokens,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })

            tool_results: list[tuple[str, str]] = []
            new_finding_ids: list[str] = []

            for tc in normalized.tool_calls:
                if tc.name == "finish_investigation":
                    finished = True
                    output = await self._run_tool(tc.name, tc.input)
                    tool_results.append((tc.id, output))
                    continue

                output = await self._run_tool(tc.name, tc.input)

                artifact_ref = (
                    tc.input.get("image_path")
                    or tc.input.get("memory_path")
                    or tc.input.get("hive_path")
                    or tc.input.get("target_path")
                    or ""
                )
                match = self.graph.find_matching_finding(output)
                if match is not None:
                    finding = self.graph.corroborate(match.id, tool_name=tc.name, raw_output=output)
                    await self._emit({"type": "finding_updated", "finding": finding.to_dict()})
                else:
                    finding = self.graph.add_finding(
                        description=f"[{tc.name}] {output[:300]}",
                        tool_name=tc.name,
                        raw_output=output,
                        artifact_ref=artifact_ref,
                    )
                    await self._emit({"type": "finding_new", "finding": finding.to_dict()})
                new_finding_ids.append(finding.id)
                tool_results.append((tc.id, output))

            if new_finding_ids:
                await self._emit({
                    "type": "tool_complete",
                    "tool": "batch",
                    "finding_ids": new_finding_ids,
                    "duration_ms": 0,
                })

            low_confidence = self.graph.get_low_confidence_findings(settings.confidence_correction_threshold)

            self._append_assistant(messages, raw)

            if tool_results:
                self._append_tool_results(messages, tool_results)

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
                self._append_correction_hint(messages, correction_msg)

                await self._emit({
                    "type": "iteration_complete",
                    "iteration": correction_iteration,
                    "low_confidence_count": len(low_confidence),
                })

            if normalized.stop_early:
                finished = True

        summary = self.graph.summary()
        await self._emit({"type": "investigation_complete", "summary": summary})
        log.info("investigation_complete", **summary)
