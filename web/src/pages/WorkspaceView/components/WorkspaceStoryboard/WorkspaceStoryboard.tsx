import { ScrollArea } from "radix-ui";

import StoryboardEmptyState from "./components/StoryboardEmptyState";
import StoryboardFrameCard from "./components/StoryboardFrameCard";
import type {
  StoryboardFrame,
  StoryboardFrameChange,
} from "./types";

import "./WorkspaceStoryboard.css";

type WorkspaceStoryboardProps = {
  frames: StoryboardFrame[];
  onAddFrame: () => void;
  onFramesChange: (frames: StoryboardFrame[]) => void;
  onGenerateFrame?: (frame: StoryboardFrame) => void;
};

function getFrameNumber(index: number) {
  return String(index + 1).padStart(2, "0");
}

export default function WorkspaceStoryboard({
  frames,
  onAddFrame,
  onFramesChange,
  onGenerateFrame,
}: WorkspaceStoryboardProps) {
  const updateFrame = (
    frameId: string,
    change: StoryboardFrameChange,
  ) => {
    onFramesChange(
      frames.map((frame) =>
        frame.id === frameId ? { ...frame, ...change } : frame,
      ),
    );
  };

  const removeFrame = (frameId: string) => {
    onFramesChange(frames.filter((frame) => frame.id !== frameId));
  };

  return (
    <div className="workspace-storyboard">
      <ScrollArea.Root
        className="workspace-storyboard__scroll-area"
        type="hover"
      >
        <ScrollArea.Viewport className="workspace-storyboard__viewport">
          {frames.length ? (
            <div className="workspace-storyboard__grid">
              {frames.map((frame, index) => (
                <StoryboardFrameCard
                  frame={frame}
                  frameNumber={getFrameNumber(index)}
                  key={frame.id}
                  onChange={(change) => updateFrame(frame.id, change)}
                  onGenerate={
                    onGenerateFrame
                      ? () => onGenerateFrame(frame)
                      : undefined
                  }
                  onRemove={() => removeFrame(frame.id)}
                />
              ))}
            </div>
          ) : (
            <StoryboardEmptyState onAddFrame={onAddFrame} />
          )}
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar
          className="workspace-storyboard__scrollbar"
          orientation="vertical"
        >
          <ScrollArea.Thumb className="workspace-storyboard__scrollbar-thumb" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </div>
  );
}
