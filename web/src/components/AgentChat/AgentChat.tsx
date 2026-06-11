import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  Bot,
  Download,
  FileText,
  History,
  Image as ImageIcon,
  Loader2,
  PanelRightClose,
  Plus,
} from "lucide-react";
import { Button, List, Popover } from "antd";
import { AnimatePresence, motion } from "motion/react";

import { useChat, type ChatMessage, type ChatMessageAttachment } from "@/hooks/useChat";
import { useWorkspaceStore, type CanvasImageItem } from "@/store/workspace";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import MessageInput from "@/components/MessageInput";
import SmoothStreamingText from "./SmoothStreamingText";
import ToolCallPanel from "@/components/ToolCallPanel";
import "./AgentChat.css";

const CANVAS_IMAGE_EXTENSIONS = new Set(["bmp", "gif", "jpeg", "jpg", "png", "svg", "webp"]);
const MARKDOWN_IMAGE_PATTERN = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
const HTML_IMAGE_PATTERN = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
const RAW_IMAGE_URL_PATTERN = /\bhttps?:\/\/[^\s<>"')]+?\.(?:bmp|gif|jpe?g|png|svg|webp)(?:\?[^\s<>"')]+)?/gi;
const AUTO_SCROLL_THRESHOLD = 96;

function formatAttachmentSize(size?: number | null) {
  if (!size) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function isImageAttachment(attachment: ChatMessageAttachment) {
  return (
    attachment.category === "image" ||
    attachment.content_type.startsWith("image/")
  );
}

function getFileExtension(file: File) {
  return file.name.split(".").pop()?.toLowerCase() || "";
}

function isCanvasImageFile(file: File) {
  return file.type.startsWith("image/") || CANVAS_IMAGE_EXTENSIONS.has(getFileExtension(file));
}

function getUploadImageId(file: File) {
  return `upload-${file.name}-${file.size}-${file.lastModified}`;
}

function createUploadImageItem(file: File): CanvasImageItem {
  const objectUrl = URL.createObjectURL(file);
  return {
    id: getUploadImageId(file),
    title: file.name || "Uploaded image",
    src: objectUrl,
    source: "upload",
    objectUrl,
    createdAt: file.lastModified || Date.now(),
  };
}

function normalizeGeneratedImageUrl(url: string) {
  return url.trim().replace(/^["'<]+|[>"')]+$/g, "");
}

function hashText(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function createGeneratedImageItem(url: string, title: string): CanvasImageItem {
  const src = normalizeGeneratedImageUrl(url);
  return {
    id: `generated-${hashText(src)}`,
    title: title || "Generated image",
    src,
    source: "generated",
    createdAt: Date.now(),
  };
}

function extractGeneratedImages(content: string) {
  const images: CanvasImageItem[] = [];
  const seen = new Set<string>();
  const pushImage = (url: string, title: string) => {
    const item = createGeneratedImageItem(url, title);
    if (!item.src || seen.has(item.id)) return;
    seen.add(item.id);
    images.push(item);
  };

  for (const match of content.matchAll(MARKDOWN_IMAGE_PATTERN)) {
    pushImage(match[2], match[1] || "Generated image");
  }
  for (const match of content.matchAll(HTML_IMAGE_PATTERN)) {
    pushImage(match[1], "Generated image");
  }
  for (const match of content.matchAll(RAW_IMAGE_URL_PATTERN)) {
    pushImage(match[0], "Generated image");
  }

  return images;
}

function getGeneratedImageScanKey(message: ChatMessage, index: number) {
  return message.id ?? `${index}-${hashText(message.content)}`;
}

function MessageAttachments({
  attachments,
}: {
  attachments: ChatMessageAttachment[];
}) {
  if (attachments.length === 0) return null;

  return (
    <div className={`message-attachments ${attachments.length === 1 ? "is-single" : ""}`}>
      {attachments.map((attachment) => {
        const isImage = isImageAttachment(attachment);
        const href = attachment.access_url;
        const previewUrl = attachment.thumb_url || attachment.access_url;
        const Icon = isImage ? ImageIcon : FileText;
        const statusText = attachment.uploading
          ? "Uploading"
          : attachment.error || attachment.parse_error || formatAttachmentSize(attachment.file_size);

        return (
          <a
            className={`message-attachment ${attachment.uploading ? "is-uploading" : ""} ${attachment.error ? "is-error" : ""}`}
            href={href}
            key={attachment.id}
            rel="noreferrer"
            target="_blank"
            title={href || attachment.file_name}
          >
            <span className="message-attachment-thumb">
              {isImage && previewUrl ? (
                <img alt={attachment.file_name} src={previewUrl} />
              ) : (
                <Icon size={16} />
              )}
              {attachment.uploading && (
                <Loader2 className="message-attachment-spinner" size={11} />
              )}
            </span>
            <span className="message-attachment-copy">
              <span className="message-attachment-name">
                {attachment.file_name}
              </span>
              {statusText && (
                <span className="message-attachment-meta">{statusText}</span>
              )}
            </span>
            {href && !attachment.uploading && (
              <Download className="message-attachment-download" size={14} />
            )}
          </a>
        );
      })}
    </div>
  );
}

type ChatMessageRowProps = {
  message: ChatMessage;
};

const ChatMessageRow = memo(function ChatMessageRow({
  message,
}: ChatMessageRowProps) {
  const [settledAssistantContent, setSettledAssistantContent] = useState(() =>
    message.role === "assistant" && !message.streaming ? message.content : "",
  );
  const isCompactUserMessage =
    message.role === "user" &&
    message.content.length <= 80 &&
    !message.content.includes("\n");
  const hasContent = message.content.trim().length > 0;
  const isAssistantRevealing =
    message.role === "assistant" &&
    (message.streaming || settledAssistantContent !== message.content);
  const handleAssistantRevealSettled = useCallback(() => {
    setSettledAssistantContent(message.content);
  }, [message.content]);

  return (
    <div
      className={`message-row group ${message.role === "user" ? "is-user" : "is-assistant"}`}
    >
      <div className={`message-stack ${message.role === "user" ? "is-user" : "is-assistant"}`}>
        {message.attachments && message.attachments.length > 0 && (
          <MessageAttachments attachments={message.attachments} />
        )}
        {(message.toolActivities && message.toolActivities.length > 0) ||
        message.streaming ||
        hasContent ? (
          <div
            className={`message-bubble animate-in fade-in slide-in-from-bottom-2 duration-300 ${message.role === "user" ? "is-user" : "is-assistant"} ${isCompactUserMessage ? "is-compact" : ""}`}
          >
            {message.toolActivities && message.toolActivities.length > 0 && (
              <ToolCallPanel activities={message.toolActivities} />
            )}
            {message.streaming &&
            !message.content &&
            (!message.toolActivities || message.toolActivities.length === 0) ? (
              <div className="thinking-indicator">
                <span />
                <span />
                <span />
              </div>
            ) : hasContent ? (
              message.role === "assistant" ? (
                isAssistantRevealing ? (
                  <SmoothStreamingText
                    content={message.content}
                    onSettled={handleAssistantRevealSettled}
                  />
                ) : (
                  <MarkdownRenderer content={message.content} />
                )
              ) : (
                <div className="whitespace-pre-wrap break-words">
                  {message.content}
                </div>
              )
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
});

export default function AgentChat() {
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const syncedGeneratedImagesRef = useRef<Set<string>>(new Set());
  const scannedGeneratedMessagesRef = useRef<Set<string>>(new Set());

  const [isCollapsed, setIsCollapsed] = useState(false);
  const upsertImageContainer = useWorkspaceStore((state) => state.upsertImageContainer);
  const removeImageFromContainer = useWorkspaceStore((state) => state.removeImageFromContainer);

  const {
    draftText,
    setDraftText,
    messages,
    selectedModelId,
    setSelectedModelId,
    conversationId,
    isSending,
    conversations,
    showConversations,
    setShowConversations,
    handleSend,
    stopSending,
    switchConversation,
    newConversation,
    attachments,
    addAttachments,
    removeAttachment,
  } = useChat();

  useEffect(() => {
    const nextImages: CanvasImageItem[] = [];
    messages.forEach((message, index) => {
      if (
        message.role !== "assistant" ||
        !message.content ||
        message.streaming ||
        message.status === "pending" ||
        message.status === "streaming"
      ) {
        return;
      }

      const scanKey = getGeneratedImageScanKey(message, index);
      if (scannedGeneratedMessagesRef.current.has(scanKey)) return;
      scannedGeneratedMessagesRef.current.add(scanKey);

      extractGeneratedImages(message.content).forEach((image) => {
        if (syncedGeneratedImagesRef.current.has(image.id)) return;
        syncedGeneratedImagesRef.current.add(image.id);
        nextImages.push(image);
      });
    });
    if (nextImages.length > 0) {
      upsertImageContainer(nextImages);
    }
  }, [messages, upsertImageContainer]);

  const scrollToBottom = useCallback((options: { force?: boolean } = {}) => {
    const body = bodyRef.current;
    if (!body) return;

    const distanceFromBottom = body.scrollHeight - body.scrollTop - body.clientHeight;
    if (!options.force && distanceFromBottom > AUTO_SCROLL_THRESHOLD) {
      return;
    }

    if (scrollFrameRef.current !== null) {
      return;
    }

    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      const body = bodyRef.current;
      if (body) {
        body.scrollTop = body.scrollHeight;
      }
    });
  }, []);

  useEffect(
    () => () => {
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
        scrollFrameRef.current = null;
      }
    },
    [],
  );

  const onSend = () => handleSend(scrollToBottom);

  const handleFileSelect = (files: File[]) => {
    addAttachments(files);

    const imageItems = files.filter(isCanvasImageFile).map(createUploadImageItem);
    if (imageItems.length > 0) {
      upsertImageContainer(imageItems);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    const file = attachments[index];
    if (file && isCanvasImageFile(file)) {
      removeImageFromContainer(getUploadImageId(file));
    }
    removeAttachment(index);
  };

  const toggleCollapse = () => {
    if (!isCollapsed) setShowConversations(false);
    setIsCollapsed(!isCollapsed);
  };

  return (
    <AnimatePresence mode="wait">
      {isCollapsed ? (
        <motion.button
          key="collapsed"
          aria-label="Expand chat"
          className="absolute right-4 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-1.5 rounded-[18px] border border-border-strong p-2 ring-1 ring-border-strong glass-effect pointer-events-auto group"
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 100, opacity: 0 }}
          onClick={toggleCollapse}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
          <div className="relative">
            <Bot size={20} className="text-on-surface" />
            {isSending && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-on-surface opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-on-surface" />
              </span>
            )}
          </div>
          <span className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant transition-colors [writing-mode:vertical-lr] group-hover:text-on-surface">
            {isSending ? "Active" : "Chat"}
          </span>
        </motion.button>
      ) : (
        <motion.aside
          key="expanded"
          className="absolute right-4 top-3 bottom-3 z-40 flex w-[420px] flex-col pointer-events-auto"
          initial={{ x: 500, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 500, opacity: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 24 }}
        >
          <div className="glass-effect flex h-full w-full flex-col overflow-hidden rounded-[18px] border border-border-strong ring-1 ring-border-strong">
            <header className="flex items-center justify-between border-border px-4 py-3">
              <div className="flex flex-col">
                <h1 className="m-0 text-[15px] font-medium tracking-tight">
                  {conversationId ? "Conversation" : "New Chat"}
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <Popover
                  arrow={false}
                  content={
                    <div className="w-[320px]">
                      <Button
                        block
                        className="mb-2 justify-start"
                        icon={<Plus size={13} />}
                        onClick={newConversation}
                        type="text"
                      >
                        New conversation
                      </Button>
                      <List
                        dataSource={conversations}
                        locale={{ emptyText: "No conversations" }}
                        renderItem={(conversation) => (
                          <List.Item className="!px-0 !py-1">
                            <Button
                              block
                              className="justify-start text-left"
                              onClick={() => switchConversation(conversation.id)}
                              type="text"
                            >
                              <span className="truncate">
                                {conversation.title || "Untitled"}
                              </span>
                            </Button>
                          </List.Item>
                        )}
                        size="small"
                      />
                    </div>
                  }
                  onOpenChange={setShowConversations}
                  open={showConversations}
                  placement="bottomRight"
                  trigger="click"
                >
                  <Button
                    icon={<History size={15} />}
                    title="History"
                    type="text"
                  />
                </Popover>
                <Button
                  icon={<PanelRightClose size={15} />}
                  onClick={toggleCollapse}
                  title="Collapse"
                  type="text"
                />
              </div>
            </header>

            <div
              className="scrollbar-hide flex-1 overflow-y-auto p-4"
              ref={bodyRef}
            >
              {messages.length === 0 ? (
                <div className="grid h-full place-items-center p-4 text-center text-[12px] leading-relaxed text-on-surface-variant opacity-60">
                  Start a conversation with the agent.
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {messages.map((message, index) => (
                    <ChatMessageRow
                      key={message.id ?? index}
                      message={message}
                    />
                  ))}
                </div>
              )}
            </div>

            <footer className="px-1.5 pb-1.5 pt-1">
              <MessageInput
                selectedModelId={selectedModelId}
                onSelectedModelChange={setSelectedModelId}
                onSend={onSend}
                onStop={stopSending}
                onTextChange={setDraftText}
                text={draftText}
                sending={isSending}
                attachments={attachments}
                images={[]}
                onClickAttachment={() => {}} // This is now handled internally by MessageInput with a hidden file input
                onRemoveAttachment={handleRemoveAttachment}
                onRemoveImage={() => {}}
                onFileSelect={handleFileSelect}
              />
            </footer>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
