import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { PlusIcon } from "@radix-ui/react-icons";
import {
  Check,
  ChevronDown,
  Clapperboard,
  FileText,
  ListTree,
} from "lucide-react";
import {
  DropdownMenu,
  ScrollArea,
  Select,
  Separator,
  Switch,
  Tabs,
} from "radix-ui";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";

import {
  agentApi,
  type AgentRunResponse,
  type AgentSummary,
  type ModelSummary,
} from "@/api/agent";
import WorkspaceAppRail from "./components/WorkspaceAppRail";
import WorkspaceChat, {
  type WorkspaceChatComposerRequest,
  type WorkspaceChatMessage,
} from "./components/WorkspaceChat";
import WorkspaceStoryboard, {
  StoryboardToolbar,
  type StoryboardFrame,
} from "./components/WorkspaceStoryboard";
import type {
  ScriptAiAction,
  ScriptAiRequest,
  ScriptDocument,
} from "./components/WorkspaceScript/types";
import type { ScriptItem } from "@/data/studio";
import { useAgentRunStream } from "@/hooks/useAgentRunStream";

import "./WorkspaceView.css";

const WorkspaceScript = lazy(() => import("./components/WorkspaceScript"));
const WorkspaceOutline = lazy(() => import("./components/WorkspaceOutline"));

export type WorkspaceMessage = WorkspaceChatMessage;

export type WorkspaceRouteState = {
  agentName: string;
  generationTargetEpisodeId?: string;
  messages: WorkspaceMessage[];
  modeLabel: string;
  runtimeConfig?: {
    modelId?: string;
    tools: string[];
  };
  run?: AgentRunResponse;
  script?: ScriptItem;
};

const DEFAULT_TOOLS = ["web_search", "knowledge_search"];
type ConfigPanel = "writer" | "resources";
type WorkspaceResource = "outline" | "script" | "storyboard";
type WorkspaceEpisode = {
  generatedContent: string;
  id: string;
  number: number;
  outlineText: string | null;
  scriptDocument: ScriptDocument | null;
  scriptGeneratedContentEdited: boolean;
  storyboardFrames: StoryboardFrame[];
};

const WORKSPACE_RESOURCES = [
  { icon: ListTree, id: "outline", label: "大纲" },
  { icon: FileText, id: "script", label: "剧本" },
  { icon: Clapperboard, id: "storyboard", label: "分镜" },
] as const;

function createWorkspaceEpisode(number: number): WorkspaceEpisode {
  return {
    generatedContent: "",
    id: crypto.randomUUID(),
    number,
    outlineText: null,
    scriptDocument: null,
    scriptGeneratedContentEdited: false,
    storyboardFrames: [],
  };
}

function getEpisodeLabel(episodeNumber: number) {
  return `EP ${String(episodeNumber).padStart(2, "0")}`;
}

const RUN_STATUS_LABELS: Record<string, string> = {
  pending: "已排队",
  queued: "已排队",
  running: "创作中",
  completed: "已完成",
  failed: "创作失败",
  cancelled: "已取消",
};

const SCRIPT_AI_PROMPTS: Record<
  ScriptAiAction,
  (selectedText: string) => string
> = {
  chat: (selectedText) =>
    `我想和你讨论下面这段剧本：\n\n${selectedText}\n\n我的问题是：`,
  condense: (selectedText) =>
    `请精简下面这段剧本，删除重复信息并压缩篇幅，同时保留关键动作、情绪和剧情事实：\n\n${selectedText}`,
  enhance: (selectedText) =>
    `请增强下面这段剧本的冲突、潜台词和画面感，同时保持人物设定、剧情事实和剧本元素类型不变：\n\n${selectedText}`,
  polish: (selectedText) =>
    `请润色下面这段剧本，改善措辞、节奏和可读性，同时保持原意、剧情事实和剧本格式不变：\n\n${selectedText}`,
};

function getAgentDisplayName(agentName: string) {
  return agentName === "LeaderAgent" ? "Leader Agent" : agentName;
}

