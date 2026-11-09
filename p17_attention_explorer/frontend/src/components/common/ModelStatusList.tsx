import { AlertCircle, CheckCircle2, CircleDashed, Download, LoaderCircle } from "lucide-react";
import type { ModelStatus } from "../../types/api";

const stateLabels = {
  not_downloaded: "Not downloaded",
  cached: "Downloaded · not loaded",
  downloading: "Downloading",
  loading: "Loading",
  ready: "Ready in memory",
  error: "Load error",
} as const;

const stateIcons = {
  not_downloaded: CircleDashed,
  cached: Download,
  downloading: LoaderCircle,
  loading: LoaderCircle,
  ready: CheckCircle2,
  error: AlertCircle,
} as const;

export function ModelStatusList({ models }: { models: ModelStatus[] }) {
  return (
    <div className="model-status-list">
      {models.map((model) => {
        const Icon = stateIcons[model.state];
        return (
          <div className="model-status-row" key={model.id}>
            <div className="model-status-copy">
              <strong>{model.name}</strong>
              <span>{model.purpose}</span>
              {model.detail && <span className={model.state === "error" ? "model-error-detail" : undefined}>{model.detail}</span>}
            </div>
            <span className={`model-state model-state-${model.state}`}>
              <Icon size={13} aria-hidden="true" />
              {stateLabels[model.state]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
