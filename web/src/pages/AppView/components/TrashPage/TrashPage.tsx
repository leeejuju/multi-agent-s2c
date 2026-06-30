import { FileText, Film, Trash2, type LucideIcon } from "lucide-react";

import type { ScriptItem, VideoProject } from "@/data/studio";

import PageContainer from "../PageContainer";

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
  const toneClass =
    tone === "amber" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700";

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${toneClass}`}
        >
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-gray-900 truncate">{title}</h4>
          <p className="text-xs text-gray-500">{meta}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
          onClick={onRestore}
          type="button"
        >
          还原
        </button>
        <button
          className="text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
          onClick={onDelete}
          type="button"
        >
          彻底删除
        </button>
      </div>
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
    <PageContainer className="studio-page-trash">
      <div className="w-full p-8">
        {trashedScripts.length === 0 && trashedVideos.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
            <Trash2 size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-semibold">
              回收站空空如也
            </p>
            <p className="text-xs text-gray-400 mt-1">没有已删除的项目</p>
          </div>
        ) : (
          <div className="space-y-4">
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
