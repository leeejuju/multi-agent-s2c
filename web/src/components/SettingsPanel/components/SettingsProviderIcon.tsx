import chatglmIcon from "@/assets/icon/chatglm.svg";
import chatgptIcon from "@/assets/icon/openai.svg";
import bailianIcon from "@/assets/icon/bailian-color.svg";
import deepseekIcon from "@/assets/icon/deepseek.svg";
import doubaoIcon from "@/assets/icon/doubao.svg";
import geminiIcon from "@/assets/icon/gemini.svg";
import kimiIcon from "@/assets/icon/kimi.svg";
import minimaxIcon from "@/assets/icon/minimax.svg";
import type { ModelProviderKey, SecondaryKey } from "../types";

type SettingsProviderIconProps = {
  className?: string;
  provider: SecondaryKey;
};

const providerIcons: Record<ModelProviderKey, string> = {
  qwen: bailianIcon,
  deepseek: deepseekIcon,
  doubao: doubaoIcon,
  kimi: kimiIcon,
  zhipu: chatglmIcon,
  minimax: minimaxIcon,
  google: geminiIcon,
  openai: chatgptIcon,
};

function isModelProviderKey(key: SecondaryKey): key is ModelProviderKey {
  return key in providerIcons;
}

export function SettingsProviderIcon({
  className,
  provider,
}: SettingsProviderIconProps) {
  if (!isModelProviderKey(provider)) return null;

  return (
    <img
      alt=""
      aria-hidden="true"
      className={["settings-provider-icon", className].filter(Boolean).join(" ")}
      src={providerIcons[provider]}
    />
  );
}
