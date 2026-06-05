from typing import Any, Literal

from forensiciq.tools.base import BaseSIFTTool

Hive = Literal["NTUSER", "SYSTEM", "SOFTWARE", "SAM", "SECURITY"]


class RegRipperTool(BaseSIFTTool):
    name = "registry_extract"
    description = (
        "Extract forensic artifacts from Windows registry hives using RegRipper. "
        "Supports hives: NTUSER (user activity, run keys), SYSTEM (services, device history), "
        "SOFTWARE (installed programs, MRU), SAM (user accounts), SECURITY (audit policy)."
    )

    async def _execute(self, hive_path: str, hive_type: str = "NTUSER", **_: Any) -> tuple[str, bool]:
        allowed = {"NTUSER", "SYSTEM", "SOFTWARE", "SAM", "SECURITY"}
        if hive_type.upper() not in allowed:
            return f"Hive type '{hive_type}' not in allowed list: {sorted(allowed)}", False
        profile = hive_type.lower()
        cmd = f"rip.pl -r {hive_path} -f {profile} 2>&1 | head -300"
        return await self._ssh_exec(cmd)

    @property
    def anthropic_tool_definition(self) -> dict:
        return {
            "name": self.name,
            "description": self.description,
            "input_schema": {
                "type": "object",
                "properties": {
                    "hive_path": {
                        "type": "string",
                        "description": "Absolute path to the registry hive file on the SIFT VM.",
                    },
                    "hive_type": {
                        "type": "string",
                        "enum": ["NTUSER", "SYSTEM", "SOFTWARE", "SAM", "SECURITY"],
                        "description": "Registry hive type to use the correct RegRipper profile.",
                        "default": "NTUSER",
                    },
                },
                "required": ["hive_path"],
            },
        }
