from typing import Any

from forensiciq.tools.base import BaseSIFTTool


class HashComputeTool(BaseSIFTTool):
    name = "hash_compute"
    description = (
        "Compute MD5, SHA-1, and SHA-256 hashes of a file for IOC matching against threat intelligence. "
        "Use to verify file integrity, identify known malware by hash, and establish chain of custody."
    )

    async def _execute(self, target_path: str, **_: Any) -> tuple[str, bool]:
        cmd = (
            f"echo 'MD5:' && md5sum {target_path} && "
            f"echo 'SHA1:' && sha1sum {target_path} && "
            f"echo 'SHA256:' && sha256sum {target_path} 2>&1"
        )
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
                        "description": "Absolute path to the file to hash on the SIFT VM.",
                    },
                },
                "required": ["target_path"],
            },
        }
