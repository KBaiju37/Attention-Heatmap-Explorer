import { Outlet } from "react-router-dom";
import type { ConnectionState } from "../common/StatusIndicator";
import type { HealthResponse } from "../../types/api";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export function AppLayout({
  connectionState,
  health,
}: {
  connectionState: ConnectionState;
  health: HealthResponse | null;
}) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-column">
        <Header connectionState={connectionState} health={health} />
        <main><Outlet /></main>
      </div>
    </div>
  );
}
