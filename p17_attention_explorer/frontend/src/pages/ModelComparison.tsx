import { useState } from "react";
import { AxiosError } from "axios";
import { Layers3 } from "lucide-react";
import { AttentionHeatmap } from "../components/common/AttentionHeatmap";
import { InferenceNotice } from "../components/common/InferenceNotice";
import { PageLayout } from "../components/layout/PageLayout";
import { requestComparison } from "../services/api";
import type { AttentionResponse } from "../types/api";

export function ModelComparison() {
  const [text, setText] = useState("The engineer explained the design before the team made a decision.");
  const [layer, setLayer] = useState(0);
  const [head, setHead] = useState<number | null>(null);
  const [results, setResults] = useState<{ bert?: AttentionResponse; gpt2?: AttentionResponse }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function compare(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResults({});
    try {
      const comparison = await requestComparison({ text, layer, head });
      setResults(comparison);
    } catch (reason) {
      const detail = reason instanceof AxiosError ? reason.response?.data?.detail : undefined;
      setError(typeof detail === "string" ? detail : reason instanceof Error ? reason.message : "Comparison request failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageLayout eyebrow="SIDE-BY-SIDE STUDY" title="Model comparison" description="Compare real BERT and GPT-2 attention outputs while preserving each model's tokenization and architecture.">
      <div className="research-caveat"><Layers3 size={16} /><span>BERT attends bidirectionally; GPT-2 is causal. Their distinct tokenizers mean the heatmap axes must remain separate.</span></div>
      <form className="control-panel" onSubmit={(event) => void compare(event)}>
        <label className="field-label" htmlFor="comparison-text">Shared input text</label>
        <textarea id="comparison-text" rows={3} maxLength={12000} value={text} required onChange={(event) => setText(event.target.value)} />
        <div className="control-row">
          <label>Layer
            <select value={layer} onChange={(event) => setLayer(Number(event.target.value))}>
              {Array.from({ length: 12 }, (_, index) => <option value={index} key={index}>{index}</option>)}
            </select>
          </label>
          <label>Head
            <select value={head === null ? "mean" : head} onChange={(event) => setHead(event.target.value === "mean" ? null : Number(event.target.value))}>
              <option value="mean">Mean across heads</option>
              {Array.from({ length: 12 }, (_, index) => <option value={index} key={index}>{index}</option>)}
            </select>
          </label>
        </div>
        <button className="primary-button" type="submit" disabled={loading || !text.trim()}>{loading ? "Loading each model sequentially…" : "Compare actual attention"}</button>
        <p className="form-hint">Only one model is kept in memory at a time; the backend unloads BERT before loading GPT-2.</p>
      </form>
      <InferenceNotice loading={loading} error={error} message="Models run sequentially on CPU. First use may download weights; this can take several minutes." />
      <div className="comparison-grid">
        {(["bert", "gpt2"] as const).map((model) => {
          const result = results[model];
          return (
            <section className="result-panel" key={model}>
              <div className="result-heading"><div><div className="eyebrow">{model === "bert" ? "BIDIRECTIONAL" : "CAUSAL"}</div><h2>{model === "bert" ? "BERT" : "GPT-2"}</h2></div>{result && <span className="result-meta">{result.tokens.length} tokens</span>}</div>
              {result ? (
                <>
                  <AttentionHeatmap tokens={result.tokens} values={result.attention} title={`${result.model_name} · layer ${result.layer} · ${result.head === null ? "mean heads" : `head ${result.head}`}`} height={350} />
                  <div className="token-list compact-tokens">{result.tokens.map((token, index) => <span className="token-chip" key={`${index}-${token}`}><span>{index}</span>{token}</span>)}</div>
                  <p className="scientific-note">{result.scientific_note}</p>
                </>
              ) : <p className="empty-result">No output yet. Run the comparison to load this model.</p>}
            </section>
          );
        })}
      </div>
    </PageLayout>
  );
}
