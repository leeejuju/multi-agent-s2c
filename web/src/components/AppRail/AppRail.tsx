import {
  BookOpenText,
  Clapperboard,
  GitBranch,
  Images,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { NavLink } from "react-router-dom";

import "./AppRail.css";

export type AppSectionId =
  | "script"
  | "storyboard"
  | "story-graph"
  | "library"
  | "settings";

export type AppRailItem = {
  description: string;
  icon: LucideIcon;
  id: AppSectionId;
  label: string;
  to: string;
};

export const appRailItems: AppRailItem[] = [
  {
    description: "故事文本、章节与场景",
    icon: BookOpenText,
    id: "script",
    label: "剧本",
    to: "/app/script",
  },
  {
    description: "镜头表与画面转译",
    icon: Clapperboard,
    id: "storyboard",
    label: "分镜",
    to: "/app/storyboard",
  },
  {
    description: "人物、事件与因果关系",
    icon: GitBranch,
    id: "story-graph",
    label: "剧情树",
    to: "/app/story-graph",
  },
  {
    description: "角色、场景与参考图库",
    icon: Images,
    id: "library",
    label: "图库",
    to: "/app/library",
  },
  {
    description: "模型、账户与工作区偏好",
    icon: Settings,
    id: "settings",
    label: "设置",
    to: "/app/settings",
  },
];

type AppRailProps = {
  activeSectionId: AppSectionId;
};

export default function AppRail({ activeSectionId }: AppRailProps) {
  const activeItem =
    appRailItems.find((item) => item.id === activeSectionId) ?? appRailItems[0];

  return (
    <aside className="app-rail" aria-label="应用主导航">
      <div className="app-rail-project">
        <span className="app-rail-eyebrow">当前作品</span>
        <h1>未命名项目</h1>
        <p>从剧本到分镜的创作工作区</p>
      </div>

      <nav className="app-rail-nav" aria-label="创作页面">
        {appRailItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              className={({ isActive }) =>
                isActive || item.id === activeSectionId
                  ? "app-rail-link is-active"
                  : "app-rail-link"
              }
              key={item.id}
              to={item.to}
            >
              <span className="app-rail-link-icon" aria-hidden="true">
                <Icon size={17} strokeWidth={2.1} />
              </span>
              <span className="app-rail-link-copy">
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </span>
            </NavLink>
          );
        })}
      </nav>

      <div className="app-rail-summary" aria-label="当前页面摘要">
        <span className="app-rail-eyebrow">正在查看</span>
        <strong>{activeItem.label}</strong>
        <p>{activeItem.description}</p>
      </div>
    </aside>
  );
}
