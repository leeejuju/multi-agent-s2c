import { Navigate, useParams } from "react-router-dom";

import AppRail, {
  appRailItems,
  type AppRailItem,
  type AppSectionId,
} from "@/components/AppRail";

type PagePanel = {
  body: string;
  kicker: string;
  metricLabel: string;
  metricValue: string;
  title: string;
};

const pagePanels: Record<AppSectionId, PagePanel[]> = {
  script: [
    {
      body: "整理故事梗概、章节、场景和对白，作为后续分镜和剧情树的源材料。",
      kicker: "结构",
      metricLabel: "章节",
      metricValue: "0",
      title: "剧本结构",
    },
    {
      body: "记录主要人物的目标、冲突和关系变化，避免镜头设计时丢失动机。",
      kicker: "角色",
      metricLabel: "人物",
      metricValue: "0",
      title: "角色线索",
    },
  ],
  storyboard: [
    {
      body: "把剧本场景拆成镜头，维护景别、机位、动作和视觉重点。",
      kicker: "镜头",
      metricLabel: "镜头",
      metricValue: "0",
      title: "镜头表",
    },
    {
      body: "沉淀每个镜头的构图、运动和画面提示词，为生成和审阅做准备。",
      kicker: "画面",
      metricLabel: "草稿",
      metricValue: "0",
      title: "画面草稿",
    },
  ],
  "story-graph": [
    {
      body: "用知识图谱表达人物、事件、场景和设定之间的关系。",
      kicker: "图谱",
      metricLabel: "节点",
      metricValue: "0",
      title: "剧情关系",
    },
    {
      body: "追踪因果、伏笔和冲突推进，辅助检查故事连续性。",
      kicker: "一致性",
      metricLabel: "关系",
      metricValue: "0",
      title: "因果链路",
    },
  ],
  library: [
    {
      body: "集中管理角色参考、场景参考、上传图片和生成图片。",
      kicker: "素材",
      metricLabel: "资源",
      metricValue: "0",
      title: "图库资源",
    },
    {
      body: "维护视觉风格、色彩、服化道和场景氛围参考。",
      kicker: "风格",
      metricLabel: "风格板",
      metricValue: "0",
      title: "视觉参考",
    },
  ],
  settings: [
    {
      body: "配置模型、供应商、账户和默认工作区行为。",
      kicker: "配置",
      metricLabel: "模型",
      metricValue: "0",
      title: "模型设置",
    },
    {
      body: "管理项目偏好、输出语言、分镜粒度和协作选项。",
      kicker: "偏好",
      metricLabel: "规则",
      metricValue: "0",
      title: "创作偏好",
    },
  ],
};

function isAppSectionId(value: string | undefined): value is AppSectionId {
  return appRailItems.some((item) => item.id === value);
}

function AppPageHeader({ section }: { section: AppRailItem }) {
  return (
    <header className="flex items-start justify-between gap-5 border-b border-border pb-6 max-[720px]:flex-col">
      <div className="min-w-0">
        <span className="text-[0.72rem] font-semibold tracking-[0.22em] text-on-surface-variant">
          APP WORKSPACE
        </span>
        <h2 className="mt-3 mb-0 text-[clamp(2rem,5vw,4.6rem)] font-semibold leading-none text-on-surface">
          {section.label}
        </h2>
        <p className="mt-4 max-w-[36rem] text-[0.98rem] leading-7 text-on-surface-variant">
          {section.description}
        </p>
      </div>
      <div className="shrink-0 rounded-[8px] border border-border bg-card-background px-4 py-3 text-right max-[720px]:w-full max-[720px]:text-left">
        <span className="block text-[0.68rem] font-semibold tracking-[0.18em] text-on-surface-variant">
          项目阶段
        </span>
        <strong className="mt-2 block text-[1rem] font-semibold text-on-surface">
          初始化
        </strong>
      </div>
    </header>
  );
}

function AppPagePanel({ panel }: { panel: PagePanel }) {
  return (
    <article className="rounded-[8px] border border-border bg-card-background p-5 shadow-[0_18px_46px_rgba(44,44,44,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <span className="text-[0.7rem] font-semibold tracking-[0.18em] text-on-surface-variant">
          {panel.kicker}
        </span>
        <div className="text-right">
          <strong className="block text-[1.45rem] font-semibold leading-none text-on-surface">
            {panel.metricValue}
          </strong>
          <small className="mt-1 block text-[0.7rem] text-on-surface-variant">
            {panel.metricLabel}
          </small>
        </div>
      </div>
      <h3 className="mt-5 mb-0 text-[1.05rem] font-semibold text-on-surface">
        {panel.title}
      </h3>
      <p className="mt-3 mb-0 text-[0.86rem] leading-6 text-on-surface-variant">
        {panel.body}
      </p>
    </article>
  );
}

export default function AppView() {
  const { sectionId } = useParams<{ sectionId: string }>();

  if (!isAppSectionId(sectionId)) {
    return <Navigate to="/app/script" replace />;
  }

  const activeSection =
    appRailItems.find((item) => item.id === sectionId) ?? appRailItems[0];
  const panels = pagePanels[activeSection.id];

  return (
    <main className="flex h-screen w-screen overflow-hidden bg-main-background text-on-surface max-[760px]:flex-col">
      <AppRail activeSectionId={activeSection.id} />

      <section className="min-w-0 flex-1 overflow-y-auto px-[clamp(1.25rem,4vw,4rem)] py-[clamp(1.5rem,4vw,4rem)]">
        <AppPageHeader section={activeSection} />

        <div className="mt-6 grid grid-cols-2 gap-4 max-[980px]:grid-cols-1">
          {panels.map((panel) => (
            <AppPagePanel key={panel.title} panel={panel} />
          ))}
        </div>

        <section className="mt-4 rounded-[8px] border border-dashed border-border-strong bg-surface/70 p-6">
          <span className="text-[0.72rem] font-semibold tracking-[0.18em] text-on-surface-variant">
            NEXT
          </span>
          <p className="mt-3 mb-0 max-w-[44rem] text-[0.9rem] leading-6 text-on-surface-variant">
            这里是新 App 主界面的页面骨架。旧聊天、画布、抽屉和设置组件仍保留在
            components 目录，后续可以按页面职责逐步接入。
          </p>
        </section>
      </section>
    </main>
  );
}
