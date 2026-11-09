import { useState } from "react";
import { Download, Sparkles } from "lucide-react";
import { AxiosError } from "axios";
import { AttentionHeatmap } from "./AttentionHeatmap";
import { InferenceNotice } from "./InferenceNotice";
import { requestAttention, requestExport, requestExplanation } from "../../services/api";
import type { AttentionResponse, ExplanationResponse } from "../../types/api";

type TextModel = "bert" | "gpt2";

function errorText(error: unknown): string {
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.detail;
    return typeof detail === "string" ? detail : error.message;
  }
  return error instanceof Error ? error.message : "The request failed.";
}

export function AttentionWorkbench({
  initialModel = "bert",
  allowModelChoice = false,
  onResult,
}: {
  initialModel?: TextModel;
  allowModelChoice?: boolean;
  onResult?: (result: AttentionResponse | null) => void;
}) {
  const [model, setModel] = useState<TextModel>(initialModel);
  const [text, setText] = useState("The researcher reviewed the results before presenting them.");
  const [layer, setLayer] = useState(0);
  const [head, setHead] = useState<number | null>(null);
  const [query, setQuery] = useState<number | null>(null);
  const [result, setResult] = useState<AttentionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<ExplanationResponse | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  async function analyze(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setExplanation(null);
    try {
      const response = await requestAttention(model, {
        text,
        layer,
        head,
        query_token: query ?? undefined,
      });
      setResult(response);
      setQuery(query === null ? null : Math.min(query, response.tokens.length - 1));
      onResult?.(response);
    } catch (reason) {
      setError(errorText(reason));
      setResult(null);
      onResult?.(null);
    } finally {
      setLoading(false);
    }
  }

  async function explain() {
    if (!result || query === null) return;
    setExplainLoading(true);
    setError(null);
    try {
      setExplanation(
        await requestExplanation({
          tokens: result.tokens,
          attention: result.attention,
          query_index: query,
          layer: result.layer,
          head: result.head,
        }),
      );
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setExplainLoading(false);
    }
  }

  async function download(format: "png" | "svg" | "json") {
    if (!result) return;
    setExporting(format);
    setError(null);
    try {
      const blob = await requestExport(format, {
        model_id: result.model_id,
        model_name: result.model_name,
        tokens: result.tokens,
        attention: result.attention,
        layer: result.layer,
        head: result.head,
        aggregation: result.aggregation,
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${result.model_id}-layer-${result.layer}.${format}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="workbench">
      <form className="control-panel" onSubmit={(event) => void analyze(event)}>
        <label className="field-label" htmlFor="attention-text">Input text</label>
        <textarea
          id="attention-text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={12000}
          rows={4}
          required
        />
        <div className="control-row">
          {allowModelChoice && (
            <label>
              Model
              <select value={model} onChange={(event) => {
                setModel(event.target.value as TextModel);
                setResult(null);
                onResult?.(null);
              }}>
                <option value="bert">BERT base uncased</option>
                <option value="gpt2">GPT-2 small</option>
              </select>
            </label>
          )}
          <label>
            Layer
            <select value={layer} onChange={(event) => setLayer(Number(event.target.value))}>
              {Array.from({ length: result?.layer_count ?? 12 }, (_, index) => (
                <option key={index} value={index}>{index}</option>
              ))}
            </select>
          </label>
          <label>
            Head
            <select
              value={head === null ? "mean" : head}
              onChange={(event) => setHead(event.target.value === "mean" ? null : Number(event.target.value))}
            >
              <option value="mean">Mean across heads</option>
              {Array.from({ length: result?.head_count ?? 12 }, (_, index) => (
                <option key={index} value={index}>{index}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-actions">
          <button className="primary-button" type="submit" disabled={loading || !text.trim()}>
            {loading ? "Running inference…" : "Extract real attention"}
          </button>
          {result && (
            <span className="muted-copy">
              {result.model_name} · {result.tokens.length} tokens
            </span>
          )}
        </div>
      </form>

      <InferenceNotice loading={loading} error={error} />
      {result?.truncated && (
        <div className="inference-notice notice-warning" role="status">
          Input was truncated to the configured sequence limit of 128 tokens.
        </div>
      )}
      {result && (
        <>
          <section className="result-panel">
            <div className="result-heading">
              <div><div className="eyebrow">REAL MODEL OUTPUT</div><h2>Attention map</h2></div>
              <span className="result-meta">Layer {result.layer} · {result.head === null ? "mean heads" : `head ${result.head}`}</span>
            </div>
            <AttentionHeatmap
              tokens={result.tokens}
              values={result.attention}
              title={`${result.model_name} attention · select a row to inspect`}
              onQuerySelect={setQuery}
            />
            <p className="scientific-note">{result.scientific_note}</p>
          </section>
          <section className="result-panel token-panel">
            <div className="result-heading">
              <div><div className="eyebrow">TOKENIZATION</div><h2>Tokens in model order</h2></div>
              <span className="result-meta">Subwords and special tokens are preserved</span>
            </div>
            <div className="token-list">
              {result.tokens.map((token, index) => (
                <button
                  type="button"
                  className={`token-chip${query === index ? " selected" : ""}`}
                  key={`${index}-${token}`}
                  onClick={() => setQuery(index)}
                  title={`Token position ${index}`}
                >
                  <span>{index}</span>{token}
                </button>
              ))}
            </div>
            {query !== null && query < result.tokens.length && (
              <div className="query-summary">
                <strong>Query token {query}: {result.tokens[query]}</strong>
                <span>Entropy: {result.attention[query].reduce((sum, weight) => weight > 0 ? sum - weight * Math.log(weight) : sum, 0).toFixed(4)}</span>
                <div className="distribution-bars">
                  {result.attention[query].map((weight, index) => (
                    <div className="distribution-row" key={`${index}-${result.tokens[index]}`}>
                      <span>{result.tokens[index]}</span>
                      <div><i style={{ width: `${Math.min(weight * 100, 100)}%` }} /></div>
                      <code>{weight.toFixed(4)}</code>
                    </div>
                  ))}
                </div>
                <button className="secondary-button" type="button" onClick={() => void explain()} disabled={explainLoading}>
                  <Sparkles size={14} /> {explainLoading ? "Summarizing…" : "Explain these values"}
                </button>
                {explanation && (
                  <div className="explanation-box">
                    <strong>Deterministic summary · based on this attention matrix</strong>
                    <p>{explanation.explanation}</p><small>{explanation.note}</small>
                  </div>
                )}
              </div>
            )}
          </section>
          <section className="result-panel">
            <div className="result-heading"><div><div className="eyebrow">HIGHEST VALUES</div><h2>Top attended token pairs</h2></div></div>
            <div className="table-scroll">
              <table className="data-table">
                <thead><tr><th>Query</th><th>Key</th><th>Attention weight</th></tr></thead>
                <tbody>{result.top_pairs.map((pair, index) => (
                  <tr key={`${pair.query_index}-${pair.key_index}-${index}`}>
                    <td>{pair.query_index}: {pair.query_token}</td>
                    <td>{pair.key_index}: {pair.key_token}</td>
                    <td>{pair.score.toFixed(6)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </section>
          <div className="export-actions" aria-label="Export attention data">
            {(["png", "svg", "json"] as const).map((format) => (
              <button
                className="secondary-button"
                key={format}
                type="button"
                disabled={exporting !== null}
                onClick={() => void download(format)}
              >
                <Download size={14} /> {exporting === format ? "Preparing…" : `Export ${format.toUpperCase()}`}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
