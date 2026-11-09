import { useState } from "react";
import { AxiosError } from "axios";
import { Download, FlaskConical } from "lucide-react";
import Plot from "react-plotly.js";
import type { Data, Layout } from "plotly.js";
import { AttentionHeatmap } from "../components/common/AttentionHeatmap";
import { InferenceNotice } from "../components/common/InferenceNotice";
import { PageLayout } from "../components/layout/PageLayout";
import { requestAttention, requestBias } from "../services/api";
import type { AttentionResponse, BiasResponse } from "../types/api";

const occupations = ["doctor", "engineer", "nurse", "teacher", "scientist", "pilot", "programmer", "receptionist"];
const pronouns = ["he", "she", "they"];
const exampleSentences = [
  "The doctor spoke to the nurse because she was concerned.",
  "The engineer explained the design because he had tested it.",
  "The teacher helped the student because they were confused.",
];

function responseError(reason: unknown): string {
  const detail = reason instanceof AxiosError ? reason.response?.data?.detail : undefined;
  return typeof detail === "string" ? detail : reason instanceof Error ? reason.message : "Experiment request failed.";
}

export function BiasInvestigation() {
  const [studyModel, setStudyModel] = useState<"bert" | "gpt2">("bert");
  const [sentences, setSentences] = useState(exampleSentences);
  const [studyLayer, setStudyLayer] = useState(0);
  const [studyHead, setStudyHead] = useState<number | null>(null);
  const [studyResults, setStudyResults] = useState<AttentionResponse[]>([]);
  const [studyLoading, setStudyLoading] = useState(false);
  const [studyError, setStudyError] = useState<string | null>(null);
  const [selectedOccupations, setSelectedOccupations] = useState(["doctor", "engineer", "nurse", "teacher"]);
  const [selectedPronouns, setSelectedPronouns] = useState(pronouns);
  const [result, setResult] = useState<BiasResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyzeSentences() {
    if (sentences.some((sentence) => !sentence.trim())) {
      setStudyError("Enter text for all three examples before comparing them.");
      return;
    }
    setStudyLoading(true);
    setStudyError(null);
    setStudyResults([]);
    try {
      const results: AttentionResponse[] = [];
      for (const sentence of sentences) {
        results.push(await requestAttention(studyModel, {
          text: sentence,
          layer: studyLayer,
          head: studyHead,
        }));
      }
      setStudyResults(results);
    } catch (reason) {
      setStudyError(responseError(reason));
    } finally {
      setStudyLoading(false);
    }
  }

  function toggle(value: string, values: string[], update: (next: string[]) => void, limit: number) {
    if (values.includes(value)) update(values.filter((item) => item !== value));
    else if (values.length < limit) update([...values, value]);
  }

  async function run() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await requestBias(selectedOccupations, selectedPronouns));
    } catch (reason) {
      setError(responseError(reason));
    } finally {
      setLoading(false);
    }
  }

  function download() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "p17-matched-template-attention-experiment.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  const plotData: Data[] = result ? selectedPronouns.map((pronoun) => {
    const observations = result.summaries.filter(
      (item) => item.pronoun === pronoun && selectedOccupations.includes(item.occupation),
    );
    return {
      type: "bar",
      name: pronoun,
      x: observations.map((item) => item.occupation),
      y: observations.map((item) => item.mean_occupation_to_pronoun),
      hovertemplate: "Occupation: %{x}<br>Pronoun: " + pronoun + "<br>Mean attention: %{y:.6f}<extra></extra>",
    };
  }) : [];
  const plotLayout: Partial<Layout> = {
    barmode: "group",
    paper_bgcolor: "transparent",
    plot_bgcolor: "#141518",
    font: { color: "#b1b2b9", size: 10 },
    margin: { l: 58, r: 12, t: 12, b: 55 },
    height: 350,
    xaxis: { title: { text: "Occupation token(s)" } },
    yaxis: { title: { text: "Mean occupation → pronoun attention" }, rangemode: "tozero" },
    legend: { orientation: "h", y: 1.12 },
  };

  return (
    <PageLayout eyebrow="CONTROLLED EXPERIMENTS" title="Pronoun–occupation investigation" description="Run matched sentences with real BERT attention and explicit token-position mapping.">
      <div className="research-caveat"><FlaskConical size={16} /><span>These small prompt experiments are exploratory observations, not evidence sufficient to establish gender bias or causal reasoning.</span></div>
      <section className="control-panel">
        <div className="eyebrow">EDITABLE EXAMPLE STUDY</div>
        <h2 className="panel-title">Compare attention for your own sentences</h2>
        <p className="form-hint">Edit all three prompts. Each heatmap uses the selected model's actual tokenizer and attention output; token positions are not assumed to align across sentences.</p>
        <div className="control-row">
          <label>Model
            <select value={studyModel} onChange={(event) => {
              setStudyModel(event.target.value as "bert" | "gpt2");
              setStudyResults([]);
            }}>
              <option value="bert">BERT base uncased</option>
              <option value="gpt2">GPT-2 small</option>
            </select>
          </label>
          <label>Layer
            <select value={studyLayer} onChange={(event) => setStudyLayer(Number(event.target.value))}>
              {Array.from({ length: 12 }, (_, index) => <option value={index} key={index}>{index}</option>)}
            </select>
          </label>
          <label>Head
            <select value={studyHead === null ? "mean" : studyHead} onChange={(event) => setStudyHead(event.target.value === "mean" ? null : Number(event.target.value))}>
              <option value="mean">Mean across heads</option>
              {Array.from({ length: 12 }, (_, index) => <option value={index} key={index}>{index}</option>)}
            </select>
          </label>
        </div>
        {sentences.map((sentence, index) => (
          <label className="field-label prompt-field" key={index} htmlFor={`bias-example-${index}`}>
            Example {index + 1}
            <textarea
              id={`bias-example-${index}`}
              value={sentence}
              maxLength={12000}
              rows={2}
              onChange={(event) => setSentences((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))}
            />
          </label>
        ))}
        <button className="primary-button" type="button" onClick={() => void analyzeSentences()} disabled={studyLoading}>
          {studyLoading ? "Comparing real model outputs…" : "Analyze edited examples"}
        </button>
        <InferenceNotice loading={studyLoading} error={studyError} message={`Running ${studyModel.toUpperCase()} inference sequentially on CPU.`} />
        {studyResults.length > 0 && (
          <div className="comparison-grid">
            {studyResults.map((result, index) => (
              <section className="result-panel" key={`${index}-${result.model_id}`}>
                <div className="result-heading">
                  <div><div className="eyebrow">EXAMPLE {index + 1} · {result.model_name}</div><h2>{sentences[index]}</h2></div>
                </div>
                <AttentionHeatmap
                  tokens={result.tokens}
                  values={result.attention}
                  height={340}
                  title={`Layer ${result.layer} · ${result.head === null ? "mean heads" : `head ${result.head}`}`}
                />
                <div className="token-list compact-tokens">
                  {result.tokens.map((token, tokenIndex) => (
                    <span className="token-chip" key={`${tokenIndex}-${token}`}><span>{tokenIndex}</span>{token}</span>
                  ))}
                </div>
                <p className="scientific-note">{result.scientific_note}</p>
              </section>
            ))}
          </div>
        )}
      </section>
      <section className="control-panel">
        <div className="field-label">Occupations · choose 1–8</div>
        <div className="choice-grid">{occupations.map((occupation) => (
          <label className="choice-chip" key={occupation}>
            <input type="checkbox" checked={selectedOccupations.includes(occupation)} onChange={() => toggle(occupation, selectedOccupations, setSelectedOccupations, 8)} />
            {occupation}
          </label>
        ))}</div>
        <div className="field-label">Pronouns · choose at least two</div>
        <div className="choice-grid">{pronouns.map((pronoun) => (
          <label className="choice-chip" key={pronoun}>
            <input type="checkbox" checked={selectedPronouns.includes(pronoun)} onChange={() => toggle(pronoun, selectedPronouns, setSelectedPronouns, 3)} />
            {pronoun}
          </label>
        ))}</div>
        <button className="primary-button" type="button" onClick={() => void run()} disabled={loading || selectedOccupations.length === 0 || selectedPronouns.length < 2}>
          {loading ? "Running matched prompts…" : "Run BERT attention experiment"}
        </button>
        <p className="form-hint">Three fixed sentence templates vary one occupation and pronoun at a time. This may require a model download on first use.</p>
      </section>
      <InferenceNotice loading={loading} error={error} message="Running CPU inference over matched prompt variants." />
      {result && (
        <>
          <section className="result-panel">
            <div className="result-heading"><div><div className="eyebrow">AGGREGATED OBSERVATIONS</div><h2>Occupation-query to pronoun-key attention</h2></div><button className="secondary-button" type="button" onClick={download}><Download size={14} /> Download JSON</button></div>
            <Plot data={plotData} layout={plotLayout} config={{ responsive: true, displaylogo: false }} useResizeHandler style={{ width: "100%", height: 350 }} />
            <p className="scientific-note">{result.note}</p>
          </section>
          <section className="result-panel">
            <div className="result-heading"><div><div className="eyebrow">TOKEN-ALIGNED RUNS</div><h2>Matched sentence observations</h2></div></div>
            <div className="table-scroll"><table className="data-table"><thead><tr><th>Occupation / pronoun</th><th>Template</th><th>Tokenized spans</th><th>Occ → pronoun</th><th>Pronoun → occ</th></tr></thead><tbody>
              {result.observations.map((observation, index) => (
                <tr key={`${observation.template_id}-${observation.occupation}-${observation.pronoun}-${index}`}>
                  <td>{observation.occupation} / {observation.pronoun}</td>
                  <td>{observation.sentence}</td>
                  <td>{observation.occupation_tokens.join(" ")} → {observation.pronoun_tokens.join(" ")}</td>
                  <td>{observation.attention_occupation_to_pronoun.toFixed(6)}</td>
                  <td>{observation.attention_pronoun_to_occupation.toFixed(6)}</td>
                </tr>
              ))}
            </tbody></table></div>
          </section>
        </>
      )}
    </PageLayout>
  );
}
