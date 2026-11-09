import { useCallback, useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import type { ConnectionState } from "./components/common/StatusIndicator";
import { fetchHealth, fetchModels } from "./services/api";
import type { HealthResponse, ModelsResponse } from "./types/api";
import { About } from "./pages/About";
import { BiasInvestigation } from "./pages/BiasInvestigation";
import { Dashboard } from "./pages/Dashboard";
import { ExportCenter } from "./pages/ExportCenter";
import { HookInspector } from "./pages/HookInspector";
import { ImageAttention } from "./pages/ImageAttention";
import { ModelComparison } from "./pages/ModelComparison";
import { ProbabilityExplorer } from "./pages/ProbabilityExplorer";
import { TextAttention } from "./pages/TextAttention";

function RoutedApp() {
  const [connectionState, setConnectionState] = useState<ConnectionState>("loading");
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [models, setModels] = useState<ModelsResponse | null>(null);
  const [modelsError, setModelsError] = useState<string | null>(null);

  const checkHealth = useCallback(async () => {
    setConnectionState("loading");
    setHealth(null);
    setError(null);
    try {
      const result = await fetchHealth();
      if (result.status !== "healthy") {
        throw new Error(`Backend reported status: ${result.status}`);
      }
      setHealth(result);
      setConnectionState("connected");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The health request failed.");
      setConnectionState("unavailable");
    }
  }, []);

  useEffect(() => {
    void checkHealth();
    let active = true;
    let timer: number | undefined;
    const refreshModels = async () => {
      try {
        const response = await fetchModels();
        if (active) {
          setModels(response);
          setModelsError(null);
        }
      } catch (reason) {
        if (active) {
          setModelsError(reason instanceof Error ? reason.message : "Model status request failed.");
        }
      } finally {
        if (active) timer = window.setTimeout(() => void refreshModels(), 5000);
      }
    };
    void refreshModels();
    return () => {
      active = false;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [checkHealth]);

  return (
    <Routes>
      <Route
        element={<AppLayout connectionState={connectionState} health={health} />}
      >
        <Route
          index
          element={
            <Dashboard
              connectionState={connectionState}
              health={health}
              error={error}
              models={models}
              modelsError={modelsError}
              onRetry={() => void checkHealth()}
            />
          }
        />
        <Route path="text-attention" element={<TextAttention />} />
        <Route path="probabilities" element={<ProbabilityExplorer />} />
        <Route path="comparison" element={<ModelComparison />} />
        <Route path="image-attention" element={<ImageAttention />} />
        <Route path="hooks" element={<HookInspector />} />
        <Route path="bias" element={<BiasInvestigation />} />
        <Route path="exports" element={<ExportCenter />} />
        <Route path="about" element={<About />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <RoutedApp />
    </BrowserRouter>
  );
}
