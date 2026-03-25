# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**multi-agent-s2c** is a script-driven image/video editing and generation system built on a multi-agent architecture. Agents collaborate through LangGraph to process user requests and generate visual content based on textual scripts.

**Tech Stack:**
- Backend: Python 3.13+, FastAPI, LangChain, LangGraph, Pydantic
- Frontend: Vue 3, TypeScript, Vite, Tailwind CSS
- LLM: OpenAI-compatible models via LangChain

## Architecture

### Agent System

The project uses a plugin-based agent architecture centered around `BaseAgent`:

```python
# All agents inherit from BaseAgent
class BaseAgent:
    name: str                    # Agent identifier
    description: str             # Agent purpose
    context: type[BaseContext]   # State management

    @abstractmethod
    async def get_agent(self) -> CompiledStateGraph:
        # Returns LangGraph agent instance
        pass

    async def stream(self, messages, context=None):
        # Standard streaming interface
        pass
```

**Agent Discovery:** `AgentManager` in `src/agents/manager.py` auto-discovers all `BaseAgent` subclasses in `src/agents/*/agent.py` at runtime. No manual registration required.

**Agent Structure:**
```
src/agents/
├── common/          # Shared base classes and utilities
│   ├── base_agent.py      # BaseAgent abstraction
│   ├── base_context.py    # BaseContext for state
│   ├── middlewares/       # Agent middleware
│   └── utils/             # Model tools, helpers
├── designagent/     # UI/Design specialist
├── deepagents/      # Deep processing agent
├── deepsearchagent/ # Search/retrieval agent
└── manager.py       # AgentManager (auto-discovers agents)
```

**Agent Communication:** Agents communicate via LangGraph's message passing system. Messages are structured dictionaries with `from`, `to`, `type`, `payload`, and `timestamp` fields. No direct cross-agent method calls allowed.

### API Layer

FastAPI routes in `server/router/` expose agent functionality:
- `POST /api/chat/agent/{agent_id}/run` - Execute agent with streaming response
- CORS enabled for `localhost:5173` (Vite dev server)

### Frontend

Vue 3 SPA in `web/` using TypeScript and Tailwind CSS:
- Components in `PascalCase` (e.g., `AgentChatComponent.vue`)
- Vue Router for navigation
- 2-space indentation

## Common Commands

### Backend (run from repo root)
```bash
# Start FastAPI server with hot-reload
python server/main.py

# Run backend tests
python -m pytest

# Install dependencies (uses uv)
uv sync
```

### Frontend (run from `web/`)
```bash
cd web
npm install          # Install dependencies
npm run dev          # Start Vite dev server (http://localhost:5173)
npm run build        # Build for production (runs vue-tsc + vite build)
npm run preview      # Preview production build
```

### Environment Setup
Copy `.env.template` to `.env` and configure:
- LLM API keys and endpoints
- Model configuration
- Agent-specific settings

## Code Conventions

### Python
- 4-space indentation
- `snake_case` for functions, variables, files
- `PascalCase` for classes
- Type hints required for all public functions
- Docstrings for all classes and public methods

### TypeScript/Vue
- 2-space indentation
- `PascalCase` for Vue SFC components
- `camelCase` for functions/variables
- Follow existing ESLint config in `web/eslint.config.js`

### Commit Messages
Conventional Commits format: `<type>(<scope>): <subject>`
- Types: `feat`, `fix`, `refactor`, `doc`, `test`, `chore`, `build`, `ci`
- Scopes: `agent`, `chat`, `web`, `deps`, etc.
- Examples:
  - `feat(agent): add stream response endpoint`
  - `fix(chat): handle empty message payload`
  - `refactor(config): split model options`

## Adding a New Agent

1. Create directory in `src/agents/<agentname>/`
2. Implement `agent.py`:
```python
from src.agents.common import BaseAgent
from .context import CustomContext

class CustomAgent(BaseAgent):
    name = "custom_agent"
    description = "Agent description"
    context = CustomContext

    async def get_agent(self) -> CompiledStateGraph:
        # Build and return LangGraph agent
        pass
```
3. Create `context.py` with `BaseContext` subclass
4. `AgentManager` will auto-discover and register at startup
5. Add route in `server/router/chat.py` to expose the agent

## Project-Specific Rules

The `.claude/rules/` directory contains project-specific rules that auto-load:
- **agent-design.md**: Agent architecture, communication protocols, collaboration patterns
- **code-style.md**: Detailed Python/TypeScript style guidelines
- **testing-requirements.md**: Test coverage requirements, testing strategies

Key principles:
- Single responsibility per agent
- No shared state between agents (message-passing only)
- Standardized message format with timestamps
- Graceful error handling that doesn't crash other agents
- Agent response time target: < 2 seconds

## Testing

- Backend tests in `test/` as `test_*.py`
- Frontend relies on type checking (`vue-tsc`) and manual testing
- Coverage target: ≥80% overall, 100% for core business logic
