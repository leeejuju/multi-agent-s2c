import { useState } from "react";
import {
  BookOpenText,
  Clapperboard,
  GitBranch,
  Images,
  Settings,
  ChevronDown,
  Clock,
  Compass,
  PanelLeftClose,
  PanelLeftOpen,
  FileText,
  Film,
  Info,
  Plus,
  Trash2,
  type LucideIcon,
} from "lucide-react";

export type SidebarSectionId =
  | "script"
  | "storyboard"
  | "story-graph"
  | "library"
  | "settings";

export type SidebarItem = {
  icon: LucideIcon;
  id: SidebarSectionId;
  label: string;
  to: string;
};

export const sidebarItems: SidebarItem[] = [
  {
    icon: BookOpenText,
    id: "script",
    label: "剧本",
    to: "/app/script",
  },
  {
    icon: Clapperboard,
    id: "storyboard",
    label: "分镜",
    to: "/app/storyboard",
  },
  {
    icon: GitBranch,
    id: "story-graph",
    label: "剧情树",
    to: "/app/story-graph",
  },
  {
    icon: Images,
    id: "library",
    label: "图库",
    to: "/app/library",
  },
  {
    icon: Settings,
    id: "settings",
    label: "设置",
    to: "/app/settings",
  },
];

type SidebarTab =
  | "new-prompt"
  | "recent"
  | "scripts-list"
  | "video-list"
  | "community"
  | "trash";

type SidebarNavButtonProps = {
  active: boolean;
  badge?: string;
  children: string;
  icon: LucideIcon;
  onClick: () => void;
  collapsed: boolean;
};

function SidebarNavButton({
  active,
  badge,
  children,
  collapsed,
  icon: Icon,
  onClick,
}: SidebarNavButtonProps) {
  return (
    <button
      className={`h-10 w-full flex items-center rounded-lg text-sm font-medium transition-all ${
        collapsed ? "justify-center px-0" : "gap-3 px-3"
      } ${
        active
          ? "bg-[#eeeeed] text-gray-900 font-semibold"
          : "text-gray-600 hover:bg-[#eeeeed]/60 hover:text-gray-950"
      }`}
      onClick={onClick}
      title={collapsed ? children : undefined}
      type="button"
    >
      <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center">
        <Icon
          className={active ? "text-brand-secondary" : "text-gray-500"}
          size={18}
        />
      </span>
      {collapsed ? null : <span>{children}</span>}
      {badge && !collapsed ? (
        <span className="ml-auto text-[10px] bg-brand-secondary/15 text-brand-secondary px-1.5 py-0.5 rounded-full font-bold">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

type SidebarProps = {
  activeTab: SidebarTab;
  hasOpenScript: boolean;
  hasOpenVideo: boolean;
  username: string;
  onSelectTab: (tab: SidebarTab) => void;
  onProfile: () => void;
  onUpdates: () => void;
};

export default function Sidebar({
  activeTab,
  hasOpenScript,
  hasOpenVideo,
  username,
  onProfile,
  onSelectTab,
  onUpdates,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`studio-sidebar flex-shrink-0 bg-[#f3f4f3] flex flex-col transition-[width] duration-200 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      <div
        className={`studio-sidebar-brand flex items-center border-b border-[#eeeeed] ${
          collapsed ? "justify-center" : "justify-between"
        }`}
      >
        {collapsed ? null : (
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-xl tracking-wide text-gray-900">
              test
            </span>
          </div>
        )}
        <button
          className="flex h-7 w-7 items-center justify-center text-gray-500 hover:text-gray-900 rounded hover:bg-gray-200 transition-colors"
          onClick={() => setCollapsed((current) => !current)}
          title={collapsed ? "展开侧边栏" : "收起侧边栏"}
          type="button"
        >
          {collapsed ? (
            <PanelLeftOpen size={18} />
          ) : (
            <PanelLeftClose size={18} />
          )}
        </button>
      </div>

      <div className="studio-sidebar-main">
        <nav className="studio-sidebar-nav">
          <SidebarNavButton
            active={activeTab === "new-prompt"}
            collapsed={collapsed}
            icon={Plus}
            onClick={() => onSelectTab("new-prompt")}
          >
            新建
          </SidebarNavButton>
          <SidebarNavButton
            active={activeTab === "recent"}
            collapsed={collapsed}
            icon={Clock}
            onClick={() => onSelectTab("recent")}
          >
            最近
          </SidebarNavButton>
          <SidebarNavButton
            active={activeTab === "scripts-list" || hasOpenScript}
            collapsed={collapsed}
            icon={FileText}
            onClick={() => onSelectTab("scripts-list")}
          >
            剧本项目
          </SidebarNavButton>
          {/* <SidebarNavButton
            active={activeTab === "video-list" || hasOpenVideo}
            badge="BETA"
            collapsed={collapsed}
            icon={Film}
            onClick={() => onSelectTab("video-list")}
          >
            影像制作
          </SidebarNavButton> */}
          <SidebarNavButton
            active={activeTab === "community"}
            collapsed={collapsed}
            icon={Compass}
            onClick={() => onSelectTab("community")}
          >
            社区
          </SidebarNavButton>
          <SidebarNavButton
            active={activeTab === "trash"}
            collapsed={collapsed}
            icon={Trash2}
            onClick={() => onSelectTab("trash")}
          >
            回收站
          </SidebarNavButton>
        </nav>
      </div>

      <div className="studio-sidebar-footer">
        <button
          className={`w-full flex items-center bg-white hover:bg-gray-100 rounded-xl border border-gray-100 cursor-pointer transition-all shadow-sm text-left ${
            collapsed ? "justify-center p-2" : "justify-between p-2.5"
          }`}
          onClick={onProfile}
          title={collapsed ? username : undefined}
          type="button"
        >
          <span
            className={`flex items-center min-w-0 ${collapsed ? "" : "gap-2.5"}`}
          >
            <span className="w-9 h-9 rounded-full bg-brand-secondary text-white flex items-center justify-center font-bold text-sm">
              LE
            </span>
            {collapsed ? null : (
              <span className="text-left min-w-0">
                <span className="text-sm font-semibold text-gray-900 truncate max-w-[100px] block">
                  {username}
                </span>
                <span className="text-[10px] text-gray-500">
                  Junior Member
                </span>
              </span>
            )}
          </span>
          {collapsed ? null : (
            <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
          )}
        </button>

        <button
          className={`w-full py-2 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary rounded-xl text-xs font-bold transition-all flex items-center justify-center border border-brand-primary/15 ${
            collapsed ? "" : "gap-1.5"
          }`}
          onClick={onUpdates}
          title={collapsed ? "更新说明" : undefined}
          type="button"
        >
          <Info size={14} />
          {collapsed ? null : <span>📢 更新说明</span>}
        </button>
      </div>
    </aside>
  );
}
