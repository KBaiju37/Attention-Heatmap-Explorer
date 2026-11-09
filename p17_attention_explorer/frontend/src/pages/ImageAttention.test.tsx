import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { ImageAttention } from "./ImageAttention";
import { requestClip, requestVision } from "../services/api";

jest.mock("../services/api", () => ({
  requestClip: jest.fn(),
  requestVision: jest.fn(),
}));
jest.mock("react-plotly.js", () => () => null);

describe("ImageAttention", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it("rejects images over the UI's documented upload limit", () => {
    render(<ImageAttention />);
    const file = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText(/image file/i), { target: { files: [file] } });

    expect(screen.getByRole("alert")).toHaveTextContent("Image must be 5 MiB or smaller.");
    expect(requestVision).not.toHaveBeenCalled();
    expect(requestClip).not.toHaveBeenCalled();
  });
});
