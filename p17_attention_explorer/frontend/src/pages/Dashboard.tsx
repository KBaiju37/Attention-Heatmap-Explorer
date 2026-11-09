import {
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  BookOpenText,
  BrainCircuit,
  Cpu,
  Download,
  Layers3,
  Network,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ModuleCard } from "../components/common/ModuleCard";
import { ModelStatusList } from "../components/common/ModelStatusList";
import { PageLayout } from "../components/layout/PageLayout";
import { StatusIndicator } from "../components/common/StatusIndicator";
import type { ConnectionState } from "../components/common/StatusIndicator";
import type { HealthResponse, ModelsResponse } from "../types/api";

const modules = [
  {
    index: "01",
    title: "Text attention",
    description: "Inspect token-to-token attention across transformer layers and heads.",
    to: "/text-attention",
    Icon: Network,
  },
  {
    index: "02",
    title: "Token probabilities",
    description: "Explore masked-token and next-token probability distributions.",
    to: "/probabilities",
    Icon: Sparkles,
  },
  {
    index: "03",
    title: "Model comparison",
    description: "Compare contextual and causal attention side by side.",
    to: "/comparison",
    Icon: Layers3,
  },
  {
    index: "04",
    title: "Image attention",
    description: "Map vision transformer attention to image patch regions.",
    to: "/image-attention",
    Icon: BrainCircuit,
  },
  {
    index: "05",
    title: "Hook inspector",
    description: "Inspect real module outputs captured with PyTorch hooks.",
    to: "/hooks",
    Icon: Cpu,
  },
  {
    index: "06",
    title: "Bias investigation",
    description: "Run controlled, matched prompts and interpret outcomes carefully.",
    to: "/bias",
    Icon: ShieldAlert,
  },
  {
    index: "07",
    title: "Export center",
    description: "Prepare reproducible heatmap images and experiment summaries.",
    to: "/exports",
    Icon: Download,
  },
  {
    index: "08",
    title: "About & limitations",
    description: "Read the scientific context and caveats for attention analysis.",
    to: "/about",
    Icon: BookOpenText,
  },
];

export function Dashboard({
  connectionState,
  health,
  error,
  models,
  modelsError,
  onRetry,
}: {
  connectionState: ConnectionState;
  health: HealthResponse | null;
  error: string | null;
  models: ModelsResponse | null;
  modelsError: string | null;
  onRetry: () => void;
}) {
  return (
    <PageLayout
      eyebrow="RESEARCH WORKSPACE"
      title="Understand what models attend to."
      description="An interactive laboratory for studying attention patterns in text and vision transformers."
    >
      <section className="hero-panel" aria-labelledby="welcome-title">
        <div className="hero-copy">
          <div className="hero-kicker"><span className="live-dot" /> P17 RESEARCH ENVIRONMENT</div>
          <h2 id="welcome-title">Look closer at the<br /><em>attention mechanism.</em></h2>
          <p>
            Explore how transformer models distribute attention across tokens and image patches.
            Work with real model outputs, inspect the details, and keep interpretation grounded.
          </p>
          <Link className="primary-button" to="/text-attention">
            Open text explorer <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="visual-orbit orbit-outer" />
          <div className="visual-orbit orbit-inner" />
          <div className="visual-core"><BrainCircuit size={35} strokeWidth={1.25} /></div>
          <span className="visual-node node-a" />
          <span className="visual-node node-b" />
          <span className="visual-node node-c" />
          <span className="visual-line line-a" />
          <span className="visual-line line-b" />
          <span className="visual-line line-c" />
          <span className="visual-label label-a">QUERY</span>
          <span className="visual-label label-b">KEY</span>
          <span className="visual-label label-c">VALUE</span>
        </div>
        <div className="hero-foot">
          <span><span className="foot-dot" /> CPU-first execution</span>
          <span><span className={`foot-dot ${models?.active_model_id ? "" : "muted-dot"}`} />{
            models
              ? models.active_model_id
                ? `MODEL IN MEMORY · ${models.models.find((model) => model.id === models.active_model_id)?.name ?? models.active_model_id}`
                : "NO MODEL IN MEMORY"
              : "MODEL STATUS UNAVAILABLE"
          }</span>
          <span>REAL MODEL INFERENCE · CPU ONLY</span>
        </div>
      </section>

      <div className="section-header">
        <div>
          <div className="eyebrow">YOUR TOOLKIT</div>
          <h2>Explore the workspace</h2>
        </div>
        <span className="section-count">08 MODULES <ArrowDownRight size={14} /></span>
      </div>
      <section className="module-grid" aria-label="P17 modules">
        {modules.map((module) => <ModuleCard key={module.to} {...module} />)}
      </section>

      <section className="model-inventory">
        <div className="section-header">
          <div><div className="eyebrow">MODEL INVENTORY</div><h2>Local model cache</h2></div>
          <span className="section-count">{models ? `DEVICE · ${models.device.toUpperCase()}` : "STATUS UNAVAILABLE"}</span>
        </div>
        {models ? (
          <ModelStatusList models={models.models} />
        ) : (
          <div className="empty-result">{modelsError ?? "Checking the real model-status endpoint…"}</div>
        )}
        <p className="form-hint">Weights are downloaded only after a model-backed action is requested. At most one model is kept in memory.</p>
      </section>

      <section className="dashboard-bottom">
        <div className="connection-card">
          <div className="card-title-row">
            <div className="card-icon"><Cpu size={17} /></div>
            <div><h3>Backend connection</h3><span>FastAPI service · local</span></div>
          </div>
          <StatusIndicator state={connectionState} />
          {connectionState === "connected" && health && (
            <p className="connection-detail">
              {health.application} · {health.environment}
            </p>
          )}
          {connectionState === "unavailable" && (
            <div className="connection-error">
              <p>{error ?? "The health check did not succeed."}</p>
              <button type="button" className="text-button" onClick={onRetry}>Try again</button>
            </div>
          )}
          {connectionState === "loading" && (
            <p className="connection-detail">Checking /api/health…</p>
          )}
        </div>
        <div className="principle-card">
          <div className="card-title-row">
            <div className="card-icon accent-icon"><BookOpen size={17} /></div>
            <div><h3>A note on interpretation</h3><span>Scientific context</span></div>
          </div>
          <p>Attention weights can help inspect model behavior, but they are not by themselves proof of causal reasoning or faithful explanations.</p>
          <Link to="/about" className="text-link">Read limitations <ArrowUpRight size={14} /></Link>
        </div>
      </section>
    </PageLayout>
  );
}
