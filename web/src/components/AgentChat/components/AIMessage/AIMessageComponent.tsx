import { type ChatMessage } from "@/hooks/useChat";
import MarkdownRenderer from "@/components/MarkdownRenderer/MarkdownRenderer";
import ToolCallPanel from "@/components/ToolCallPanel/ToolCallPanel";

import SmoothStreamingText from "../SmoothStreamingText/SmoothStreamingText";
import "./AIMessageComponent.css";

type AIMessageComponentProps = {
  message: ChatMessage;
};

export default function AIMessageComponent({ message }: AIMessageComponentProps) {
  const hasToolCalls = (message.toolActivities?.length ?? 0) > 0;
  const hasContent = message.content.trim().length > 0;
  const isStreaming =
    message.streaming || message.status === "streaming" || message.status === "pending";

  return (
    <>
      {hasToolCalls ? (
        <ToolCallPanel activities={message.toolActivities ?? []} />
      ) : null}
      {hasContent || isStreaming ? (
        <div className="message-bubble is-assistant">
          {isStreaming ? (
            <SmoothStreamingText content={message.content} className="markdown-body" />
          ) : (
            <MarkdownRenderer className="markdown-body" content={message.content} />
          )}
        </div>
      ) : (
        <div className="thinking-indicator" role="status" aria-live="polite">
          <span />
          <span />
          <span />
          Thinking...
        </div>
      )}
    </>
  );
}
