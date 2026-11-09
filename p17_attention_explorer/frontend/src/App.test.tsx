import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import App from "./App";
import { fetchHealth, fetchModels } from "./services/api";

jest.mock("./services/api", () => ({
  fetchHealth: jest.fn(),
  fetchModels: jest.fn(),
}));
jest.mock("react-plotly.js", () => () => null);

const health = {
  application: "P17 Attention Heatmap Explorer",
  status: "healthy",
  version: "0.1.0",
  environment: "development",
};
const models = {
  device: "cpu",
  active_model_id: null,
  models: [{
    id: "bert",
    name: "BERT base uncased",
    checkpoint: "google-bert/bert-base-uncased",
    purpose: "Bidirectional text attention and masked-token prediction",
    state: "not_downloaded" as const,
    detail: null,
  }],
};

describe("P17 dashboard", () => {
  beforeEach(() => {
    jest.mocked(fetchModels).mockResolvedValue(models);
  });

  afterEach(() => {
    jest.resetAllMocks();
    window.history.replaceState({}, "", "/");
  });

  it("shows loading then real backend health status", async () => {
    let resolveHealth: (value: typeof health) => void = () => undefined;
    jest.mocked(fetchHealth).mockImplementation(
      () => new Promise((resolve) => { resolveHealth = resolve; }),
    );

    render(<App />);
    expect(screen.getAllByText(/checking backend/i).length).toBeGreaterThan(0);

    resolveHealth(health);
    expect(await screen.findByText("API v0.1.0")).toBeInTheDocument();
    expect(screen.getByText(/P17 Attention Heatmap Explorer · development/)).toBeInTheDocument();
    expect(await screen.findByText("Not downloaded")).toBeInTheDocument();
  });

  it("renders navigation and the real inference workspace without fabricated output", async () => {
    jest.mocked(fetchHealth).mockResolvedValue(health);
    render(<App />);

    expect(await screen.findByRole("heading", { name: /understand what models attend to/i })).toBeInTheDocument();
    fireEvent.click(
      within(screen.getByRole("navigation", { name: "Main navigation" }))
        .getByRole("link", { name: /text attention/i }),
    );
    expect(screen.getByRole("heading", { name: "Text attention explorer" })).toBeInTheDocument();
    expect(screen.getByLabelText("Input text")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Extract real attention" })).toBeInTheDocument();
  });

  it("shows backend request errors and supports retry", async () => {
    jest.mocked(fetchHealth)
      .mockRejectedValueOnce(new Error("Network Error"))
      .mockResolvedValueOnce(health);
    render(<App />);

    expect(await screen.findByText("Network Error")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.getByText("API v0.1.0")).toBeInTheDocument());
    expect(fetchHealth).toHaveBeenCalledTimes(2);
  });
});
