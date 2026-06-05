export type SettingsPanelProps = {
  onClose: () => void;
  open: boolean;
};

export type PrimaryKey =
  | "models"
  | "mcp"
  | "chat"
  | "interface"
  | "account";

export type SecondaryKey =
  | "qwen"
  | "deepseek"
  | "doubao"
  | "kimi"
  | "zhipu"
  | "minimax"
  | "google"
  | "openai"
  | "connection"
  | "tools"
  | "streaming"
  | "attachments"
  | "theme"
  | "layout"
  | "profile"
  | "about";

export type ModelProviderKey =
  | "qwen"
  | "deepseek"
  | "doubao"
  | "kimi"
  | "zhipu"
  | "minimax"
  | "google"
  | "openai";

export type SettingsSection = {
  key: PrimaryKey;
  label: string;
};

export type SecondaryItem = {
  key: SecondaryKey;
  label: string;
};

export type SettingsSidebarSectionMap = Record<PrimaryKey, SecondaryItem[]>;

export type SettingsPrimarySidebarProps = {
  activePrimary: PrimaryKey;
  sections: SettingsSection[];
  onSelectPrimary: (key: PrimaryKey) => void;
};

export type SettingsSecondarySidebarProps = {
  activeSecondary: SecondaryKey;
  items: SecondaryItem[];
  onSelectSecondary: (key: SecondaryKey) => void;
};

export type SettingsDetailPanelProps = {
  activePrimary: PrimaryKey;
  activeSecondary: SecondaryKey;
  activeSecondaryTitle: string;
  autoSave: boolean;
  compactMode: boolean;
  defaultModel: string;
  enabledProviders: Record<ModelProviderKey, boolean>;
  mcpEnabled: boolean;
  providerApiKeys: Record<ModelProviderKey, string>;
  streamThrottle: string;
  theme: string;
  onAutoSave: (value: boolean) => void;
  onCompactMode: (value: boolean) => void;
  onDefaultModel: (value: string) => void;
  onMcpEnabled: (value: boolean) => void;
  onProviderApiKey: (provider: ModelProviderKey, value: string) => void;
  onProviderEnabled: (provider: ModelProviderKey, value: boolean) => void;
  onStreamThrottle: (value: string) => void;
  onTheme: (value: string) => void;
};