export default function WorkspaceView() {
  const navigate = useNavigate();
  const location = useLocation();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const state = location.state as WorkspaceRouteState | null;
  const workspaceStateId = state?.run?.run_id ?? state?.script?.id;
  const [chatInputError, setChatInputError] = useState<string | null>(null);
  const [isChatSubmitting, setIsChatSubmitting] = useState(false);
  const [chatComposerRequest, setChatComposerRequest] =
    useState<WorkspaceChatComposerRequest | null>(null);
  const [configPanel, setConfigPanel] = useState<ConfigPanel>("writer");
  const [activeResource, setActiveResource] =
    useState<WorkspaceResource>("script");
  const [episodes, setEpisodes] = useState<WorkspaceEpisode[]>(() => [
    createWorkspaceEpisode(1),
  ]);
  const initialEpisodeIdRef = useRef(episodes[0].id);
  const [activeEpisodeId, setActiveEpisodeId] = useState(episodes[0].id);
  const episodeButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [models, setModels] = useState<ModelSummary[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState(
    state?.agentName ?? "LeaderAgent",
  );
  const [selectedModelId, setSelectedModelId] = useState(
    state?.runtimeConfig?.modelId ?? "",
  );
  const [enabledTools, setEnabledTools] = useState(
    state?.runtimeConfig?.tools ?? DEFAULT_TOOLS,
  );
  const {
    assistantContent,
    isStreaming,
    runStatus,
    streamError,
    toolActivities,
  } = useAgentRunStream(state?.run);
  const requestedGenerationTargetEpisodeId =
    state?.generationTargetEpisodeId;
  const generationTargetEpisodeId =
    requestedGenerationTargetEpisodeId &&
    episodes.some(
      (episode) => episode.id === requestedGenerationTargetEpisodeId,
    )
      ? requestedGenerationTargetEpisodeId
      : initialEpisodeIdRef.current;

  useEffect(() => {
    if (!assistantContent) return;

    setEpisodes((current) =>
      current.map((episode) =>
        episode.id === generationTargetEpisodeId &&
        episode.generatedContent !== assistantContent
          ? { ...episode, generatedContent: assistantContent }
          : episode,
      ),
    );
  }, [assistantContent, generationTargetEpisodeId]);

  useEffect(() => {
    let isActive = true;

    void agentApi
      .getAgents()
      .then((agentItems) => {
        if (!isActive) return;
        setAgents(agentItems);
      })
      .catch(() => undefined);

    void agentApi
      .getModels()
      .then((modelResponse) => {
        if (!isActive) return;
        setModels(modelResponse.models);
        setSelectedModelId(
          (current) => current || modelResponse.default_model,
        );
      })
      .catch(() => undefined);

    return () => {
      isActive = false;
    };
  }, []);

  if (!state || workspaceStateId !== workspaceId) {
    return <Navigate to="/app/script/recent" replace />;
  }

  const { agentName, messages, modeLabel, run, script } = state;
  const activeEpisode =
    episodes.find((episode) => episode.id === activeEpisodeId) ?? episodes[0];
  const activeEpisodeLabel = getEpisodeLabel(activeEpisode.number);
  const activeEpisodeInitialContent =
    activeEpisode.id === initialEpisodeIdRef.current
      ? (script?.content ?? "")
      : "";
  const activeEpisodeGeneratedContent = activeEpisode.generatedContent;
  const activeEpisodeOutlineContent =
    activeEpisode.outlineText ?? activeEpisodeGeneratedContent;
  const agentOptions = agents.length
    ? agents
    : [{ id: agentName, name: agentName, description: "" }];
  const activeResourceLabel = WORKSPACE_RESOURCES.find(
    (resource) => resource.id === activeResource,
  )?.label;
  const workspaceContextLabel = `${activeEpisodeLabel} · ${activeResourceLabel}`;
  const agentDisplayName = getAgentDisplayName(selectedAgentId);
  const title = script?.title || "未命名创作";
  const statusLabel = run
    ? RUN_STATUS_LABELS[runStatus] ?? "处理中"
    : "编辑中";
  const outlinePlaceholder =
    run && activeEpisode.id === generationTargetEpisodeId
      ? "创作助手正在整理大纲，也可以直接开始输入"
      : "从这里开始整理大纲";
  const toggleTool = (toolId: string, enabled: boolean) => {
    setEnabledTools((current) =>
      enabled
        ? [...new Set([...current, toolId])]
        : current.filter((item) => item !== toolId),
    );
  };

  const handleChatSubmit = async (
    query: string,
    startNewConversation: boolean,
  ) => {
    if ((!startNewConversation && isStreaming) || isChatSubmitting) return;

    const targetEpisodeId = activeEpisodeId;
    setIsChatSubmitting(true);
    setChatInputError(null);

    try {
      const shouldStartNewConversation =
        startNewConversation || selectedAgentId !== agentName;
      const threadId =
        !shouldStartNewConversation && run?.thread_id
          ? run.thread_id
          : (
              await agentApi.createThread({
                agent_id: selectedAgentId,
                metadata: {
                  runtime_config: {
                    model: selectedModelId || undefined,
                    tools: enabledTools,
                  },
                },
              })
            ).thread_id;
      const nextRun = await agentApi.createAgentRun({
        agent_id: selectedAgentId,
        parent_run_id: shouldStartNewConversation
          ? null
          : (run?.run_id ?? null),
        query,
        thread_id: threadId,
        thread_metadata: {
          request_id: crypto.randomUUID(),
          runtime_config: {
            model: selectedModelId || undefined,
            tools: enabledTools,
          },
        },
      });
      const nextMessages: WorkspaceMessage[] = shouldStartNewConversation
        ? []
        : [...messages];

      if (!shouldStartNewConversation && assistantContent) {
        nextMessages.push({
          content: assistantContent,
          id: `assistant-${run?.run_id ?? crypto.randomUUID()}`,
          role: "assistant",
        });
      }
      nextMessages.push({
        content: query,
        id: `human-${crypto.randomUUID()}`,
        role: "human",
      });

      const nextWorkspaceState: WorkspaceRouteState = {
        ...state,
        agentName: selectedAgentId,
        generationTargetEpisodeId: targetEpisodeId,
        messages: nextMessages,
        runtimeConfig: {
          modelId: selectedModelId || undefined,
          tools: enabledTools,
        },
        run: nextRun,
      };
      navigate(`/workspace/${nextRun.run_id}`, {
        state: nextWorkspaceState,
      });
    } catch (error) {
      const normalizedError =
        error instanceof Error
          ? error
          : new Error("发送失败，请稍后重试。");
      setChatInputError(normalizedError.message);
      throw normalizedError;
    } finally {
      setIsChatSubmitting(false);
    }
  };

  const handleScriptAiAction = ({
    action,
    selectedText,
  }: ScriptAiRequest) => {
    setChatComposerRequest({
      draft: SCRIPT_AI_PROMPTS[action](selectedText),
      id: crypto.randomUUID(),
    });
  };

  const updateEpisode = (
    episodeId: string,
    patch: Partial<WorkspaceEpisode>,
  ) => {
    setEpisodes((current) =>
      current.map((episode) =>
        episode.id === episodeId ? { ...episode, ...patch } : episode,
      ),
    );
  };

  const addStoryboardFrame = () => {
    const frame: StoryboardFrame = {
      description: "",
      id: crypto.randomUUID(),
      movement: "static",
      shotSize: "medium",
      title: "",
    };

    updateEpisode(activeEpisode.id, {
      storyboardFrames: [...activeEpisode.storyboardFrames, frame],
    });
  };

  const selectEpisode = (episodeId: string) => {
    setActiveEpisodeId(episodeId);
  };

  const selectResource = (resource: WorkspaceResource) => {
    setActiveResource(resource);
  };

  const addEpisode = () => {
    const nextNumber =
      episodes.reduce(
        (highest, episode) => Math.max(highest, episode.number),
        0,
      ) + 1;
    const nextEpisode = createWorkspaceEpisode(nextNumber);

    setEpisodes((current) => [...current, nextEpisode]);
    setActiveEpisodeId(nextEpisode.id);

    window.requestAnimationFrame(() => {
      episodeButtonRefs.current.get(nextEpisode.id)?.focus();
    });
  };

  return (
    <div className="workspace-view">
      <div
        className="workspace-view__layout"
        data-active-resource={activeResource}
      >
        <WorkspaceAppRail />
        <aside className="workspace-view__panel workspace-view__panel--resources">
          <div className="workspace-view__episode-header">
            <span className="workspace-view__episode-heading">
              EPISODES
            </span>
          </div>
          <div className="workspace-view__episode-add-row">
            <button
              aria-label="新增"
              className="workspace-view__episode-add"
              onClick={addEpisode}
              title="新增"
              type="button"
            >
              <PlusIcon aria-hidden="true" height={15} width={15} />
              新增
            </button>
          </div>

          <ScrollArea.Root className="workspace-view__scroll-area" type="hover">
            <ScrollArea.Viewport className="workspace-view__episode-viewport">
              <div className="workspace-view__episode-list">
                {episodes.map((episode) => {
                  const episodeLabel = getEpisodeLabel(episode.number);
                  const isEpisodeActive = episode.id === activeEpisode.id;

                  return (
                    <button
                      aria-current={isEpisodeActive ? "page" : undefined}
                      className="workspace-view__episode-button"
                      data-active={isEpisodeActive}
                      data-episode-id={episode.id}
                      key={episode.id}
                      onClick={() => selectEpisode(episode.id)}
                      ref={(node) => {
                        if (node) {
                          episodeButtonRefs.current.set(episode.id, node);
                        } else {
                          episodeButtonRefs.current.delete(episode.id);
                        }
                      }}
                      type="button"
                    >
                      <span className="workspace-view__episode-title">
                        {episodeLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
              <nav
                aria-label={`${activeEpisodeLabel} 创作资源`}
                className="workspace-view__resource-list"
              >
                {WORKSPACE_RESOURCES.map((resource) => {
                  const isActive = resource.id === activeResource;
                  const ResourceIcon = resource.icon;

                  return (
                    <button
                      aria-current={isActive ? "page" : undefined}
                      className="workspace-view__resource-button"
                      data-active={isActive}
                      key={resource.id}
                      onClick={() => selectResource(resource.id)}
                      type="button"
                    >
                      <span
                        aria-hidden="true"
                        className="workspace-view__resource-indicator"
                        data-active={isActive}
                      />
                      <ResourceIcon
                        aria-hidden="true"
                        className="workspace-view__resource-icon"
                        data-active={isActive}
                        size={14}
                        strokeWidth={1.8}
                      />
                      <span>{resource.label}</span>
                    </button>
                  );
                })}
              </nav>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar
              className="workspace-view__scrollbar"
              orientation="vertical"
            >
              <ScrollArea.Thumb className="workspace-view__scrollbar-thumb" />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>
        </aside>

        <main
          aria-busy={isStreaming}
          className="workspace-view__document-panel"
        >
          <div className="workspace-view__document-header">
            <div className="workspace-view__document-heading">
              <h1 className="workspace-view__title">
                {title}
              </h1>
              <span className="workspace-view__context-label">
                {workspaceContextLabel}
              </span>
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button
                    className="workspace-view__context-trigger"
                    type="button"
                  >
                    <span>{workspaceContextLabel}</span>
                    <ChevronDown aria-hidden="true" size={12} />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    align="start"
                    className="workspace-view__context-menu"
                    sideOffset={6}
                  >
                    <DropdownMenu.Item
                      className="workspace-view__context-add"
                      onSelect={addEpisode}
                    >
                      <PlusIcon aria-hidden="true" height={14} width={14} />
                      新增
                    </DropdownMenu.Item>
                    <DropdownMenu.Group className="workspace-view__context-group">
                      {episodes.map((episode) => {
                        const episodeLabel = getEpisodeLabel(episode.number);
                        const isActive = episode.id === activeEpisode.id;

                        return (
                          <DropdownMenu.Item
                            className="workspace-view__context-item"
                            data-active={isActive}
                            key={episode.id}
                            onSelect={() => selectEpisode(episode.id)}
                          >
                            {episodeLabel}
                          </DropdownMenu.Item>
                        );
                      })}
                    </DropdownMenu.Group>
                    <DropdownMenu.Group className="workspace-view__context-group">
                      {WORKSPACE_RESOURCES.map((resource) => {
                        const ResourceIcon = resource.icon;
                        const isActive = resource.id === activeResource;

                        return (
                          <DropdownMenu.Item
                            className="workspace-view__context-item"
                            data-active={isActive}
                            key={resource.id}
                            onSelect={() => selectResource(resource.id)}
                          >
                            <ResourceIcon aria-hidden="true" size={14} />
                            {resource.label}
                          </DropdownMenu.Item>
                        );
                      })}
                    </DropdownMenu.Group>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>
            <div className="workspace-view__header-actions">
              {activeResource === "storyboard" ? (
                <StoryboardToolbar
                  frameCount={activeEpisode.storyboardFrames.length}
                  onAddFrame={addStoryboardFrame}
                />
              ) : null}
              <div
                className="workspace-view__run-status"
                data-error={Boolean(streamError || runStatus === "failed")}
                data-streaming={Boolean(run && isStreaming)}
              >
                {run && isStreaming ? (
                  <span className="workspace-view__run-status-dot" />
                ) : null}
                {statusLabel}
              </div>
            </div>
          </div>
          <Separator.Root className="workspace-view__separator" />

          <div className="workspace-view__document-content">
            {activeResource === "outline" ? (
              <Suspense fallback={<div className="workspace-view__document-fallback" />}>
                <WorkspaceOutline
                  key={`${activeEpisode.id}:outline`}
                  onChange={(outlineText) =>
                    updateEpisode(activeEpisode.id, { outlineText })
                  }
                  placeholder={outlinePlaceholder}
                  title={activeEpisodeLabel}
                  value={activeEpisodeOutlineContent}
                />
              </Suspense>
            ) : activeResource === "storyboard" ? (
              <WorkspaceStoryboard
                frames={activeEpisode.storyboardFrames}
                key={`${activeEpisode.id}:storyboard`}
                onAddFrame={addStoryboardFrame}
                onFramesChange={(storyboardFrames) =>
                  updateEpisode(activeEpisode.id, { storyboardFrames })
                }
              />
            ) : (
              <Suspense fallback={<div className="workspace-view__document-fallback" />}>
                <WorkspaceScript
                  characters={script?.characters}
                  generatedContent={activeEpisodeGeneratedContent}
                  generatedContentEdited={
                    activeEpisode.scriptGeneratedContentEdited
                  }
                  initialContent={activeEpisodeInitialContent}
                  initialDocument={activeEpisode.scriptDocument}
                  key={`${activeEpisode.id}:script`}
                  onAiAction={handleScriptAiAction}
                  onDocumentChange={(scriptDocument) =>
                    updateEpisode(activeEpisode.id, { scriptDocument })
                  }
                  onGeneratedContentEditedChange={(
                    scriptGeneratedContentEdited,
                  ) =>
                    updateEpisode(activeEpisode.id, {
                      scriptGeneratedContentEdited,
                    })
                  }
                />
              </Suspense>
            )}
          </div>
        </main>

        {activeResource !== "storyboard" ? (
          <aside className="workspace-view__panel workspace-view__panel--config">
            <Tabs.Root
              className="workspace-view__config-tabs"
              onValueChange={(value) => setConfigPanel(value as ConfigPanel)}
              value={configPanel}
            >
            <div className="workspace-view__tabs-header">
              <Tabs.List
                aria-label="配置区域"
                className="workspace-view__tabs-list"
              >
                <span
                  aria-hidden="true"
                  className="workspace-view__tabs-indicator"
                  data-panel={configPanel}
                />
                <Tabs.Trigger
                  className="workspace-view__tabs-trigger"
                  value="writer"
                >
                  编剧
                </Tabs.Trigger>
                <Tabs.Trigger
                  className="workspace-view__tabs-trigger"
                  value="resources"
                >
                  资源
                </Tabs.Trigger>
              </Tabs.List>
            </div>

            <Tabs.Content
              className="workspace-view__tabs-content"
              value="writer"
            >
              <ScrollArea.Root
                className="workspace-view__config-scroll-area"
                type="hover"
              >
                <ScrollArea.Viewport className="workspace-view__config-viewport">
                  <div className="workspace-view__config-stack">
                    <section className="workspace-view__config-section">
                      <label className="workspace-view__field-label">
                        Agent
                      </label>
                      <Select.Root
                        onValueChange={setSelectedAgentId}
                        value={selectedAgentId}
                      >
                        <Select.Trigger
                          aria-label="选择 Agent"
                          className="workspace-view__select-trigger"
                        >
                          <Select.Value>{agentDisplayName}</Select.Value>
                          <Select.Icon>
                            <ChevronDown aria-hidden="true" size={15} />
                          </Select.Icon>
                        </Select.Trigger>
                        <Select.Portal>
                          <Select.Content
                            className="workspace-view__select-content"
                            position="popper"
                            sideOffset={6}
                          >
                            <Select.Viewport>
                              {agentOptions.map((agent) => (
                                <Select.Item
                                  className="workspace-view__select-item"
                                  key={agent.id}
                                  value={agent.id}
                                >
                                  <Select.ItemText>
                                    {getAgentDisplayName(agent.id)}
                                  </Select.ItemText>
                                  <Select.ItemIndicator className="workspace-view__select-indicator">
                                    <Check aria-hidden="true" size={14} />
                                  </Select.ItemIndicator>
                                </Select.Item>
                              ))}
                            </Select.Viewport>
                          </Select.Content>
                        </Select.Portal>
                      </Select.Root>
                    </section>

                    <section className="workspace-view__config-section workspace-view__config-section--mode">
                      <div className="workspace-view__section-heading">
                        创作模式
                      </div>
                      <div className="workspace-view__mode-value">
                        {modeLabel}
                      </div>
                    </section>

                    <section className="workspace-view__config-section">
                      <label className="workspace-view__field-label">
                        模型
                      </label>
                      <Select.Root
                        disabled={!models.length}
                        onValueChange={setSelectedModelId}
                        value={selectedModelId}
                      >
                        <Select.Trigger
                          aria-label="选择模型"
                          className="workspace-view__select-trigger"
                        >
                          <Select.Value placeholder="使用系统默认模型" />
                          <Select.Icon>
                            <ChevronDown aria-hidden="true" size={15} />
                          </Select.Icon>
                        </Select.Trigger>
                        <Select.Portal>
                          <Select.Content
                            className="workspace-view__select-content workspace-view__select-content--models"
                            position="popper"
                            sideOffset={6}
                          >
                            <Select.ScrollUpButton />
                            <Select.Viewport>
                              {models.map((model) => (
                                <Select.Item
                                  className="workspace-view__select-item"
                                  key={model.id}
                                  value={model.id}
                                >
                                  <Select.ItemText>
                                    {model.name}
                                    <span className="workspace-view__model-provider">
                                      {model.provider}
                                    </span>
                                  </Select.ItemText>
                                  <Select.ItemIndicator className="workspace-view__select-indicator">
                                    <Check aria-hidden="true" size={14} />
                                  </Select.ItemIndicator>
                                </Select.Item>
                              ))}
                            </Select.Viewport>
                            <Select.ScrollDownButton />
                          </Select.Content>
                        </Select.Portal>
                      </Select.Root>
                    </section>

                    <section className="workspace-view__config-section">
                      <h2 className="workspace-view__section-heading">
                        能力
                      </h2>
                      <div className="workspace-view__capabilities">
                        <div className="workspace-view__capability">
                          <div>
                            <div className="workspace-view__capability-name">
                              联网搜索
                            </div>
                            <div className="workspace-view__capability-description">
                              查找公开资料与事实
                            </div>
                          </div>
                          <Switch.Root
                            aria-label="启用联网搜索"
                            checked={enabledTools.includes("web_search")}
                            className="workspace-view__switch"
                            onCheckedChange={(enabled) =>
                              toggleTool("web_search", enabled)
                            }
                          >
                            <Switch.Thumb className="workspace-view__switch-thumb" />
                          </Switch.Root>
                        </div>
                        <div className="workspace-view__capability">
                          <div>
                            <div className="workspace-view__capability-name">
                              知识库检索
                            </div>
                            <div className="workspace-view__capability-description">
                              检索已上传的项目资料
                            </div>
                          </div>
                          <Switch.Root
                            aria-label="启用知识库检索"
                            checked={enabledTools.includes(
                              "knowledge_search",
                            )}
                            className="workspace-view__switch"
                            onCheckedChange={(enabled) =>
                              toggleTool("knowledge_search", enabled)
                            }
                          >
                            <Switch.Thumb className="workspace-view__switch-thumb" />
                          </Switch.Root>
                        </div>
                      </div>
                    </section>
                  </div>
                </ScrollArea.Viewport>
                <ScrollArea.Scrollbar
                  className="workspace-view__scrollbar"
                  orientation="vertical"
                >
                  <ScrollArea.Thumb className="workspace-view__scrollbar-thumb" />
                </ScrollArea.Scrollbar>
              </ScrollArea.Root>
            </Tabs.Content>

            <Tabs.Content
              className="workspace-view__tabs-content"
              value="resources"
            >
              <ScrollArea.Root
                className="workspace-view__config-scroll-area"
                type="hover"
              >
                <ScrollArea.Viewport className="workspace-view__config-viewport">
                  <section className="workspace-view__config-section workspace-view__config-section--empty">
                    <p className="workspace-view__resources-empty">
                      暂无资源
                    </p>
                  </section>
                </ScrollArea.Viewport>
              </ScrollArea.Root>
            </Tabs.Content>
            </Tabs.Root>
          </aside>
        ) : null}
      </div>

      <WorkspaceChat
        assistantContent={assistantContent}
        composerRequest={chatComposerRequest}
        defaultOpen={Boolean(run)}
        inputError={chatInputError}
        isStreaming={isStreaming}
        isSubmitting={isChatSubmitting}
        messages={messages}
        onStartNewConversation={() => setChatInputError(null)}
        onSubmit={handleChatSubmit}
        statusLabel={run ? statusLabel : undefined}
        streamError={streamError}
        toolActivities={toolActivities}
      />
    </div>
  );
}
