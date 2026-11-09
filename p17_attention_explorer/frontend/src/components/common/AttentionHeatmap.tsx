import Plot from "react-plotly.js";
import type { Data, Layout } from "plotly.js";

export function AttentionHeatmap({
  tokens,
  values,
  title,
  height = 440,
  onQuerySelect,
}: {
  tokens: string[];
  values: number[][];
  title: string;
  height?: number;
  onQuerySelect?: (index: number) => void;
}) {
  const data: Data[] = [
    {
      type: "heatmap",
      x: tokens,
      y: tokens,
      z: values,
      colorscale: [
        [0, "#17191d"],
        [0.35, "#4d4557"],
        [0.7, "#b36b62"],
        [1, "#d4f16d"],
      ],
      colorbar: {
        title: { text: "Weight", font: { color: "#b9bac1", size: 10 } },
        tickfont: { color: "#9799a2", size: 9 },
        thickness: 10,
      },
      hovertemplate: "Query: %{y}<br>Key: %{x}<br>Attention: %{z:.5f}<extra></extra>",
      zsmooth: false,
    },
  ];
  const layout: Partial<Layout> = {
    title: { text: title, font: { color: "#dedfe3", size: 12 } },
    paper_bgcolor: "transparent",
    plot_bgcolor: "#141518",
    font: { color: "#a6a8b0", size: 9 },
    margin: { l: 78, r: 25, t: 42, b: 90 },
    height,
    xaxis: { title: { text: "Key token" }, tickangle: -55, automargin: true },
    yaxis: { title: { text: "Query token" }, autorange: "reversed", automargin: true },
    clickmode: "event",
  };

  return (
    <div className="heatmap-container">
      <Plot
        data={data}
        layout={layout}
        config={{ responsive: true, displaylogo: false, modeBarButtonsToRemove: ["lasso2d", "select2d"] }}
        useResizeHandler
        style={{ width: "100%", height }}
        onClick={(event) => {
          const index = event.points[0]?.pointIndex;
          if (typeof index === "number") onQuerySelect?.(index);
        }}
      />
    </div>
  );
}
