import type { ReactNode } from "react";
import { Check, X } from "lucide-react";

import type { UpdateNote, VideoProject } from "@/data/studio";

type ModalFrameProps = {
  children: ReactNode;
  maxWidth?: string;
  onClose: () => void;
};

function ModalFrame({
  children,
  maxWidth = "max-w-xl",
  onClose,
}: ModalFrameProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div
        className={`bg-white rounded-3xl border border-[#dadad9] p-6 ${maxWidth} w-full relative max-h-[90vh] overflow-y-auto`}
      >
        <button
          aria-label="关闭"
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-900 rounded-xl hover:bg-gray-100"
          onClick={onClose}
          type="button"
        >
          <X size={18} />
        </button>
        {children}
      </div>
    </div>
  );
}

export function UpdatesModal({
  notes,
  onClose,
}: {
  notes: UpdateNote[];
  onClose: () => void;
}) {
  return (
    <ModalFrame onClose={onClose}>
      <h3 className="text-lg font-bold text-gray-900 font-display mb-4">
        📢 剧画研发部发布：产品更新公告
      </h3>
      <div className="space-y-6">
        {notes.map((note) => (
          <div
            className="border-b border-gray-100 pb-5 last:border-none last:pb-0"
            key={note.id}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-brand-primary font-mono bg-brand-primary/10 px-2 py-0.5 rounded-full">
                {note.version}
              </span>
              <span className="text-xs text-gray-400 font-mono">
                {note.date}
              </span>
            </div>
            <h4 className="text-sm font-bold text-gray-800 mt-2">
              {note.title}
            </h4>
            <ul className="mt-3 space-y-2">
              {note.highlights.map((item) => (
                <li
                  className="text-xs text-gray-600 flex gap-2 items-start leading-relaxed"
                  key={item}
                >
                  <Check
                    className="text-brand-secondary flex-shrink-0 mt-0.5"
                    size={14}
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </ModalFrame>
  );
}

export function ProfileModal({
  onClose,
  onUsernameChange,
  username,
}: {
  onClose: () => void;
  onUsernameChange: (value: string) => void;
  username: string;
}) {
  return (
    <ModalFrame maxWidth="max-w-sm" onClose={onClose}>
      <div className="text-center mb-5">
        <div className="w-16 h-16 rounded-full bg-brand-secondary text-white text-2xl font-bold flex items-center justify-center mx-auto mb-3 shadow-md">
          LE
        </div>
        <h3 className="text-base font-bold text-gray-900">个人账户设置</h3>
        <p className="text-xs text-gray-400">管理您的编剧笔名和创作偏好</p>
      </div>
      <div className="space-y-4">
        <div>
          <label className="text-xs text-gray-500 block mb-1 font-semibold">
            编剧笔名
          </label>
          <input
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-primary focus:bg-white transition-all"
            onChange={(event) => onUsernameChange(event.target.value)}
            type="text"
            value={username}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1 font-semibold">
            开发者 API Key
          </label>
          <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between text-xs text-gray-500">
            <span>已通过 AI Studio 安全注入</span>
            <span className="text-[10px] bg-green-500/10 text-green-700 px-1.5 py-0.5 rounded-full font-bold">
              已就绪
            </span>
          </div>
        </div>
        <div className="bg-[#fcfcfc] rounded-xl border border-gray-100 p-3 text-[11px] text-gray-500 space-y-1">
          <p>
            <strong>当前身份:</strong> 实习编剧 (Junior)
          </p>
          <p>
            <strong>注册邮箱:</strong> QQ1224307033@gmail.com
          </p>
          <p>
            <strong>物理节点:</strong> 中国 湖北 武汉
          </p>
        </div>
        <button
          className="w-full py-2 bg-brand-primary text-white hover:bg-brand-primary/95 text-xs font-bold rounded-xl shadow-sm transition-all text-center cursor-pointer"
          onClick={onClose}
          type="button"
        >
          保存并退出
        </button>
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
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col justify-between p-6 text-white animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs text-brand-secondary font-mono uppercase tracking-widest font-bold">
            CINEMATIC PREVIEW SLIDESHOW
          </span>
          <h3 className="text-lg font-bold mt-0.5">{project.title}</h3>
        </div>
        <button
          aria-label="关闭预览"
          className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
          onClick={onClose}
          type="button"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto my-8 relative w-full">
        <div className="w-full aspect-video rounded-3xl border border-white/10 overflow-hidden shadow-2xl relative bg-black">
          {scene?.imageUrl ? (
            <img
              alt=""
              className="w-full h-full object-cover animate-pulse-slow transition-all duration-700"
              src={scene.imageUrl}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              无此幕预览图
            </div>
          )}
          <div className="absolute bottom-6 left-6 right-6 bg-black/70 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center animate-slide-up">
            <p className="text-[11px] text-brand-secondary font-mono tracking-widest uppercase font-bold mb-1">
              ACT {index + 1} / {project.scenes.length} • {scene?.title}
            </p>
            <p className="text-sm leading-relaxed text-gray-100 font-sans select-none max-w-2xl mx-auto">
              {scene?.scriptText}
            </p>
          </div>
        </div>

        <button
          aria-label="上一幕"
          className="absolute top-1/2 -translate-y-1/2 left-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          onClick={onPrevious}
          type="button"
        >
          ←
        </button>
        <button
          aria-label="下一幕"
          className="absolute top-1/2 -translate-y-1/2 right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          onClick={onNext}
          type="button"
        >
          →
        </button>
      </div>

      <div className="flex items-center justify-center gap-4 py-2 border-t border-white/10">
        <button
          className="px-6 py-2 bg-brand-secondary text-white rounded-full text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
          onClick={onTogglePlaying}
          type="button"
        >
          {playing ? (
            <>
              <span className="w-2 h-2 rounded bg-white inline-block animate-ping" />
              <span>正在播放幻灯分镜</span>
            </>
          ) : (
            <span>继续自动轮播</span>
          )}
        </button>
      </div>
    </div>
  );
}
