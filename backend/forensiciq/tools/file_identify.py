from typing import Any

from forensiciq.tools.base import BaseSIFTTool


class FileIdentifyTool(BaseSIFTTool):
    name = "file_identify"
    description = (
        "Identify file type, metadata, and embedded information using the 'file' command and exiftool. "
        "Reveals true file types regardless of extension, embedded timestamps, author info, "
        "and other metadata that may indicate tampering or malicious content."
    )

    async def _execute(self, target_path: str, **_: Any) -> tuple[str, bool]:
        cmd_file = f"file {target_path} 2>&1"
        cmd_exif = f"exiftool {target_path} 2>&1 | head -50"
        out1, ok1 = await self._ssh_exec(cmd_file)
        out2, ok2 = await self._ssh_exec(cmd_exif)
        combined = f"[file]\n{out1}\n\n[exiftool]\n{out2}"
        return combined, ok1 or ok2

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
                        "description": "Absolute path to the file to identify on the SIFT VM.",
                    },
                },
                "required": ["target_path"],
            },
        }
