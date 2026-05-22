import { AlertCircle, CheckCircle2, Loader2, Search, Wrench } from "lucide-react";

import type { ToolActivity } from "@/hooks/useChat";

type Props = {
  activity: ToolActivity;
};

function normalizeScope(scope?: string | string[]) {
  if (Array.isArray(scope)) {
    const label = scope.filter(Boolean).join(" / ");
    return label || "References";
  }
  return scope || "References";
}

function isSearchActivity(activity: ToolActivity) {
  const raw = `${activity.name} ${activity.source || ""} ${activity.query || ""}`.toLowerCase();
  return (
    raw.includes("search") ||
    raw.includes("reference") ||
    raw.includes("web") ||
    raw.includes("tavily") ||
    raw.includes("local") ||
    raw.includes("knowledge") ||
    raw.includes("rag")
  );
}

function inferScope(activity: ToolActivity) {
  if (activity.searchScope) return activity.searchScope;

  const raw = `${activity.name} ${activity.source || ""} ${activity.query || ""}`.toLowerCase();
  const scopes: string[] = [];
  if (raw.includes("web") || raw.includes("tavily")) scopes.push("Web");
  if (raw.includes("local") || raw.includes("file")) scopes.push("Local");
  if (raw.includes("knowledge") || raw.includes("rag")) scopes.push("Knowledge");
  if (raw.includes("search") || raw.includes("reference")) scopes.push("References");
  return scopes.length ? scopes : undefined;
}

function getStatusCopy(activity: ToolActivity) {
  const search = isSearchActivity(activity);
  const scope = normalizeScope(inferScope(activity));

  if (activity.status === "failed") {
    return search ? `Search failed: ${scope}` : `Failed ${activity.name}`;
  }
  if (activity.status === "completed" || activity.status === "searched") {
    return search ? `Searched ${scope}` : `Done ${activity.name}`;
  }
  return search ? `Searching ${scope}...` : activity.title || `Doing ${activity.name}...`;
}

export default function ToolCallStatus({ activity }: Props) {
  const active =
    activity.status === "started" ||
    activity.status === "updated" ||
    activity.status === "searching";
  const failed = activity.status === "failed";
  const done = activity.status === "completed" || activity.status === "searched";
  const Icon = failed ? AlertCircle : done ? CheckCircle2 : isSearchActivity(activity) ? Search : Wrench;

  return (
    <div className={`tool-call-status is-${activity.status}`}>
      <span className="tool-call-status-icon">
        {active ? <Loader2 size={14} /> : <Icon size={14} />}
      </span>
      <span className="tool-call-status-copy">
        <span className="tool-call-status-title">{getStatusCopy(activity)}</span>
        <span className="tool-call-status-detail">
          {activity.query || activity.title || activity.name}
        </span>
      </span>
      {typeof activity.resultCount === "number" && (
        <span className="tool-call-status-count">
          {activity.resultCount} {activity.resultCount === 1 ? "result" : "results"}
        </span>
      )}
    </div>
  );
}
