import hashlib
import time
from abc import ABC, abstractmethod
from typing import Any

import asyncssh
import structlog

from forensiciq.config import settings

log = structlog.get_logger()

FORBIDDEN_PREFIXES = (
    "rm ", "rm\t", "dd ", "dd\t", "shred ", "mkfs",
    "fdisk", "chmod ", "chown ", "truncate ", "> /",
    "sudo rm", "sudo dd", "sudo shred", "sudo mkfs",
)


class ToolSecurityError(Exception):
    pass


class ToolResult:
    def __init__(self, output: str, success: bool, duration_ms: int, output_hash: str) -> None:
        self.output = output
        self.success = success
        self.duration_ms = duration_ms
        self.output_hash = output_hash


class BaseSIFTTool(ABC):
    name: str
    description: str

    def _check_command(self, command: str) -> None:
        normalized = command.strip().lower()
        for prefix in FORBIDDEN_PREFIXES:
            if normalized.startswith(prefix.lower()):
                raise ToolSecurityError(f"Blocked destructive command pattern: {prefix.strip()!r}")
        for separator in (";", "&&", "||", "|"):
            for part in command.split(separator):
                part = part.strip().lower()
                for prefix in FORBIDDEN_PREFIXES:
                    if part.startswith(prefix.lower()):
                        raise ToolSecurityError(f"Blocked destructive sub-command: {prefix.strip()!r}")

    async def _ssh_exec(self, command: str) -> tuple[str, bool]:
        self._check_command(command)
        try:
            async with asyncssh.connect(
                host=settings.sift_host,
                port=settings.sift_port,
                username=settings.sift_user,
                client_keys=[settings.sift_ssh_key_path],
                known_hosts=None,
                connect_timeout=30,
            ) as conn:
                result = await conn.run(command, timeout=300)
                output = (result.stdout or "") + (result.stderr or "")
                return output.strip(), result.exit_status == 0
        except ToolSecurityError:
            raise
        except Exception as exc:
            log.error("ssh_exec_failed", tool=self.name, error=str(exc))
            return f"SSH connection error: {exc}", False

    async def run(self, **kwargs: Any) -> ToolResult:
        start = time.monotonic()
        try:
            output, success = await self._execute(**kwargs)
        except ToolSecurityError:
            raise
        except Exception as exc:
            output = f"Tool execution error: {exc}"
            success = False
        duration_ms = int((time.monotonic() - start) * 1000)
        output_hash = hashlib.sha256(output.encode()).hexdigest()
        return ToolResult(output=output, success=success, duration_ms=duration_ms, output_hash=output_hash)

    @abstractmethod
    async def _execute(self, **kwargs: Any) -> tuple[str, bool]:
        ...

    @property
    @abstractmethod
    def anthropic_tool_definition(self) -> dict:
        ...
