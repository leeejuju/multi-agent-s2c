import { ImageIcon, Sparkles, Trash2 } from "lucide-react";
import { Tooltip } from "radix-ui";

import type {
  StoryboardCameraMovement,
  StoryboardFrame,
  StoryboardFrameChange,
  StoryboardShotSize,
} from "../types";

import "./StoryboardFrameCard.css";

const SHOT_SIZE_OPTIONS = [
  { label: "远景", value: "wide" },
  { label: "全景", value: "full" },
  { label: "中景", value: "medium" },
  { label: "近景", value: "close" },
  { label: "特写", value: "detail" },
] satisfies Array<{ label: string; value: StoryboardShotSize }>;

const MOVEMENT_OPTIONS = [
  { label: "固定", value: "static" },
  { label: "推镜", value: "push" },
  { label: "拉镜", value: "pull" },
  { label: "摇镜", value: "pan" },
  { label: "移镜", value: "track" },
  { label: "跟拍", value: "follow" },
] satisfies Array<{ label: string; value: StoryboardCameraMovement }>;

type StoryboardFrameCardProps = {
  frame: StoryboardFrame;
  frameNumber: string;
  onChange: (change: StoryboardFrameChange) => void;
  onGenerate?: () => void;
  onRemove: () => void;
};

export default function StoryboardFrameCard({
  frame,
  frameNumber,
  onChange,
  onGenerate,
  onRemove,
}: StoryboardFrameCardProps) {
  const hasDescription = Boolean(frame.description.trim());
  const canGenerate = hasDescription && Boolean(onGenerate);
  const generateUnavailableReason = hasDescription
    ? "图片生成服务尚未接入"
    : "请先填写画面描述";

  return (
    <article
      aria-label={`镜头 ${frameNumber}`}
      className="storyboard-frame-card"
    >
      <figure
        aria-label={`镜头 ${frameNumber} 静态分镜图`}
        className="storyboard-frame-card__figure"
      >
        {frame.imageUrl ? (
          <img
            alt={`镜头 ${frameNumber} 分镜图`}
            className="storyboard-frame-card__image"
            decoding="async"
            draggable={false}
            src={frame.imageUrl}
          />
        ) : (
          <>
            <span
              aria-hidden="true"
              className="storyboard-frame-card__placeholder-background"
            />
            <span className="storyboard-frame-card__placeholder-frame" />
            <span className="storyboard-frame-card__placeholder">
              <ImageIcon aria-hidden="true" size={28} strokeWidth={1.35} />
              <span className="storyboard-frame-card__placeholder-label">
                分镜图待生成
              </span>
            </span>
          </>
        )}

        <span className="storyboard-frame-card__number">
          {frameNumber}
        </span>
        <button
          aria-label={`删除镜头 ${Number(frameNumber)}`}
          className="storyboard-frame-card__delete"
          onClick={onRemove}
          type="button"
        >
          <Trash2 aria-hidden="true" size={14} />
        </button>
      </figure>

      <div className="storyboard-frame-card__body">
        <div className="storyboard-frame-card__settings">
          <label
            className="storyboard-frame-card__field"
            htmlFor={`storyboard-shot-size-${frame.id}`}
          >
            <span className="storyboard-frame-card__sr-only">景别</span>
            <select
              className="storyboard-frame-card__select"
              id={`storyboard-shot-size-${frame.id}`}
              onChange={(event) =>
                onChange({
                  shotSize: event.target.value as StoryboardShotSize,
                })
              }
              value={frame.shotSize ?? "medium"}
            >
              {SHOT_SIZE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label
            className="storyboard-frame-card__field"
            htmlFor={`storyboard-movement-${frame.id}`}
          >
            <span className="storyboard-frame-card__sr-only">运镜</span>
            <select
              className="storyboard-frame-card__select"
              id={`storyboard-movement-${frame.id}`}
              onChange={(event) =>
                onChange({
                  movement: event.target.value as StoryboardCameraMovement,
                })
              }
              value={frame.movement ?? "static"}
            >
              {MOVEMENT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label
          className="storyboard-frame-card__description-field"
          htmlFor={`storyboard-description-${frame.id}`}
        >
          <span className="storyboard-frame-card__description-label">
            画面描述
          </span>
          <textarea
            className="storyboard-frame-card__description"
            id={`storyboard-description-${frame.id}`}
            onChange={(event) => onChange({ description: event.target.value })}
            placeholder="描述构图、人物动作、光线、环境与画面重点"
            value={frame.description}
          />
        </label>

        {onGenerate ? (
          <Tooltip.Provider delayDuration={250}>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <span
                  aria-label={!canGenerate ? generateUnavailableReason : undefined}
                  className="storyboard-frame-card__generate-wrapper"
                  tabIndex={!canGenerate ? 0 : undefined}
                >
                  <button
                    aria-label={`生成镜头 ${Number(frameNumber)} 分镜图`}
                    className="storyboard-frame-card__generate"
                    disabled={!canGenerate}
                    onClick={onGenerate}
                    type="button"
                  >
                    <Sparkles aria-hidden="true" size={14} />
                    生成分镜图
                  </button>
                </span>
              </Tooltip.Trigger>
              {!canGenerate ? (
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="storyboard-frame-card__tooltip"
                    sideOffset={7}
                  >
                    {generateUnavailableReason}
                    <Tooltip.Arrow className="storyboard-frame-card__tooltip-arrow" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              ) : null}
            </Tooltip.Root>
          </Tooltip.Provider>
        ) : null}
      </div>
    </article>
  );
}
