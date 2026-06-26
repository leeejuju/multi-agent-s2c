from __future__ import annotations

import base64
import posixpath
import shlex

from agent_sandbox import Sandbox as AgentSandboxClient
from agent_sandbox.core.api_error import ApiError
from deepagents.backends.protocol import (
    FILE_NOT_FOUND,
    INVALID_PATH,
    IS_DIRECTORY,
    PERMISSION_DENIED,
    ExecuteResponse,
    FileDownloadResponse,
    FileUploadResponse,
)
from deepagents.backends.sandbox import BaseSandbox

DEFAULT_EXECUTE_TIMEOUT = 120
MAX_EXECUTE_OUTPUT_BYTES = 100_000


class S2CSandbox(BaseSandbox):
    """DeepAgents sandbox adapter for an already-provisioned remote sandbox."""

    def __init__(
        self,
        thread_id: str,
        uid: str
    ) -> None:
        
        self._id = uid
        self._execute_timeout = 10
        self._client = None

    @property
    def id(self) -> str:
        return self._id

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

        effective_timeout = timeout or self._execute_timeout
        try:
            response = self._client.bash.exec(
                command=command,
                async_mode=False,
                timeout=effective_timeout,
                hard_timeout=effective_timeout,
                max_output_length=MAX_EXECUTE_OUTPUT_BYTES,
            )
        except Exception as exc:  # noqa: BLE001
            return ExecuteResponse(
                output=f"Error executing command ({type(exc).__name__}): {exc}",
                exit_code=1,
            )

        data = getattr(response, "data", None)
        if data is None:
            message = getattr(response, "message", None) or "Sandbox returned no command data."
            return ExecuteResponse(output=f"Error: {message}", exit_code=1)

        stdout = str(getattr(data, "stdout", "") or "")
        stderr = str(getattr(data, "stderr", "") or "")
        output = self._join_output(stdout, stderr)
        status = str(getattr(data, "status", "") or "")
        exit_code = getattr(data, "exit_code", None)

        if status == "timed_out":
            exit_code = 124 if exit_code is None else int(exit_code)
            output = self._append_line(
                output,
                f"Error: Command timed out after {effective_timeout} seconds.",
            )
        elif status == "killed":
            exit_code = 137 if exit_code is None else int(exit_code)
            output = self._append_line(output, "Error: Command was killed.")
        elif status and status != "completed" and exit_code is None:
            exit_code = 1
            output = self._append_line(output, f"Error: Command status is {status}.")
        elif exit_code is not None:
            exit_code = int(exit_code)

        truncated_output, truncated = self._truncate_output(output or "<no output>")
        return ExecuteResponse(
            output=truncated_output,
            exit_code=exit_code,
            truncated=truncated,
        )

    def upload_files(self, files: list[tuple[str, bytes]]) -> list[FileUploadResponse]:
        responses: list[FileUploadResponse] = []
        for path, content in files:
            if not self._is_absolute_file_path(path):
                responses.append(FileUploadResponse(path=path, error=INVALID_PATH))
                continue

            try:
                parent = posixpath.dirname(path.rstrip("/")) or "/"
                mkdir = self.execute(f"mkdir -p {shlex.quote(parent)}")
                if mkdir.exit_code not in (0, None):
                    responses.append(FileUploadResponse(path=path, error=INVALID_PATH))
                    continue

                encoded = base64.b64encode(content).decode("ascii")
                response = self.client.file.write_file(
                    file=path,
                    content=encoded,
                    encoding="base64",
                )
                if getattr(response, "success", None) is False:
                    responses.append(
                        FileUploadResponse(
                            path=path,
                            error=str(getattr(response, "message", "") or INVALID_PATH),
                        )
                    )
                    continue
                responses.append(FileUploadResponse(path=path))
            except ApiError as exc:
                responses.append(
                    FileUploadResponse(path=path, error=self._upload_error(exc))
                )
            except Exception:
                responses.append(FileUploadResponse(path=path, error=INVALID_PATH))
        return responses

    def download_files(self, paths: list[str]) -> list[FileDownloadResponse]:
        responses: list[FileDownloadResponse] = []
        for path in paths:
            if not self._is_absolute_file_path(path):
                responses.append(FileDownloadResponse(path=path, error=INVALID_PATH))
                continue

            try:
                check = self.execute(
                    "if [ -d {path} ]; then exit 3; fi; "  # noqa: UP032
                    "if [ ! -e {path} ]; then exit 2; fi; "
                    "if [ ! -f {path} ]; then exit 4; fi".format(
                        path=shlex.quote(path)
                    )
                )
                if check.exit_code == 2:
                    responses.append(
                        FileDownloadResponse(path=path, error=FILE_NOT_FOUND)
                    )
                    continue
                if check.exit_code == 3:
                    responses.append(FileDownloadResponse(path=path, error=IS_DIRECTORY))
                    continue
                if check.exit_code not in (0, None):
                    responses.append(FileDownloadResponse(path=path, error=INVALID_PATH))
                    continue

                content = b"".join(self.client.file.download_file(path=path))
                responses.append(FileDownloadResponse(path=path, content=content))
            except ApiError as exc:
                responses.append(
                    FileDownloadResponse(path=path, error=self._download_error(exc))
                )
            except Exception:
                responses.append(FileDownloadResponse(path=path, error=INVALID_PATH))
        return responses

    @staticmethod
    def _is_absolute_file_path(path: str) -> bool:
        return isinstance(path, str) and path.startswith("/") and path != "/"

    @staticmethod
    def _join_output(stdout: str, stderr: str) -> str:
        parts = []
        if stdout:
            parts.append(stdout)
        if stderr:
            parts.append("\n".join(f"[stderr] {line}" for line in stderr.splitlines()))
        return "\n".join(parts)

    @staticmethod
    def _append_line(output: str, line: str) -> str:
        return f"{output.rstrip()}\n{line}" if output else line

    @staticmethod
    def _truncate_output(output: str) -> tuple[str, bool]:
        raw = output.encode("utf-8")
        if len(raw) <= MAX_EXECUTE_OUTPUT_BYTES:
            return output, False
        truncated = raw[:MAX_EXECUTE_OUTPUT_BYTES].decode("utf-8", errors="ignore")
        return (
            f"{truncated}\n\n... Output truncated at {MAX_EXECUTE_OUTPUT_BYTES} bytes.",
            True,
        )

    @staticmethod
    def _upload_error(exc: ApiError) -> str:
        if exc.status_code == 403:
            return PERMISSION_DENIED
        return INVALID_PATH

    @staticmethod
    def _download_error(exc: ApiError) -> str:
        if exc.status_code == 404:
            return FILE_NOT_FOUND
        if exc.status_code == 403:
            return PERMISSION_DENIED
        return INVALID_PATH
