import {
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { ArrowUp, FileText, Image, Paperclip, X } from "lucide-react";
import { Form } from "radix-ui";

import PageContainer from "../PageContainer";

import "./NewPromptPage.css";

const MAX_FILE_COUNT = 6;
const MAX_IMAGE_COUNT = 1;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_TEXT_SIZE = 100 * 1024;
const MAX_COMBINED_TEXT_SIZE = 200 * 1024;

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);
const TEXT_EXTENSIONS = new Set([
  "txt",
  "md",
  "markdown",
  "fountain",
  "fdx",
  "json",
  "csv",
  "html",
  "htm",
]);

const FILE_ACCEPT = [
  ...Array.from(IMAGE_EXTENSIONS, (extension) => `.${extension}`),
  ...Array.from(TEXT_EXTENSIONS, (extension) => `.${extension}`),
].join(",");

const EXAMPLE_PROMPTS = [
  {
    label: "悬疑短剧大纲",
    prompt:
      "把这段故事梗概整理成一集 15 分钟的悬疑短剧，先建立角色关系，再输出分场大纲。",
  },
  {
    label: "三幕式结构",
    prompt:
      "根据我选择的人物小传，设计一个三幕式电影故事，并给出每一幕的核心冲突和转折。",
  },
  {
    label: "小说改写剧本",
    prompt:
      "将我粘贴的小说片段改写为规范剧本格式，保留原意，并强化动作、对白和场景节奏。",
  },
  {
    label: "双人戏开场",
    prompt:
      "为一个发生在深夜便利店的双人戏写开场：两位角色互相隐瞒身份，结尾留下反转钩子。",
  },
] as const;

type NewPromptPageProps = {
  accountEmail: string;
  attachments: File[];
  isSubmitting: boolean;
  onAttachmentsChange: (attachments: File[]) => void;
  onPromptChange: (value: string) => void;
  onPromptKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onSubmit: (event?: FormEvent) => void;
  promptInput: string;
  submissionError: string | null;
};

