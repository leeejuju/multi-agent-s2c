import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  ArrowUpIcon,
  ChatBubbleIcon,
  CheckCircledIcon,
  Cross2Icon,
  ExclamationTriangleIcon,
  GearIcon,
  HamburgerMenuIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from "@radix-ui/react-icons";
import { Dialog, ScrollArea } from "radix-ui";

import type { AgentToolActivity } from "@/hooks/useAgentRunStream";

import "./WorkspaceChat.css";

export type WorkspaceChatMessage = {
  content: string;
  id: string;
  role: "assistant" | "human";
};

export type WorkspaceChatComposerRequest = {
  draft: string;
  id: string;
};

type WorkspaceChatProps = {
  assistantContent: string;
  composerRequest?: WorkspaceChatComposerRequest | null;
  defaultOpen?: boolean;
  inputError: string | null;
  isStreaming: boolean;
  isSubmitting: boolean;
  messages: WorkspaceChatMessage[];
  onStartNewConversation: () => void;
  onSubmit: (message: string, startNewConversation: boolean) => Promise<void>;
  statusLabel?: string;
  streamError: string | null;
  toolActivities: AgentToolActivity[];
};

function getToolDisplayName(name: string) {
  const names: Record<string, string> = {
    knowledge_search: "知识库检索",
    web_search_one: "网页搜索",
    web_search_parallel: "并行网页搜索",
  };
  return names[name] ?? name;
}

function ToolActivityCard({ activity }: { activity: AgentToolActivity }) {
  const isFailed = ["error", "failed"].includes(activity.status);
  const isComplete = ["completed", "success"].includes(activity.status);
  const isActive = !isFailed && !isComplete;
  const Icon = isFailed
    ? ExclamationTriangleIcon
    : isComplete
      ? CheckCircledIcon
      : activity.name.includes("search")
        ? MagnifyingGlassIcon
        : GearIcon;
  const statusLabel = isFailed
    ? "执行失败"
    : isComplete
      ? "已完成"
      : "正在执行";

  return (
    <section
      className="workspace-chat__tool-card"
      data-active={isActive}
      data-failed={isFailed}
    >
      <div className="workspace-chat__tool-header">
        <span
          className="workspace-chat__tool-icon"
          data-active={isActive}
          data-failed={isFailed}
        >
          <Icon aria-hidden="true" height={15} width={15} />
        </span>
        <div className="workspace-chat__tool-body">
          <p className="workspace-chat__tool-name">
            {getToolDisplayName(activity.name)}
          </p>
          <p
            className="workspace-chat__tool-status"
            data-active={isActive}
            data-failed={isFailed}
          >
            {statusLabel}
          </p>
        </div>
        {typeof activity.resultCount === "number" ? (
          <span className="workspace-chat__tool-count">
            {activity.resultCount} 项
          </span>
        ) : null}
      </div>
      {activity.query ? (
        <p className="workspace-chat__tool-query">
          {activity.query}
        </p>
      ) : null}
      {activity.error ? (
        <p className="workspace-chat__tool-error">
          {activity.error}
        </p>
      ) : null}
    </section>
  );
}

function ChatThinkingIndicator() {
  return (
    <div className="workspace-chat__thinking" role="status">
      <span className="workspace-thinking-text">正在思考，准备输出</span>
    </div>
  );
}

