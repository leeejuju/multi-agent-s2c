import { Plus, Trash2 } from "lucide-react";

import type { ScriptItem } from "@/data/studio";

import PageContainer from "../PageContainer";
import StudioCard from "../StudioCard";

type ScriptsListPageProps = {
  onCreateNewScript: () => void;
  onOpenScript: (script: ScriptItem) => void;
  onTrashScript: (id: string) => void;
  scripts: ScriptItem[];
};

function CreateCard({ onClick }: { onClick: () => void }) {
  return (
    <StudioCard onClick={onClick}>
      <span className="flex h-full flex-col items-center justify-center text-center group-hover:text-brand-primary">
        <span className="w-12 h-12 rounded-full bg-[#f3f4f3] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
          <Plus size={24} className="text-gray-500" />
        </span>
        <span className="text-sm font-semibold text-gray-900 mb-1">新剧本</span>
        <span className="text-xs text-gray-500">撰写专业的结构化剧本</span>
      </span>
    </StudioCard>
  );
}

function ScriptCard({
  onOpen,
  onTrash,
  script,
}: {
  onOpen: () => void;
  onTrash: () => void;
  script: ScriptItem;
}) {
  return (
    <StudioCard>
      <button
        className="flex-1 cursor-pointer text-left min-h-0"
        onClick={onOpen}
        type="button"
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-base font-bold text-gray-900 group-hover:text-brand-primary transition-colors line-clamp-1">
            {script.title}
          </h3>
          <span className="p-1 rounded bg-[#f3f4f3] text-[10px] text-gray-600 font-mono">
            TEXT
          </span>
        </div>
        <p className="text-xs text-gray-500 line-clamp-5 leading-relaxed font-mono whitespace-pre-wrap">
          {script.content || script.description}
        </p>
      </button>
      <div className="flex items-center justify-between border-t border-[#f3f4f3] pt-4 mt-4">
        <span className="text-[11px] text-gray-400">
          更新于 {script.lastEdited}
        </span>
        <button
          className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"
          onClick={onTrash}
          title="移至回收站"
          type="button"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </StudioCard>
  );
}

export default function ScriptsListPage({
  onCreateNewScript,
  onOpenScript,
  onTrashScript,
  scripts,
}: ScriptsListPageProps) {
  return (
    <PageContainer className="studio-page-scripts">
      <div className="w-full p-8">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(336px,1fr))] gap-6">
          <CreateCard onClick={onCreateNewScript} />
          {scripts.map((script) => (
            <ScriptCard
              key={script.id}
              onOpen={() => onOpenScript(script)}
              onTrash={() => onTrashScript(script.id)}
              script={script}
            />
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
