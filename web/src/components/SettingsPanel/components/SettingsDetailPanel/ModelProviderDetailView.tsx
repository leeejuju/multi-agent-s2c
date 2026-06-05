import { Button, Input, Switch, Tooltip } from "antd";
import { AlertCircle, Check, CheckCircle2, CircleHelp } from "lucide-react";
import { useMemo, useState } from "react";

import { MODEL_PROVIDER_CATALOG, sortModelSeries } from "../../modelCatalog";
import { SettingsProviderIcon } from "../SettingsProviderIcon";
import type {
  ModelProviderKey,
  SecondaryKey,
  SettingsDetailPanelProps,
} from "../../types";

type ApiKeyTestStatus = "idle" | "missing" | "ready";

const MODEL_PROVIDER_KEYS = Object.keys(
  MODEL_PROVIDER_CATALOG,
) as ModelProviderKey[];

function createProviderTestStatus() {
  return MODEL_PROVIDER_KEYS.reduce(
    (record, key) => ({ ...record, [key]: "idle" }),
    {} as Record<ModelProviderKey, ApiKeyTestStatus>,
  );
}

function isModelProviderKey(key: SecondaryKey): key is ModelProviderKey {
  return key in MODEL_PROVIDER_CATALOG;
}

function renderApiKeyBadge(status: ApiKeyTestStatus) {
  switch (status) {
    case "ready":
      return (
        <span className="settings-api-key-badge is-ready">
          <CheckCircle2 className="mr-1 inline" size={13} />
          Ready for backend test
        </span>
      );
    case "missing":
      return (
        <span className="settings-api-key-badge is-missing">
          <AlertCircle className="mr-1 inline" size={13} />
          Missing key
        </span>
      );
    default:
      return null;
  }
}

export function ModelProviderDetailView({
  activeSecondaryTitle,
  activeSecondary,
  defaultModel,
  enabledProviders,
  onDefaultModel,
  onProviderApiKey,
  onProviderEnabled,
  providerApiKeys,
}: SettingsDetailPanelProps) {
  const [apiKeyTestStatus, setApiKeyTestStatus] = useState(
    createProviderTestStatus,
  );
  const selectedProvider = isModelProviderKey(activeSecondary)
    ? activeSecondary
    : null;
  const providerCatalog = selectedProvider
    ? MODEL_PROVIDER_CATALOG[selectedProvider]
    : null;
  const sortedSeries = useMemo(
    () => (providerCatalog ? sortModelSeries(providerCatalog.series) : []),
    [providerCatalog],
  );
  const modelVariants = sortedSeries.flatMap((series) => series.variants);
  const selectedModelValue = modelVariants.some(
    (variant) => variant.id === defaultModel,
  )
    ? defaultModel
    : modelVariants[0]?.id;

  const testSelectedProviderKey = () => {
    if (!selectedProvider) return;

    setApiKeyTestStatus((current) => ({
      ...current,
      [selectedProvider]: providerApiKeys[selectedProvider].trim()
        ? "ready"
        : "missing",
    }));
  };

  if (!providerCatalog || !selectedProvider) {
    return null;
  }

  const apiKeyBadge = renderApiKeyBadge(apiKeyTestStatus[selectedProvider]);

  return (
    <>
      <div className="settings-provider-card">
        <div className="settings-provider-summary-main">
          <SettingsProviderIcon
            className="settings-provider-detail-icon"
            provider={selectedProvider}
          />
          <span className="settings-provider-summary-title">
            {activeSecondaryTitle}
          </span>
        </div>
        <div className="settings-provider-summary-action">
          <span className="settings-provider-summary-action-label">
            Enable
          </span>
          <Switch
            checked={enabledProviders[selectedProvider]}
            onChange={(checked) =>
              onProviderEnabled(selectedProvider, checked)
            }
          />
        </div>
      </div>

      <div
        className={`settings-provider-config-section ${
          !enabledProviders[selectedProvider] ? "is-disabled" : ""
        }`}
      >
        <div className="settings-row-group settings-api-key-card">
          <div className="settings-field-block">
            <div className="settings-field-header">
              <div className="settings-field-label-group">
                <span className="settings-field-label">模型地址</span>
                <Tooltip title="官方接入文档">
                  <a
                    aria-label="官方接入文档"
                    className="settings-field-help"
                    href={providerCatalog.docsUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <CircleHelp size={14} />
                  </a>
                </Tooltip>
              </div>
              <span className="settings-field-meta">只读</span>
            </div>
            <div className="settings-base-url-shell">
              <Input
                className="settings-base-url-input"
                placeholder="模型地址"
                readOnly
                size="middle"
                value={providerCatalog.baseUrl}
              />
            </div>
          </div>

          <div className="settings-field-block">
            <div className="settings-field-header">
              <div className="settings-field-label-group">
                <span className="settings-field-label">API 密钥</span>
                <Tooltip title="官网获取 API Key">
                  <a
                    aria-label="官网获取 API Key"
                    className="settings-field-help"
                    href={providerCatalog.apiKeyUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <CircleHelp size={14} />
                  </a>
                </Tooltip>
              </div>
              <span className="settings-field-meta">必填</span>
            </div>
            <div className="settings-api-key-shell">
              <div className="settings-api-key-field">
                <Input.Password
                  autoComplete="off"
                  onChange={(event) =>
                    onProviderApiKey(selectedProvider, event.target.value)
                  }
                  placeholder={`输入 ${providerCatalog.apiKeyName}`}
                  size="middle"
                  value={providerApiKeys[selectedProvider]}
                  visibilityToggle
                />
              </div>
              <Button
                className="settings-api-key-test-button"
                onClick={testSelectedProviderKey}
                size="middle"
                type="default"
              >
                Test
              </Button>
            </div>
            {apiKeyBadge && (
              <div className="settings-api-key-status-row">{apiKeyBadge}</div>
            )}
          </div>
        </div>

        <div className="settings-row-group settings-model-series-panel">
          <div className="settings-model-series-header">
            <span>Model series</span>
            <span>{sortedSeries.length} series</span>
          </div>
          <div className="settings-model-series-grid">
            {sortedSeries.map((series) => (
              <article className="settings-model-card" key={series.title}>
                <div className="settings-model-card-header">
                  <span>{series.title}</span>
                  <span>{series.variants.length} models</span>
                </div>
                <div className="settings-model-chip-list">
                  {series.variants.map((variant) => (
                    <button
                      className={`settings-model-chip ${
                        variant.id === selectedModelValue ? "is-selected" : ""
                      }`}
                      key={variant.id}
                      onClick={() => onDefaultModel(variant.id)}
                      type="button"
                    >
                      {variant.id === selectedModelValue && (
                        <Check className="settings-model-chip-icon mr-1" size={12} />
                      )}
                      <span>{variant.label}</span>
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