export default function NewPromptPage({
  accountEmail,
  attachments,
  isSubmitting,
  onAttachmentsChange,
  onPromptChange,
  onPromptKeyDown,
  onSubmit,
  promptInput,
  submissionError,
}: NewPromptPageProps) {
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  const extensionOf = (file: File) =>
    file.name.split(".").pop()?.toLowerCase() ?? "";

  const fileKind = (file: File) => {
    const extension = extensionOf(file);
    if (IMAGE_EXTENSIONS.has(extension)) return "image";
    if (TEXT_EXTENSIONS.has(extension)) return "text";
    return null;
  };

  const fileIdentity = (file: File) =>
    `${file.name}:${file.size}:${file.lastModified}`;

  const handleFilesSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    const nextAttachments = [...attachments];
    const validationMessages: string[] = [];
    let imageCount = nextAttachments.filter(
      (file) => fileKind(file) === "image",
    ).length;
    let combinedTextSize = nextAttachments
      .filter((file) => fileKind(file) === "text")
      .reduce((total, file) => total + file.size, 0);

    for (const file of selectedFiles) {
      if (nextAttachments.length >= MAX_FILE_COUNT) {
        validationMessages.push("最多可选择 6 个参考文件，多余文件未添加。");
        break;
      }

      if (
        nextAttachments.some(
          (attachment) => fileIdentity(attachment) === fileIdentity(file),
        )
      ) {
        validationMessages.push(`“${file.name}”已经选择。`);
        continue;
      }

      const kind = fileKind(file);
      if (!kind) {
        validationMessages.push(`“${file.name}”不是支持的参考文件格式。`);
        continue;
      }

      if (kind === "image") {
        if (imageCount >= MAX_IMAGE_COUNT) {
          validationMessages.push("一次最多选择 1 张图片参考。");
          continue;
        }
        if (file.size > MAX_IMAGE_SIZE) {
          validationMessages.push(`图片“${file.name}”不能超过 10 MB。`);
          continue;
        }
        imageCount += 1;
      } else {
        if (file.size > MAX_TEXT_SIZE) {
          validationMessages.push(`文本“${file.name}”不能超过 100 KB。`);
          continue;
        }
        if (combinedTextSize + file.size > MAX_COMBINED_TEXT_SIZE) {
          validationMessages.push("所选文本参考合计不能超过 200 KB。");
          continue;
        }
        combinedTextSize += file.size;
      }

      nextAttachments.push(file);
    }

    if (nextAttachments.length !== attachments.length) {
      onAttachmentsChange(nextAttachments);
    }
    setAttachmentError(
      validationMessages.length > 0
        ? Array.from(new Set(validationMessages)).join(" ")
        : null,
    );

    event.target.value = "";
  };

  const removeAttachment = (attachmentIndex: number) => {
    onAttachmentsChange(
      attachments.filter((_, index) => index !== attachmentIndex),
    );
    setAttachmentError(null);
  };

  const appendExamplePrompt = (examplePrompt: string) => {
    const currentPrompt = promptInput.trimEnd();
    const nextPrompt = currentPrompt
      ? `${currentPrompt}\n\n${examplePrompt}`
      : examplePrompt;

    onPromptChange(nextPrompt);
    window.requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    });
  };

  return (
    <PageContainer className="studio-page-new">
      <div className="new-prompt-page__layout">
        <div className="new-prompt-page__greeting">
          <div className="new-prompt-page__greeting-mark" aria-hidden="true">
            <div className="new-prompt-page__greeting-bar new-prompt-page__greeting-bar--muted" />
            <div className="new-prompt-page__greeting-bar new-prompt-page__greeting-bar--selected" />
            <div className="new-prompt-page__greeting-bar new-prompt-page__greeting-bar--brand" />
          </div>
          <h2 className="new-prompt-page__title">
            晚上好，{accountEmail}
          </h2>
        </div>

        <Form.Root
          className="new-prompt-input"
          onSubmit={onSubmit}
        >
          <Form.Field className="new-prompt-page__field" name="prompt">
            <Form.Label className="new-prompt-page__label">
              创作要求
            </Form.Label>
            <Form.Control asChild>
              <textarea
                ref={textareaRef}
                className="new-prompt-page__textarea"
                disabled={isSubmitting}
                onChange={(event) => onPromptChange(event.target.value)}
                onKeyDown={onPromptKeyDown}
                placeholder="帮您处理剧本格式或从新点子开始？在此输入您的剧本构思、情节灵感、或直接粘贴杂乱段落..."
                value={promptInput}
              />
            </Form.Control>
          </Form.Field>

          {attachments.length > 0 ? (
            <ul
              aria-label="已选择的附件"
              className="new-prompt-page__attachments"
            >
              {attachments.map((file, index) => {
                const isImage = fileKind(file) === "image";
                return (
                  <li
                    className="new-prompt-page__attachment"
                    key={fileIdentity(file)}
                  >
                    {isImage ? (
                      <Image
                        aria-hidden="true"
                        className="new-prompt-page__attachment-icon"
                        size={14}
                      />
                    ) : (
                      <FileText
                        aria-hidden="true"
                        className="new-prompt-page__attachment-icon"
                        size={14}
                      />
                    )}
                    <span className="new-prompt-page__attachment-name">
                      {file.name}
                    </span>
                    <span className="new-prompt-page__attachment-size">
                      {file.size < 1024 * 1024
                        ? `${Math.max(1, Math.round(file.size / 1024))} KB`
                        : `${(file.size / 1024 / 1024).toFixed(1)} MB`}
                    </span>
                    <button
                      aria-label={`移除附件 ${file.name}`}
                      className="new-prompt-page__attachment-remove"
                      disabled={isSubmitting}
                      onClick={() => removeAttachment(index)}
                      type="button"
                    >
                      <X aria-hidden="true" size={13} />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {attachmentError ? (
            <p
              className="new-prompt-page__attachment-error"
              id={`${fileInputId}-error`}
              role="alert"
            >
              {attachmentError}
            </p>
          ) : null}

          <div className="new-prompt-page__controls">
            <div className="new-prompt-page__attachment-controls">
              <input
                ref={fileInputRef}
                accept={FILE_ACCEPT}
                aria-describedby={
                  attachmentError ? `${fileInputId}-error` : undefined
                }
                className="new-prompt-page__file-input"
                disabled={isSubmitting || attachments.length >= MAX_FILE_COUNT}
                id={fileInputId}
                multiple
                onChange={handleFilesSelected}
                tabIndex={-1}
                type="file"
              />
              <button
                aria-controls={fileInputId}
                className="new-prompt-page__attach-button"
                disabled={isSubmitting || attachments.length >= MAX_FILE_COUNT}
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                <Paperclip aria-hidden="true" size={14} />
                添加附件
              </button>
            </div>

            <Form.Submit
              aria-label={isSubmitting ? "正在提交" : "提交提示词"}
              className="new-prompt-page__submit"
              disabled={!promptInput.trim() || isSubmitting}
              type="submit"
            >
              {isSubmitting ? (
                <span className="new-prompt-page__submit-status">提交中</span>
              ) : (
                <ArrowUp size={15} />
              )}
            </Form.Submit>
          </div>
        </Form.Root>

        <div className="new-prompt-page__response" aria-live="polite">
          {submissionError ? (
            <div
              className="new-prompt-page__submission-error"
              role="alert"
            >
              提交失败：{submissionError}
            </div>
          ) : null}

          <section aria-label="创作示例" className="new-prompt-page__examples">
            <div className="new-prompt-page__example-list">
              {EXAMPLE_PROMPTS.map((example) => (
                <button
                  aria-label={`将示例添加到创作要求：${example.prompt}`}
                  className="new-prompt-example"
                  disabled={isSubmitting}
                  key={example.label}
                  onClick={() => appendExamplePrompt(example.prompt)}
                  type="button"
                >
                  {example.label}
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </PageContainer>
  );
}
