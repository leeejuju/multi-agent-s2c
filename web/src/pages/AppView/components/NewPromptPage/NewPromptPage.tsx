import type { DragEvent, FormEvent, KeyboardEvent } from "react";
import { ArrowUp, Paperclip, Plus, X, type LucideIcon } from "lucide-react";

import PageContainer from "../PageContainer";

import "./NewPromptPage.css";

type PromptMode =
  | "chat"
  | "format"
  | "scratchpad"
  | "writing"
  | "plot"
  | "character";

type PromptModeCopy = Record<
  Exclude<PromptMode, "chat">,
  { bubble: string; icon: LucideIcon; label: string; prompt: string; tone: string }
>;

type NewPromptPageProps = {
  isUploading: boolean;
  onClearUploadedFile: () => void;
  onDrop: (event: DragEvent) => void;
  onModeChange: (mode: PromptMode) => void;
  onPromptChange: (value: string) => void;
  onPromptKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onSubmit: (event?: FormEvent) => void;
  onTriggerUpload: () => void;
  promptInput: string;
  promptModeCopy: PromptModeCopy;
  selectedMode: PromptMode;
  uploadedFileName: string | null;
  username: string;
};

export default function NewPromptPage({
  isUploading,
  onClearUploadedFile,
  onDrop,
  onModeChange,
  onPromptChange,
  onPromptKeyDown,
  onSubmit,
  onTriggerUpload,
  promptInput,
  promptModeCopy,
  selectedMode,
  uploadedFileName,
  username,
}: NewPromptPageProps) {
  return (
    <PageContainer className="studio-page-new">
      <div className="w-full max-w-4xl mx-auto px-8 py-16 flex flex-col items-start justify-center min-h-full">
        <div className="flex items-center gap-3 mb-6 animate-fade-in">
          <div className="flex gap-1.5">
            <div className="w-3 h-8 bg-red-400 rounded-full" />
            <div className="w-3 h-8 bg-green-400 rounded-full" />
            <div className="w-3 h-8 bg-yellow-400 rounded-full" />
          </div>
          <h2 className="text-3xl font-bold font-display text-gray-900 tracking-tight">
            晚上好，{username}
          </h2>
        </div>

        <form
          className="new-prompt-input w-full bg-[#fdfdfd] rounded-3xl p-6 transition-colors relative overflow-hidden"
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDrop}
          onSubmit={onSubmit}
        >
          <textarea
            className="w-full min-h-[140px] text-gray-800 bg-transparent resize-none border-none outline-none focus:ring-0 text-base leading-relaxed placeholder-gray-400"
            onChange={(event) => onPromptChange(event.target.value)}
            onKeyDown={onPromptKeyDown}
            placeholder="帮您处理剧本格式或从新点子开始？在此输入您的剧本构思、情节灵感、或直接粘贴杂乱段落..."
            value={promptInput}
          />

          {uploadedFileName ? (
            <div className="mb-4 flex items-center justify-between bg-brand-primary/10 border border-brand-primary/20 px-3 py-1.5 rounded-xl text-xs text-brand-primary font-medium animate-fade-in">
              <div className="flex items-center gap-2">
                <Paperclip size={14} />
                <span>已添加参考文件: {uploadedFileName}</span>
              </div>
              <button
                className="hover:text-brand-secondary"
                onClick={onClearUploadedFile}
                type="button"
              >
                <X size={14} />
              </button>
            </div>
          ) : null}

          <div className="flex items-center justify-between pt-4 mt-2">
            <button
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all ${
                isUploading ? "opacity-60 cursor-not-allowed" : ""
              }`}
              disabled={isUploading}
              onClick={onTriggerUpload}
              type="button"
            >
              <Plus size={14} className="text-brand-secondary" />
              <span>{isUploading ? "导入中..." : "添加文件"}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-sm ${
                  promptInput.trim()
                    ? "bg-brand-primary text-white hover:bg-brand-primary/90 cursor-pointer"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
                disabled={!promptInput.trim()}
                type="submit"
              >
                <ArrowUp size={15} />
              </button>
            </div>
          </div>
        </form>

        <div className="flex flex-wrap items-center justify-start gap-2.5 mt-8 max-w-2xl animate-fade-in">
          {Object.entries(promptModeCopy).map(([mode, copy]) => {
            const Icon = copy.icon;
            const active = selectedMode === mode;

            return (
              <button
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium border transition-all ${
                  active
                    ? "bg-[#eeeeed] text-gray-900 border-[#dadad9] font-semibold"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900"
                }`}
                key={mode}
                onClick={() => onModeChange(mode as PromptMode)}
                type="button"
              >
                <Icon size={13} className={copy.tone} />
                <span>{copy.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </PageContainer>
  );
}
