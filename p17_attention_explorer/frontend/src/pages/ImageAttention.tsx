import { useEffect, useState } from "react";
import { AxiosError } from "axios";
import { Image, Sparkles } from "lucide-react";
import Plot from "react-plotly.js";
import type { Data, Layout } from "plotly.js";
import { InferenceNotice } from "../components/common/InferenceNotice";
import { PageLayout } from "../components/layout/PageLayout";
import { requestClip, requestVision } from "../services/api";
import type { ClipResponse, VisionResponse } from "../types/api";

type ViewMode = "vit" | "clip";

function getError(reason: unknown): string {
  const detail = reason instanceof AxiosError ? reason.response?.data?.detail : undefined;
  return typeof detail === "string" ? detail : reason instanceof Error ? reason.message : "Image analysis failed.";
}

export function ImageAttention() {
  const [mode, setMode] = useState<ViewMode>("vit");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [layer, setLayer] = useState(0);
  const [head, setHead] = useState<number | null>(null);
  const [candidateText, setCandidateText] = useState("a photograph of a dog\na photograph of a cat\na landscape");
  const [vit, setVit] = useState<VisionResponse | null>(null);
  const [clip, setClip] = useState<ClipResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function chooseFile(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setError(null);
    setVit(null);
    setClip(null);
    if (selected && !["image/jpeg", "image/png", "image/webp"].includes(selected.type)) {
      setFile(null);
      setError("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (selected && selected.size > 5 * 1024 * 1024) {
      setFile(null);
      setError("Image must be 5 MiB or smaller.");
      return;
    }
    setFile(selected);
  }

  async function analyze(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      if (mode === "vit") {
        setVit(await requestVision(file, layer, head));
        setClip(null);
      } else {
        const candidates = candidateText.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
        if (candidates.length === 0 || candidates.length > 50) {
          throw new Error("Provide between 1 and 50 text candidates, one per line.");
        }
        setClip(await requestClip(file, candidates));
        setVit(null);
      }
    } catch (reason) {
      setError(getError(reason));
      setVit(null);
      setClip(null);
    } finally {
      setLoading(false);
    }
  }

  const vitData: Data[] = vit ? [{
    type: "heatmap",
    z: vit.attention,
    colorscale: "Magma",
    hovertemplate: "Patch row %{y}, column %{x}<br>Attention: %{z:.5f}<extra></extra>",
  }] : [];
  const vitLayout: Partial<Layout> = {
    paper_bgcolor: "transparent",
    plot_bgcolor: "#141518",
    font: { color: "#b1b2b9", size: 10 },
    margin: { l: 38, r: 12, t: 12, b: 35 },
    height: 330,
    xaxis: { title: { text: "Patch column" }, autorange: "reversed" },
    yaxis: { title: { text: "Patch row" }, autorange: "reversed" },
  };

  return (
    <PageLayout eyebrow="VISION ANALYSIS" title="Image attention explorer" description="Inspect ViT attention across image patches or compare CLIP image/text embeddings.">
      <div className="research-caveat"><Image size={16} /><span>CLS-to-patch attention visualizes one internal signal; it is not definitive evidence of what caused a classification.</span></div>
      <form className="control-panel" onSubmit={(event) => void analyze(event)}>
        <div className="control-row">
          <label>Analysis
            <select value={mode} onChange={(event) => setMode(event.target.value as ViewMode)}>
              <option value="vit">ViT patch self-attention</option>
              <option value="clip">CLIP image/text similarity</option>
            </select>
          </label>
          {mode === "vit" && <>
            <label>Layer
              <select value={layer} onChange={(event) => setLayer(Number(event.target.value))}>
                {Array.from({ length: vit?.layer_count ?? 12 }, (_, index) => <option value={index} key={index}>{index}</option>)}
              </select>
            </label>
            <label>Head
              <select value={head === null ? "mean" : head} onChange={(event) => setHead(event.target.value === "mean" ? null : Number(event.target.value))}>
                <option value="mean">Mean heads</option>
                {Array.from({ length: vit?.head_count ?? 12 }, (_, index) => <option value={index} key={index}>{index}</option>)}
              </select>
            </label>
          </>}
        </div>
        <label className="field-label" htmlFor="image-upload">Image file · JPEG, PNG, or WebP · up to 5 MiB</label>
        <input id="image-upload" type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseFile} />
        {file && <span className="form-hint">{file.name} · {(file.size / 1024).toFixed(0)} KiB</span>}
        {mode === "clip" && <>
          <label className="field-label" htmlFor="clip-candidates">Text candidates · one per line</label>
          <textarea id="clip-candidates" rows={4} value={candidateText} onChange={(event) => setCandidateText(event.target.value)} />
        </>}
        <button className="primary-button" type="submit" disabled={!file || loading}>
          {loading ? "Loading model and analyzing…" : mode === "vit" ? "Analyze with ViT" : "Compare with CLIP"}
        </button>
      </form>
      <InferenceNotice loading={loading} error={error} message="CPU inference may take several minutes on first use while model weights are downloaded." />
      {vit && file && (
        <div className="vision-grid">
          <section className="result-panel">
            <div className="result-heading"><div><div className="eyebrow">INPUT IMAGE</div><h2>Original</h2></div><span className="result-meta">{vit.image_width} × {vit.image_height}</span></div>
            {previewUrl && <img className="vision-image" src={previewUrl} alt="Uploaded input" />}
          </section>
          <section className="result-panel">
            <div className="result-heading"><div><div className="eyebrow">CLS-TO-PATCH ATTENTION</div><h2>Overlay</h2></div><span className="result-meta">{vit.patch_grid} × {vit.patch_grid} patches</span></div>
            <img className="vision-image" src={vit.overlay_png} alt="ViT attention overlay over uploaded image" />
          </section>
          <section className="result-panel vision-heatmap">
            <div className="result-heading"><div><div className="eyebrow">PATCH GRID</div><h2>Attention values</h2></div></div>
            <Plot data={vitData} layout={vitLayout} config={{ responsive: true, displaylogo: false }} useResizeHandler style={{ width: "100%", height: 330 }} />
            <p className="scientific-note">{vit.note}</p>
          </section>
        </div>
      )}
      {clip && (
        <section className="result-panel">
          <div className="result-heading"><div><div className="eyebrow">SEPARATE ENCODERS</div><h2>CLIP cosine similarities</h2></div></div>
          <div className="probability-list">{clip.candidates.map((candidate) => (
            <div className="probability-row" key={candidate.rank}>
              <span className="probability-rank">#{candidate.rank}</span><span className="probability-token">{candidate.text}</span>
              <div className="probability-track"><i style={{ width: `${Math.max(0, Math.min((candidate.cosine_similarity + 1) * 50, 100))}%` }} /></div>
              <code>{candidate.cosine_similarity.toFixed(5)}</code>
            </div>
          ))}</div>
          <p className="scientific-note"><Sparkles size={14} /> {clip.note}</p>
        </section>
      )}
    </PageLayout>
  );
}
