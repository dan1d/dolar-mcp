const BASE_URL = "https://dolarapi.com";

export class DolarApiClient {
  async get<T = unknown>(path: string): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`GET ${path} failed (${res.status}): ${body}`);
    }
    return res.json() as Promise<T>;
  }
}
