import { GearIcon, ReaderIcon } from "@radix-ui/react-icons";

import "./WorkspaceAppRail.css";

export default function WorkspaceAppRail() {
  return (
    <nav aria-label="应用导航" className="workspace-app-rail">
      <div className="workspace-app-rail__primary">
        <button
          aria-current="page"
          aria-label="创作"
          className="workspace-app-rail__item"
          data-active="true"
          type="button"
        >
          <span className="workspace-app-rail__icon">
            <ReaderIcon aria-hidden="true" height={18} width={18} />
          </span>
          <span className="workspace-app-rail__label">创作</span>
        </button>
      </div>

      <div className="workspace-app-rail__secondary">
        <div aria-label="个人资料" className="workspace-app-rail__avatar-row">
          <span aria-hidden="true" className="workspace-app-rail__avatar" />
          <span className="workspace-app-rail__label">个人资料</span>
        </div>
        <button
          aria-label="设置"
          className="workspace-app-rail__item"
          type="button"
        >
          <span className="workspace-app-rail__icon">
            <GearIcon aria-hidden="true" height={18} width={18} />
          </span>
          <span className="workspace-app-rail__label">设置</span>
        </button>
      </div>
    </nav>
  );
}
