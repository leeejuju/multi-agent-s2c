import {
  ArrowUp,
  Check,
  Cpu,
  Paperclip,
  Square,
} from "lucide-react";
import { Button, Popover, Switch } from "antd";
import { type ChangeEvent, type KeyboardEvent, useMemo, useRef, useState } from "react";

import AttachmentCapsules from "@/components/AttachmentCapsules";
import "./MessageInput.css";

type Props = {
  text: string;
  images: any[];
  attachments: any[];
  selectedModelId: string;
  className?: string;
  disabled?: boolean;
  sending?: boolean;
  variant?: "default" | "script-start";
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
  className,
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
  variant = "default",
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

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0 && onFileSelect) {
      onFileSelect(Array.from(files));
    }
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

  if (variant === "script-start") {
    return (
      <div
        className={[
          "message-input message-input-script-start glass-effect-sm flex flex-col bg-card-background",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          multiple
        />
        <textarea
          className="message-input-textarea message-script-textarea w-full resize-none border-0 bg-transparent outline-none"
          disabled={disabled}
          onChange={(event) => onTextChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="帮您处理剧本格式或从新点子开始？"
          value={text}
        />

        {(images.length > 0 || attachments.length > 0) && (
          <div className="message-script-attachments">
            <AttachmentCapsules
              attachments={attachments}
              images={images}
              onRemoveAttachment={onRemoveAttachment}
              onRemoveImage={onRemoveImage}
            />
          </div>
        )}

        <div className="message-script-toolbar">
          <button
            className="message-script-file-button"
            disabled={disabled}
            onClick={handleAttachmentClick}
            type="button"
          >
            <Paperclip size={16} />
            <span>添加文件</span>
          </button>

          <Button
            className={`message-send-button ${sending ? "is-stopping" : ""}`}
            disabled={sending ? false : !canSend}
            icon={sending ? <Square size={13} fill="currentColor" /> : <ArrowUp size={16} />}
            onClick={sending ? onStop : onSend}
            shape="default"
            title={sending ? "停止" : "发送"}
            type={sending ? "default" : "primary"}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={[
        "message-input glass-effect-sm flex flex-col overflow-hidden rounded-[18px] bg-card-background px-3 py-3",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        multiple
      />

      {(images.length > 0 || attachments.length > 0) && (
        <div className="message-input-attachments">
          <AttachmentCapsules
            attachments={attachments}
            images={images}
            onRemoveAttachment={onRemoveAttachment}
            onRemoveImage={onRemoveImage}
          />
        </div>
      )}

      <div className="px-1">
        <textarea
          className="message-input-textarea w-full min-h-[112px] max-h-[220px] resize-none border-0 bg-transparent px-1 py-2 text-[1rem] outline-none"
          disabled={disabled}
          onChange={(event) => onTextChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="写下你的创作需求"
          value={text}
        />
      </div>

      <div className="message-input-toolbar">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            className="message-input-icon-button"
            icon={<Paperclip size={15} />}
            onClick={handleAttachmentClick}
            disabled={disabled}
            title="添加附件"
            type="text"
          />

          <div className="message-agent-toggle">
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
          title={sending ? "停止" : "发送"}
          type={sending ? "default" : "primary"}
        />
      </div>
    </div>
  );
}
