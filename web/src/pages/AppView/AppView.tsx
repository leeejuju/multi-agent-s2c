import { useEffect, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";

import { agentApi, type AgentRunResponse } from "@/api/agent";
import Sidebar, {
  sidebarSectionIds,
  type SidebarSectionId,
  type SidebarTab,
} from "@/components/Sidebar";
import type { ScriptItem, VideoProject } from "@/data/studio";
import { useAuthStore } from "@/store/auth";
import type {
  WorkspaceMessage,
  WorkspaceRouteState,
} from "@/pages/WorkspaceView";

import NewPromptPage from "./components/NewPromptPage";
import PageContainer from "./components/PageContainer";
import RecentPage from "./components/RecentPage";
import ScriptsListPage from "./components/ScriptsListPage";
import StoryboardEditorPage from "./components/StoryboardEditorPage";
import { ProfileModal, SlideshowModal } from "./components/StudioModals";
import TrashPage from "./components/TrashPage";
import VideoListPage from "./components/VideoListPage";

import "./AppView.css";

const sectionInitialTabs: Record<SidebarSectionId, SidebarTab> = {
  script: "recent",
  storyboard: "video-list",
  "story-graph": "scripts-list",
  library: "community",
  settings: "new-prompt",
};

const studioTabRoutes: Record<SidebarTab, string> = {
  "new-prompt": "/app/script/new-prompt",
  recent: "/app/script/recent",
  "scripts-list": "/app/script/scripts-list",
  "video-list": "/app/storyboard/video-list",
  community: "/app/library/community",
  trash: "/app/script/trash",
};

// ponytail: 当前只有一个公开顶层 Agent，等产品真的需要选择时再加载列表。
const LEADER_AGENT_ID = "LeaderAgent";

function isImagePromptAttachment(file: File) {
  return (
    file.type.startsWith("image/") ||
    /\.(?:jpe?g|png|webp)$/i.test(file.name)
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error(`无法读取图片附件：${file.name}`));
    };
    reader.onerror = () => reject(new Error(`无法读取图片附件：${file.name}`));
    reader.readAsDataURL(file);
  });
}

async function buildPromptWithAttachments(query: string, attachments: File[]) {
  const textAttachments = attachments.filter(
    (attachment) => !isImagePromptAttachment(attachment),
  );
  if (textAttachments.length === 0) return query;

  const sections = await Promise.all(
    textAttachments.map(async (attachment) => {
      const content = await attachment.text();
      if (!content.trim()) {
        throw new Error(`附件内容为空：${attachment.name}`);
      }
      return [
        `--- 参考附件开始：${attachment.name} ---`,
        content,
        `--- 参考附件结束：${attachment.name} ---`,
      ].join("\n");
    }),
  );

  return [
    query,
    "",
    "请结合下面由用户选择的参考附件完成本次创作要求：",
    ...sections,
  ].join("\n\n");
}

function getAttachmentMetadata(attachments: File[]) {
  return attachments.map((attachment) => ({
    category: isImagePromptAttachment(attachment) ? "image" : "document",
    file_name: attachment.name,
    file_size: attachment.size,
    content_type: attachment.type || "text/plain",
  }));
}

function isSidebarSectionId(value: string | undefined): value is SidebarSectionId {
  return sidebarSectionIds.some((id) => id === value);
}

function isStudioTab(value: string | undefined): value is SidebarTab {
  return (
    value === "new-prompt" ||
    value === "recent" ||
    value === "scripts-list" ||
    value === "video-list" ||
    value === "community" ||
    value === "trash"
  );
}

function insertOptimisticHumanMessage(
  state: Omit<WorkspaceRouteState, "messages" | "run"> & {
    run: AgentRunResponse;
  },
  content: string,
): WorkspaceRouteState {
  const message: WorkspaceMessage = {
    content,
    id: `human-${state.run.run_id}`,
    role: "human",
  };
  return { ...state, messages: [message] };
}

