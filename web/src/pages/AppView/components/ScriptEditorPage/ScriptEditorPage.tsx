import {
  AlertCircle,
  Download,
  FileText,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  User,
  X,
  type LucideIcon,
} from "lucide-react";

import type { Character } from "@/data/studio";

export type AiPanelTab = "tools" | "chat" | "characters";
export type EditorQuickAction = "continue" | "format" | "character";
export type EditorMessage = { sender: "user" | "ai"; text: string };

type ScriptEditorPageProps = {
  aiChatInput: string;
  aiMessages: EditorMessage[];
  aiPanelTab: AiPanelTab;
  characters: Character[];
  content: string;
  editorGenerating: boolean;
  onAddCharacter: () => void;
  onAiChatInputChange: (value: string) => void;
  onAiPanelTabChange: (tab: AiPanelTab) => void;
  onContentChange: (value: string) => void;
  onExport: () => void;
  onQuickTool: (action: EditorQuickAction) => void;
  onRemoveCharacter: (id: string) => void;
  onSendEditorChat: () => void;
  onTitleChange: (value: string) => void;
  title: string;
};

const scriptInserts = [
  ["场景", "\n场景：[INT/EXT. 地点 - 时间]\n"],
  ["动作", "\n动作段落...\n"],
  ["对话", "\n角色名\n（神态姿势）\n【对话】\n"],
] as const;

