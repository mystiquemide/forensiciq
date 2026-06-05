from typing import Any

from forensiciq.tools.base import BaseSIFTTool


class YaraTool(BaseSIFTTool):
    name = "malware_scan"
    description = (
        "Scan a file, directory, or memory dump for malware signatures using YARA rules. "
        "Uses the SIFT built-in rule sets covering common malware families, RATs, ransomware, "
        "and living-off-the-land binaries."
    )

    async def _execute(self, target_path: str, rules_path: str = "/opt/yara-rules/", **_: Any) -> tuple[str, bool]:
        cmd = f"yara -r {rules_path} {target_path} 2>&1 | head -150"
        return await self._ssh_exec(cmd)

    @property
    def anthropic_tool_definition(self) -> dict:
        return {
            "name": self.name,
            "description": self.description,
            "input_schema": {
                "type": "object",
                "properties": {
                    "target_path": {
                        "type": "string",
                        "description": "Absolute path to the file, directory, or memory dump to scan.",
                    },
                    "rules_path": {
                        "type": "string",
                        "description": "Path to YARA rules directory or file. Defaults to SIFT built-in rules.",
                        "default": "/opt/yara-rules/",
                    },
                },
                "required": ["target_path"],
            },
        }
