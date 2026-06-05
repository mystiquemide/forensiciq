from typing import Any

from forensiciq.tools.base import BaseSIFTTool


class StringsTool(BaseSIFTTool):
    name = "string_extract"
    description = (
        "Extract printable strings from a binary file or memory dump. "
        "Useful for identifying C2 domains, IPs, registry keys, file paths, "
        "and other IOCs embedded in malicious executables or memory regions."
    )

    async def _execute(self, target_path: str, min_length: int = 8, grep_pattern: str = "", **_: Any) -> tuple[str, bool]:
        if min_length < 4 or min_length > 100:
            min_length = 8
        cmd = f"strings -n {min_length} {target_path}"
        if grep_pattern:
            safe_pattern = grep_pattern.replace("'", "")
            cmd += f" | grep -i '{safe_pattern}'"
        cmd += " | head -200 2>&1"
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
                        "description": "Absolute path to the binary or memory dump on the SIFT VM.",
                    },
                    "min_length": {
                        "type": "integer",
                        "description": "Minimum string length to extract. Defaults to 8.",
                        "default": 8,
                    },
                    "grep_pattern": {
                        "type": "string",
                        "description": "Optional grep pattern to filter strings (e.g. 'http', '192.168', '.exe').",
                        "default": "",
                    },
                },
                "required": ["target_path"],
            },
        }
