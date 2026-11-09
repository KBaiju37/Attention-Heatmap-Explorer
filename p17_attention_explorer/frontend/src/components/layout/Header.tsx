import { Bell, ChevronRight } from "lucide-react";
import { useLocation } from "react-router-dom";
import { StatusIndicator } from "../common/StatusIndicator";
import type { ConnectionState } from "../common/StatusIndicator";
import type { HealthResponse } from "../../types/api";

const pageNames: Record<string, string> = {
  "/": "Overview",
  "/text-attention": "Text attention",
  "/probabilities": "Token probabilities",
  "/comparison": "Model comparison",
  "/image-attention": "Image attention",
  "/hooks": "Hook inspector",
  "/bias": "Bias investigation",
  "/exports": "Export center",
  "/about": "About & limitations",
};

export function Header({
  connectionState,
  health,
}: {
  connectionState: ConnectionState;
  health: HealthResponse | null;
}) {
  const { pathname } = useLocation();

  return (
    <header className="topbar">
      <div className="breadcrumbs">
        <span>Workspace</span>
        <ChevronRight size={14} aria-hidden="true" />
        <strong>{pageNames[pathname] ?? "Overview"}</strong>
      </div>
      <div className="topbar-actions">
        <StatusIndicator
          state={connectionState}
          detail={
            connectionState === "connected" && health
              ? `API v${health.version}`
              : undefined
          }
        />
        <span className="topbar-divider" />
        <button className="icon-button" type="button" aria-label="Notifications">
          <Bell size={17} />
        </button>
        <span className="avatar" aria-label="P17 workspace">P</span>
      </div>
    </header>
  );
}
