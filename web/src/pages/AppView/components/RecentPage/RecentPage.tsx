import { Trash2 } from "lucide-react";

import type { ScriptItem, VideoProject } from "@/data/studio";

import PageContainer from "../PageContainer";
import StudioCard from "../StudioCard";

import "./RecentPage.css";

type RecentPageProps = {
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
        className="recent-page__card-body"
        onClick={onOpen}
        type="button"
      >
        <div className="recent-page__card-header">
          <h3 className="recent-page__card-title">
            {script.title}
          </h3>
          <span className="recent-page__card-type">
            TEXT
          </span>
        </div>
        <p className="recent-page__script-excerpt">
          {script.content || script.description}
        </p>
      </button>
      <div className="recent-page__card-footer">
        <span className="recent-page__updated-at">
          更新于 {script.lastEdited}
        </span>
        <button
          className="recent-page__trash-button"
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
        className="recent-page__card-body"
        onClick={onOpen}
        type="button"
      >
        <div className="recent-page__card-header">
          <h3 className="recent-page__card-title">
            {project.title}
          </h3>
          <span className="recent-page__card-type">
            VIDEO
          </span>
        </div>
        <p className="recent-page__video-description">
          {project.description}
        </p>
        <div className="recent-page__scene-list">
          {project.scenes.slice(0, 3).map((scene) => (
            <div
              className="recent-page__scene-thumbnail"
              key={scene.id}
            >
              {scene.imageUrl ? (
                <img
                  alt=""
                  className="recent-page__scene-image"
                  src={scene.imageUrl}
                />
              ) : (
                <div className="recent-page__scene-placeholder">
                  分镜
                </div>
              )}
            </div>
          ))}
          {project.scenes.length > 3 ? (
            <div className="recent-page__scene-overflow">
              +{project.scenes.length - 3}
            </div>
          ) : null}
        </div>
      </button>
      <div className="recent-page__card-footer">
        <span className="recent-page__updated-at">
          更新于 {project.lastEdited}
        </span>
        <button
          className="recent-page__trash-button"
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
  onOpenScript,
  onOpenVideo,
  onTrashScript,
  onTrashVideo,
  scripts,
  videoProjects,
}: RecentPageProps) {
  return (
    <PageContainer className="recent-page">
      <div className="recent-page__content">
        <div className="recent-page__grid">
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
