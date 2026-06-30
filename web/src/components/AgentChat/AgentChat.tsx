import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, History, PanelRightClose, Plus } from "lucide-react";
import { Button, List, Popover } from "antd";
import { AnimatePresence, motion } from "motion/react";

import { useChat, type ChatMessage } from "@/hooks/useChat";
import { useWorkspaceStore, type CanvasImageItem } from "@/store/workspace";
import MessageInput from "@/components/MessageInput";
import ChatMessageRow from "./components/ChatMessageRow/ChatMessageRow";

const CANVAS_IMAGE_EXTENSIONS = new Set(["bmp", "gif", "jpeg", "jpg", "png", "svg", "webp"]);
const MARKDOWN_IMAGE_PATTERN = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
const HTML_IMAGE_PATTERN = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
const RAW_IMAGE_URL_PATTERN = /\bhttps?:\/\/[^\s<>"')]+?\.(?:bmp|gif|jpe?g|png|svg|webp)(?:\?[^\s<>"')]+)?/gi;
const AUTO_SCROLL_THRESHOLD = 96;

type AgentChatProps = {
  docked?: boolean;
};

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

export default function AgentChat({ docked = false }: AgentChatProps) {
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
    const file = attachments[index]?.file;
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
      {!docked && isCollapsed ? (
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
          <span className="mt-1.5 text-[0.9rem] font-semibold text-on-surface-variant transition-colors [writing-mode:vertical-lr] group-hover:text-on-surface">
            {isSending ? "进行中" : "对话"}
          </span>
        </motion.button>
      ) : (
        <motion.aside
          key="expanded"
          className={
            docked
              ? "relative z-0 flex h-[min(74vh,760px)] min-h-[540px] w-full max-w-[420px] flex-col pointer-events-auto max-[1120px]:max-w-none"
              : "absolute right-4 top-3 bottom-3 z-40 flex w-[420px] flex-col pointer-events-auto"
          }
          initial={docked ? { y: 16, opacity: 0 } : { x: 500, opacity: 0 }}
          animate={docked ? { y: 0, opacity: 1 } : { x: 0, opacity: 1 }}
          exit={docked ? { y: 16, opacity: 0 } : { x: 500, opacity: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 24 }}
        >
          <div className="glass-effect flex h-full w-full flex-col overflow-hidden rounded-[18px] border border-border-strong ring-1 ring-border-strong">
            <header className="flex items-center justify-between border-border px-5 py-4">
              <div className="flex flex-col">
                <h1 className="m-0 text-[1.12rem] font-semibold tracking-tight">
                  {conversationId ? "剧本对话" : "新对话"}
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
                        新对话
                      </Button>
                      <List
                        dataSource={conversations}
                        locale={{ emptyText: "暂无对话" }}
                        renderItem={(conversation) => (
                          <List.Item className="!px-0 !py-1">
                            <Button
                              block
                              className="justify-start text-left"
                              onClick={() => switchConversation(conversation.id)}
                              type="text"
                            >
                              <span className="truncate">
                                {conversation.title || "未命名"}
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
                    title="历史"
                    type="text"
                  />
                </Popover>
                {!docked ? (
                  <Button
                    icon={<PanelRightClose size={15} />}
                    onClick={toggleCollapse}
                    title="收起"
                    type="text"
                  />
                ) : null}
              </div>
            </header>

            <div
              className="scrollbar-hide flex-1 overflow-y-auto px-5 py-4"
              ref={bodyRef}
            >
              {messages.length === 0 ? (
                <div className="grid h-full place-items-center p-4 text-center text-[1rem] font-medium leading-relaxed text-on-surface-variant">
                  开始对话
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

            <footer className="px-3 pb-3 pt-2">
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
