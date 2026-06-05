from typing import Any

from forensiciq.tools.base import BaseSIFTTool


class Log2TimelineTool(BaseSIFTTool):
    name = "timeline_generate"
    description = (
        "Generate a super-timeline from a disk image or directory using log2timeline/plaso. "
        "Extracts timestamps from file system metadata, Windows event logs, browser history, "
        "registry, and application logs into a single chronological timeline."
    )

    async def _execute(self, image_path: str, output_path: str = "/tmp/forensiciq_timeline.csv", **_: Any) -> tuple[str, bool]:
        plaso_path = output_path.replace(".csv", ".plaso")
        cmd_extract = f"log2timeline.py --parsers 'win7,winevtx,winreg,filestat,chrome_history,firefox_history' {plaso_path} {image_path} 2>&1 | tail -20"
        out1, ok1 = await self._ssh_exec(cmd_extract)
        if not ok1:
            return out1, False
        cmd_export = f"psort.py -o l2tcsv -w {output_path} {plaso_path} 2>&1 | tail -5 && head -100 {output_path}"
        out2, ok2 = await self._ssh_exec(cmd_export)
        combined = f"[EXTRACT]\n{out1}\n\n[EXPORT SAMPLE]\n{out2}"
        return combined, ok2

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
                        "description": "Absolute path to the disk image or evidence directory on the SIFT VM.",
                    },
                    "output_path": {
                        "type": "string",
                        "description": "Where to write the CSV timeline on the SIFT VM. Defaults to /tmp/forensiciq_timeline.csv.",
                    },
                },
                "required": ["image_path"],
            },
        }
