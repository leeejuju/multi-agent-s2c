import { Images, Plus } from "lucide-react";

import "./StoryboardEmptyState.css";

type StoryboardEmptyStateProps = {
  onAddFrame: () => void;
};

export default function StoryboardEmptyState({
  onAddFrame,
}: StoryboardEmptyStateProps) {
  return (
    <div className="storyboard-empty-state">
      <span className="storyboard-empty-state__icon">
        <Images aria-hidden="true" size={24} strokeWidth={1.5} />
      </span>
      <h2 className="storyboard-empty-state__title">
        先定下第一个画面
      </h2>
      <button
        className="storyboard-empty-state__add"
        onClick={onAddFrame}
        type="button"
      >
        <Plus aria-hidden="true" size={14} />
        新增第一个镜头
      </button>
    </div>
  );
}
