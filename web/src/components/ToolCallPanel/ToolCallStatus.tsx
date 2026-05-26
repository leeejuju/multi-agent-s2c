import {
  AlertCircle,
  CheckCircle2,
  Database,
  FileSearch,
  FileText,
  Globe2,
  Image,
  Loader2,
  Search,
  Wrench,
} from "lucide-react";
import type { ComponentType } from "react";

import type { ToolActivity } from "@/hooks/useChat";

type Props = {
  activity: ToolActivity;
};

type StatusKind =
  | "document"
  | "generic"
  | "image"
  | "knowledge"
  | "local"
  | "search"
  | "web";

type StatusKindInfo = {
  detailLabel: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  kind: StatusKind;
  label: string;
};

function scopeText(scope?: string | string[]) {
  return Array.isArray(scope) ? scope.join(" ") : scope || "";
}

function getRawText(activity: ToolActivity) {
  return [
    activity.name,
    activity.source,
    scopeText(activity.searchScope),
    activity.title,
    activity.query,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getStatusKind(activity: ToolActivity): StatusKindInfo {
  const source = (activity.source || "").toLowerCase();
  const raw = getRawText(activity);

  if (source.includes("web") || raw.includes("web") || raw.includes("tavily")) {
    return {
      detailLabel: "Network reference",
      icon: Globe2,
      kind: "web",
      label: "Web search",
    };
  }
  if (
    source.includes("image") ||
    raw.includes("image") ||
    raw.includes("vision") ||
    raw.includes("visual") ||
    raw.includes("layout")
  ) {
    return {
      detailLabel: "Visual context",
      icon: Image,
      kind: "image",
      label: "Image analysis",
    };
  }
  if (
    source.includes("document") ||
    source.includes("doc") ||
    raw.includes("document") ||
    raw.includes("docling") ||
    raw.includes("pdf") ||
    raw.includes("docx") ||
    raw.includes("parse")
  ) {
    return {
      detailLabel: "Document context",
      icon: FileText,
      kind: "document",
      label: "Document analysis",
    };
  }
  if (
    source.includes("knowledge") ||
    source.includes("rag") ||
    raw.includes("knowledge") ||
    raw.includes("rag")
  ) {
    return {
      detailLabel: "Knowledge base",
      icon: Database,
      kind: "knowledge",
      label: "Knowledge search",
    };
  }
  if (source.includes("local") || raw.includes("local_file") || raw.includes("local file")) {
    return {
      detailLabel: "Local reference",
      icon: FileSearch,
      kind: "local",
      label: "Local file search",
    };
  }
  if (raw.includes("search") || raw.includes("reference")) {
    return {
      detailLabel: "Reference lookup",
      icon: Search,
      kind: "search",
      label: "Reference search",
    };
  }
  return {
    detailLabel: "Tool call",
    icon: Wrench,
    kind: "generic",
    label: activity.title || activity.name,
  };
}

function getTone(status: ToolActivity["status"]) {
  if (status === "failed") return "failed";
  if (
    status === "analyzed" ||
    status === "completed" ||
    status === "parsed" ||
    status === "searched" ||
    status === "uploaded"
  ) {
    return "done";
  }
  return "active";
}

function getStatusCopy(activity: ToolActivity) {
  const kind = getStatusKind(activity);
  const tone = getTone(activity.status);

  if (tone === "failed") {
    return `${kind.label} failed`;
  }
  if (tone === "done") {
    return `${kind.label} complete`;
  }

  if (activity.status === "uploading") return `Uploading ${kind.detailLabel}`;
  if (activity.status === "parsing") return `Parsing ${kind.detailLabel}`;
  if (activity.status === "analyzing") return `Analyzing ${kind.detailLabel}`;
  if (activity.status === "searching") return `Searching ${kind.detailLabel}`;
  return activity.title || `Running ${kind.label}`;
}

export default function ToolCallStatus({ activity }: Props) {
  const kind = getStatusKind(activity);
  const tone = getTone(activity.status);
  const Icon = tone === "failed" ? AlertCircle : kind.icon;

  return (
    <div className={`tool-call-status is-${activity.status} is-kind-${kind.kind}`}>
      <span className="tool-call-status-icon">
        <Icon size={14} />
        {tone === "active" && (
          <Loader2 className="tool-call-status-spinner" size={9} />
        )}
        {tone === "done" && (
          <CheckCircle2 className="tool-call-status-check" size={10} />
        )}
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
