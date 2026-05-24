import {
  ArrowUp,
  Paperclip,
  Square,
} from "lucide-react";
import { Button, Select, Switch } from "antd";
import { KeyboardEvent, useMemo, useRef, useState } from "react";

import AttachmentCapsules from "@/components/AttachmentCapsules";
import "./MessageInput.css";

type Props = {
  text: string;
  images: any[];
  attachments: any[];
  selectedModelId: string;
  disabled?: boolean;
  sending?: boolean;
  onTextChange: (value: string) => void;
  onSelectedModelChange: (value: string) => void;
  onSend: () => void;
  onStop?: () => void;
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
  onStop,
  onTextChange,
  selectedModelId,
  sending = false,
  onClickAttachment,
  onFileSelect,
  text,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [agentEnabled, setAgentEnabled] = useState(false);

  const canSend = useMemo(() => {
    return !disabled && (text.trim().length > 0 || images.length > 0 || attachments.length > 0);
  }, [attachments.length, disabled, images.length, text]);

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
    <div className="message-input flex flex-col rounded-3xl overflow-hidden glass-effect-sm bg-white">
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
          className="message-input-textarea w-full min-h-[96px] max-h-[220px] border-0 bg-transparent outline-none text-sm resize-none py-1"
          disabled={disabled}
          onChange={(event) => onTextChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything..."
          value={text}
        />
      </div>

      <div className="flex items-center justify-between py-1.5 px-2 pb-2">
        <div className="flex items-center gap-1">
          <Button
            className="flex h-8 items-center rounded-xl text-xs font-semibold"
            icon={<Paperclip size={16} />}
            onClick={handleAttachmentClick}
            disabled={disabled}
            title="Add Attachment"
            type="text"
          />

          <div className="flex h-8 items-center gap-1.5 rounded-xl px-2 text-xs font-semibold text-on-surface-variant">
            <Switch
              checked={agentEnabled}
              disabled={disabled}
              onChange={setAgentEnabled}
              size="small"
            />
            <span>Agent</span>
          </div>
          
          <Select
            className="min-w-[118px]"
            disabled={disabled}
            onChange={onSelectedModelChange}
            options={models.map((model) => ({
              label: model.name,
              value: model.id,
            }))}
            size="small"
            value={selectedModelId}
          />
        </div>

        <Button
          className={sending ? "bg-red-500 hover:!bg-red-600" : ""}
          danger={sending}
          disabled={sending ? false : !canSend}
          icon={sending ? <Square size={14} fill="currentColor" /> : <ArrowUp size={18} />}
          onClick={sending ? onStop : onSend}
          shape="default"
          title={sending ? "Stop" : "Send"}
          type="primary"
        />
      </div>
    </div>
  );
}
