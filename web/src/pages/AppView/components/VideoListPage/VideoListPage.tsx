import { Plus, Trash2 } from "lucide-react";

import type { VideoProject } from "@/data/studio";

import StudioCard from "../StudioCard";

type VideoListPageProps = {
  newProjectAspect: VideoProject["aspectRatio"];
  onCreateNewVideoProject: () => void;
  onNewProjectAspectChange: (aspectRatio: VideoProject["aspectRatio"]) => void;
  onOpenVideo: (project: VideoProject) => void;
  onTrashVideo: (id: string) => void;
  videoProjects: VideoProject[];
};

function CreateCard({ onClick }: { onClick: () => void }) {
  return (
    <StudioCard onClick={onClick}>
      <span className="flex h-full flex-col items-center justify-center text-center group-hover:text-brand-secondary">
        <span className="w-12 h-12 rounded-full bg-[#f3f4f3] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
          <Plus size={24} className="text-gray-500" />
        </span>
        <span className="text-sm font-semibold text-gray-900 mb-1">
          新建影像项目
        </span>
        <span className="text-xs text-gray-500">以制作AI影像为目的</span>
      </span>
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

export default function VideoListPage({
  newProjectAspect,
  onCreateNewVideoProject,
  onNewProjectAspectChange,
  onOpenVideo,
  onTrashVideo,
  videoProjects,
}: VideoListPageProps) {
  return (
    <section className="studio-page-video flex-1 min-h-0 overflow-y-auto">
      <div className="w-full p-8">
        <div className="mb-8 flex items-center justify-end">
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(336px,1fr))] gap-6">
          <CreateCard onClick={onCreateNewVideoProject} />
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
    </section>
  );
}
