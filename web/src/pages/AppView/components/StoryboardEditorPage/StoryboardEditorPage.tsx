import { Film, Play, Plus, RefreshCw, Sparkles } from "lucide-react";

import type { VideoProject, VideoScene } from "@/data/studio";

type StoryboardEditorPageProps = {
  activeSceneIndex: number;
  currentScene: VideoScene | undefined;
  generating: boolean;
  onActiveSceneChange: (index: number) => void;
  onAddScene: () => void;
  onGenerateScene: (sceneId: string) => void;
  onPlay: () => void;
  onRemoveScene: () => void;
  onSceneChange: (scene: VideoScene) => void;
  presetImages: string[];
  project: VideoProject;
};

export default function StoryboardEditorPage({
  activeSceneIndex,
  currentScene,
  generating,
  onActiveSceneChange,
  onAddScene,
  onGenerateScene,
  onPlay,
  onRemoveScene,
  onSceneChange,
  presetImages,
  project,
}: StoryboardEditorPageProps) {
  return (
    <section className="studio-page-storyboard flex-1 min-h-0 overflow-hidden">
      <div className="flex flex-col h-full bg-brand-surface">
        <div className="flex-1 flex flex-col md:flex-row h-full">
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="text-xs font-mono text-brand-secondary uppercase tracking-widest font-bold">
                  VISION STORYBOARD BOARD
                </span>
                <h2 className="text-xl font-bold text-gray-900 mt-0.5">
                  {project.title}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="bg-brand-primary hover:bg-brand-primary/95 text-white text-xs px-4 py-2 rounded-xl font-bold transition-all shadow-sm flex items-center gap-1.5"
                  onClick={onPlay}
                  type="button"
                >
                  <Play size={13} fill="currentColor" />
                  <span>播放分镜预告</span>
                </button>
                <button
                  className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 text-xs px-3 py-2 rounded-xl font-bold shadow-sm flex items-center gap-1"
                  onClick={onAddScene}
                  type="button"
                >
                  <Plus size={14} />
                  <span>添加幕节</span>
                </button>
              </div>
            </div>

            {currentScene ? (
              <div className="bg-white rounded-3xl border border-[#dadad9] p-6 shadow-md grid grid-cols-1 lg:grid-cols-12 gap-6 relative overflow-hidden">
                <div className="lg:col-span-7 flex flex-col justify-between">
                  <div className="relative bg-black rounded-2xl border border-gray-200 overflow-hidden group aspect-video">
                    {currentScene.imageUrl ? (
                      <img
                        alt=""
                        className="w-full h-full object-cover"
                        src={currentScene.imageUrl}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-center text-gray-400 p-4">
                        <Film size={40} className="text-gray-300 mb-2" />
                        <p className="text-xs font-semibold">无分镜示意图</p>
                        <p className="text-[10px] text-gray-500 mt-1">
                          输入右侧场景描述，让 AI 生成专属故事底版
                        </p>
                      </div>
                    )}

                    {generating ? (
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white">
                        <RefreshCw
                          className="animate-spin text-brand-secondary mb-2"
                          size={32}
                        />
                        <p className="text-xs font-semibold">
                          AI 故事板极速生成中...
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1">
                          使用双子星图像矩阵芯片渲染
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-3">
                    <span className="text-[11px] text-gray-400 font-bold block mb-1">
                      精美电影感预设图片底稿：
                    </span>
                    <div className="flex gap-2">
                      {presetImages.map((url) => (
                        <button
                          className="w-12 h-9 rounded overflow-hidden border border-gray-200 hover:border-brand-secondary transition-all"
                          key={url}
                          onClick={() =>
                            onSceneChange({ ...currentScene, imageUrl: url })
                          }
                          type="button"
                        >
                          <img
                            alt=""
                            className="w-full h-full object-cover"
                            src={url}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] text-gray-400 font-bold block mb-1">
                        分镜幕节标题
                      </label>
                      <input
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-900 focus:outline-none focus:border-brand-secondary focus:bg-white transition-all"
                        onChange={(event) =>
                          onSceneChange({
                            ...currentScene,
                            title: event.target.value,
                          })
                        }
                        type="text"
                        value={currentScene.title}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 font-bold block mb-1">
                        画面视觉提示 / 导演指导（AI绘图参考）
                      </label>
                      <textarea
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs leading-relaxed text-gray-700 focus:outline-none focus:border-brand-secondary focus:bg-white transition-all resize-none"
                        onChange={(event) =>
                          onSceneChange({
                            ...currentScene,
                            scriptText: event.target.value,
                          })
                        }
                        rows={5}
                        value={currentScene.scriptText}
                      />
                    </div>
                  </div>
                  <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between gap-4">
                    <button
                      className="text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                      onClick={onRemoveScene}
                      type="button"
                    >
                      删除本幕
                    </button>
                    <button
                      className="bg-brand-secondary hover:bg-brand-secondary/95 text-white text-xs px-4 py-2 rounded-xl font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
                      disabled={generating}
                      onClick={() => onGenerateScene(currentScene.id)}
                      type="button"
                    >
                      <Sparkles size={13} />
                      <span>AI 智能绘图</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <div>
              <h3 className="text-xs font-bold text-gray-500 mb-3">
                分镜幕节列表 ({project.scenes.length})
              </h3>
              <div className="flex gap-4 overflow-x-auto pb-4">
                {project.scenes.map((scene, index) => (
                  <button
                    className={`flex-shrink-0 w-44 bg-white rounded-2xl border-2 p-3 cursor-pointer transition-all text-left ${
                      activeSceneIndex === index
                        ? "border-brand-secondary shadow-md scale-[1.02]"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    key={scene.id}
                    onClick={() => onActiveSceneChange(index)}
                    type="button"
                  >
                    <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden mb-2 border border-gray-200">
                      {scene.imageUrl ? (
                        <img
                          alt=""
                          className="w-full h-full object-cover"
                          src={scene.imageUrl}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">
                          未渲染
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-brand-secondary font-mono block font-bold">
                      ACT {index + 1}
                    </span>
                    <h4 className="text-xs font-bold text-gray-900 truncate mt-0.5">
                      {scene.title}
                    </h4>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
