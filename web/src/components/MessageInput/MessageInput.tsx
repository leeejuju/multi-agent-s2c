import {
  ArrowUp,
  Check,
  Cpu,
  Paperclip,
  Square,
} from "lucide-react";
import { Button, Popover, Switch } from "antd";
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

type UploadAwareItem = {
  file?: File;
  uploaded?: unknown;
  uploading?: boolean;
  uploadProgress?: number;
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
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const selectedModel =
    models.find((model) => model.id === selectedModelId) || models[0];
  const hasUploadingAttachment = [...images, ...attachments].some(
    (item) => item?.uploading,
  );
  const hasIncompleteAttachmentUpload = [...images, ...attachments].some(
    (item) => {
      const attachment = item as UploadAwareItem;
      return (
        Boolean(attachment?.file) &&
        (attachment.uploading === true ||
          attachment.uploaded === undefined ||
          (typeof attachment.uploadProgress === "number" && attachment.uploadProgress < 100))
      );
    },
  );

  const canSend = useMemo(() => {
    return (
      !disabled &&
      !sending &&
      !hasUploadingAttachment &&
      !hasIncompleteAttachmentUpload &&
      (text.trim().length > 0 || images.length > 0 || attachments.length > 0)
    );
  }, [
    attachments.length,
    disabled,
    hasIncompleteAttachmentUpload,
    hasUploadingAttachment,
    images.length,
    sending,
    text,
  ]);

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

  const selectModel = (modelId: string) => {
    onSelectedModelChange(modelId);
    setModelPickerOpen(false);
  };

  const modelPicker = (
    <div className="model-picker">
      {models.map((model) => {
        const selected = model.id === selectedModelId;
        return (
          <button
            className={`model-picker-option ${selected ? "is-selected" : ""}`}
            key={model.id}
            onClick={() => selectModel(model.id)}
            type="button"
          >
            <span className="model-picker-icon">
              {selected ? <Check size={14} /> : <Cpu size={14} />}
            </span>
            <span className="model-picker-name">{model.name}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="message-input glass-effect-sm flex px-1.5 py-1.5 flex-col overflow-hidden rounded-[18px] bg-card-background">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        multiple
      />

      {(images.length > 0 || attachments.length > 0) && (
        <div className="border-b border-border bg-surface-variant px-2 pt-2 pb-0.5">
          <AttachmentCapsules
            attachments={attachments}
            images={images}
            onRemoveAttachment={onRemoveAttachment}
            onRemoveImage={onRemoveImage}
          />
        </div>
      )}

      <div className="px-2 py-2 pb-1">
        <textarea
          className="message-input-textarea w-full min-h-[68px] max-h-[160px] resize-none border-0 bg-transparent py-1 text-[13px] outline-none"
          disabled={disabled}
          onChange={(event) => onTextChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything..."
          value={text}
        />
      </div>

      <div className="flex items-center justify-between px-2 pb-1.5 pt-0.5">
        <div className="flex items-center gap-1">
          <Button
            className="flex h-7 items-center rounded-lg text-[11px] font-medium"
            icon={<Paperclip size={15} />}
            onClick={handleAttachmentClick}
            disabled={disabled}
            title="Add Attachment"
            type="text"
          />

          <div className="flex h-7 items-center gap-1 rounded-lg px-1.5 text-[11px] font-medium text-on-surface-variant">
            <Switch
              checked={agentEnabled}
              disabled={disabled}
              onChange={setAgentEnabled}
              size="small"
            />
            <span>Agent</span>
          </div>

          <Popover
            arrow={false}
            content={modelPicker}
            onOpenChange={setModelPickerOpen}
            open={!disabled && modelPickerOpen}
            placement="topLeft"
            trigger="click"
          >
            <Button
              className="message-model-button"
              disabled={disabled}
              icon={<Cpu size={13} />}
              type="text"
            >
              {selectedModel.name}
            </Button>
          </Popover>
        </div>

        <Button
          className={`message-send-button ${sending ? "is-stopping" : ""}`}
          disabled={sending ? false : !canSend}
          icon={sending ? <Square size={13} fill="currentColor" /> : <ArrowUp size={16} />}
          onClick={sending ? onStop : onSend}
          shape="default"
          title={sending ? "Stop" : "Send"}
          type={sending ? "default" : "primary"}
        />
      </div>
    </div>
  );
}
