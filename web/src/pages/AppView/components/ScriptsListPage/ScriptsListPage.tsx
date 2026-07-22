import { Plus, Trash2 } from "lucide-react";

import type { ScriptItem } from "@/data/studio";

import PageContainer from "../PageContainer";
import StudioCard from "../StudioCard";

import "./ScriptsListPage.css";

type ScriptsListPageProps = {
  onCreateNewScript: () => void;
  onOpenScript: (script: ScriptItem) => void;
  onTrashScript: (id: string) => void;
  scripts: ScriptItem[];
};

function CreateCard({ onClick }: { onClick: () => void }) {
  return (
    <StudioCard onClick={onClick}>
      <span className="scripts-list-page__create-card">
        <span className="scripts-list-page__create-icon-wrap">
          <Plus size={24} className="scripts-list-page__create-icon" />
        </span>
        <span className="scripts-list-page__create-title">新剧本</span>
        <span className="scripts-list-page__create-description">
          撰写专业的结构化剧本
        </span>
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
        className="scripts-list-page__card-body"
        onClick={onOpen}
        type="button"
      >
        <div className="scripts-list-page__card-header">
          <h3 className="scripts-list-page__card-title">
            {script.title}
          </h3>
          <span className="scripts-list-page__card-type">
            TEXT
          </span>
        </div>
        <p className="scripts-list-page__excerpt">
          {script.content || script.description}
        </p>
      </button>
      <div className="scripts-list-page__card-footer">
        <span className="scripts-list-page__updated-at">
          更新于 {script.lastEdited}
        </span>
        <button
          className="scripts-list-page__trash-button"
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
    <PageContainer className="scripts-list-page">
      <div className="scripts-list-page__content">
        <div className="scripts-list-page__grid">
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
