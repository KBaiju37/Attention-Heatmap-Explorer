import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { AttentionWorkbench } from "./AttentionWorkbench";
import { requestAttention, requestExport } from "../../services/api";

jest.mock("../../services/api", () => ({
  requestAttention: jest.fn(),
  requestExport: jest.fn(),
}));
jest.mock("react-plotly.js", () => () => null);

const result = {
  model_id: "bert",
  model_name: "BERT base uncased",
  tokens: ["[CLS]", "reviewed"],
  layer_count: 12,
  head_count: 12,
  layer: 2,
  head: null,
  aggregation: "mean_heads" as const,
  attention: [[0.8, 0.2], [0.25, 0.75]],
  query_distribution: null,
  query_entropy: null,
  top_pairs: [],
  truncated: false,
  scientific_note: "Observed attention only.",
};

describe("AttentionWorkbench", () => {
  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  it("sends the returned attention matrix to the export API", async () => {
    jest.mocked(requestAttention).mockResolvedValue(result);
    jest.mocked(requestExport).mockResolvedValue(new Blob(["export"]));
    const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: jest.fn(() => "blob:p17-export"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: jest.fn(),
    });

    render(<AttentionWorkbench />);
    fireEvent.click(screen.getByRole("button", { name: "Extract real attention" }));
    await screen.findByRole("heading", { name: "Attention map" });
    fireEvent.click(screen.getByRole("button", { name: "Export JSON" }));

    await waitFor(() => expect(requestExport).toHaveBeenCalledWith("json", {
      model_id: "bert",
      model_name: "BERT base uncased",
      tokens: ["[CLS]", "reviewed"],
      attention: [[0.8, 0.2], [0.25, 0.75]],
      layer: 2,
      head: null,
      aggregation: "mean_heads",
    }));
    expect(click).toHaveBeenCalledTimes(1);
  });
});
