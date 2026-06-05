from typing import Any

from forensiciq.tools.base import BaseSIFTTool


class SleuthKitTool(BaseSIFTTool):
    name = "filesystem_list"
    description = (
        "List and analyze file system contents from a disk image using Sleuth Kit (fls/icat). "
        "Can enumerate deleted files, list directory trees, and extract specific file contents."
    )

    async def _execute(self, image_path: str, path: str = "/", deleted: bool = False, **_: Any) -> tuple[str, bool]:
        deleted_flag = "-d" if deleted else ""
        cmd = f"fls {deleted_flag} -r -p {image_path} 2>&1 | grep -i '{path}' | head -200"
        return await self._ssh_exec(cmd)

    @property
    def anthropic_tool_definition(self) -> dict:
        return {
            "name": self.name,
            "description": self.description,
            "input_schema": {
                "type": "object",
                "properties": {
                    "image_path": {
                        "type": "string",
                        "description": "Absolute path to the disk image on the SIFT VM.",
                    },
                    "path": {
                        "type": "string",
                        "description": "Directory path to list. Defaults to root.",
                        "default": "/",
                    },
                    "deleted": {
                        "type": "boolean",
                        "description": "If true, show only deleted files.",
                        "default": False,
                    },
                },
                "required": ["image_path"],
            },
        }
