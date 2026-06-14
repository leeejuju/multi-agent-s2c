from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field

from .sandbox import S2CSandbox


class RunPythonCodeSchema(BaseModel):
    code: str = Field(description="Python code to write into the sandbox and execute.")
    timeout: int | None = Field(
        default=None,
        description="Optional execution timeout in seconds.",
    )


def create_python_code_tool(sandbox: S2CSandbox) -> StructuredTool:
    def run_python_code(code: str, timeout: int | None = None) -> str:
        result = sandbox.run_python_code(code, timeout=timeout)
        output = result.output
        if result.exit_code is not None:
            output = f"{output.rstrip()}\n\n[Python exited with code {result.exit_code}]"
        return output

    return StructuredTool.from_function(
        name="run_python_code",
        description=(
            "Write Python code into the sandbox as a temporary .py file and execute it. "
            "Use this when calculation, parsing, transformation, or validation is easier "
            "with Python than with manual reasoning."
        ),
        func=run_python_code,
        args_schema=RunPythonCodeSchema,
    )


def create_sandbox_tools(sandbox: S2CSandbox) -> list[StructuredTool]:
    return [create_python_code_tool(sandbox)]
