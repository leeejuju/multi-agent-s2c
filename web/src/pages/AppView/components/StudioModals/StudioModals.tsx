import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Avatar, Dialog, Label, Toolbar } from "radix-ui";

import type { VideoProject } from "@/data/studio";

import "./StudioModals.css";

type ModalFrameProps = {
  children: ReactNode;
  onClose: () => void;
  size?: "md" | "sm";
  title: string;
};

function ModalFrame({
  children,
  onClose,
  size = "md",
  title,
}: ModalFrameProps) {
  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="studio-modal__overlay" />
        <Dialog.Content
          aria-describedby={undefined}
          className="studio-modal__content"
          data-size={size}
        >
          <Dialog.Title className="studio-modal__title">{title}</Dialog.Title>
          <Dialog.Close
            aria-label="关闭"
            className="studio-modal__close"
          >
            <X size={18} />
          </Dialog.Close>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function ProfileModal({
  email,
  onClose,
}: {
  email: string;
  onClose: () => void;
}) {
  return (
    <ModalFrame onClose={onClose} size="sm" title="个人账户设置">
      <div className="profile-modal__header">
        <Avatar.Root className="profile-modal__avatar">
          <Avatar.Fallback>{email.slice(0, 2).toUpperCase()}</Avatar.Fallback>
        </Avatar.Root>
        <h3 className="profile-modal__heading">个人账户设置</h3>
      </div>
      <div className="profile-modal__fields">
        <div>
          <Label.Root
            className="profile-modal__label"
            htmlFor="profile-email"
          >
            登录邮箱
          </Label.Root>
          <input
            className="profile-modal__input"
            id="profile-email"
            readOnly
            type="email"
            value={email}
          />
        </div>
        <Dialog.Close
          className="profile-modal__save"
        >
          保存并退出
        </Dialog.Close>
      </div>
    </ModalFrame>
  );
}

type SlideshowModalProps = {
  index: number;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onTogglePlaying: () => void;
  playing: boolean;
  project: VideoProject;
};

export function SlideshowModal({
  index,
  onClose,
  onNext,
  onPrevious,
  onTogglePlaying,
  playing,
  project,
}: SlideshowModalProps) {
  const scene = project.scenes[index];

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="slideshow-modal__overlay" />
        <Dialog.Content
          aria-describedby={undefined}
          className="slideshow-modal__content"
        >
          <div className="slideshow-modal__header">
            <div>
              <span className="slideshow-modal__eyebrow">
                CINEMATIC PREVIEW SLIDESHOW
              </span>
              <Dialog.Title className="slideshow-modal__title">
                {project.title}
              </Dialog.Title>
            </div>
            <Dialog.Close
              aria-label="关闭预览"
              className="slideshow-modal__close"
            >
              <X size={20} />
            </Dialog.Close>
          </div>

          <div className="slideshow-modal__stage">
            <div className="slideshow-modal__frame">
              {scene?.imageUrl ? (
                <img
                  alt=""
                  className="slideshow-modal__image"
                  src={scene.imageUrl}
                />
              ) : (
                <div className="slideshow-modal__empty">
                  无此幕预览图
                </div>
              )}
              <div className="slideshow-modal__caption">
                <p className="slideshow-modal__caption-meta">
                  ACT {index + 1} / {project.scenes.length} • {scene?.title}
                </p>
                <p className="slideshow-modal__caption-text">
                  {scene?.scriptText}
                </p>
              </div>
            </div>

            <Toolbar.Root
              aria-label="幻灯分镜导航"
              className="slideshow-modal__navigation"
            >
              <Toolbar.Button
                aria-label="上一幕"
                className="slideshow-modal__navigation-button"
                data-direction="previous"
                onClick={onPrevious}
              >
                ←
              </Toolbar.Button>
              <Toolbar.Button
                aria-label="下一幕"
                className="slideshow-modal__navigation-button"
                data-direction="next"
                onClick={onNext}
              >
                →
              </Toolbar.Button>
            </Toolbar.Root>
          </div>

          <Toolbar.Root
            aria-label="幻灯播放控制"
            className="slideshow-modal__controls"
          >
            <Toolbar.Button
              className="slideshow-modal__play-button"
              onClick={onTogglePlaying}
            >
              {playing ? (
                <>
                  <span className="slideshow-modal__playing-indicator" />
                  <span>正在播放幻灯分镜</span>
                </>
              ) : (
                <span>继续自动轮播</span>
              )}
            </Toolbar.Button>
          </Toolbar.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
