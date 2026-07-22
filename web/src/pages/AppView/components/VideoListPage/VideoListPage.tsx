import { Plus, Trash2 } from "lucide-react";

import type { VideoProject } from "@/data/studio";

import StudioCard from "../StudioCard";

import "./VideoListPage.css";

type VideoListPageProps = {
  onCreateNewVideoProject: () => void;
  onOpenVideo: (project: VideoProject) => void;
  onTrashVideo: (id: string) => void;
  videoProjects: VideoProject[];
};

function CreateCard({ onClick }: { onClick: () => void }) {
  return (
    <StudioCard onClick={onClick}>
      <span className="video-list-page__create-card">
        <span className="video-list-page__create-icon-wrap">
          <Plus size={24} className="video-list-page__create-icon" />
        </span>
        <span className="video-list-page__create-title">
          新建影像项目
        </span>
        <span className="video-list-page__create-description">
          以制作AI影像为目的
        </span>
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
        className="video-list-page__card-body"
        onClick={onOpen}
        type="button"
      >
        <div className="video-list-page__card-header">
          <h3 className="video-list-page__card-title">
            {project.title}
          </h3>
          <span className="video-list-page__card-type">
            VIDEO
          </span>
        </div>
        <p className="video-list-page__description">
          {project.description}
        </p>
        <div className="video-list-page__scene-list">
          {project.scenes.slice(0, 3).map((scene) => (
            <div
              className="video-list-page__scene-thumbnail"
              key={scene.id}
            >
              {scene.imageUrl ? (
                <img
                  alt=""
                  className="video-list-page__scene-image"
                  src={scene.imageUrl}
                />
              ) : (
                <div className="video-list-page__scene-placeholder">
                  分镜
                </div>
              )}
            </div>
          ))}
          {project.scenes.length > 3 ? (
            <div className="video-list-page__scene-overflow">
              +{project.scenes.length - 3}
            </div>
          ) : null}
        </div>
      </button>
      <div className="video-list-page__card-footer">
        <span className="video-list-page__updated-at">
          更新于 {project.lastEdited}
        </span>
        <button
          className="video-list-page__trash-button"
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
  onCreateNewVideoProject,
  onOpenVideo,
  onTrashVideo,
  videoProjects,
}: VideoListPageProps) {
  return (
    <section className="video-list-page">
      <div className="video-list-page__content">
        <div className="video-list-page__grid">
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
