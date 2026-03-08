import { describe, it, expect, vi, beforeEach } from "vitest";
import { DolarApiClient } from "../src/client.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("DolarApiClient", () => {
  let client: DolarApiClient;

  beforeEach(() => {
    mockFetch.mockReset();
    client = new DolarApiClient();
  });

  it("sends GET request to correct URL", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));

    await client.get("/v1/dolares");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://dolarapi.com/v1/dolares",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("returns parsed JSON", async () => {
    const data = [{ casa: "blue", venta: 1300 }];
    mockFetch.mockResolvedValueOnce(jsonResponse(data));

    const result = await client.get("/v1/dolares");
    expect(result).toEqual(data);
  });

  it("throws on non-OK response", async () => {
    mockFetch.mockResolvedValueOnce(new Response("Server Error", { status: 500 }));

    await expect(client.get("/v1/dolares")).rejects.toThrow("GET /v1/dolares failed (500)");
  });
});
