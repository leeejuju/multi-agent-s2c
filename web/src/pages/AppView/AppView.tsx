import { useEffect, useMemo, useState } from "react";
import type { DragEvent, FormEvent, KeyboardEvent } from "react";
import {
  FileText,
  Film,
  Send,
  Sparkles,
  User,
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
import ScriptEditorPage, {
  type AiPanelTab,
  type EditorQuickAction,
} from "./components/ScriptEditorPage";
import ScriptsListPage from "./components/ScriptsListPage";
import StoryboardEditorPage from "./components/StoryboardEditorPage";
import {
  ProfileModal,
  SlideshowModal,
  UpdatesModal,
} from "./components/StudioModals";
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
      aspectRatio: "16:9",
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

  const runEditorQuickTool = (action: EditorQuickAction) => {
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

  const addManualCharacter = () => {
    const name = window.prompt("输入新角色姓名：");
    if (!name) return;

    setScriptCharacters((previous) => [
      ...previous,
      {
        id: `char-manual-${Date.now()}`,
        name,
        role: window.prompt("输入角色剧作定位 (如：配角、主角)：") || "定位",
        motivation: window.prompt("核心动机：") || "动机描述",
        conflict: window.prompt("面临的矛盾冲突：") || "戏剧矛盾",
        description: window.prompt("外貌或性格描述：") || "暂无详细描述",
      },
    ]);
  };

  const removeCharacter = (id: string) => {
    setScriptCharacters((previous) =>
      previous.filter((character) => character.id !== id),
    );
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
            <ScriptEditorPage
              aiChatInput={aiChatInput}
              aiMessages={aiMessages}
              aiPanelTab={aiPanelTab}
              characters={scriptCharacters}
              content={scriptContent}
              editorGenerating={editorGenerating}
              onAddCharacter={addManualCharacter}
              onAiChatInputChange={setAiChatInput}
              onAiPanelTabChange={setAiPanelTab}
              onContentChange={setScriptContent}
              onExport={exportAsTxt}
              onQuickTool={runEditorQuickTool}
              onRemoveCharacter={removeCharacter}
              onSendEditorChat={handleSendEditorChat}
              onTitleChange={setScriptTitle}
              title={scriptTitle}
            />
          ) : null}

          {activeVideoId && activeVideo ? (
            <StoryboardEditorPage
              activeSceneIndex={activeSceneIndex}
              currentScene={currentScene}
              generating={storyboardGenerating}
              onActiveSceneChange={setActiveSceneIndex}
              onAddScene={addSceneToActiveVideo}
              onGenerateScene={generateStoryboardImg}
              onPlay={() => {
                setShowSlideshow(true);
                setSlideshowIndex(0);
                setSlideshowPlaying(true);
              }}
              onRemoveScene={removeActiveScene}
              onSceneChange={(scene) => updateActiveScene(() => scene)}
              presetImages={presetStoryboardImages}
              project={activeVideo}
            />
          ) : null}
        </>
      </main>

      {showUpdatesModal ? (
        <UpdatesModal
          notes={initialUpdateNotes}
          onClose={() => setShowUpdatesModal(false)}
        />
      ) : null}

      {showProfileModal ? (
        <ProfileModal
          onClose={() => setShowProfileModal(false)}
          onUsernameChange={setUsername}
          username={username}
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