export default function ScriptEditorPage({
  aiChatInput,
  aiMessages,
  aiPanelTab,
  characters,
  content,
  editorGenerating,
  onAddCharacter,
  onAiChatInputChange,
  onAiPanelTabChange,
  onContentChange,
  onExport,
  onQuickTool,
  onRemoveCharacter,
  onSendEditorChat,
  onTitleChange,
  title,
}: ScriptEditorPageProps) {
  return (
    <section className="studio-page-script-editor flex-1 min-h-0 overflow-hidden">
      <div className="flex h-full w-full bg-brand-surface">
        <div className="flex-1 flex flex-col border-r border-[#e2e2e2] bg-white h-full relative min-w-0">
          <div className="h-12 border-b border-[#eeeeed] px-4 flex items-center justify-between bg-[#fcfcfc] gap-4">
            <div className="flex items-center gap-2 min-w-0 w-1/2">
              <input
                className="text-base font-bold text-gray-900 border-b border-transparent hover:border-gray-300 focus:border-brand-primary focus:outline-none px-1 py-0.5 w-full bg-transparent"
                onChange={(event) => onTitleChange(event.target.value)}
                type="text"
                value={title}
              />
            </div>
            <div className="flex items-center gap-1.5">
              {scriptInserts.map(([label, insert]) => (
                <button
                  className="px-2.5 py-1 text-[11px] font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg"
                  key={label}
                  onClick={() => onContentChange(content + insert)}
                  type="button"
                >
                  {label}
                </button>
              ))}
              <span className="w-px h-5 bg-gray-200 mx-1" />
              <button
                className="p-1.5 hover:bg-gray-100 text-gray-600 hover:text-gray-900 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                onClick={onExport}
                type="button"
              >
                <Download size={15} />
                <span className="hidden sm:inline">导出</span>
              </button>
            </div>
          </div>

          <div className="flex-1 p-8 overflow-y-auto screenplay-editor bg-[#fdfdfc] flex justify-center">
            <div className="w-full max-w-[650px] relative">
              <textarea
                className="w-full h-[85vh] bg-transparent border-none outline-none focus:ring-0 font-mono text-sm leading-relaxed text-gray-800 resize-none placeholder-gray-400"
                onChange={(event) => onContentChange(event.target.value)}
                placeholder={"/* 在此输入标准好莱坞格式剧本 */\n\n场景：INT. 鼓楼小剧场 - 深夜\n\n一阵干冰白雾渐渐消退。陈野在微弱聚光灯下俯身捡起一只纸飞机。"}
                value={content}
              />
            </div>
          </div>
        </div>

        <aside className="w-80 flex-shrink-0 flex flex-col bg-[#f3f4f3] border-l border-[#e2e2e2] h-full">
          <div className="flex border-b border-[#eeeeed]">
            {[
              ["tools", "AI 诊治工具"],
              ["chat", "创意对话"],
              ["characters", `角色卡 (${characters.length})`],
            ].map(([tab, label]) => (
              <button
                className={`flex-1 py-3 text-xs font-bold border-b-2 transition-all ${
                  aiPanelTab === tab
                    ? "border-brand-primary text-brand-primary bg-white"
                    : "border-transparent text-gray-500 hover:bg-gray-100"
                }`}
                key={tab}
                onClick={() => onAiPanelTabChange(tab as AiPanelTab)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>

          {aiPanelTab === "tools" ? (
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h4 className="text-xs font-bold text-gray-900 mb-2 flex items-center gap-1">
                  <Sparkles size={14} className="text-amber-500" />
                  <span>即时 AI 剧作助理</span>
                </h4>
                <p className="text-[11px] text-gray-500 leading-normal mb-3">
                  基于双子星模型。我们将提取您的当前剧情并执行智能补完或修正。
                </p>
                <div className="space-y-2">
                  <EditorToolButton
                    busy={editorGenerating}
                    icon={Plus}
                    label="续写下一幕"
                    onClick={() => onQuickTool("continue")}
                    primary
                  />
                  <EditorToolButton
                    busy={editorGenerating}
                    icon={FileText}
                    label="智能格式化整顿"
                    onClick={() => onQuickTool("format")}
                  />
                  <EditorToolButton
                    busy={editorGenerating}
                    icon={User}
                    label="提炼本剧场角色设定"
                    onClick={() => onQuickTool("character")}
                  />
                </div>
              </div>

              <div className="bg-amber-50/70 rounded-xl border border-amber-200 p-3 flex gap-2">
                <AlertCircle
                  className="text-amber-600 flex-shrink-0 mt-0.5"
                  size={16}
                />
                <div className="text-[10px] text-amber-800 leading-normal">
                  <strong>排版提示：</strong>
                  好莱坞标准格式通常包含 SCENE SLUGLINE (大写)、CHARACTER NAMES
                  居中、以及动作段落的精炼描写。点击上面“智能格式化”可一键整容。
                </div>
              </div>
            </div>
          ) : null}

          {aiPanelTab === "chat" ? (
            <div className="flex-grow flex flex-col justify-between overflow-hidden">
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {aiMessages.map((message, index) => (
                  <div
                    className={`max-w-[85%] rounded-xl p-3 text-xs leading-relaxed shadow-sm ${
                      message.sender === "user"
                        ? "bg-brand-primary text-white ml-auto rounded-tr-none"
                        : "bg-white text-gray-800 rounded-tl-none border border-gray-200"
                    }`}
                    key={`${message.sender}-${index}`}
                  >
                    {message.text}
                  </div>
                ))}
              </div>
              <div className="p-3 bg-white border-t border-[#eeeeed] flex items-center gap-2">
                <input
                  className="flex-1 text-xs bg-[#f3f4f3] px-3 py-2 rounded-lg border border-transparent focus:border-gray-300 focus:outline-none"
                  onChange={(event) => onAiChatInputChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") onSendEditorChat();
                  }}
                  placeholder="给智能剧本助手提建议..."
                  type="text"
                  value={aiChatInput}
                />
                <button
                  className="p-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/95 transition-colors"
                  onClick={onSendEditorChat}
                  type="button"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          ) : null}

          {aiPanelTab === "characters" ? (
            <div className="flex-grow p-4 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-500">
                  剧场演员 / 角色库
                </span>
                <button
                  className="text-[10px] bg-brand-primary text-white hover:bg-brand-primary/90 px-2 py-1 rounded-lg font-bold"
                  onClick={onAddCharacter}
                  type="button"
                >
                  + 手动新增
                </button>
              </div>
              {characters.length === 0 ? (
                <div className="text-center py-8 bg-white rounded-xl border border-dashed border-gray-200 text-xs text-gray-400">
                  当前尚无角色，可以前往“AI 诊治工具”一键分析提炼！👤
                </div>
              ) : (
                <div className="space-y-3">
                  {characters.map((character) => (
                    <div
                      className="bg-white rounded-xl border border-gray-200 p-3 text-xs relative group"
                      key={character.id}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-gray-900">
                          {character.name}
                        </span>
                        <span className="text-[10px] text-brand-secondary bg-brand-secondary/10 px-1.5 py-0.5 rounded-full font-bold">
                          {character.role}
                        </span>
                      </div>
                      <div className="text-gray-600 mt-1 space-y-1">
                        <p>
                          <strong className="text-gray-800">动机:</strong>{" "}
                          {character.motivation}
                        </p>
                        <p>
                          <strong className="text-gray-800">冲突:</strong>{" "}
                          {character.conflict}
                        </p>
                        <p className="text-gray-400 border-t border-[#f3f4f3] pt-1 mt-1 text-[11px] leading-relaxed">
                          {character.description}
                        </p>
                      </div>
                      <button
                        className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => onRemoveCharacter(character.id)}
                        type="button"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

function EditorToolButton({
  busy,
  icon: Icon,
  label,
  onClick,
  primary = false,
}: {
  busy: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      className={`w-full py-2 text-xs font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
        primary
          ? "bg-brand-primary text-white hover:bg-brand-primary/95"
          : "bg-white hover:bg-gray-50 border border-gray-200 text-gray-800"
      }`}
      disabled={busy}
      onClick={onClick}
      type="button"
    >
      {busy ? (
        <RefreshCw size={13} className="animate-spin" />
      ) : (
        <Icon size={14} className={primary ? "" : "text-gray-500"} />
      )}
      <span>{label}</span>
    </button>
  );
}
