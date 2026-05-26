import { useCallback, useEffect, useRef, useState } from "react";
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
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { useChat, type ChatMessageAttachment } from "@/hooks/useChat";
import { useWorkspaceStore } from "@/store/workspace";
import MessageInput from "@/components/MessageInput";
import ToolCallPanel from "@/components/ToolCallPanel";
import "./AgentChat.css";

const ATTACHMENT_NODE_ID = "global-attachments-container";

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

export default function AgentChat() {
  const bodyRef = useRef<HTMLDivElement | null>(null);

  const [isCollapsed, setIsCollapsed] = useState(false);
  const { nodes, addNode, removeNode } = useWorkspaceStore();

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
    setAttachments,
  } = useChat();

  // Sync workspace node count with local attachments state
  useEffect(() => {
    const attachmentNode = nodes.find((n) => n.id === ATTACHMENT_NODE_ID);
    
    // If node exists but attachments are empty, remove node
    if (attachmentNode && attachments.length === 0) {
      removeNode(ATTACHMENT_NODE_ID);
    } 
    // If node is missing but attachments exist, it was probably deleted from canvas
    else if (!attachmentNode && attachments.length > 0) {
      setAttachments([]);
    }
    // Update count if it changed
    else if (attachmentNode && attachmentNode.count !== attachments.length) {
      const { updateNode } = useWorkspaceStore.getState();
      updateNode(ATTACHMENT_NODE_ID, { count: attachments.length });
    }
  }, [nodes, attachments.length, removeNode, setAttachments]);

  const scrollToBottom = useCallback(() => {
    window.requestAnimationFrame(() => {
      const body = bodyRef.current;
      if (body) {
        body.scrollTop = body.scrollHeight;
      }
    });
  }, []);

  const onSend = () => handleSend(scrollToBottom);

  const handleFileSelect = (files: File[]) => {
    addAttachments(files);

    // Ensure unified attachment container exists on workspace
    const existingNode = nodes.find(n => n.id === ATTACHMENT_NODE_ID);
    if (!existingNode) {
      addNode({
        id: ATTACHMENT_NODE_ID,
        type: "attachment",
        x: 400,
        y: 300,
        width: 200,
        height: 72,
        count: files.length,
      });
    } else {
      const { updateNode } = useWorkspaceStore.getState();
      updateNode(ATTACHMENT_NODE_ID, { count: attachments.length + files.length });
    }
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
          className="absolute right-5 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-2 p-3 rounded-[32px] glass-effect border border-[#b8b8b8] ring-1 ring-[#b8b8b8] pointer-events-auto group"
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 100, opacity: 0 }}
          onClick={toggleCollapse}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
          <div className="relative">
            <Bot size={24} className="text-on-surface" />
            {isSending && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-on-surface opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-on-surface" />
              </span>
            )}
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant [writing-mode:vertical-lr] mt-2 group-hover:text-on-surface transition-colors">
            {isSending ? "Active" : "Chat"}
          </span>
        </motion.button>
      ) : (
        <motion.aside
          key="expanded"
          className="absolute right-5 top-2 bottom-2 z-40 w-[500px] flex flex-col pointer-events-auto"
          initial={{ x: 500, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 500, opacity: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 24 }}
        >
          <div className="flex flex-col h-full w-full overflow-hidden rounded-[32px] glass-effect border border-[#b8b8b8] ring-1 ring-[#b8b8b8]">
            <header className="flex items-center justify-between py-5 px-6 border-b border-black/5">
              <div className="flex flex-col">
                <h1 className="m-0 font-display text-xl font-extrabold tracking-tight">
                  {conversationId ? "Conversation" : "New Chat"}
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <Popover
                  arrow={false}
                  content={
                    <div className="w-[360px]">
                      <Button
                        block
                        className="mb-2 justify-start"
                        icon={<Plus size={14} />}
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
                    icon={<History size={16} />}
                    title="History"
                    type="text"
                  />
                </Popover>
                <Button
                  icon={<PanelRightClose size={16} />}
                  onClick={toggleCollapse}
                  title="Collapse"
                  type="text"
                />
              </div>
            </header>

            <div
              className="flex-1 overflow-y-auto p-6 scrollbar-hide"
              ref={bodyRef}
            >
              {messages.length === 0 ? (
                <div className="grid h-full place-items-center p-6 text-center text-sm leading-relaxed text-on-surface-variant opacity-60">
                  Start a conversation with the agent.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {messages.map((m, i) => {
                    const isCompactUserMessage =
                      m.role === "user" &&
                      m.content.length <= 80 &&
                      !m.content.includes("\n");
                    const hasContent = m.content.trim().length > 0;
                    return (
                    <div
                      key={i}
                      className={`message-row group ${m.role === "user" ? "is-user" : "is-assistant"}`}
                    >
                      <div className={`message-stack ${m.role === "user" ? "is-user" : "is-assistant"}`}>
                        {m.attachments && m.attachments.length > 0 && (
                          <MessageAttachments attachments={m.attachments} />
                        )}
                        {(m.toolActivities && m.toolActivities.length > 0) ||
                        m.streaming ||
                        hasContent ? (
                          <div
                            className={`message-bubble animate-in fade-in slide-in-from-bottom-2 duration-300 ${m.role === "user" ? "is-user" : "is-assistant"} ${isCompactUserMessage ? "is-compact" : ""}`}
                          >
                            {m.toolActivities && m.toolActivities.length > 0 && (
                              <ToolCallPanel activities={m.toolActivities} />
                            )}
                            {m.streaming &&
                            !m.content &&
                            (!m.toolActivities || m.toolActivities.length === 0) ? (
                              <div className="thinking-indicator">
                                <span />
                                <span />
                                <span />
                              </div>
                            ) : hasContent ? (
                              <div className={m.role === "assistant" ? "markdown-body break-words" : "whitespace-pre-wrap break-words"}>
                                {m.role === "assistant" ? (
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {m.content}
                                  </ReactMarkdown>
                                ) : (
                                  m.content
                                )}
                                {m.streaming && <span className="cursor-blink" />}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>

            <footer className="px-[5px] pb-[5px] pt-2">
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
                onRemoveAttachment={removeAttachment}
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
