import { type ChatMessage } from "@/hooks/useChat";
import type { FC } from "react";

import AIMessageComponent from "../AIMessage/AIMessageComponent";
import UserMessageComponent from "../UserMessage/UserMessageComponent";
import "./ChatMessageRow.css";

type ChatMessageRowProps = {
  message: ChatMessage;
};

type MessageRenderer = FC<{ message: ChatMessage }>;

const MESSAGE_RENDERERS: Record<ChatMessage["role"], MessageRenderer> = {
  assistant: AIMessageComponent,
  user: UserMessageComponent,
};

export default function ChatMessageRow({ message }: ChatMessageRowProps) {
  const roleClass = message.role === "user" ? "is-user" : "is-assistant";
  const MessageRenderer = MESSAGE_RENDERERS[message.role];

  return (
    <div className={`message-row ${roleClass}`}>
      <div className={`message-stack ${roleClass}`}>
        <MessageRenderer message={message} />
      </div>
    </div>
  );
}
