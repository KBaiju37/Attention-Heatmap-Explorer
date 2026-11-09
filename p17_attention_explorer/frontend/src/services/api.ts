import axios from "axios";
import type {
  AttentionResponse,
  BiasResponse,
  ClipResponse,
  ComparisonResponse,
  ExplanationResponse,
  HealthResponse,
  HookResponse,
  ModelsResponse,
  ProbabilityResponse,
  VisionResponse,
} from "../types/api";

export function resolveApiBaseUrl(
  hostname = window.location.hostname,
  configuredUrl = process.env.VITE_API_BASE_URL,
): string {
  const configured = configuredUrl?.trim();
  if (configured) {
    try {
      const parsed = new URL(configured);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return configured.replace(/\/+$/, "");
      }
    } catch {
      throw new Error("VITE_API_BASE_URL must be an absolute HTTP or HTTPS URL.");
    }
    throw new Error("VITE_API_BASE_URL must use HTTP or HTTPS.");
  }

  const codespacesHost = hostname.match(/^(.*)-5173(\.app\.github\.dev)$/i);
  if (codespacesHost) return `https://${codespacesHost[1]}-8000${codespacesHost[2]}`;

  return "http://127.0.0.1:8000";
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 5000,
  headers: { Accept: "application/json" },
});

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await api.get<HealthResponse>("/api/health");
  return response.data;
}

export async function fetchModels(): Promise<ModelsResponse> {
  const response = await api.get<ModelsResponse>("/api/models");
  return response.data;
}

const inferenceTimeout = 10 * 60 * 1000;

export async function requestAttention(
  modelId: "bert" | "gpt2",
  payload: { text: string; layer: number; head: number | null; query_token?: number },
): Promise<AttentionResponse> {
  const response = await api.post<AttentionResponse>(
    `/api/${modelId}/attention`,
    payload,
    { timeout: inferenceTimeout },
  );
  return response.data;
}

export async function requestComparison(payload: {
  text: string;
  layer: number;
  head: number | null;
}): Promise<ComparisonResponse> {
  const response = await api.post<ComparisonResponse>(
    "/api/comparison",
    payload,
    { timeout: inferenceTimeout },
  );
  return response.data;
}

export async function requestProbabilities(
  modelId: "bert" | "gpt2",
  payload: { text: string; top_k: number },
): Promise<ProbabilityResponse> {
  const response = await api.post<ProbabilityResponse>(
    `/api/${modelId}/probabilities`,
    payload,
    { timeout: inferenceTimeout },
  );
  return response.data;
}

export async function requestVision(
  file: File,
  layer: number,
  head: number | null,
): Promise<VisionResponse> {
  const body = new FormData();
  body.append("file", file);
  body.append("layer", String(layer));
  if (head !== null) body.append("head", String(head));
  const response = await api.post<VisionResponse>("/api/vision/attention", body, {
    timeout: inferenceTimeout,
  });
  return response.data;
}

export async function requestClip(
  file: File,
  candidates: string[],
): Promise<ClipResponse> {
  const body = new FormData();
  body.append("file", file);
  candidates.forEach((candidate) => body.append("candidates", candidate));
  const response = await api.post<ClipResponse>("/api/vision/clip", body, {
    timeout: inferenceTimeout,
  });
  return response.data;
}

export async function requestHook(
  modelId: "bert" | "gpt2",
  layer: number,
): Promise<HookResponse> {
  const response = await api.post<HookResponse>(
    `/api/hooks/${modelId}/${layer}`,
    undefined,
    { timeout: inferenceTimeout },
  );
  return response.data;
}

export async function requestBias(
  occupations: string[],
  pronouns: string[],
): Promise<BiasResponse> {
  const response = await api.post<BiasResponse>(
    "/api/experiments/bias",
    { occupations, pronouns },
    { timeout: inferenceTimeout },
  );
  return response.data;
}

export async function requestExplanation(payload: {
  tokens: string[];
  attention: number[][];
  query_index: number;
  layer: number;
  head: number | null;
}): Promise<ExplanationResponse> {
  const response = await api.post<ExplanationResponse>(
    "/api/experiments/explain",
    payload,
    { timeout: inferenceTimeout },
  );
  return response.data;
}

export async function requestExport(
  format: "png" | "svg" | "json",
  payload: {
    model_id: string;
    model_name: string;
    tokens: string[];
    attention: number[][];
    layer: number;
    head: number | null;
    aggregation: string;
  },
): Promise<Blob> {
  const response = await api.post<Blob>(`/api/export/${format}`, payload, {
    timeout: inferenceTimeout,
    responseType: "blob",
  });
  return response.data;
}

export default api;
