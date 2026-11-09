import { useState } from "react";
import { AxiosError } from "axios";
import { ScanEye } from "lucide-react";
import { InferenceNotice } from "../components/common/InferenceNotice";
import { PageLayout } from "../components/layout/PageLayout";
import { requestHook } from "../services/api";
import type { HookResponse } from "../types/api";

export function HookInspector() {
  const [model, setModel] = useState<"bert" | "gpt2">("bert");
  const [layer, setLayer] = useState(0);
  const [result, setResult] = useState<HookResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function inspect() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await requestHook(model, layer));
    } catch (reason) {
      const detail = reason instanceof AxiosError ? reason.response?.data?.detail : undefined;
      setError(typeof detail === "string" ? detail : reason instanceof Error ? reason.message : "Hook inspection failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageLayout eyebrow="PYTORCH INSPECTION" title="Hook inspector" description="Capture the actual output of one selected transformer attention module during a forward pass.">
      <div className="research-caveat"><ScanEye size={16} /><span>Hooks observe module outputs. They expose attention probabilities only when the selected module returns them; a hidden-state tensor is not an attention map.</span></div>
      <section className="control-panel">
        <div className="control-row">
          <label>Model<select value={model} onChange={(event) => setModel(event.target.value as "bert" | "gpt2")}><option value="bert">BERT base uncased</option><option value="gpt2">GPT-2 small</option></select></label>
          <label>Layer<input type="number" min={0} max={11} value={layer} onChange={(event) => setLayer(Number(event.target.value))} /></label>
          <button type="button" className="primary-button" onClick={() => void inspect()} disabled={loading}>{loading ? "Inspecting…" : "Register, inspect, and remove hook"}</button>
        </div>
        <p className="form-hint">The hook is removed in a finally block after the real model forward pass; only detached shape/statistic summaries are retained.</p>
      </section>
      <InferenceNotice loading={loading} error={error} />
      {result && (
        <section className="result-panel">
          <div className="result-heading"><div><div className="eyebrow">CAPTURED MODULE OUTPUT</div><h2>{result.module_name}</h2></div><span className="planned-pill">{result.hook_status}</span></div>
          <div className="hook-summary">
            <div><span>Layer</span><strong>{result.layer}</strong></div>
            <div><span>Captures</span><strong>{result.outputs.length}</strong></div>
            <div><span>Attention probabilities</span><strong>{result.attention_probabilities_captured ? "Expected output validated" : "Not identified"}</strong></div>
          </div>
          <div className="table-scroll"><table className="data-table"><thead><tr><th>Output path</th><th>Shape</th><th>Type</th><th>Summary</th></tr></thead><tbody>
            {result.outputs.map((output) => <tr key={output.path}><td>{output.path}</td><td>{output.shape?.join(" × ") ?? "—"}</td><td>{output.dtype ?? output.type}</td><td>{output.attention_probability_candidate ? "Expected attention output; normalized square tensor" : "Module output; not identified as attention"}</td></tr>)}
          </tbody></table></div>
          <p className="scientific-note">{result.note}</p>
        </section>
      )}
    </PageLayout>
  );
}
