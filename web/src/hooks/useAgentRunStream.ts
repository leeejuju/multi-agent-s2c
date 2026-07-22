import { useEffect, useState } from "react";

import {
  subscribeAgentRunEvents,
  type AgentRunEvent,
  type AgentRunResponse,
} from "@/api/agent";

type TextUpdate =
  | { mode: "append"; text: string }
  | { mode: "replace"; text: string };

export type AgentToolActivity = {
  error?: string;
  id: string;
  name: string;
  query?: string;
  resultCount?: number;
  status: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getTextUpdate(event: AgentRunEvent): TextUpdate | null {
  if (event.type !== "messages") return null;
  const protocolEvent = asRecord(
    Array.isArray(event.payload) ? event.payload[0] : event.payload,
  );
  if (!protocolEvent) return null;

  if (protocolEvent.event === "content-block-delta") {
    const delta = asRecord(protocolEvent.delta);
    return typeof delta?.text === "string"
      ? { mode: "append", text: delta.text }
      : null;
  }

  if (protocolEvent.event === "content-block-finish") {
    const content = asRecord(protocolEvent.content);
    return typeof content?.text === "string"
      ? { mode: "replace", text: content.text }
      : null;
  }

  return null;
}

function getToolActivities(event: AgentRunEvent): AgentToolActivity[] {
  if (event.type !== "values") return [];
  const graphState = asRecord(
    Array.isArray(event.payload) ? event.payload[0] : event.payload,
  );
  const activities = asRecord(graphState?.tool_activities);
  if (!activities) return [];

  return Object.entries(activities).flatMap(([key, value]) => {
    const activity = asRecord(value);
    if (!activity) return [];

    const id =
      typeof activity.tool_call_id === "string" ? activity.tool_call_id : key;
    const name =
      typeof activity.tool_name === "string" ? activity.tool_name : "工具";
    const status =
      typeof activity.status === "string" ? activity.status : "running";

    return [
      {
        id,
        name,
        status,
        ...(typeof activity.query === "string"
          ? { query: activity.query }
          : {}),
        ...(typeof activity.result_count === "number"
          ? { resultCount: activity.result_count }
          : {}),
        ...(typeof activity.error === "string"
          ? { error: activity.error }
          : {}),
      },
    ];
  });
}

export function useAgentRunStream(run?: AgentRunResponse) {
  const runId = run?.run_id ?? null;
  const [assistantState, setAssistantState] = useState({
    content: "",
    runId,
  });
  const assistantContent =
    assistantState.runId === runId ? assistantState.content : "";
  const [runStatus, setRunStatus] = useState(run?.status ?? "idle");
  const [streamError, setStreamError] = useState<string | null>(null);
  const [toolActivities, setToolActivities] = useState<AgentToolActivity[]>([]);

  useEffect(() => {
    setAssistantState({ content: "", runId });
    setRunStatus(run?.status ?? "idle");
    setStreamError(null);
    setToolActivities([]);
    if (!run?.stream_url) return;

    const controller = new AbortController();
    void subscribeAgentRunEvents(run.stream_url, {
      signal: controller.signal,
      onEvent: ({ data }) => {
        const textUpdate = getTextUpdate(data);
        if (textUpdate) {
          setAssistantState((current) => ({
            content:
              textUpdate.mode === "append"
                ? (current.runId === runId ? current.content : "") +
                  textUpdate.text
                : textUpdate.text,
            runId,
          }));
          setRunStatus("running");
        }

        const activityUpdates = getToolActivities(data);
        if (activityUpdates.length > 0) {
          setToolActivities((current) => {
            const merged = new Map(
              current.map((activity) => [activity.id, activity]),
            );
            for (const activity of activityUpdates) {
              merged.set(activity.id, activity);
            }
            return [...merged.values()];
          });
        }

        if (data.type === "status" && data.status === "running") {
          setRunStatus("running");
        }
        if (data.type === "end") {
          if (data.status === "completed") setRunStatus("completed");
          if (data.status === "cancelled") setRunStatus("cancelled");
          if (data.status === "failed") {
            setRunStatus("failed");
            setStreamError(data.error || "Agent Run 执行失败");
          }
        }
      },
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      setStreamError(
        error instanceof Error ? error.message : "Agent Run 事件流读取失败",
      );
    });

    return () => controller.abort();
  }, [run?.status, run?.stream_url, runId]);

  return {
    assistantContent,
    isStreaming:
      Boolean(run?.stream_url) &&
      streamError === null &&
      !["completed", "failed", "cancelled"].includes(runStatus),
    runStatus,
    streamError,
    toolActivities,
  };
}
