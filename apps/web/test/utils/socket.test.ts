import { describe, expect, it } from "vitest";
import { getSocketBaseUrl } from "@/utils/socket";
import { API_BASE_URL } from "@/utils/fetch";

describe("socket utils", () => {
  it("returns base URL stripped of trailing /api", () => {
    const url = getSocketBaseUrl();
    expect(typeof url).toBe("string");
    expect(url.endsWith("/api")).toBe(false);
    expect(url.endsWith("/")).toBe(false);
  });
});