export default function AppView() {
  const navigate = useNavigate();
  const accountEmail = useAuthStore((state) => state.user?.email ?? "");
  const { pageId, sectionId } = useParams<{
    pageId?: string;
    sectionId: string;
  }>();
  const safeSectionId = isSidebarSectionId(sectionId) ? sectionId : "script";

  const [activeTab, setActiveTab] = useState<SidebarTab>(
    () => (isStudioTab(pageId) ? pageId : sectionInitialTabs[safeSectionId]),
  );
  const [scripts, setScripts] = useState<ScriptItem[]>([]);
  const [videoProjects, setVideoProjects] = useState<VideoProject[]>([]);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const [promptInput, setPromptInput] = useState("");
  const [promptAttachments, setPromptAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [showSlideshow, setShowSlideshow] = useState(false);
  const [slideshowIndex, setSlideshowIndex] = useState(0);
  const [slideshowPlaying, setSlideshowPlaying] = useState(false);

  const activeVideo = videoProjects.find(
    (project) => project.id === activeVideoId,
  );
  const activeScripts = scripts.filter((script) => !script.isTrash);
  const activeVideos = videoProjects.filter((project) => !project.isTrash);

  useEffect(() => {
    if (isSidebarSectionId(sectionId)) {
      setActiveTab(isStudioTab(pageId) ? pageId : sectionInitialTabs[sectionId]);
      setActiveVideoId(null);
    }
  }, [pageId, sectionId]);

  useEffect(() => {
    let interval: number | undefined;

    if (slideshowPlaying && showSlideshow && activeVideo?.scenes.length) {
      interval = window.setInterval(() => {
        setSlideshowIndex((previous) =>
          previous >= activeVideo.scenes.length - 1 ? 0 : previous + 1,
        );
      }, 3500);
    }

    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [activeVideo, showSlideshow, slideshowPlaying]);

  if (!isSidebarSectionId(sectionId)) {
    return <Navigate to="/app/script" replace />;
  }

  const setSidebarTab = (tab: SidebarTab) => {
    setActiveVideoId(null);
    setActiveTab(tab);
    navigate(studioTabRoutes[tab]);
  };

  const openScript = (script: ScriptItem) => {
    const workspaceState: WorkspaceRouteState = {
      agentName: LEADER_AGENT_ID,
      messages: [],
      modeLabel: "剧本编辑",
      script,
    };
    navigate(`/workspace/${script.id}`, { state: workspaceState });
  };

  const openVideo = (project: VideoProject) => {
    setActiveVideoId(project.id);
    setActiveSceneIndex(0);
    setActiveTab("video-list");
  };

  const handleCreateNewScript = () => {
    const newScript: ScriptItem = {
      id: `script-${Date.now()}`,
      title: "",
      description: "",
      content: "",
      characters: [],
      lastEdited: "刚刚",
      createdAt: new Date().toISOString(),
    };

    setScripts((previous) => [newScript, ...previous]);
    openScript(newScript);
  };

  const handleCreateNewVideoProject = () => {
    const newProject: VideoProject = {
      id: `video-${Date.now()}`,
      title: "未命名影像项目",
      description: "",
      aspectRatio: "16:9",
      scenes: [],
      lastEdited: "刚刚",
      createdAt: new Date().toISOString(),
    };

    setVideoProjects((previous) => [newProject, ...previous]);
    openVideo(newProject);
  };

  const handleHomeSubmit = async (event?: FormEvent) => {
    event?.preventDefault();
    const query = promptInput.trim();
    if (!query || isSubmitting) return;

    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      const attachmentMetadata = getAttachmentMetadata(promptAttachments);
      const queryWithAttachments = await buildPromptWithAttachments(
        query,
        promptAttachments,
      );
      const imageAttachment = promptAttachments.find(isImagePromptAttachment);
      const imageContent = imageAttachment
        ? await readFileAsDataUrl(imageAttachment)
        : null;
      const thread = await agentApi.createThread({
        agent_id: LEADER_AGENT_ID,
        metadata: attachmentMetadata.length
          ? { attachments: attachmentMetadata }
          : undefined,
      });
      const run = await agentApi.createAgentRun({
        agent_id: LEADER_AGENT_ID,
        image_content: imageContent,
        query: queryWithAttachments,
        thread_id: thread.thread_id,
        thread_metadata: {
          attachments: attachmentMetadata,
          request_id: crypto.randomUUID(),
        },
      });

      setPromptInput("");
      setPromptAttachments([]);
      const workspaceState = insertOptimisticHumanMessage(
        {
          agentName: LEADER_AGENT_ID,
          modeLabel: "自由创作",
          run,
        },
        attachmentMetadata.length
          ? `${query}\n\n参考附件：${attachmentMetadata
              .map((attachment) => attachment.file_name)
              .join("、")}`
          : query,
      );
      navigate(`/workspace/${run.run_id}`, { state: workspaceState });
    } catch (error) {
      setSubmissionError(
        error instanceof Error ? error.message : "提交失败，请稍后重试。",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePromptKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleHomeSubmit();
    }
  };

  const moveToTrash = (id: string, type: "script" | "video") => {
    if (type === "script") {
      setScripts((previous) =>
        previous.map((script) =>
          script.id === id ? { ...script, isTrash: true } : script,
        ),
      );
    } else {
      setVideoProjects((previous) =>
        previous.map((project) =>
          project.id === id ? { ...project, isTrash: true } : project,
        ),
      );
      if (activeVideoId === id) setActiveVideoId(null);
    }
  };

  const restoreFromTrash = (id: string, type: "script" | "video") => {
    if (type === "script") {
      setScripts((previous) =>
        previous.map((script) =>
          script.id === id ? { ...script, isTrash: false } : script,
        ),
      );
    } else {
      setVideoProjects((previous) =>
        previous.map((project) =>
          project.id === id ? { ...project, isTrash: false } : project,
        ),
      );
    }
  };

  const deletePermanently = (id: string, type: "script" | "video") => {
    if (!window.confirm("确定要永久删除该项目吗？此操作不可撤销。")) return;

    if (type === "script") {
      setScripts((previous) => previous.filter((script) => script.id !== id));
    } else {
      setVideoProjects((previous) =>
        previous.filter((project) => project.id !== id),
      );
    }
  };

  const addSceneToActiveVideo = () => {
    if (!activeVideo) return;

    const newScene = {
      id: `scene-${Date.now()}`,
      title: "",
      scriptText: "",
      imageUrl: "",
    };

    setVideoProjects((previous) =>
      previous.map((project) =>
        project.id === activeVideoId
          ? { ...project, scenes: [...project.scenes, newScene] }
          : project,
      ),
    );
    setActiveSceneIndex(activeVideo.scenes.length);
  };

  const updateActiveScene = (nextScene: VideoProject["scenes"][number]) => {
    setVideoProjects((previous) =>
      previous.map((project) =>
        project.id === activeVideoId
          ? {
              ...project,
              scenes: project.scenes.map((scene, index) =>
                index === activeSceneIndex ? nextScene : scene,
              ),
            }
          : project,
      ),
    );
  };

  const removeActiveScene = () => {
    if (!activeVideo) return;

    setVideoProjects((previous) =>
      previous.map((project) =>
        project.id === activeVideoId
          ? {
              ...project,
              scenes: project.scenes.filter((_, index) => index !== activeSceneIndex),
            }
          : project,
      ),
    );
    setActiveSceneIndex(0);
  };

  const trashedScripts = scripts.filter((script) => script.isTrash);
  const trashedVideos = videoProjects.filter((project) => project.isTrash);
  const currentScene = activeVideo?.scenes[activeSceneIndex];

  return (
    <div className="studio-shell">
      <Sidebar
        accountEmail={accountEmail}
        activeTab={activeTab}
        onProfile={() => setShowProfileModal(true)}
        onSelectTab={setSidebarTab}
      />

      <main className="app-view__main">
        {activeTab === "new-prompt" && !activeVideoId ? (
          <NewPromptPage
            accountEmail={accountEmail}
            attachments={promptAttachments}
            isSubmitting={isSubmitting}
            onAttachmentsChange={setPromptAttachments}
            onPromptChange={setPromptInput}
            onPromptKeyDown={handlePromptKeyDown}
            onSubmit={handleHomeSubmit}
            promptInput={promptInput}
            submissionError={submissionError}
          />
        ) : null}

        {activeTab === "recent" && !activeVideoId ? (
          <RecentPage
            onOpenScript={openScript}
            onOpenVideo={openVideo}
            onTrashScript={(id) => moveToTrash(id, "script")}
            onTrashVideo={(id) => moveToTrash(id, "video")}
            scripts={activeScripts}
            videoProjects={activeVideos}
          />
        ) : null}

        {activeTab === "scripts-list" && !activeVideoId ? (
          <ScriptsListPage
            onCreateNewScript={handleCreateNewScript}
            onOpenScript={openScript}
            onTrashScript={(id) => moveToTrash(id, "script")}
            scripts={activeScripts}
          />
        ) : null}

        {activeTab === "video-list" && !activeVideoId ? (
          <VideoListPage
            onCreateNewVideoProject={handleCreateNewVideoProject}
            onOpenVideo={openVideo}
            onTrashVideo={(id) => moveToTrash(id, "video")}
            videoProjects={activeVideos}
          />
        ) : null}

        {activeTab === "community" && !activeVideoId ? (
          <PageContainer />
        ) : null}

        {activeTab === "trash" && !activeVideoId ? (
          <TrashPage
            onDeletePermanently={deletePermanently}
            onRestoreFromTrash={restoreFromTrash}
            trashedScripts={trashedScripts}
            trashedVideos={trashedVideos}
          />
        ) : null}

        {activeVideoId && activeVideo ? (
          <StoryboardEditorPage
            activeSceneIndex={activeSceneIndex}
            currentScene={currentScene}
            onActiveSceneChange={setActiveSceneIndex}
            onAddScene={addSceneToActiveVideo}
            onPlay={() => {
              setShowSlideshow(true);
              setSlideshowIndex(0);
              setSlideshowPlaying(true);
            }}
            onRemoveScene={removeActiveScene}
            onSceneChange={updateActiveScene}
            project={activeVideo}
          />
        ) : null}
      </main>

      {showProfileModal ? (
        <ProfileModal
          email={accountEmail}
          onClose={() => setShowProfileModal(false)}
        />
      ) : null}

      {showSlideshow && activeVideo ? (
        <SlideshowModal
          index={slideshowIndex}
          onClose={() => {
            setShowSlideshow(false);
            setSlideshowPlaying(false);
          }}
          onNext={() => {
            setSlideshowIndex((previous) =>
              previous === activeVideo.scenes.length - 1 ? 0 : previous + 1,
            );
            setSlideshowPlaying(false);
          }}
          onPrevious={() => {
            setSlideshowIndex((previous) =>
              previous === 0 ? activeVideo.scenes.length - 1 : previous - 1,
            );
            setSlideshowPlaying(false);
          }}
          onTogglePlaying={() => setSlideshowPlaying((previous) => !previous)}
          playing={slideshowPlaying}
          project={activeVideo}
        />
      ) : null}
    </div>
  );
}
