"""
Security boundary tests: verify that destructive and chained commands
are blocked at the tool layer before any SSH connection is made.
"""
import pytest

from forensiciq.tools.base import BaseSIFTTool, ToolSecurityError
from forensiciq.tools.hash_compute import HashComputeTool


@pytest.fixture()
def tool() -> BaseSIFTTool:
    return HashComputeTool()


# --- Direct destructive commands ---

@pytest.mark.parametrize("cmd", [
    "rm -rf /cases",
    "rm /evidence/disk.img",
    "dd if=/dev/zero of=/dev/sda",
    "shred -u /cases/memory.dmp",
    "mkfs.ext4 /dev/sdb",
    "fdisk /dev/sda",
    "chmod 777 /etc/passwd",
    "chown root /cases",
    "truncate -s 0 /var/log/syslog",
    "> /etc/shadow",
    "sudo rm -rf /",
    "sudo dd if=/dev/zero of=/dev/sda",
])
def test_direct_destructive_blocked(tool: BaseSIFTTool, cmd: str) -> None:
    with pytest.raises(ToolSecurityError):
        tool._check_command(cmd)


# --- Chained commands containing destructive sub-commands ---

@pytest.mark.parametrize("cmd", [
    "strings /cases/evil.exe && rm -rf /tmp",
    "file /evidence/disk.img; dd if=/dev/zero of=/dev/sda",
    "cat /var/log/auth.log || shred /cases/memory.dmp",
    "ls /cases | rm -rf /tmp/out",
])
def test_chained_destructive_blocked(tool: BaseSIFTTool, cmd: str) -> None:
    with pytest.raises(ToolSecurityError):
        tool._check_command(cmd)


# --- Legitimate read-only commands must pass ---

@pytest.mark.parametrize("cmd", [
    "strings /cases/evil.exe",
    "sha256sum /evidence/disk.img",
    "file /cases/memory.dmp",
    "cat /var/log/auth.log",
    "ls -la /cases/",
    "md5sum /evidence/sample.bin",
])
def test_legitimate_commands_allowed(tool: BaseSIFTTool, cmd: str) -> None:
    tool._check_command(cmd)  # must not raise
