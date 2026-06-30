import { useEffect, useMemo, useState } from "react";
import type { DragEvent, FormEvent, KeyboardEvent, ReactNode } from "react";
import {
  AlertCircle,
  Check,
  Download,
  FileText,
  Film,
  Play,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  User,
  X,
  type LucideIcon,
} from "lucide-react";
import { Navigate, useNavigate, useParams } from "react-router-dom";

import Sidebar, { sidebarItems, type SidebarSectionId } from "@/components/Sidebar";
import {
  initialCommunityItems,
  initialScripts,
  initialUpdateNotes,
  initialVideoProjects,
  type Character,
  type CommunityItem,
  type ScriptItem,
  type VideoProject,
} from "@/data/studio";

import CommunityPage from "./components/CommunityPage";
import NewPromptPage from "./components/NewPromptPage";
import RecentPage from "./components/RecentPage";
import ScriptsListPage from "./components/ScriptsListPage";
import TrashPage from "./components/TrashPage";

type StudioTab =
  | "new-prompt"
  | "recent"
  | "scripts-list"
  | "video-list"
  | "community"
  | "trash";

type PromptMode =
  | "chat"
  | "format"
  | "scratchpad"
  | "writing"
  | "plot"
  | "character";

type AiPanelTab = "tools" | "chat" | "characters";

const sectionInitialTabs: Record<SidebarSectionId, StudioTab> = {
  script: "recent",
  storyboard: "video-list",
  "story-graph": "scripts-list",
  library: "community",
  settings: "new-prompt",
};

const studioTabRoutes: Record<StudioTab, string> = {
  "new-prompt": "/app/script/new-prompt",
  recent: "/app/script/recent",
  "scripts-list": "/app/script/scripts-list",
  "video-list": "/app/storyboard/video-list",
  community: "/app/library/community",
  trash: "/app/script/trash",
};

const promptModeCopy: Record<
  Exclude<PromptMode, "chat">,
  { bubble: string; icon: LucideIcon; label: string; prompt: string; tone: string }
> = {
  format: {
    bubble: "格式化可是我的拿手好戏！交给我，一秒变好莱坞专业排版！📐",
    icon: FileText,
    label: "整理格式",
    prompt:
      "帮我把以下这段杂乱的历史素材整理成符合标准的电影剧本格式：\n\n宋太祖赵匡胤在万岁殿暴雪之夜，与晋王赵光义对饮，赵匡胤用玉斧击地，大喊‘好为之’...",
    tone: "text-amber-600",
  },
  scratchpad: {
    bubble: "灵感电击！让我们把散乱的想法编织成网吧！💡",
    icon: Sparkles,
    label: "临时想法",
    prompt:
      "我有一个关于‘月球背面被遗忘的八十年代家属区’的科幻脑洞，想写成一出带有黑色幽默的荒诞短剧，请帮我脑暴一些剧情冲突和看点...",
    tone: "text-yellow-500",
  },
  writing: {
    bubble: "准备动笔！让我来为你铺陈最动人的台词... 🖋️",
    icon: Send,
    label: "写作",
    prompt:
      "为一对在散场后的鼓楼小剧场相遇的男女，创作一段充满理想主义色彩与都市疲惫感交织的深夜对话剧本。",
    tone: "text-blue-500",
  },
  plot: {
    bubble: "剧情骨架至关重要。让我们给故事打下坚不可摧的基石！🧱",
    icon: Film,
    label: "剧情",
    prompt:
      "为一部关于‘赛博朋克哈尔滨大教堂’的科幻悬疑电影，规划出标准的经典三幕式剧情大纲和关键转折点。",
    tone: "text-purple-500",
  },
  character: {
    bubble: "创造鲜活的灵魂！让我为你的角色注入矛盾与深度。👤",
    icon: User,
    label: "角色",
    prompt:
      "帮我设计一个立体的反派角色：一个身穿东正教祭披的生化半机械人神父，他坚信将人类意识转化为纯净代码是最高尚的赦免。",
    tone: "text-rose-500",
  },
};

const presetStoryboardImages = [
  "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1514306191717-452ec28c7814?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=800",
];

function isSidebarSectionId(value: string | undefined): value is SidebarSectionId {
  return sidebarItems.some((item) => item.id === value);
}

