import {
  ArrowUp,
  Bot,
  Check,
  Paperclip,
  Sparkles,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";

import AttachmentCapsules from "@/components/AttachmentCapsules";

type Props = {
  text: string;
  images: any[];
  attachments: any[];
  selectedModelId: string;
  disabled?: boolean;
  onTextChange: (value: string) => void;
  onSelectedModelChange: (value: string) => void;
  onSend: () => void;
  onClickAttachment: () => void;
  onRemoveImage: (index: number) => void;
  onRemoveAttachment: (index: number) => void;
  onFileSelect?: (files: File[]) => void;
};

const models = [
  { id: "gpt-4o", name: "GPT-4o" },
  { id: "deepseek", name: "DeepSeek" },
  { id: "qwen-plus", name: "Qwen Plus" },
];

export default function MessageInput({
  attachments,
  disabled = false,
  images,
  onRemoveAttachment,
  onRemoveImage,
  onSelectedModelChange,
  onSend,
  onTextChange,
  selectedModelId,
  onClickAttachment,
  onFileSelect,
  text,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [agentEnabled, setAgentEnabled] = useState(false);

  const canSend = useMemo(() => {
    return !disabled && (text.trim().length > 0 || images.length > 0 || attachments.length > 0);
  }, [attachments.length, disabled, images.length, text]);

  useEffect(() => {
    const closeSelector = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setShowModelSelector(false);
      }
    };
    window.addEventListener("click", closeSelector);
    return () => window.addEventListener("click", closeSelector);
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSend) onSend();
    }
  };

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
    onClickAttachment();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0 && onFileSelect) {
      onFileSelect(Array.from(files));
    }
    // Reset input value to allow selecting same file again
    event.target.value = "";
  };

  return (
    <div className="flex flex-col rounded-3xl overflow-hidden glass-effect-sm bg-white" ref={wrapperRef}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        multiple
      />

      {(images.length > 0 || attachments.length > 0) && (
        <div className="bg-black/5 px-3 pt-3 pb-1 border-b border-black/5">
          <AttachmentCapsules
            attachments={attachments}
            images={images}
            onRemoveAttachment={onRemoveAttachment}
            onRemoveImage={onRemoveImage}
          />
        </div>
      )}

      <div className="py-3 px-3 pb-1">
        <textarea
          className="w-full min-h-[96px] max-h-[220px] border-0 bg-transparent outline-none text-sm resize-none py-1"
          disabled={disabled}
          onChange={(event) => onTextChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything..."
          value={text}
        />
      </div>

      <div className="flex items-center justify-between py-1.5 px-2 pb-2">
        <div className="flex items-center gap-1">
          <button 
            className="flex h-8 px-2.5 items-center gap-1.5 rounded-xl text-xs font-semibold text-on-surface-variant transition-colors hover:bg-black/5 hover:text-on-surface disabled:opacity-30 disabled:cursor-not-allowed" 
            onClick={handleAttachmentClick}
            disabled={disabled}
            title="Add Attachment"
          >
            <Paperclip size={16} />
          </button>

          <button 
            className={`flex h-8 px-2.5 items-center gap-1.5 rounded-xl text-xs font-semibold transition-colors hover:bg-black/5 ${agentEnabled ? "text-on-surface" : "text-on-surface-variant"}`} 
            onClick={() => setAgentEnabled(!agentEnabled)}
            title="Enable Agent Mode"
          >
            {agentEnabled ? <ToggleRight size={18} className="text-on-surface" /> : <ToggleLeft size={18} />}
            <span>Agent</span>
          </button>
          
          <div className="relative">
            <button
              className="flex h-8 px-2.5 items-center gap-1.5 rounded-xl text-xs font-semibold text-on-surface-variant transition-colors hover:bg-black/5 hover:text-on-surface"
              onClick={(e) => { e.stopPropagation(); setShowModelSelector(!showModelSelector); }}
              title="Select Model"
            >
              <Sparkles size={16} />
              <span>{models.find(m => m.id === selectedModelId)?.name || "Model"}</span>
            </button>

            {showModelSelector && (
              <div className="absolute bottom-[calc(100%+8px)] right-0 z-20 w-[190px] p-2 rounded-2xl glass-effect">
                {models.map((m) => (
                  <button
                    key={m.id}
                    className={`grid w-full grid-cols-[14px_1fr_14px] items-center gap-2 rounded-xl py-2.25 px-2.5 text-left text-[13px] transition-colors hover:bg-black/5 ${m.id === selectedModelId ? "text-on-surface" : "text-on-surface-variant"}`}
                    onClick={() => { onSelectedModelChange(m.id); setShowModelSelector(false); }}
                  >
                    <Bot size={14} />
                    <span>{m.name}</span>
                    {m.id === selectedModelId && <Check size={14} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-on-surface text-white transition-transform duration-200 hover:scale-105 active:scale-95 disabled:opacity-30"
          disabled={!canSend}
          onClick={onSend}
          title="Send"
        >
          <ArrowUp size={18} />
        </button>
      </div>
    </div>
  );
}
