import {
  Database,
  Info,
  Settings,
  User,
} from "@lucide/vue"

import type { SettingsSection } from "@/types/settings"

export const SETTINGS_SECTIONS: SettingsSection[] = [
  { id: "general", label: "General", icon: Settings },
  { id: "account", label: "Account", icon: User },
  { id: "data", label: "Data Controls", icon: Database },
  { id: "about", label: "About", icon: Info }
]
