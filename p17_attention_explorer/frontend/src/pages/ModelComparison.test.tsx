import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { ModelComparison } from "./ModelComparison";
import { requestComparison } from "../services/api";

jest.mock("../services/api", () => ({
  requestComparison: jest.fn(),
}));
jest.mock("react-plotly.js", () => () => null);

const attention = (model_id: "bert" | "gpt2", token: string) => ({
  model_id,
  model_name: model_id === "bert" ? "BERT base uncased" : "GPT-2 small",
  tokens: [token],
  layer_count: 12,
  head_count: 12,
  layer: 0,
  head: null,
  aggregation: "mean_heads" as const,
  attention: [[1]],
  query_distribution: null,
  query_entropy: null,
  top_pairs: [],
  truncated: false,
  scientific_note: "Observed attention only.",
});

describe("ModelComparison", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it("requests real outputs and preserves the model-specific token axes", async () => {
    jest.mocked(requestComparison).mockResolvedValue({
      bert: attention("bert", "[CLS]"),
      gpt2: attention("gpt2", "Ġtext"),
      note: "The token positions are not aligned.",
    });

    render(<ModelComparison />);
    fireEvent.click(screen.getByRole("button", { name: "Compare actual attention" }));

    expect(await screen.findByText("[CLS]")).toBeInTheDocument();
    expect(screen.getByText("Ġtext")).toBeInTheDocument();
    expect(requestComparison).toHaveBeenCalledWith({
      text: "The engineer explained the design before the team made a decision.",
      layer: 0,
      head: null,
    });
  });
});
