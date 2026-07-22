import { FileText, Film, Trash2, type LucideIcon } from "lucide-react";
import { Toolbar } from "radix-ui";

import type { ScriptItem, VideoProject } from "@/data/studio";

import PageContainer from "../PageContainer";

import "./TrashPage.css";

type TrashPageProps = {
  onDeletePermanently: (id: string, type: "script" | "video") => void;
  onRestoreFromTrash: (id: string, type: "script" | "video") => void;
  trashedScripts: ScriptItem[];
  trashedVideos: VideoProject[];
};

function TrashRow({
  icon: Icon,
  meta,
  onDelete,
  onRestore,
  title,
  tone,
}: {
  icon: LucideIcon;
  meta: string;
  onDelete: () => void;
  onRestore: () => void;
  title: string;
  tone: "amber" | "blue";
}) {
  return (
    <div className="trash-page__row">
      <div className="trash-page__row-main">
        <div className="trash-page__row-icon" data-tone={tone}>
          <Icon size={18} />
        </div>
        <div className="trash-page__row-copy">
          <h4 className="trash-page__row-title">{title}</h4>
          <p className="trash-page__row-meta">{meta}</p>
        </div>
      </div>
      <Toolbar.Root
        aria-label={`${title} 操作`}
        className="trash-page__row-actions"
      >
        <Toolbar.Button
          className="trash-page__restore-button"
          onClick={onRestore}
        >
          还原
        </Toolbar.Button>
        <Toolbar.Button
          className="trash-page__delete-button"
          onClick={onDelete}
        >
          彻底删除
        </Toolbar.Button>
      </Toolbar.Root>
    </div>
  );
}

export default function TrashPage({
  onDeletePermanently,
  onRestoreFromTrash,
  trashedScripts,
  trashedVideos,
}: TrashPageProps) {
  return (
    <PageContainer className="trash-page">
      <div className="trash-page__content">
        {trashedScripts.length === 0 && trashedVideos.length === 0 ? (
          <div className="trash-page__empty">
            <Trash2 size={40} className="trash-page__empty-icon" />
            <p className="trash-page__empty-title">
              回收站空空如也
            </p>
            <p className="trash-page__empty-description">没有已删除的项目</p>
          </div>
        ) : (
          <div className="trash-page__list">
            {trashedScripts.map((script) => (
              <TrashRow
                icon={FileText}
                key={script.id}
                meta={`剧本草稿 · 更新于 ${script.lastEdited}`}
                onDelete={() => onDeletePermanently(script.id, "script")}
                onRestore={() => onRestoreFromTrash(script.id, "script")}
                title={script.title}
                tone="amber"
              />
            ))}
            {trashedVideos.map((project) => (
              <TrashRow
                icon={Film}
                key={project.id}
                meta={`影像项目 · 更新于 ${project.lastEdited}`}
                onDelete={() => onDeletePermanently(project.id, "video")}
                onRestore={() => onRestoreFromTrash(project.id, "video")}
                title={project.title}
                tone="blue"
              />
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