function loadStored<T>(key: string, fallback: T): T {
  try {
    const saved = window.localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch {
    return fallback;
  }
}

function isStudioTab(value: string | undefined): value is StudioTab {
  return (
    value === "new-prompt" ||
    value === "recent" ||
    value === "scripts-list" ||
    value === "video-list" ||
    value === "community" ||
    value === "trash"
  );
}

function filterScriptsByQuery(scripts: ScriptItem[], searchQuery: string) {
  const query = searchQuery.trim().toLowerCase();
  return scripts.filter(
    (script) =>
      !script.isTrash &&
      (script.title.toLowerCase().includes(query) ||
        script.description.toLowerCase().includes(query)),
  );
}

function filterVideosByQuery(
  videoProjects: VideoProject[],
  searchQuery: string,
) {
  const query = searchQuery.trim().toLowerCase();
  return videoProjects.filter(
    (project) =>
      !project.isTrash &&
      (project.title.toLowerCase().includes(query) ||
        project.description.toLowerCase().includes(query)),
  );
}

function buildGeneratedContent(mode: PromptMode, prompt: string, fileName: string | null) {
  const referenceLine = fileName ? `\n\n参考文件：${fileName}` : "";

  if (mode === "character") {
    return `人物设定：核心角色

身份：一个被信仰、技术与权力共同改写的人。

核心动机：把混乱的人类情感转译成可被保存、检索和复制的秩序。

内在冲突：他宣称自己在赦免世界，却无法承认最早被他抹除的其实是自己的恐惧。

外部冲突：旧时代的幸存者拒绝被上传，新的城市系统也开始质疑他的绝对权限。

可用镜头：银色祭披在冷光中像代码流一样抖动；他的声音同时来自扩音器、忏悔室和每个人的植入芯片。

原始提示：
${prompt}${referenceLine}`;
  }

  if (mode === "plot") {
    return `片名暂定：《霓虹暴雪》

第一幕：失踪
永远下雪的城市中，退役义体锅炉工老李收到一段来自孙女的残缺语音。线索指向被封锁的冰雕大教堂。

第二幕：追查
老李穿过旧工业区、地下热网和被算法接管的祷告大厅，发现神父正在把居民意识转换成纯净代码。

第三幕：对峙
教堂核心机房里，老李必须在毁掉系统与保留孙女数字残影之间做选择。暴雪停下时，城市第一次听见真实的人声。

关键转折：神父不是单纯反派，他曾经也试图拯救一场灾难，只是把“保存”误当成了“活着”。

原始提示：
${prompt}${referenceLine}`;
  }

  if (mode === "format") {
    return `场景：INT. 万岁殿 - 暴雪夜

殿内昏暗。巨烛在风声中摇晃，窗纸上映着两个不断拉长的身影。

赵匡胤倚在御榻上，呼吸沉重，手边的玉斧被烛火照得冷白。

赵光义站在台阶下，半张脸藏进阴影。

赵匡胤
（声音嘶哑）
再给朕斟一杯。

赵光义没有动。

赵光义
皇兄，太医说你不能再饮。

赵匡胤抓起玉斧，重重击地。

赵匡胤
好为之！好为之！

殿外的内侍只能看见巨大的影子猛然倒下。

原始提示：
${prompt}${referenceLine}`;
  }

  return `场景：鼓楼小剧场。深夜。

最后一束灯从舞台中央移开，空气里还悬着干冰和旧木地板的潮味。

林妙站在最后一排，手里还攥着没发完的工作消息。她本来只是想躲十分钟。

陈野从舞台边缘捡起纸飞机，抬头看见她。

陈野
演出结束了。

林妙
我知道。我只是想看看，一个没有观众的舞台还算不算舞台。

陈野笑了，把那只纸飞机轻轻抛向她。

陈野
算。只要还有人愿意留下来，它就还在演。

原始提示：
${prompt}${referenceLine}`;
}

function ModalFrame({
  children,
  maxWidth = "max-w-xl",
  onClose,
}: {
  children: ReactNode;
  maxWidth?: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div
        className={`bg-white rounded-3xl border border-[#dadad9] p-6 ${maxWidth} w-full relative max-h-[90vh] overflow-y-auto`}
      >
        <button
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-900 rounded-xl hover:bg-gray-100"
          onClick={onClose}
          type="button"
        >
          <X size={18} />
        </button>
        {children}
      </div>
    </div>
  );
}

export default function AppView() {
  const navigate = useNavigate();
  const { pageId, sectionId } = useParams<{
    pageId?: string;
    sectionId: string;
  }>();
  const safeSectionId = isSidebarSectionId(sectionId) ? sectionId : "script";

  const [activeTab, setActiveTab] = useState<StudioTab>(
    () => (isStudioTab(pageId) ? pageId : sectionInitialTabs[safeSectionId]),
  );
  const [scripts, setScripts] = useState<ScriptItem[]>(() =>
    loadStored("studio_scripts", initialScripts),
  );
  const [videoProjects, setVideoProjects] = useState<VideoProject[]>(() =>
    loadStored("studio_video_projects", initialVideoProjects),
  );
  const [communityItems, setCommunityItems] =
    useState<CommunityItem[]>(initialCommunityItems);
  const [activeScriptId, setActiveScriptId] = useState<string | null>(null);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [username, setUsername] = useState("leejuju");

  const [showUpdatesModal, setShowUpdatesModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const [promptInput, setPromptInput] = useState("");
  const [selectedMode, setSelectedMode] = useState<PromptMode>("chat");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const [scriptTitle, setScriptTitle] = useState("");
  const [scriptContent, setScriptContent] = useState("");
  const [scriptCharacters, setScriptCharacters] = useState<Character[]>([]);
  const [aiChatInput, setAiChatInput] = useState("");
  const [aiMessages, setAiMessages] = useState<
    Array<{ sender: "user" | "ai"; text: string }>
  >([
    {
      sender: "ai",
      text: "你好！我是剧画 AI 创作助手。我可以帮你续写台词、规划冲突，或者进行人物小传设计。今天想聊聊哪个段落？",
    },
  ]);
  const [aiPanelTab, setAiPanelTab] = useState<AiPanelTab>("tools");
  const [editorGenerating, setEditorGenerating] = useState(false);

  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [storyboardGenerating, setStoryboardGenerating] = useState(false);
  const [showSlideshow, setShowSlideshow] = useState(false);
  const [slideshowIndex, setSlideshowIndex] = useState(0);
  const [slideshowPlaying, setSlideshowPlaying] = useState(false);
  const [newProjectAspect, setNewProjectAspect] =
    useState<VideoProject["aspectRatio"]>("16:9");

  const activeVideo = useMemo(
    () => videoProjects.find((project) => project.id === activeVideoId),
    [activeVideoId, videoProjects],
  );

  const recentScripts = useMemo(
    () => filterScriptsByQuery(scripts, ""),
    [scripts],
  );

  const recentVideos = useMemo(
    () => filterVideosByQuery(videoProjects, ""),
    [videoProjects],
  );

  const scriptListScripts = useMemo(
    () => filterScriptsByQuery(scripts, ""),
    [scripts],
  );

  useEffect(() => {
    if (isSidebarSectionId(sectionId)) {
      setActiveTab(isStudioTab(pageId) ? pageId : sectionInitialTabs[sectionId]);
      setActiveScriptId(null);
      setActiveVideoId(null);
    }
  }, [pageId, sectionId]);

  useEffect(() => {
    window.localStorage.setItem("studio_scripts", JSON.stringify(scripts));
  }, [scripts]);

  useEffect(() => {
    window.localStorage.setItem(
      "studio_video_projects",
      JSON.stringify(videoProjects),
    );
  }, [videoProjects]);

  useEffect(() => {
    if (!activeScriptId) return;
    setScripts((previous) =>
      previous.map((script) =>
        script.id === activeScriptId
          ? {
              ...script,
              title: scriptTitle,
              content: scriptContent,
              characters: scriptCharacters,
              lastEdited: "刚刚",
            }
          : script,
      ),
    );
  }, [activeScriptId, scriptCharacters, scriptContent, scriptTitle]);

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

  const clearEditors = () => {
    setActiveScriptId(null);
    setActiveVideoId(null);
  };

  const setSidebarTab = (tab: StudioTab) => {
    clearEditors();
    setActiveTab(tab);
    navigate(studioTabRoutes[tab]);
  };

  const handleModeChange = (mode: PromptMode) => {
    setSelectedMode(mode);

    if (mode === "chat") {
      setPromptInput("");
      return;
    }

    const copy = promptModeCopy[mode];
    setPromptInput(copy.prompt);
  };

  const openScript = (script: ScriptItem) => {
    setActiveScriptId(script.id);
    setActiveVideoId(null);
    setScriptTitle(script.title);
    setScriptContent(script.content);
    setScriptCharacters(script.characters || []);
    setActiveTab("scripts-list");
  };

  const openVideo = (project: VideoProject) => {
    setActiveVideoId(project.id);
    setActiveScriptId(null);
    setActiveSceneIndex(0);
    setActiveTab("video-list");
  };

  const handleCreateNewScript = () => {
    const newScript: ScriptItem = {
      id: `script-${Date.now()}`,
      title: "未命名剧本",
      description: "开始你的创作之旅...",
      content:
        "场景：[时间]，[地点]。[环境描述]。\n\n[角色名字]\n（[神态动作]）\n[台词对话...]\n",
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
      description: "以制作AI影像为目的",
      aspectRatio: newProjectAspect,
      scenes: [
        {
          id: "scene-1",
          title: "场景一：故事的起点",
          scriptText:
            "在此输入第一幕的视觉分镜描述，例如：一个在雨中孤独伫立在钟楼下的少女，手里拿着一封被雨水浸湿的信。",
          imageUrl:
            "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=800",
        },
      ],
      lastEdited: "刚刚",
      createdAt: new Date().toISOString(),
    };

    setVideoProjects((previous) => [newProject, ...previous]);
    openVideo(newProject);
  };

  const handleHomeSubmit = (event?: FormEvent) => {
    event?.preventDefault();
    if (!promptInput.trim()) return;

    const tempId = `script-${Date.now()}`;
    const newScript: ScriptItem = {
      id: tempId,
      title: `${
        selectedMode === "character"
          ? "AI 角色设定"
          : selectedMode === "plot"
            ? "AI 剧情大纲"
            : "新创作草稿"
      } - ${new Date().toLocaleDateString()}`,
      description: "AI 实时生成中...",
      content: `/* 剧画 AI 正在拼命码字中... 请稍候... */\n\n您的灵感Prompt:\n${promptInput}`,
      characters: [],
      lastEdited: "刚刚",
      createdAt: new Date().toISOString(),
    };

    setScripts((previous) => [newScript, ...previous]);
    openScript(newScript);
    setEditorGenerating(true);

    window.setTimeout(() => {
      const generatedContent = buildGeneratedContent(
        selectedMode,
        promptInput,
        uploadedFileName,
      );
      const generatedCharacters =
        selectedMode === "character"
          ? [
              {
                id: "char-ai-1",
                name: "核心角色",
                role: "核心人物",
                motivation: "参见大纲",
                conflict: "内在对抗",
                description: "由AI一键生成",
              },
            ]
          : [];

      setScripts((previous) =>
        previous.map((script) =>
          script.id === tempId
            ? {
                ...script,
                description: "完成于 " + new Date().toLocaleTimeString(),
                content: generatedContent,
                characters: generatedCharacters,
              }
            : script,
        ),
      );
      setScriptContent(generatedContent);
      setScriptCharacters(generatedCharacters);
      setEditorGenerating(false);
      setUploadedFileName(null);
    }, 500);
  };

  const triggerMockUpload = () => {
    setIsUploading(true);
    window.setTimeout(() => {
      setIsUploading(false);
      setUploadedFileName("灵感大纲素材_Draft_v1.txt");
    }, 700);
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    triggerMockUpload();
  };

  const handlePromptKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleHomeSubmit();
    }
  };

  const moveToTrash = (id: string, type: "script" | "video") => {
    if (type === "script") {
      setScripts((previous) =>
        previous.map((script) =>
          script.id === id ? { ...script, isTrash: true } : script,
        ),
      );
      if (activeScriptId === id) setActiveScriptId(null);
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

  const importCommunityScript = (item: CommunityItem) => {
    const newScript: ScriptItem = {
      id: `script-import-${Date.now()}`,
      title: `${item.title} (导入)`,
      description: `导入自社区作者 @${item.author}`,
      content:
        item.content === "（内容见示例：烛影斧声）"
          ? scripts.find((script) => script.id === "script-1")?.content || ""
          : item.content,
      characters: [],
      lastEdited: "刚刚",
      createdAt: new Date().toISOString(),
    };

    setScripts((previous) => [newScript, ...previous]);
    openScript(newScript);
  };

  const likeCommunityItem = (id: string) => {
    setCommunityItems((previous) =>
      previous.map((item) =>
        item.id === id
          ? {
              ...item,
              likes: item.hasLiked ? item.likes - 1 : item.likes + 1,
              hasLiked: !item.hasLiked,
            }
          : item,
      ),
    );
  };

  const exportAsTxt = () => {
    const element = document.createElement("a");
    const file = new Blob([`《${scriptTitle}》\n\n${scriptContent}`], {
      type: "text/plain;charset=utf-8",
    });
    element.href = URL.createObjectURL(file);
    element.download = `${scriptTitle || "未命名剧本"}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleSendEditorChat = () => {
    if (!aiChatInput.trim() || !activeScriptId) return;

    const userMessage = aiChatInput;
    setAiMessages((previous) => [
      ...previous,
      { sender: "user", text: userMessage },
    ]);
    setAiChatInput("");
    setEditorGenerating(true);

    window.setTimeout(() => {
      setAiMessages((previous) => [
        ...previous,
        {
          sender: "ai",
          text: `我会从“冲突更明确、动作更可拍、台词更短”三个方向处理。针对你的问题：${userMessage}`,
        },
      ]);
      setEditorGenerating(false);
    }, 450);
  };

  const runEditorQuickTool = (action: "continue" | "format" | "character") => {
    if (!activeScriptId) return;

    setEditorGenerating(true);

    window.setTimeout(() => {
      if (action === "continue") {
        setScriptContent(
          (previous) =>
            `${previous}\n\n场景：INT. 走廊 - 连续\n\n门外的脚步声越来越近。角色没有回头，只把那封信压进剧本最后一页。\n\n角色\n（压低声音）\n如果今天之后还有人问起，就说我们从没来过这里。`,
        );
      } else if (action === "format") {
        setScriptContent((previous) =>
          previous
            .replaceAll("场景：", "场景：")
            .replaceAll("（", "\n（")
            .replaceAll("）", "）\n")
            .trim(),
        );
      } else {
        const newCharacter: Character = {
          id: `char-gen-${Date.now()}`,
          name: "分析所得人物",
          role: "分析结果",
          motivation: "从剧本提炼",
          conflict: "深度剧作矛盾",
          description:
            "这个角色需要在公开目标和真实恐惧之间保持张力，适合用短句台词和克制动作表现。",
        };
        setScriptCharacters((previous) => [...previous, newCharacter]);
        setAiPanelTab("characters");
      }

      setEditorGenerating(false);
    }, 450);
  };

  const generateStoryboardImg = (sceneId: string) => {
    setStoryboardGenerating(true);

    window.setTimeout(() => {
      const nextImage =
        presetStoryboardImages[Math.floor(Math.random() * presetStoryboardImages.length)];
      setVideoProjects((previous) =>
        previous.map((project) =>
          project.id === activeVideoId
            ? {
                ...project,
                scenes: project.scenes.map((scene) =>
                  scene.id === sceneId ? { ...scene, imageUrl: nextImage } : scene,
                ),
              }
            : project,
        ),
      );
      setStoryboardGenerating(false);
    }, 550);
  };

  const addSceneToActiveVideo = () => {
    if (!activeVideo) return;

    const newScene = {
      id: `scene-${Date.now()}`,
      title: `场景 ${activeVideo.scenes.length + 1}：新增视觉切片`,
      scriptText: "在此输入视觉分镜描述，点击AI智能绘图渲染...",
      imageUrl:
        "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=800",
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

  const updateActiveScene = (
    updater: (scene: VideoProject["scenes"][number]) => VideoProject["scenes"][number],
  ) => {
    setVideoProjects((previous) =>
      previous.map((project) =>
        project.id === activeVideoId
          ? {
              ...project,
              scenes: project.scenes.map((scene, index) =>
                index === activeSceneIndex ? updater(scene) : scene,
              ),
            }
          : project,
      ),
    );
  };

  const removeActiveScene = () => {
    if (!activeVideo) return;
    if (activeVideo.scenes.length <= 1) {
      window.alert("必须保留至少一个故事板画面。");
      return;
    }

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
    <div className="studio-shell flex h-screen w-screen overflow-hidden bg-[#f3f4f3] selection:bg-brand-secondary/20 selection:text-brand-secondary">
      <Sidebar
        activeTab={activeTab}
        hasOpenScript={Boolean(activeScriptId)}
        hasOpenVideo={Boolean(activeVideoId)}
        onProfile={() => setShowProfileModal(true)}
        onSelectTab={setSidebarTab}
        onUpdates={() => setShowUpdatesModal(true)}
        username={username}
      />

      <main className="flex-1 flex flex-col min-w-0 bg-[#f3f4f3] relative">
        <>
          {activeTab === "new-prompt" && !activeScriptId && !activeVideoId ? (
            <NewPromptPage
              isUploading={isUploading}
              onClearUploadedFile={() => setUploadedFileName(null)}
              onDrop={handleDrop}
              onModeChange={handleModeChange}
              onPromptChange={setPromptInput}
              onPromptKeyDown={handlePromptKeyDown}
              onSubmit={handleHomeSubmit}
              onTriggerUpload={triggerMockUpload}
              promptInput={promptInput}
              promptModeCopy={promptModeCopy}
              selectedMode={selectedMode}
              uploadedFileName={uploadedFileName}
              username={username}
            />
          ) : null}

          {activeTab === "recent" && !activeScriptId && !activeVideoId ? (
            <RecentPage
              onCreateNewScript={handleCreateNewScript}
              onCreateNewVideoProject={handleCreateNewVideoProject}
              onOpenScript={openScript}
              onOpenVideo={openVideo}
              onTrashScript={(id) => moveToTrash(id, "script")}
              onTrashVideo={(id) => moveToTrash(id, "video")}
              scripts={recentScripts}
              videoProjects={recentVideos}
            />
          ) : null}

          {activeTab === "scripts-list" && !activeScriptId && !activeVideoId ? (
            <ScriptsListPage
              onCreateNewScript={handleCreateNewScript}
              onOpenScript={openScript}
              onTrashScript={(id) => moveToTrash(id, "script")}
              scripts={scriptListScripts}
            />
          ) : null}

          {activeTab === "community" && !activeScriptId && !activeVideoId ? (
            <CommunityPage
              communityItems={communityItems}
              onImportCommunityScript={importCommunityScript}
              onLikeCommunityItem={likeCommunityItem}
            />
          ) : null}

          {activeTab === "trash" && !activeScriptId && !activeVideoId ? (
            <TrashPage
              onDeletePermanently={deletePermanently}
              onRestoreFromTrash={restoreFromTrash}
              trashedScripts={trashedScripts}
              trashedVideos={trashedVideos}
            />
          ) : null}

          {activeScriptId ? (
            <section className="studio-page-script-editor flex-1 min-h-0 overflow-hidden">
              <div className="flex h-full w-full bg-brand-surface">
                <div className="flex-1 flex flex-col border-r border-[#e2e2e2] bg-white h-full relative min-w-0">
                <div className="h-12 border-b border-[#eeeeed] px-4 flex items-center justify-between bg-[#fcfcfc] gap-4">
                  <div className="flex items-center gap-2 min-w-0 w-1/2">
                    <input
                      className="text-base font-bold text-gray-900 border-b border-transparent hover:border-gray-300 focus:border-brand-primary focus:outline-none px-1 py-0.5 w-full bg-transparent"
                      onChange={(event) => setScriptTitle(event.target.value)}
                      type="text"
                      value={scriptTitle}
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[
                      ["场景", "\n场景：[INT/EXT. 地点 - 时间]\n"],
                      ["动作", "\n动作段落...\n"],
                      ["对话", "\n角色名\n（神态姿势）\n【对话】\n"],
                    ].map(([label, insert]) => (
                      <button
                        className="px-2.5 py-1 text-[11px] font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg"
                        key={label}
                        onClick={() =>
                          setScriptContent((previous) => previous + insert)
                        }
                        type="button"
                      >
                        {label}
                      </button>
                    ))}
                    <span className="w-px h-5 bg-gray-200 mx-1" />
                    <button
                      className="p-1.5 hover:bg-gray-100 text-gray-600 hover:text-gray-900 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                      onClick={exportAsTxt}
                      type="button"
                    >
                      <Download size={15} />
                      <span className="hidden sm:inline">导出</span>
                    </button>
                  </div>
                </div>

                <div className="flex-1 p-8 overflow-y-auto screenplay-editor bg-[#fdfdfc] flex justify-center">
                  <div className="w-full max-w-[650px] relative">
                    <textarea
                      className="w-full h-[85vh] bg-transparent border-none outline-none focus:ring-0 font-mono text-sm leading-relaxed text-gray-800 resize-none placeholder-gray-400"
                      onChange={(event) => setScriptContent(event.target.value)}
                      placeholder={"/* 在此输入标准好莱坞格式剧本 */\n\n场景：INT. 鼓楼小剧场 - 深夜\n\n一阵干冰白雾渐渐消退。陈野在微弱聚光灯下俯身捡起一只纸飞机。"}
                      value={scriptContent}
                    />
                  </div>
                </div>
              </div>

              <aside className="w-80 flex-shrink-0 flex flex-col bg-[#f3f4f3] border-l border-[#e2e2e2] h-full">
                <div className="flex border-b border-[#eeeeed]">
                  {[
                    ["tools", "AI 诊治工具"],
                    ["chat", "创意对话"],
                    ["characters", `角色卡 (${scriptCharacters.length})`],
                  ].map(([tab, label]) => (
                    <button
                      className={`flex-1 py-3 text-xs font-bold border-b-2 transition-all ${
                        aiPanelTab === tab
                          ? "border-brand-primary text-brand-primary bg-white"
                          : "border-transparent text-gray-500 hover:bg-gray-100"
                      }`}
                      key={tab}
                      onClick={() => setAiPanelTab(tab as AiPanelTab)}
                      type="button"
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {aiPanelTab === "tools" ? (
                  <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <h4 className="text-xs font-bold text-gray-900 mb-2 flex items-center gap-1">
                        <Sparkles size={14} className="text-amber-500" />
                        <span>即时 AI 剧作助理</span>
                      </h4>
                      <p className="text-[11px] text-gray-500 leading-normal mb-3">
                        基于双子星模型。我们将提取您的当前剧情并执行智能补完或修正。
                      </p>
                      <div className="space-y-2">
                        <EditorToolButton
                          busy={editorGenerating}
                          icon={Plus}
                          label="续写下一幕"
                          onClick={() => runEditorQuickTool("continue")}
                          primary
                        />
                        <EditorToolButton
                          busy={editorGenerating}
                          icon={FileText}
                          label="智能格式化整顿"
                          onClick={() => runEditorQuickTool("format")}
                        />
                        <EditorToolButton
                          busy={editorGenerating}
                          icon={User}
                          label="提炼本剧场角色设定"
                          onClick={() => runEditorQuickTool("character")}
                        />
                      </div>
                    </div>

                    <div className="bg-amber-50/70 rounded-xl border border-amber-200 p-3 flex gap-2">
                      <AlertCircle
                        className="text-amber-600 flex-shrink-0 mt-0.5"
                        size={16}
                      />
                      <div className="text-[10px] text-amber-800 leading-normal">
                        <strong>排版提示：</strong>
                        好莱坞标准格式通常包含 SCENE SLUGLINE
                        (大写)、CHARACTER NAMES
                        居中、以及动作段落的精炼描写。点击上面“智能格式化”可一键整容。
                      </div>
                    </div>
                  </div>
                ) : null}

                {aiPanelTab === "chat" ? (
                  <div className="flex-grow flex flex-col justify-between overflow-hidden">
                    <div className="flex-1 p-4 overflow-y-auto space-y-3">
                      {aiMessages.map((message, index) => (
                        <div
                          className={`max-w-[85%] rounded-xl p-3 text-xs leading-relaxed shadow-sm ${
                            message.sender === "user"
                              ? "bg-brand-primary text-white ml-auto rounded-tr-none"
                              : "bg-white text-gray-800 rounded-tl-none border border-gray-200"
                          }`}
                          key={`${message.sender}-${index}`}
                        >
                          {message.text}
                        </div>
                      ))}
                    </div>
                    <div className="p-3 bg-white border-t border-[#eeeeed] flex items-center gap-2">
                      <input
                        className="flex-1 text-xs bg-[#f3f4f3] px-3 py-2 rounded-lg border border-transparent focus:border-gray-300 focus:outline-none"
                        onChange={(event) => setAiChatInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") handleSendEditorChat();
                        }}
                        placeholder="给智能剧本助手提建议..."
                        type="text"
                        value={aiChatInput}
                      />
                      <button
                        className="p-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/95 transition-colors"
                        onClick={handleSendEditorChat}
                        type="button"
                      >
                        <Send size={14} />
                      </button>
                    </div>
                  </div>
                ) : null}

                {aiPanelTab === "characters" ? (
                  <div className="flex-grow p-4 overflow-y-auto space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-500">
                        剧场演员 / 角色库
                      </span>
                      <button
                        className="text-[10px] bg-brand-primary text-white hover:bg-brand-primary/90 px-2 py-1 rounded-lg font-bold"
                        onClick={() => {
                          const name = window.prompt("输入新角色姓名：");
                          if (!name) return;
                          const newCharacter: Character = {
                            id: `char-manual-${Date.now()}`,
                            name,
                            role:
                              window.prompt("输入角色剧作定位 (如：配角、主角)：") ||
                              "定位",
                            motivation: window.prompt("核心动机：") || "动机描述",
                            conflict:
                              window.prompt("面临的矛盾冲突：") || "戏剧矛盾",
                            description:
                              window.prompt("外貌或性格描述：") || "暂无详细描述",
                          };
                          setScriptCharacters((previous) => [
                            ...previous,
                            newCharacter,
                          ]);
                        }}
                        type="button"
                      >
                        + 手动新增
                      </button>
                    </div>
                    {scriptCharacters.length === 0 ? (
                      <div className="text-center py-8 bg-white rounded-xl border border-dashed border-gray-200 text-xs text-gray-400">
                        当前尚无角色，可以前往“AI 诊治工具”一键分析提炼！👤
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {scriptCharacters.map((character) => (
                          <div
                            className="bg-white rounded-xl border border-gray-200 p-3 text-xs relative group"
                            key={character.id}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-gray-900">
                                {character.name}
                              </span>
                              <span className="text-[10px] text-brand-secondary bg-brand-secondary/10 px-1.5 py-0.5 rounded-full font-bold">
                                {character.role}
                              </span>
                            </div>
                            <div className="text-gray-600 mt-1 space-y-1">
                              <p>
                                <strong className="text-gray-800">动机:</strong>{" "}
                                {character.motivation}
                              </p>
                              <p>
                                <strong className="text-gray-800">冲突:</strong>{" "}
                                {character.conflict}
                              </p>
                              <p className="text-gray-400 border-t border-[#f3f4f3] pt-1 mt-1 text-[11px] leading-relaxed">
                                {character.description}
                              </p>
                            </div>
                            <button
                              className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() =>
                                setScriptCharacters((previous) =>
                                  previous.filter(
                                    (item) => item.id !== character.id,
                                  ),
                                )
                              }
                              type="button"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
                </aside>
              </div>
            </section>
          ) : null}

          {activeVideoId && activeVideo ? (
            <section className="studio-page-storyboard flex-1 min-h-0 overflow-hidden">
              <div className="flex flex-col h-full bg-brand-surface">
                <div className="flex-1 flex flex-col md:flex-row h-full">
                  <div className="flex-1 p-6 overflow-y-auto space-y-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-mono text-brand-secondary uppercase tracking-widest font-bold">
                        VISION STORYBOARD BOARD
                      </span>
                      <h2 className="text-xl font-bold text-gray-900 mt-0.5">
                        {activeVideo.title}
                      </h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="bg-brand-primary hover:bg-brand-primary/95 text-white text-xs px-4 py-2 rounded-xl font-bold transition-all shadow-sm flex items-center gap-1.5"
                        onClick={() => {
                          setShowSlideshow(true);
                          setSlideshowIndex(0);
                          setSlideshowPlaying(true);
                        }}
                        type="button"
                      >
                        <Play size={13} fill="currentColor" />
                        <span>播放分镜预告</span>
                      </button>
                      <button
                        className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 text-xs px-3 py-2 rounded-xl font-bold shadow-sm flex items-center gap-1"
                        onClick={addSceneToActiveVideo}
                        type="button"
                      >
                        <Plus size={14} />
                        <span>添加幕节</span>
                      </button>
                    </div>
                  </div>

                  {currentScene ? (
                    <div className="bg-white rounded-3xl border border-[#dadad9] p-6 shadow-md grid grid-cols-1 lg:grid-cols-12 gap-6 relative overflow-hidden">
                      <div className="lg:col-span-7 flex flex-col justify-between">
                        <div className="relative bg-black rounded-2xl border border-gray-200 overflow-hidden group aspect-video">
                          {currentScene.imageUrl ? (
                            <img
                              alt=""
                              className="w-full h-full object-cover"
                              src={currentScene.imageUrl}
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-center text-gray-400 p-4">
                              <Film size={40} className="text-gray-300 mb-2" />
                              <p className="text-xs font-semibold">无分镜示意图</p>
                              <p className="text-[10px] text-gray-500 mt-1">
                                输入右侧场景描述，让 AI 生成专属故事底版
                              </p>
                            </div>
                          )}

                          {storyboardGenerating ? (
                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white">
                              <RefreshCw
                                className="animate-spin text-brand-secondary mb-2"
                                size={32}
                              />
                              <p className="text-xs font-semibold">
                                AI 故事板极速生成中...
                              </p>
                              <p className="text-[10px] text-gray-400 mt-1">
                                使用双子星图像矩阵芯片渲染
                              </p>
                            </div>
                          ) : null}
                        </div>

                        <div className="mt-3">
                          <span className="text-[11px] text-gray-400 font-bold block mb-1">
                            精美电影感预设图片底稿：
                          </span>
                          <div className="flex gap-2">
                            {presetStoryboardImages.map((url) => (
                              <button
                                className="w-12 h-9 rounded overflow-hidden border border-gray-200 hover:border-brand-secondary transition-all"
                                key={url}
                                onClick={() =>
                                  updateActiveScene((scene) => ({
                                    ...scene,
                                    imageUrl: url,
                                  }))
                                }
                                type="button"
                              >
                                <img
                                  alt=""
                                  className="w-full h-full object-cover"
                                  src={url}
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="lg:col-span-5 flex flex-col justify-between">
                        <div className="space-y-4">
                          <div>
                            <label className="text-[10px] text-gray-400 font-bold block mb-1">
                              分镜幕节标题
                            </label>
                            <input
                              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-900 focus:outline-none focus:border-brand-secondary focus:bg-white transition-all"
                              onChange={(event) =>
                                updateActiveScene((scene) => ({
                                  ...scene,
                                  title: event.target.value,
                                }))
                              }
                              type="text"
                              value={currentScene.title}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-400 font-bold block mb-1">
                              画面视觉提示 / 导演指导（AI绘图参考）
                            </label>
                            <textarea
                              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs leading-relaxed text-gray-700 focus:outline-none focus:border-brand-secondary focus:bg-white transition-all resize-none"
                              onChange={(event) =>
                                updateActiveScene((scene) => ({
                                  ...scene,
                                  scriptText: event.target.value,
                                }))
                              }
                              rows={5}
                              value={currentScene.scriptText}
                            />
                          </div>
                        </div>
                        <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between gap-4">
                          <button
                            className="text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                            onClick={removeActiveScene}
                            type="button"
                          >
                            删除本幕
                          </button>
                          <button
                            className="bg-brand-secondary hover:bg-brand-secondary/95 text-white text-xs px-4 py-2 rounded-xl font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
                            disabled={storyboardGenerating}
                            onClick={() => generateStoryboardImg(currentScene.id)}
                            type="button"
                          >
                            <Sparkles size={13} />
                            <span>AI 智能绘图</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <h3 className="text-xs font-bold text-gray-500 mb-3">
                      分镜幕节列表 ({activeVideo.scenes.length})
                    </h3>
                    <div className="flex gap-4 overflow-x-auto pb-4">
                      {activeVideo.scenes.map((scene, index) => (
                        <button
                          className={`flex-shrink-0 w-44 bg-white rounded-2xl border-2 p-3 cursor-pointer transition-all text-left ${
                            activeSceneIndex === index
                              ? "border-brand-secondary shadow-md scale-[1.02]"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                          key={scene.id}
                          onClick={() => setActiveSceneIndex(index)}
                          type="button"
                        >
                          <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden mb-2 border border-gray-200">
                            {scene.imageUrl ? (
                              <img
                                alt=""
                                className="w-full h-full object-cover"
                                src={scene.imageUrl}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">
                                未渲染
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] text-brand-secondary font-mono block font-bold">
                            ACT {index + 1}
                          </span>
                          <h4 className="text-xs font-bold text-gray-900 truncate mt-0.5">
                            {scene.title}
                          </h4>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                </div>
              </div>
            </section>
          ) : null}
        </>
      </main>

      {showUpdatesModal ? (
        <ModalFrame onClose={() => setShowUpdatesModal(false)}>
          <h3 className="text-lg font-bold text-gray-900 font-display mb-4">
            📢 剧画研发部发布：产品更新公告
          </h3>
          <div className="space-y-6">
            {initialUpdateNotes.map((note) => (
              <div
                className="border-b border-gray-100 pb-5 last:border-none last:pb-0"
                key={note.id}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-brand-primary font-mono bg-brand-primary/10 px-2 py-0.5 rounded-full">
                    {note.version}
                  </span>
                  <span className="text-xs text-gray-400 font-mono">
                    {note.date}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-gray-800 mt-2">
                  {note.title}
                </h4>
                <ul className="mt-3 space-y-2">
                  {note.highlights.map((item) => (
                    <li
                      className="text-xs text-gray-600 flex gap-2 items-start leading-relaxed"
                      key={item}
                    >
                      <Check
                        className="text-brand-secondary flex-shrink-0 mt-0.5"
                        size={14}
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </ModalFrame>
      ) : null}

      {showProfileModal ? (
        <ModalFrame maxWidth="max-w-sm" onClose={() => setShowProfileModal(false)}>
          <div className="text-center mb-5">
            <div className="w-16 h-16 rounded-full bg-brand-secondary text-white text-2xl font-bold flex items-center justify-center mx-auto mb-3 shadow-md">
              LE
            </div>
            <h3 className="text-base font-bold text-gray-900">个人账户设置</h3>
            <p className="text-xs text-gray-400">管理您的编剧笔名和创作偏好</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1 font-semibold">
                编剧笔名
              </label>
              <input
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-primary focus:bg-white transition-all"
                onChange={(event) => setUsername(event.target.value)}
                type="text"
                value={username}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1 font-semibold">
                开发者 API Key
              </label>
              <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between text-xs text-gray-500">
                <span>已通过 AI Studio 安全注入</span>
                <span className="text-[10px] bg-green-500/10 text-green-700 px-1.5 py-0.5 rounded-full font-bold">
                  已就绪
                </span>
              </div>
            </div>
            <div className="bg-[#fcfcfc] rounded-xl border border-gray-100 p-3 text-[11px] text-gray-500 space-y-1">
              <p>
                <strong>当前身份:</strong> 实习编剧 (Junior)
              </p>
              <p>
                <strong>注册邮箱:</strong> QQ1224307033@gmail.com
              </p>
              <p>
                <strong>物理节点:</strong> 中国 湖北 武汉
              </p>
            </div>
            <button
              className="w-full py-2 bg-brand-primary text-white hover:bg-brand-primary/95 text-xs font-bold rounded-xl shadow-sm transition-all text-center cursor-pointer"
              onClick={() => setShowProfileModal(false)}
              type="button"
            >
              保存并退出
            </button>
          </div>
        </ModalFrame>
      ) : null}

      {showSlideshow && activeVideo ? (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col justify-between p-6 text-white animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-brand-secondary font-mono uppercase tracking-widest font-bold">
                CINEMATIC PREVIEW SLIDESHOW
              </span>
              <h3 className="text-lg font-bold mt-0.5">{activeVideo.title}</h3>
            </div>
            <button
              className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
              onClick={() => {
                setShowSlideshow(false);
                setSlideshowPlaying(false);
              }}
              type="button"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto my-8 relative w-full">
            <div className="w-full aspect-video rounded-3xl border border-white/10 overflow-hidden shadow-2xl relative bg-black">
              {activeVideo.scenes[slideshowIndex]?.imageUrl ? (
                <img
                  alt=""
                  className="w-full h-full object-cover animate-pulse-slow transition-all duration-700"
                  src={activeVideo.scenes[slideshowIndex].imageUrl}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  无此幕预览图
                </div>
              )}
              <div className="absolute bottom-6 left-6 right-6 bg-black/70 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center animate-slide-up">
                <p className="text-[11px] text-brand-secondary font-mono tracking-widest uppercase font-bold mb-1">
                  ACT {slideshowIndex + 1} / {activeVideo.scenes.length} •{" "}
                  {activeVideo.scenes[slideshowIndex]?.title}
                </p>
                <p className="text-sm leading-relaxed text-gray-100 font-sans select-none max-w-2xl mx-auto">
                  {activeVideo.scenes[slideshowIndex]?.scriptText}
                </p>
              </div>
            </div>

            <button
              className="absolute top-1/2 -translate-y-1/2 left-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              onClick={() => {
                setSlideshowIndex((previous) =>
                  previous === 0 ? activeVideo.scenes.length - 1 : previous - 1,
                );
                setSlideshowPlaying(false);
              }}
              type="button"
            >
              ←
            </button>
            <button
              className="absolute top-1/2 -translate-y-1/2 right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              onClick={() => {
                setSlideshowIndex((previous) =>
                  previous === activeVideo.scenes.length - 1 ? 0 : previous + 1,
                );
                setSlideshowPlaying(false);
              }}
              type="button"
            >
              →
            </button>
          </div>

          <div className="flex items-center justify-center gap-4 py-2 border-t border-white/10">
            <button
              className="px-6 py-2 bg-brand-secondary text-white rounded-full text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
              onClick={() => setSlideshowPlaying(!slideshowPlaying)}
              type="button"
            >
              {slideshowPlaying ? (
                <>
                  <span className="w-2 h-2 rounded bg-white inline-block animate-ping" />
                  <span>正在播放幻灯分镜</span>
                </>
              ) : (
                <span>继续自动轮播</span>
              )}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EditorToolButton({
  busy,
  icon: Icon,
  label,
  onClick,
  primary = false,
}: {
  busy: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      className={`w-full py-2 text-xs font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
        primary
          ? "bg-brand-primary text-white hover:bg-brand-primary/95"
          : "bg-white hover:bg-gray-50 border border-gray-200 text-gray-800"
      }`}
      disabled={busy}
      onClick={onClick}
      type="button"
    >
      {busy ? (
        <RefreshCw size={13} className="animate-spin" />
      ) : (
        <Icon size={14} className={primary ? "" : "text-gray-500"} />
      )}
      <span>{label}</span>
    </button>
  );
}
