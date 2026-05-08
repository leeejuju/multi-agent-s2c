import { useCallback, useRef } from "react";
import { History, Maximize2, Minimize2, Minus, Plus } from "lucide-react";
import { motion } from "motion/react";

import { useChat } from "@/hooks/useChat";
import MessageInput from "@/components/MessageInput";
import "./AgentChat.css";

export default function AgentChat() {
  const bodyRef = useRef<HTMLDivElement | null>(null);

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
  } = useChat();

  const scrollToBottom = useCallback(() => {
    window.requestAnimationFrame(() => {
      const body = bodyRef.current;
      if (body) {
        body.scrollTop = body.scrollHeight;
      }
    });
  }, []);

  const onSend = () => handleSend(scrollToBottom);

  return (
    <motion.aside
      className="absolute right-5 top-5 bottom-5 z-40 w-[400px] flex flex-col pointer-events-auto"
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 24 }}
    >
      <div className="flex flex-col h-full w-full overflow-hidden rounded-[32px] glass-effect">
        <header className="flex items-center justify-between py-5 px-6 border-b border-black/5">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Agent Active</span>
            <h1 className="m-0 font-display text-xl font-extrabold tracking-tight">
              {conversationId ? "Conversation" : "New Chat"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex h-7 w-7 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-black/5 hover:text-on-surface" onClick={() => setShowConversations(!showConversations)}>
              <History size={16} />
            </button>
            <button className="flex h-7 w-7 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-black/5 hover:text-on-surface"><Minimize2 size={16} /></button>
            <button className="flex h-7 w-7 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-black/5 hover:text-on-surface"><Maximize2 size={16} /></button>
            <button className="flex h-7 w-7 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-black/5 hover:text-on-surface"><Minus size={16} /></button>
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

        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide" ref={bodyRef}>
          {messages.length === 0 ? (
            <div className="grid h-full place-items-center p-6 text-center text-sm leading-relaxed text-on-surface-variant opacity-60">
              Start a conversation with the agent.
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {messages.map((m, i) => (
                <div key={i} className={`mb-6 max-w-[90%] group ${m.role === "user" ? "ml-auto" : ""}`}>
                  <div className={`message-bubble animate-in fade-in slide-in-from-bottom-2 duration-300 ${m.role === "user" ? "is-user" : "is-assistant"}`}>
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

        <footer className="p-5 pt-4">
          <MessageInput
            selectedModelId={selectedModelId}
            onSelectedModelChange={setSelectedModelId}
            onSend={onSend}
            onTextChange={setDraftText}
            text={draftText}
            disabled={isSending}
            attachments={[]}
            images={[]}
            onClickAttachment={() => {}} // Attached in useChat/MessageInput
            onRemoveAttachment={() => {}}
            onRemoveImage={() => {}}
          />
        </footer>
      </div>
    </motion.aside>
  );
}
