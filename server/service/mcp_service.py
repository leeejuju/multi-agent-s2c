from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class MCPToolDescriptor:
    name: str
    description: str = ""
    input_schema: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class MCPServerConfig:
    name: str
    command: str
    args: tuple[str, ...] = ()
    env: dict[str, str] = field(default_factory=dict)
    enabled: bool = True


class MCPService:
    """Registry for MCP servers and tools exposed to agents."""

    def __init__(self) -> None:
        self._servers: dict[str, MCPServerConfig] = {}
        self._tools: dict[str, list[MCPToolDescriptor]] = {}

    def register_server(self, config: MCPServerConfig) -> None:
        self._servers[config.name] = config
        self._tools.setdefault(config.name, [])

    def register_tool(self, server_name: str, tool: MCPToolDescriptor) -> None:
        if server_name not in self._servers:
            raise KeyError(f"Unknown MCP server: {server_name}")
        self._tools.setdefault(server_name, []).append(tool)

    def get_server(self, server_name: str) -> MCPServerConfig | None:
        return self._servers.get(server_name)

    def list_servers(self, *, enabled_only: bool = True) -> list[MCPServerConfig]:
        servers = self._servers.values()
        if enabled_only:
            servers = [server for server in servers if server.enabled]
        return sorted(servers, key=lambda server: server.name)

    def list_tools(self, server_name: str | None = None) -> list[MCPToolDescriptor]:
        if server_name is not None:
            return list(self._tools.get(server_name, []))
        return [
            tool
            for server_tools in self._tools.values()
            for tool in server_tools
        ]
