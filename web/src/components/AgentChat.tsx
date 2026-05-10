import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, History, PanelRightClose, Plus, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { useChat } from "@/hooks/useChat";
import { useWorkspaceStore } from "@/store/workspace";
import MessageInput from "@/components/MessageInput";
import "./AgentChat.css";

const ATTACHMENT_NODE_ID = "global-attachments-container";

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
          className="absolute right-5 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-2 p-3 rounded-[32px] glass-effect pointer-events-auto group"
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
          <div className="flex flex-col h-full w-full overflow-hidden rounded-[32px] glass-effect">
            <header className="flex items-center justify-between py-5 px-6 border-b border-black/5">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Agent Active
                </span>
                <h1 className="m-0 font-display text-xl font-extrabold tracking-tight">
                  {conversationId ? "Conversation" : "New Chat"}
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-black/5 hover:text-on-surface"
                  onClick={() => setShowConversations(!showConversations)}
                  title="History"
                >
                  <History size={16} />
                </button>
                <button
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-black/5 hover:text-on-surface"
                  onClick={toggleCollapse}
                  title="Collapse"
                >
                  <PanelRightClose size={16} />
                </button>
              </div>
            </header>

            {showConversations && (
              <div className="absolute left-[18px] right-[18px] top-20 z-20 max-height-[280px] overflow-y-auto rounded-2xl p-2 glass-effect">
                <button
                  className="flex w-full items-center gap-2 rounded-xl bg-transparent py-2.5 px-3 text-left text-sm font-semibold transition-colors hover:bg-black/5"
                  onClick={newConversation}
                >
                  <Plus size={14} /> New conversation
                </button>
                {conversations.map((c) => (
                  <button
                    key={c.id}
                    className="flex w-full items-center gap-3 rounded-xl bg-transparent py-2.5 px-3 text-left text-sm transition-colors hover:bg-black/5"
                    onClick={() => switchConversation(c.id)}
                  >
                    <span className="truncate">{c.title || "Untitled"}</span>
                  </button>
                ))}
              </div>
            )}

            <div
              className="flex-1 overflow-y-auto p-6 scrollbar-hide"
              ref={bodyRef}
            >
              {messages.length === 0 ? (
                <div className="grid h-full place-items-center p-6 text-center text-sm leading-relaxed text-on-surface-variant opacity-60">
                  Start a conversation with the agent.
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={`mb-6 max-w-[90%] group ${m.role === "user" ? "ml-auto" : ""}`}
                    >
                      <div
                        className={`message-bubble animate-in fade-in slide-in-from-bottom-2 duration-300 ${m.role === "user" ? "is-user" : "is-assistant"}`}
                      >
                        {m.streaming && !m.content ? (
                          <div className="thinking-indicator">
                            <span />
                            <span />
                            <span />
                          </div>
                        ) : (
                          <div className="whitespace-pre-wrap break-words">
                            {m.content}
                            {m.streaming && <span className="cursor-blink" />}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <footer className="px-2 pb-4 pt-2">
              <MessageInput
                selectedModelId={selectedModelId}
                onSelectedModelChange={setSelectedModelId}
                onSend={onSend}
                onTextChange={setDraftText}
                text={draftText}
                disabled={isSending}
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
