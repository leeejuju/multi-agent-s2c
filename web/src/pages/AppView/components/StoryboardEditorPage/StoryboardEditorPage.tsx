import { Film, Play, Plus } from "lucide-react";
import { Label, ToggleGroup, Toolbar } from "radix-ui";

import type { VideoProject, VideoScene } from "@/data/studio";

import "./StoryboardEditorPage.css";

type StoryboardEditorPageProps = {
  activeSceneIndex: number;
  currentScene: VideoScene | undefined;
  onActiveSceneChange: (index: number) => void;
  onAddScene: () => void;
  onPlay: () => void;
  onRemoveScene: () => void;
  onSceneChange: (scene: VideoScene) => void;
  project: VideoProject;
};

export default function StoryboardEditorPage({
  activeSceneIndex,
  currentScene,
  onActiveSceneChange,
  onAddScene,
  onPlay,
  onRemoveScene,
  onSceneChange,
  project,
}: StoryboardEditorPageProps) {
  return (
    <section className="storyboard-editor-page">
      <div className="storyboard-editor-page__canvas">
        <div className="storyboard-editor-page__frame">
          <div className="storyboard-editor-page__body">
            <div className="storyboard-editor-page__header">
              <div>
                <span className="storyboard-editor-page__eyebrow">
                  VISION STORYBOARD BOARD
                </span>
                <h2 className="storyboard-editor-page__title">
                  {project.title}
                </h2>
              </div>
              <Toolbar.Root
                aria-label="分镜操作"
                className="storyboard-editor-page__toolbar"
              >
                <Toolbar.Button
                  className="storyboard-editor-page__play-button"
                  onClick={onPlay}
                >
                  <Play size={13} fill="currentColor" />
                  <span>播放分镜预告</span>
                </Toolbar.Button>
                <Toolbar.Button
                  className="storyboard-editor-page__add-button"
                  onClick={onAddScene}
                >
                  <Plus size={14} />
                  <span>添加幕节</span>
                </Toolbar.Button>
              </Toolbar.Root>
            </div>

            {currentScene ? (
              <div className="storyboard-editor-page__editor-card">
                <div className="storyboard-editor-page__preview-column">
                  <div className="storyboard-editor-page__preview">
                    {currentScene.imageUrl ? (
                      <img
                        alt=""
                        className="storyboard-editor-page__preview-image"
                        src={currentScene.imageUrl}
                      />
                    ) : (
                      <div className="storyboard-editor-page__preview-empty">
                        <Film
                          size={40}
                          className="storyboard-editor-page__preview-empty-icon"
                        />
                        <p className="storyboard-editor-page__preview-empty-title">
                          无分镜示意图
                        </p>
                        <p className="storyboard-editor-page__preview-empty-help">
                          输入右侧场景描述，让 AI 生成专属故事底版
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="storyboard-editor-page__details-column">
                  <div className="storyboard-editor-page__fields">
                    <div>
                      <Label.Root
                        className="storyboard-editor-page__field-label"
                        htmlFor="scene-title"
                      >
                        分镜幕节标题
                      </Label.Root>
                      <input
                        className="storyboard-editor-page__title-input"
                        id="scene-title"
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
                      <Label.Root
                        className="storyboard-editor-page__field-label"
                        htmlFor="scene-direction"
                      >
                        画面视觉提示 / 导演指导（AI绘图参考）
                      </Label.Root>
                      <textarea
                        className="storyboard-editor-page__direction-input"
                        id="scene-direction"
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
                  <div className="storyboard-editor-page__editor-footer">
                    <Toolbar.Root aria-label="当前幕节操作">
                      <Toolbar.Button
                        className="storyboard-editor-page__delete-button"
                        onClick={onRemoveScene}
                      >
                        删除本幕
                      </Toolbar.Button>
                    </Toolbar.Root>
                  </div>
                </div>
              </div>
            ) : null}

            <div>
              <h3 className="storyboard-editor-page__scene-list-title">
                分镜幕节列表 ({project.scenes.length})
              </h3>
              <ToggleGroup.Root
                aria-label="选择分镜幕节"
                className="storyboard-editor-page__scene-list"
                onValueChange={(value) => {
                  if (value) {
                    onActiveSceneChange(Number(value));
                  }
                }}
                type="single"
                value={String(activeSceneIndex)}
              >
                {project.scenes.map((scene, index) => (
                  <ToggleGroup.Item
                    aria-label={`选择第 ${index + 1} 幕：${scene.title}`}
                    className="storyboard-editor-page__scene-item"
                    key={scene.id}
                    value={String(index)}
                  >
                    <div className="storyboard-editor-page__scene-media">
                      {scene.imageUrl ? (
                        <img
                          alt=""
                          className="storyboard-editor-page__scene-image"
                          src={scene.imageUrl}
                        />
                      ) : (
                        <div className="storyboard-editor-page__scene-placeholder">
                          未渲染
                        </div>
                      )}
                    </div>
                    <span className="storyboard-editor-page__scene-act">
                      ACT {index + 1}
                    </span>
                    <h4 className="storyboard-editor-page__scene-title">
                      {scene.title}
                    </h4>
                  </ToggleGroup.Item>
                ))}
              </ToggleGroup.Root>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
