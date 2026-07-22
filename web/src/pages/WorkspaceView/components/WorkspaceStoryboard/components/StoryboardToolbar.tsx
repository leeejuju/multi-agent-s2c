import { Plus } from "lucide-react";
import { Toolbar } from "radix-ui";

import "./StoryboardToolbar.css";

type StoryboardToolbarProps = {
  frameCount: number;
  onAddFrame: () => void;
};

export default function StoryboardToolbar({
  frameCount,
  onAddFrame,
}: StoryboardToolbarProps) {
  return (
    <Toolbar.Root
      aria-label="分镜操作"
      className="storyboard-toolbar"
    >
      <span className="storyboard-toolbar__count">
        {frameCount} 镜
      </span>
      <Toolbar.Button
        aria-label="新增镜头"
        className="storyboard-toolbar__add"
        onClick={onAddFrame}
        type="button"
      >
        <Plus aria-hidden="true" size={14} />
        <span className="storyboard-toolbar__add-label">新增镜头</span>
      </Toolbar.Button>
    </Toolbar.Root>
  );
}
