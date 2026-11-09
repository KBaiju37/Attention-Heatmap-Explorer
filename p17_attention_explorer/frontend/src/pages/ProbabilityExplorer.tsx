import { useRef, useState } from "react";
import { AxiosError } from "axios";
import { PageLayout } from "../components/layout/PageLayout";
import { InferenceNotice } from "../components/common/InferenceNotice";
import { requestProbabilities } from "../services/api";
import type { ProbabilityResponse } from "../types/api";

export function ProbabilityExplorer() {
  const [model, setModel] = useState<"bert" | "gpt2">("bert");
  const [text, setText] = useState("The scientist presented the [MASK] at the conference.");
  const [topK, setTopK] = useState(10);
  const [result, setResult] = useState<ProbabilityResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  function maskSelectedText() {
    const input = textRef.current;
    if (!input || input.selectionStart === input.selectionEnd) {
      setError("Select one token or subword in the input before masking it.");
      return;
    }
    const start = input.selectionStart;
    const end = input.selectionEnd;
    setText(`${text.slice(0, start)}[MASK]${text.slice(end)}`);
    setModel("bert");
    setError(null);
    setResult(null);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      setResult(await requestProbabilities(model, { text, top_k: topK }));
    } catch (reason) {
      const detail = reason instanceof AxiosError ? reason.response?.data?.detail : undefined;
      setError(typeof detail === "string" ? detail : reason instanceof Error ? reason.message : "Prediction request failed.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageLayout eyebrow="TOKEN PREDICTION" title="Token probability explorer" description="Examine actual vocabulary softmax probabilities from a masked or causal language model.">
      <form className="control-panel" onSubmit={(event) => void submit(event)}>
        <label className="field-label" htmlFor="probability-model">Prediction task</label>
        <select id="probability-model" value={model} onChange={(event) => setModel(event.target.value as "bert" | "gpt2")}>
          <option value="bert">BERT · masked token</option>
          <option value="gpt2">GPT-2 · next token</option>
        </select>
        <label className="field-label" htmlFor="probability-text">Input text</label>
        <textarea ref={textRef} id="probability-text" rows={4} maxLength={12000} required value={text} onChange={(event) => setText(event.target.value)} />
        <button className="secondary-button" type="button" onClick={maskSelectedText}>Mask selected text for BERT</button>
        <div className="control-row">
          <label>Top candidates
            <select value={topK} onChange={(event) => setTopK(Number(event.target.value))}>
              {[5, 10, 20, 50].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <button type="submit" className="primary-button" disabled={loading || !text.trim()}>
            {loading ? "Running inference…" : "Calculate probabilities"}
          </button>
        </div>
        <p className="form-hint">{model === "bert" ? "Include exactly one [MASK] token. Select a single token/subword to replace it; a multi-token phrase is still predicted as one WordPiece, not a whole-word distribution." : "GPT-2 predicts the next token from the end of the context; it is not a masked language model."}</p>
      </form>
      <InferenceNotice loading={loading} error={error} />
      {result && (
        <section className="result-panel">
          <div className="result-heading"><div><div className="eyebrow">{result.prediction_type}</div><h2>Vocabulary candidates</h2></div><span className="result-meta">Vocabulary size {result.vocabulary_size.toLocaleString()}</span></div>
          {result.truncated && <div className="inference-notice notice-warning">Input was truncated to 128 tokens.</div>}
          <div className="probability-list">
            {result.candidates.map((candidate) => (
              <div className="probability-row" key={candidate.token_id}>
                <span className="probability-rank">#{candidate.rank}</span>
                <span className="probability-token" title={candidate.token}>{candidate.display || candidate.token}</span>
                <div className="probability-track"><i style={{ width: `${Math.min(candidate.probability / Math.max(result.candidates[0]?.probability ?? 1, Number.EPSILON) * 100, 100)}%` }} /></div>
                <code>{candidate.probability.toPrecision(6)}</code>
              </div>
            ))}
          </div>
          <div className="probability-footer">
            <span>Top-k probability mass: <strong>{result.top_k_probability_mass.toFixed(6)}</strong> (full vocabulary softmax; top-k is not rescaled)</span>
          </div>
          <p className="scientific-note">{result.note}</p>
        </section>
      )}
    </PageLayout>
  );
}
