import { ArrowRight, Clock3, Plus, Search, Paperclip } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { agentApi, type ConversationSummary } from "@/api/agent";
import { useChatStore } from "@/store/chat";
import "./WorkspaceHomeView.css";

function formatWorkspaceDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently updated";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function WorkspaceHomeView() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [query, setQuery] = useState("");
  const [workspaces, setWorkspaces] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const setConversationId = useChatStore((state) => state.setConversationId);
  const setDraftText = useChatStore((state) => state.setDraftText);
  const setMessages = useChatStore((state) => state.setMessages);

  useEffect(() => {
    let mounted = true;

    setLoading(true);
    void agentApi
      .getConversations()
      .then((items) => {
        if (mounted) setWorkspaces(items);
      })
      .catch(() => {
        if (mounted) setWorkspaces([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const visibleWorkspaces = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return workspaces;

    return workspaces.filter((workspace) =>
      (workspace.title || "Untitled workspace")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [query, workspaces]);

  const startDesign = () => {
    setConversationId(null);
    setMessages([]);
    setDraftText(prompt.trim());
    navigate("/chat");
  };

  const openWorkspace = (workspace: ConversationSummary) => {
    setConversationId(workspace.id);
    setDraftText("");
    navigate("/chat");
  };

  return (
    <main className="workspace-home-page">
      <section className="workspace-home-start">
        <div className="workspace-home-heading">
          <span>Script to Canvas</span>
          <h1>Start designing</h1>
        </div>

        <form
          className="workspace-home-input-panel"
          onSubmit={(event) => {
            event.preventDefault();
            startDesign();
          }}
        >
          <button type="button" className="icon-action-button" title="Add attachment">
            <Paperclip size={20} strokeWidth={2.5} />
          </button>
          <Search size={20} className="search-indicator-icon" />
          <textarea
            aria-label="Start design prompt"
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Describe the scene, story, shot, style, or visual concept you want to design..."
            value={prompt}
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (prompt.trim()) startDesign();
              }
            }}
          />
          <button type="submit" className="submit-action-button" disabled={!prompt.trim()}>
            <ArrowRight size={18} strokeWidth={2.5} />
          </button>
        </form>
      </section>

      <section className="workspace-home-history">
        <div className="workspace-history-container">
          <div className="workspace-history-topbar">
            <div>
              <span>Previous workspace</span>
              <h2>Recent work</h2>
            </div>
            <label className="workspace-history-search">
              <Search size={15} />
              <input
                aria-label="Search previous workspaces"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search"
                value={query}
              />
            </label>
          </div>

          {loading ? (
            <div className="workspace-home-empty">Loading workspace...</div>
          ) : visibleWorkspaces.length === 0 ? (
            <div className="workspace-home-empty">
              <Plus size={18} />
              <span>No previous workspace yet.</span>
            </div>
          ) : (
            <div className="workspace-card-grid">
              {visibleWorkspaces.map((workspace) => (
                <button
                  className="workspace-card"
                  key={workspace.id}
                  onClick={() => openWorkspace(workspace)}
                  type="button"
                >
                  <span className="workspace-card-kicker">Workspace</span>
                  <strong>{workspace.title || "Untitled workspace"}</strong>
                  <small>
                    <Clock3 size={13} />
                    {formatWorkspaceDate(workspace.updated_at || workspace.created_at)}
                  </small>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
