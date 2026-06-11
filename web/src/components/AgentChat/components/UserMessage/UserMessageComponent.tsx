import { type ChatMessage } from "@/hooks/useChat";

import MessageAttachments from "../MessageAttachments/MessageAttachments";
import "./UserMessageComponent.css";

type UserMessageComponentProps = {
  message: ChatMessage;
};

export default function UserMessageComponent({ message }: UserMessageComponentProps) {
  const hasContent = message.content.trim().length > 0;
  const hasAttachments = (message.attachments?.length ?? 0) > 0;
  const compactClass = hasContent ? "" : "is-compact";

  return (
    <>
      {hasAttachments ? (
        <MessageAttachments attachments={message.attachments ?? []} />
      ) : null}
      {hasContent ? (
        <div className={`message-bubble is-user ${compactClass}`.trim()}>
          {message.content}
        </div>
      ) : null}
    </>
  );
}
