export interface HealthResponse {
  application: string;
  status: string;
  version: string;
  environment: string;
}

export type ModelState =
  | "not_downloaded"
  | "cached"
  | "downloading"
  | "loading"
  | "ready"
  | "error";

export interface ModelStatus {
  id: string;
  name: string;
  checkpoint: string;
  purpose: string;
  state: ModelState;
  detail: string | null;
}

export interface ModelsResponse {
  device: string;
  active_model_id: string | null;
  models: ModelStatus[];
}

export interface AttentionPair {
  query_index: number;
  query_token: string;
  key_index: number;
  key_token: string;
  score: number;
}

export interface AttentionResponse {
  model_id: string;
  model_name: string;
  tokens: string[];
  layer_count: number;
  head_count: number;
  layer: number;
  head: number | null;
  aggregation: "single_head" | "mean_heads";
  attention: number[][];
  query_distribution: number[] | null;
  query_entropy: number | null;
  top_pairs: AttentionPair[];
  truncated: boolean;
  scientific_note: string;
}

export interface ComparisonResponse {
  bert: AttentionResponse;
  gpt2: AttentionResponse;
  note: string;
}

export interface TokenCandidate {
  token_id: number;
  token: string;
  display: string;
  probability: number;
  rank: number;
}

export interface ProbabilityResponse {
  model_id: string;
  model_name: string;
  tokens: string[];
  selected_position: number;
  prediction_type: string;
  candidates: TokenCandidate[];
  vocabulary_size: number;
  top_k_probability_mass: number;
  truncated: boolean;
  note: string;
}

export interface VisionResponse {
  model_id: string;
  model_name: string;
  image_width: number;
  image_height: number;
  patch_grid: number;
  layer_count: number;
  head_count: number;
  layer: number;
  head: number | null;
  attention: number[][];
  overlay_png: string;
  note: string;
}

export interface ClipResponse {
  model_id: string;
  model_name: string;
  candidates: { text: string; cosine_similarity: number; rank: number }[];
  note: string;
}

export interface BiasResponse {
  model_id: string;
  model_name: string;
  observations: {
    template_id: string;
    occupation: string;
    pronoun: string;
    sentence: string;
    occupation_tokens: string[];
    pronoun_tokens: string[];
    attention_occupation_to_pronoun: number;
    attention_pronoun_to_occupation: number;
  }[];
  summaries: {
    occupation: string;
    pronoun: string;
    sample_count: number;
    mean_occupation_to_pronoun: number;
    mean_pronoun_to_occupation: number;
  }[];
  note: string;
}

export interface HookResponse {
  model_id: string;
  module_name: string;
  layer: number;
  hook_status: string;
  outputs: { path: string; shape?: number[]; dtype?: string; type?: string; attention_probability_candidate?: boolean }[];
  attention_probabilities_captured: boolean;
  note: string;
}

export interface ExplanationResponse {
  source: string;
  explanation: string;
  note: string;
}
