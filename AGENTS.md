# Repository Agent Guide

This file is the single source of repository guidance for Claude/Codex-style coding agents. `CLAUDE.md` imports this file directly, so update `AGENTS.md` whenever architecture or workflow guidance changes.

## Current Project Shape

`multi-agent-s2c` is a script-driven visual creation system. The backend is a FastAPI service built around LangChain/LangGraph agents, SQLAlchemy repositories, PostgreSQL, and MinIO-backed uploads. The frontend is a React + TypeScript + Vite app under `web/`.

The concrete business agents in `src/agents/` are `DesignAgent`, `SearchAgent`, and `LayoutAgent`.

## Backend Architecture

- Agent code lives in `src/agents/`.
- Shared agent primitives live in `src/agents/common/`.
- Each agent should live in `src/agents/<agentname>/` and expose its class from that package's `__init__.py`.
- `AgentManager` in `src/agents/manager.py` auto-discovers agent packages and instantiates `BaseAgent` subclasses.
- `BaseAgent.stream_messages(...)` wraps LangGraph streaming and yields normalized `("messages", message)` chunks for token streaming.
- Chat HTTP routes live in `server/router/chat.py`.
- Chat orchestration and persistence live in `server/service/chat_service.py`.
- Database access should go through repository classes in `src/database/repositories/`; do not put raw SQL or persistence logic inside agents.
- Uploaded files are stored through `src/storage/`; current upload responses are assembled in memory and are not fully persisted as attachment rows yet.

## Current Chat Flow

1. `POST /api/chat/agent/{agent_id}/run/stream` receives user input and attachment metadata.
2. `chat_service.stream_chunk(...)` saves the user message through `ConversationRepository`.
3. Image attachment URLs are converted into LangChain multimodal message content when present.
4. The selected agent is resolved by `agent_manager.get_agent(agent_id)`.
5. Agent stream tokens are emitted as JSON lines.
6. The assistant's final accumulated response is saved to the conversation.

Agent runs execute in-process by default. ARQ queue execution and Redis Stream event publishing are opt-in through `ENABLE_RUN_QUEUE=true`; database event persistence remains enabled by default.

## DesignAgent Status

`DesignAgent` is currently positioned as a script and storyboard design agent. Its prompt asks it to produce structured creative planning outputs such as story summaries, dramatic structure, character notes, scene lists, shot tables, camera language, visual emphasis, and sound/music suggestions.

When changing `DesignAgent`, keep it responsible for understanding the user's creative intent and producing final creative plans. Do not move repository or storage concerns into it.

## SearchAgent Direction

`SearchAgent` is an independent retrieval and reference-organization agent, not a middleware that automatically runs before every request.

First version scope:

- Tavily web search is supported when `TAVILY_API_KEY` is configured.
- `DesignAgent` should call it on demand through `search_references(query, scopes, limit)`.
- Search must return stable structured JSON:

```json
{
  "reference_context": {
    "project_history": [],
    "material_refs": [],
    "knowledge_refs": [],
    "web_refs": [],
    "local_file_refs": []
  },
  "recommended_usage": {
    "must_follow": [],
    "can_use": [],
    "avoid": []
  },
  "search_notes": []
}
```

The retrieval routes are:

- `ProjectHistorySearch`: current user's conversation history, established characters, scenes, style, and previous plans.
- `MaterialSearch`: current and historical attachment summaries, filenames, user references, and parsed text or image descriptions once available.
- `KnowledgeSearch`: Milvus vector retrieval or local knowledge providers for story structure, genre patterns, storyboard conventions, and camera language templates.
- `WebSearch`: Tavily web results.
- `LocalFileSearch`: LangChain filesystem search under `LOCAL_REFERENCE_ROOT`.

`SearchAgent` should read data through repositories or provider factories. It should not parse raw attachments itself and should not generate final scripts or storyboards.

## LayoutAgent Direction

`LayoutAgent` is responsible for image composition analysis, layout optimization, and generation-ready prompt drafting. It should not call image generation APIs in the first version.

## Frontend Architecture

For frontend-specific conventions, follow `web/AGENTS.md`

Current frontend stack:

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Zustand
- `react-router-dom`

Frontend code lives under `web/src/`.

## Development Commands

Backend:

```bash
uv sync
python server/main.py
python -m pytest
```

Frontend:

```bash
cd web
npm install
npm run dev
npm run build
```

Targeted validation for backend edits:

```bash
uv run --no-sync python -m compileall server/router server/service src/agents src/database/repositories
```

## Contribution Rules

- Follow `CONTRIBUTING.md` for repository contribution workflow.
- Pull requests should include a short summary and motivation.
- Link the issue or task ID when available.
- For UI changes in `web/`, include screenshots or video.
- Include verification notes with the commands run and outcomes.

## Git Commit Rules

- Use Conventional Commits.
- Commit format: `<type>(<scope>): <subject>`.
- `type` should be one of: `feat`, `fix`, `refactor`, `doc`, `test`, `chore`, `build`, `ci`.
- `scope` is recommended and should describe the changed module, such as `agent`, `chat`, `web`, or `deps`.
- `subject` uses lowercase imperative form and should be concise, recommended <= 72 characters.
- Git commit messages must be written in English.
- Do not wrap commit messages, subjects, or scopes with `@` characters.
- Keep one commit focused on one change.

## Working Rules

- Prefer existing local patterns over new abstractions.
- Keep agent responsibilities narrow.
- Keep API/service orchestration outside agents.
- Keep database reads and writes in repositories.
- Read project source/config files using UTF-8 encoding unless a different encoding is explicitly required.
- Preserve user changes in the working tree; never revert unrelated modifications.
- Add tests or compile checks for behavior changes with non-trivial blast radius.
- If implementing `SearchAgent`, keep it opt-in from `DesignAgent`; do not add automatic pre-retrieval middleware.