export default function WorkspaceChat({
  assistantContent,
  composerRequest,
  defaultOpen = false,
  inputError,
  isStreaming,
  isSubmitting,
  messages,
  onStartNewConversation,
  onSubmit,
  statusLabel,
  streamError,
  toolActivities,
}: WorkspaceChatProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [isNewConversation, setIsNewConversation] = useState(false);
  const [open, setOpen] = useState(defaultOpen);
  const visibleMessages = isNewConversation ? [] : messages;
  const visibleAssistantContent = isNewConversation ? "" : assistantContent;
  const visibleToolActivities = isNewConversation ? [] : toolActivities;
  const visibleStatusLabel = isNewConversation ? undefined : statusLabel;
  const visibleStreamError = isNewConversation ? null : streamError;
  const visibleIsStreaming = isNewConversation ? false : isStreaming;
  const hasConversationContent =
    visibleMessages.length > 0 ||
    visibleToolActivities.length > 0 ||
    Boolean(
      visibleAssistantContent ||
        visibleStatusLabel ||
        visibleStreamError ||
        visibleIsStreaming,
    );
  const canSubmit =
    draft.trim().length > 0 && !visibleIsStreaming && !isSubmitting;
  const hasRecentConversation = messages.length > 0 || Boolean(assistantContent);
  const recentConversationTitle =
    messages.find((message) => message.role === "human")?.content ||
    assistantContent ||
    "当前对话";

  useEffect(() => {
    if (!composerRequest) return;

    setDraft(composerRequest.draft);
    setHistoryOpen(false);
    setIsNewConversation(false);
    setOpen(true);

    const frame = window.requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;

      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [composerRequest]);

  const handleSubmit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const message = draft.trim();
    if (!message || !canSubmit) return;

    try {
      await onSubmit(message, isNewConversation);
      setDraft("");
      setIsNewConversation(false);
    } catch {
      // WorkspaceView owns and renders the API error.
    }
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  };

  return (
    <Dialog.Root
      modal={false}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setHistoryOpen(false);
      }}
      open={open}
    >
      <Dialog.Portal>
        <Dialog.Content
          aria-describedby={undefined}
          aria-label="创作助手对话"
          className="workspace-chat-panel"
        >
          <Dialog.Title className="workspace-chat__sr-only">创作助手</Dialog.Title>
          <div className="workspace-chat-content">
            <header className="workspace-chat__header">
              <button
                aria-controls="workspace-chat-history"
                aria-expanded={historyOpen}
                aria-label="最近对话"
                className="workspace-chat__icon-button"
                data-active={historyOpen}
                onClick={() => setHistoryOpen((current) => !current)}
                type="button"
              >
                <HamburgerMenuIcon height={17} width={17} />
              </button>

              <div className="workspace-chat__header-actions">
                <button
                  aria-label="新建对话"
                  className="workspace-chat__icon-button"
                  data-active={isNewConversation}
                  onClick={() => {
                    setDraft("");
                    setHistoryOpen(false);
                    setIsNewConversation(true);
                    onStartNewConversation();
                  }}
                  type="button"
                >
                  <PlusIcon height={17} width={17} />
                </button>

                <Dialog.Close
                  aria-label="关闭对话"
                  className="workspace-chat__icon-button"
                >
                  <Cross2Icon height={17} width={17} />
                </Dialog.Close>
              </div>
            </header>

            <button
              aria-label="关闭最近对话"
              className="workspace-chat__history-overlay"
              data-open={historyOpen}
              onClick={() => setHistoryOpen(false)}
              tabIndex={historyOpen ? 0 : -1}
              type="button"
            />

            <aside
              aria-label="最近对话"
              className="workspace-chat__history-panel"
              data-open={historyOpen}
              id="workspace-chat-history"
            >
              <div className="workspace-chat__history-heading">
                最近对话
              </div>
              <ScrollArea.Root className="workspace-chat__scroll-area" type="hover">
                <ScrollArea.Viewport className="workspace-chat__history-viewport">
                  {hasRecentConversation ? (
                    <button
                      className="workspace-chat__history-item"
                      data-selected={!isNewConversation}
                      onClick={() => {
                        setHistoryOpen(false);
                        setIsNewConversation(false);
                      }}
                      type="button"
                    >
                      <span className="workspace-chat__history-title">
                        {recentConversationTitle}
                      </span>
                      <span className="workspace-chat__history-meta">
                        当前工作区
                      </span>
                    </button>
                  ) : (
                    <p className="workspace-chat__history-empty">
                      暂无最近对话
                    </p>
                  )}
                </ScrollArea.Viewport>
                <ScrollArea.Scrollbar
                  className="workspace-chat__scrollbar"
                  orientation="vertical"
                >
                  <ScrollArea.Thumb className="workspace-chat__scrollbar-thumb" />
                </ScrollArea.Scrollbar>
              </ScrollArea.Root>
            </aside>

            <ScrollArea.Root className="workspace-chat__scroll-area" type="hover">
              <ScrollArea.Viewport className="workspace-chat__messages-viewport">
                <div className="workspace-chat__message-list">
                  {visibleMessages.map((message) => (
                    <section
                      aria-label={message.role === "human" ? "用户消息" : "AI 消息"}
                      className="workspace-chat__message"
                      data-role={message.role}
                      key={message.id}
                    >
                      <p
                        className="workspace-chat__message-content"
                        data-role={message.role}
                      >
                        {message.content}
                      </p>
                    </section>
                  ))}

                  {visibleToolActivities.map((activity) => (
                    <ToolActivityCard activity={activity} key={activity.id} />
                  ))}

                  {visibleAssistantContent ? (
                    <section aria-label="AI 消息" className="workspace-chat__assistant-message">
                      <p className="workspace-chat__assistant-content">
                        {visibleAssistantContent}
                        {visibleIsStreaming ? (
                          <span
                            aria-hidden="true"
                            className="workspace-stream-caret"
                          />
                        ) : null}
                      </p>
                    </section>
                  ) : visibleIsStreaming ? (
                    <ChatThinkingIndicator />
                  ) : null}

                  {visibleStatusLabel &&
                  !visibleIsStreaming &&
                  !visibleStreamError ? (
                    <p className="workspace-chat__status">
                      {visibleStatusLabel}
                    </p>
                  ) : null}

                  {visibleStreamError ? (
                    <p className="workspace-chat__stream-error" role="alert">
                      {visibleStreamError}
                    </p>
                  ) : null}

                  {!hasConversationContent ? (
                    <p className="workspace-chat__empty">
                      暂无对话内容
                    </p>
                  ) : null}
                </div>
              </ScrollArea.Viewport>
              <ScrollArea.Scrollbar
                className="workspace-chat__scrollbar"
                orientation="vertical"
              >
                <ScrollArea.Thumb className="workspace-chat__scrollbar-thumb" />
              </ScrollArea.Scrollbar>
            </ScrollArea.Root>

            <form
              className="workspace-chat__composer"
              onSubmit={(event) => void handleSubmit(event)}
            >
              <div className="workspace-chat__composer-shell">
                <textarea
                  aria-label="对话输入"
                  className="workspace-chat__input"
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder="输入消息，Enter 发送"
                  ref={inputRef}
                  rows={3}
                  value={draft}
                />
                <div className="workspace-chat__composer-actions">
                  <button
                    aria-label="发送消息"
                    className="workspace-chat__submit"
                    disabled={!canSubmit}
                    type="submit"
                  >
                    <ArrowUpIcon height={18} width={18} />
                  </button>
                </div>
              </div>
              {inputError ? (
                <p className="workspace-chat__input-error" role="alert">
                  {inputError}
                </p>
              ) : null}
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>

      <Dialog.Trigger
        aria-label="打开创作助手对话"
        className="workspace-chat-trigger"
        type="button"
      >
        <ChatBubbleIcon height={20} width={20} />
      </Dialog.Trigger>
    </Dialog.Root>
  );
}
