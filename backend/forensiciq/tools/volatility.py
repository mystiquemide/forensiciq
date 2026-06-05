from typing import Any, Literal

from forensiciq.tools.base import BaseSIFTTool

VolPlugin = Literal["pslist", "netscan", "malfind", "dlllist", "cmdline", "filescan", "handles"]


class VolatilityTool(BaseSIFTTool):
    name = "memory_analyze"
    description = (
        "Analyze a memory dump using Volatility. Supports plugins: pslist (process list), "
        "netscan (network connections), malfind (injected code), dlllist (loaded DLLs), "
        "cmdline (command lines), filescan (open file handles), handles (handle table)."
    )

    async def _execute(self, memory_path: str, plugin: str = "pslist", **_: Any) -> tuple[str, bool]:
        allowed = {"pslist", "netscan", "malfind", "dlllist", "cmdline", "filescan", "handles"}
        if plugin not in allowed:
            return f"Plugin '{plugin}' not in allowed list: {sorted(allowed)}", False
        cmd = f"vol -f {memory_path} {plugin} 2>&1 | head -200"
        return await self._ssh_exec(cmd)

    @property
    def anthropic_tool_definition(self) -> dict:
        return {
            "name": self.name,
            "description": self.description,
            "input_schema": {
                "type": "object",
                "properties": {
                    "memory_path": {
                        "type": "string",
                        "description": "Absolute path to the memory dump file on the SIFT VM.",
                    },
                    "plugin": {
                        "type": "string",
                        "enum": ["pslist", "netscan", "malfind", "dlllist", "cmdline", "filescan", "handles"],
                        "description": "Volatility plugin to run.",
                        "default": "pslist",
                    },
                },
                "required": ["memory_path"],
            },
        }
