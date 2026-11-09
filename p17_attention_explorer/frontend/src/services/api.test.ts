import { describe, expect, it } from "@jest/globals";
import { resolveApiBaseUrl } from "./api";

describe("resolveApiBaseUrl", () => {
  it("uses the explicitly configured API URL", () => {
    expect(resolveApiBaseUrl("example.test", " https://api.example.test/// "))
      .toBe("https://api.example.test");
  });

  it("maps a Codespaces frontend forwarded hostname to the backend port", () => {
    expect(resolveApiBaseUrl("friendly-codespace-5173.app.github.dev", ""))
      .toBe("https://friendly-codespace-8000.app.github.dev");
  });

  it("uses the local backend for localhost development", () => {
    expect(resolveApiBaseUrl("127.0.0.1", ""))
      .toBe("http://127.0.0.1:8000");
  });
});
