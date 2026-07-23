import type { Component } from "vue"

export type SettingsSectionId =
  | "general"
  | "account"
  | "data"
  | "about"

export interface SettingsSection {
  id: SettingsSectionId
  label: string
  icon: Component
}
