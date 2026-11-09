import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { ProbabilityExplorer } from "./ProbabilityExplorer";
import { requestProbabilities } from "../services/api";

jest.mock("../services/api", () => ({
  requestProbabilities: jest.fn(),
}));

describe("ProbabilityExplorer", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it("replaces selected text with a BERT mask token", () => {
    render(<ProbabilityExplorer />);
    const text = screen.getByLabelText("Input text") as HTMLTextAreaElement;
    text.setSelectionRange(4, 13);
    fireEvent.click(screen.getByRole("button", { name: "Mask selected text for BERT" }));

    expect(text.value).toBe("The [MASK] presented the [MASK] at the conference.");
    expect(screen.getByLabelText("Prediction task")).toHaveValue("bert");
    expect(requestProbabilities).not.toHaveBeenCalled();
  });
});
