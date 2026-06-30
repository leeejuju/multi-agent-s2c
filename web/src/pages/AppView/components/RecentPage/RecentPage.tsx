import { Plus, Trash2 } from "lucide-react";

import type { ScriptItem, VideoProject } from "@/data/studio";

import PageContainer from "../PageContainer";
import StudioCard from "../StudioCard";

type RecentPageProps = {
  onCreateNewScript: () => void;
  onCreateNewVideoProject: () => void;
  onOpenScript: (script: ScriptItem) => void;
  onOpenVideo: (project: VideoProject) => void;
  onTrashScript: (id: string) => void;
  onTrashVideo: (id: string) => void;
  scripts: ScriptItem[];
  videoProjects: VideoProject[];
};



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

function VideoCard({
  onOpen,
  onTrash,
  project,
}: {
  onOpen: () => void;
  onTrash: () => void;
  project: VideoProject;
}) {
  return (
    <StudioCard>
      <button
        className="flex-1 cursor-pointer text-left min-h-0"
        onClick={onOpen}
        type="button"
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-base font-bold text-gray-900 group-hover:text-brand-secondary transition-colors line-clamp-1">
            {project.title}
          </h3>
          <span className="p-1 rounded bg-[#f3f4f3] text-[10px] text-gray-600 font-mono">
            VIDEO
          </span>
        </div>
        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
          {project.description}
        </p>
        <div className="flex gap-1.5 mt-3 overflow-hidden">
          {project.scenes.slice(0, 3).map((scene) => (
            <div
              className="w-12 h-10 rounded bg-gray-100 border border-gray-200 overflow-hidden relative"
              key={scene.id}
            >
              {scene.imageUrl ? (
                <img
                  alt=""
                  className="w-full h-full object-cover"
                  src={scene.imageUrl}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-400">
                  分镜
                </div>
              )}
            </div>
          ))}
          {project.scenes.length > 3 ? (
            <div className="w-10 h-10 rounded bg-[#f3f4f3] border border-gray-200 flex items-center justify-center text-[10px] text-gray-500 font-bold">
              +{project.scenes.length - 3}
            </div>
          ) : null}
        </div>
      </button>
      <div className="flex items-center justify-between border-t border-[#f3f4f3] pt-4 mt-4">
        <span className="text-[11px] text-gray-400">
          更新于 {project.lastEdited}
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

export default function RecentPage({
  onCreateNewScript,
  onCreateNewVideoProject,
  onOpenScript,
  onOpenVideo,
  onTrashScript,
  onTrashVideo,
  scripts,
  videoProjects,
}: RecentPageProps) {
  return (
    <PageContainer className="studio-page-recent">
      <div className="w-full p-8">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(336px,1fr))] gap-6">
       
          {scripts.map((script) => (
            <ScriptCard
              key={script.id}
              onOpen={() => onOpenScript(script)}
              onTrash={() => onTrashScript(script.id)}
              script={script}
            />
          ))}
          {videoProjects.map((project) => (
            <VideoCard
              key={project.id}
              onOpen={() => onOpenVideo(project)}
              onTrash={() => onTrashVideo(project.id)}
              project={project}
            />
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
