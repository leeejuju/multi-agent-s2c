import base64
import fnmatch
import re
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path
from uuid import uuid4

from deepagents.backends.protocol import (
    FILE_NOT_FOUND,
    INVALID_PATH,
    IS_DIRECTORY,
    PERMISSION_DENIED,
    EditResult,
    ExecuteResponse,
    FileData,
    FileDownloadResponse,
    FileInfo,
    FileUploadResponse,
    GlobResult,
    GrepMatch,
    GrepResult,
    LsResult,
    ReadResult,
    WriteResult,
)
from deepagents.backends.sandbox import BaseSandbox
from deepagents.backends.utils import check_empty_content, perform_string_replacement

DEFAULT_EXECUTE_TIMEOUT = 120
MAX_EXECUTE_OUTPUT_BYTES = 100_000
MAX_GREP_FILE_SIZE_BYTES = 10 * 1024 * 1024
PROJECT_ROOT = Path(__file__).resolve().parents[3]


@dataclass(frozen=True)
class SandboxPolicy:
    read_roots: tuple[Path, ...] = field(default_factory=tuple)
    write_roots: tuple[Path, ...] = field(default_factory=tuple)
    allow_network: bool = False


class S2CSandbox(BaseSandbox):
    """Path policy helper for future agent backend tools."""

    def __init__(
        self,
        policy: SandboxPolicy,
        *,
        execute_timeout: int = DEFAULT_EXECUTE_TIMEOUT,
    ) -> None:
        if execute_timeout <= 0:
            raise ValueError(f"execute_timeout must be positive, got {execute_timeout}.")

        self.policy = SandboxPolicy(
            read_roots=tuple(root.resolve() for root in policy.read_roots),
            write_roots=tuple(root.resolve() for root in policy.write_roots),
            allow_network=policy.allow_network,
        )
        self._id = f"agent-sandbox-{uuid4().hex[:8]}"
        self._execute_timeout = execute_timeout
        self.root = self.policy.write_roots[0] if self.policy.write_roots else PROJECT_ROOT
        self.cwd = self.root

    @property
    def id(self) -> str:
        return self._id

    def can_read(self, path: str | Path) -> bool:
        return self._is_allowed(path, self.policy.read_roots)

    def can_write(self, path: str | Path) -> bool:
        return self._is_allowed(path, self.policy.write_roots)

    def require_read(self, path: str | Path) -> Path:
        resolved = self._resolve_path(path)
        if not self.can_read(resolved):
            raise PermissionError(f"Read path is outside the agent sandbox: {resolved}")
        return resolved

    def require_write(self, path: str | Path) -> Path:
        resolved = self._resolve_path(path)
        if not self.can_write(resolved):
            raise PermissionError(f"Write path is outside the agent sandbox: {resolved}")
        return resolved

    def ls(self, path: str) -> LsResult:
        try:
            directory = self.require_read(path)
            if not directory.exists() or not directory.is_dir():
                return LsResult(entries=[])

            entries: list[FileInfo] = []
            for child in directory.iterdir():
                if not self.can_read(child):
                    continue
                entries.append(
                    {
                        "path": self._to_virtual_path(child),
                        "is_dir": child.is_dir(),
                        "size": 0 if child.is_dir() else child.stat().st_size,
                    }
                )
            entries.sort(key=lambda entry: entry.get("path", ""))
            return LsResult(entries=entries)
        except PermissionError as exc:
            return LsResult(error=str(exc), entries=[])
        except OSError as exc:
            return LsResult(error=f"Cannot list '{path}': {exc}", entries=[])

    def read(
        self,
        file_path: str,
        offset: int = 0,
        limit: int = 2000,
    ) -> ReadResult:
        try:
            path = self.require_read(file_path)
            if not path.exists() or not path.is_file():
                return ReadResult(error=f"File '{file_path}' not found")

            raw = path.read_bytes()
            try:
                content = raw.decode("utf-8")
            except UnicodeDecodeError:
                return ReadResult(
                    file_data=FileData(
                        content=base64.standard_b64encode(raw).decode("ascii"),
                        encoding="base64",
                    )
                )

            empty_msg = check_empty_content(content)
            if empty_msg:
                return ReadResult(file_data=FileData(content=empty_msg, encoding="utf-8"))

            lines = content.splitlines(keepends=True)
            if offset >= len(lines):
                return ReadResult(
                    error=f"Line offset {offset} exceeds file length ({len(lines)} lines)"
                )
            return ReadResult(
                file_data=FileData(
                    content="".join(lines[offset : offset + limit]),
                    encoding="utf-8",
                )
            )
        except PermissionError as exc:
            return ReadResult(error=str(exc))
        except OSError as exc:
            return ReadResult(error=f"Error reading file '{file_path}': {exc}")

    def write(self, file_path: str, content: str) -> WriteResult:
        try:
            path = self.require_write(file_path)
            if path.exists():
                return WriteResult(
                    error=(
                        f"Cannot write to {file_path} because it already exists. "
                        "Read and then edit it, or write to a new path."
                    )
                )
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8", newline="")
            return WriteResult(path=file_path)
        except PermissionError as exc:
            return WriteResult(error=str(exc))
        except OSError as exc:
            return WriteResult(error=f"Error writing file '{file_path}': {exc}")

    def edit(
        self,
        file_path: str,
        old_string: str,
        new_string: str,
        replace_all: bool = False,
    ) -> EditResult:
        try:
            path = self.require_write(file_path)
            if not path.exists() or not path.is_file():
                return EditResult(error=f"Error: File '{file_path}' not found")

            content = path.read_text(encoding="utf-8")
            old_string = old_string.replace("\r\n", "\n").replace("\r", "\n")
            new_string = new_string.replace("\r\n", "\n").replace("\r", "\n")
            result = perform_string_replacement(
                content,
                old_string,
                new_string,
                replace_all,
            )
            if isinstance(result, str):
                return EditResult(error=result)

            new_content, occurrences = result
            path.write_text(new_content, encoding="utf-8", newline="")
            return EditResult(path=file_path, occurrences=int(occurrences))
        except PermissionError as exc:
            return EditResult(error=str(exc))
        except (OSError, UnicodeError) as exc:
            return EditResult(error=f"Error editing file '{file_path}': {exc}")

    def glob(self, pattern: str, path: str = "/") -> GlobResult:
        try:
            search_path = self.require_read(path)
            if not search_path.exists() or not search_path.is_dir():
                return GlobResult(matches=[])

            normalized_pattern = pattern.lstrip("/").replace("\\", "/")
            matches: list[FileInfo] = []
            for candidate in search_path.rglob(normalized_pattern):
                if not candidate.is_file() or not self.can_read(candidate):
                    continue
                matches.append(
                    {
                        "path": self._to_virtual_path(candidate),
                        "is_dir": False,
                        "size": candidate.stat().st_size,
                    }
                )
            matches.sort(key=lambda item: item.get("path", ""))
            return GlobResult(matches=matches)
        except PermissionError as exc:
            return GlobResult(error=str(exc), matches=[])
        except OSError as exc:
            return GlobResult(error=f"Error globbing path '{path}': {exc}", matches=[])

    def grep(
        self,
        pattern: str,
        path: str | None = None,
        glob: str | None = None,
    ) -> GrepResult:
        try:
            search_path = self.require_read(path or "/")
            candidates = [search_path] if search_path.is_file() else search_path.rglob("*")
            matches: list[GrepMatch] = []

            for candidate in candidates:
                if not candidate.is_file() or not self.can_read(candidate):
                    continue
                relative_path = candidate.relative_to(self.root).as_posix()
                if glob and not fnmatch.fnmatch(relative_path, glob):
                    continue
                if candidate.stat().st_size > MAX_GREP_FILE_SIZE_BYTES:
                    continue

                try:
                    content = candidate.read_text(encoding="utf-8")
                except UnicodeError:
                    continue

                for line_number, line in enumerate(content.splitlines(), 1):
                    if pattern in line:
                        matches.append(
                            {
                                "path": self._to_virtual_path(candidate),
                                "line": line_number,
                                "text": line,
                            }
                        )
            return GrepResult(matches=matches)
        except PermissionError as exc:
            return GrepResult(error=str(exc), matches=[])
        except OSError as exc:
            return GrepResult(error=f"Error searching path '{path or '/'}': {exc}", matches=[])

    def execute(
        self,
        command: str,
        *,
        timeout: int | None = None,
    ) -> ExecuteResponse:
        if not command:
            return ExecuteResponse(
                output="Error: Command must be a non-empty string.",
                exit_code=1,
            )

        try:
            result = subprocess.run(  # noqa: S602
                command,
                check=False,
                shell=True,
                capture_output=True,
                stdin=subprocess.DEVNULL,
                text=True,
                timeout=timeout or self._execute_timeout,
                cwd=str(self.cwd),
            )
        except subprocess.TimeoutExpired:
            return ExecuteResponse(
                output=f"Error: Command timed out after {timeout or self._execute_timeout} seconds.",
                exit_code=124,
            )
        except Exception as exc:  # noqa: BLE001
            return ExecuteResponse(
                output=f"Error executing command ({type(exc).__name__}): {exc}",
                exit_code=1,
            )

        output = "\n".join(
            part
            for part in (
                result.stdout,
                "\n".join(f"[stderr] {line}" for line in result.stderr.splitlines()),
            )
            if part
        ) or "<no output>"
        truncated = len(output.encode("utf-8")) > MAX_EXECUTE_OUTPUT_BYTES
        if truncated:
            output = output[:MAX_EXECUTE_OUTPUT_BYTES]
            output += f"\n\n... Output truncated at {MAX_EXECUTE_OUTPUT_BYTES} bytes."

        return ExecuteResponse(
            output=output,
            exit_code=result.returncode,
            truncated=truncated,
        )

    def upload_files(self, files: list[tuple[str, bytes]]) -> list[FileUploadResponse]:
        responses: list[FileUploadResponse] = []
        for path, content in files:
            try:
                resolved = self.require_write(path)
                resolved.parent.mkdir(parents=True, exist_ok=True)
                resolved.write_bytes(content)
                responses.append(FileUploadResponse(path=path))
            except PermissionError:
                responses.append(FileUploadResponse(path=path, error=PERMISSION_DENIED))
            except (OSError, ValueError):
                responses.append(FileUploadResponse(path=path, error=INVALID_PATH))
        return responses

    def download_files(self, paths: list[str]) -> list[FileDownloadResponse]:
        responses: list[FileDownloadResponse] = []
        for path in paths:
            try:
                resolved = self.require_read(path)
                if not resolved.exists():
                    responses.append(FileDownloadResponse(path=path, error=FILE_NOT_FOUND))
                    continue
                if resolved.is_dir():
                    responses.append(FileDownloadResponse(path=path, error=IS_DIRECTORY))
                    continue
                responses.append(
                    FileDownloadResponse(path=path, content=resolved.read_bytes())
                )
            except PermissionError:
                responses.append(
                    FileDownloadResponse(path=path, error=PERMISSION_DENIED)
                )
            except (OSError, ValueError):
                responses.append(FileDownloadResponse(path=path, error=INVALID_PATH))
        return responses

    def run_python_code(
        self,
        code: str,
        *,
        timeout: int | None = None,
    ) -> ExecuteResponse:
        script_path = self.require_write(f"/.s2c_python_runs/{uuid4().hex}.py")
        script_path.parent.mkdir(parents=True, exist_ok=True)
        script_path.write_text(code, encoding="utf-8", newline="")
        command = subprocess.list2cmdline([sys.executable, str(script_path)])
        return self.execute(command, timeout=timeout)

    def _resolve_path(self, path: str | Path) -> Path:
        value = str(path).replace("\\", "/")
        if re.match(r"^[A-Za-z]:/", value):
            return Path(value).resolve()
        if value.startswith("/"):
            return (self.root / value.lstrip("/")).resolve()
        return (self.cwd / value).resolve()

    def _to_virtual_path(self, path: str | Path) -> str:
        resolved = Path(path).resolve()
        try:
            return "/" + resolved.relative_to(self.root).as_posix()
        except ValueError:
            return resolved.as_posix()

    @staticmethod
    def _is_allowed(path: str | Path, roots: tuple[Path, ...]) -> bool:
        resolved = Path(path).resolve()
        return any(resolved == root or root in resolved.parents for root in roots)


def create_s2c_sandbox(root: str | Path | None = None) -> S2CSandbox:
    resolved_root = Path(root).resolve() if root is not None else PROJECT_ROOT
    return S2CSandbox(
        SandboxPolicy(
            read_roots=(resolved_root,),
            write_roots=(resolved_root,),
        )
    )


AgentSandbox = S2CSandbox
