import type { AxiosRequestConfig } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { secureApi } from "@/utils/fetch";

type MockedResponse = {
  status: number;
  data?: unknown;
};

type Recorded = {
  url?: string;
  method?: string;
  config: AxiosRequestConfig;
};

// Remplace l'adapter axios natif par un mock contrôlable pour tester
// l'intercepteur de refresh sans toucher au réseau.
const withMockedAdapter = async (
  plan: (url: string) => MockedResponse,
): Promise<{ calls: Recorded[] }> => {
  const calls: Recorded[] = [];
  const original = secureApi.defaults.adapter;

  secureApi.defaults.adapter = async (config) => {
    calls.push({ url: config.url, method: config.method, config });
    const response = plan(config.url ?? "");

    if (response.status >= 400) {
      const error = Object.assign(new Error("Request failed"), {
        isAxiosError: true,
        config,
        response: {
          status: response.status,
          data: response.data,
          statusText: "",
          headers: {},
          config,
        },
      });
      throw error;
    }

    return {
      data: response.data ?? {},
      status: response.status,
      statusText: "OK",
      headers: {},
      config,
    } as never;
  };

  try {
    return { calls };
  } finally {
    // Réinitialiser après le test — fait dans afterEach plus bas.
    void original;
  }
};

const originalAdapter = secureApi.defaults.adapter;

describe("secureApi — intercepteur de refresh", () => {
  beforeEach(() => {
    secureApi.defaults.adapter = originalAdapter;
    vi.restoreAllMocks();
  });

  it("déclenche un refresh puis rejoue la requête sur 401", async () => {
    let callsByUrl = new Map<string, number>();
    const { calls } = await withMockedAdapter((url) => {
      const count = (callsByUrl.get(url) ?? 0) + 1;
      callsByUrl.set(url, count);

      if (url.includes("/auth/refresh")) {
        return { status: 200, data: { ok: true } };
      }
      if (url.includes("/protected")) {
        return count === 1
          ? { status: 401, data: { message: "Token expired" } }
          : { status: 200, data: { secret: 42 } };
      }
      return { status: 404 };
    });

    const response = await secureApi.get("/protected");

    expect(response.status).toBe(200);
    expect(response.data).toEqual({ secret: 42 });

    const refreshCalls = calls.filter((c) => c.url?.includes("/auth/refresh"));
    const protectedCalls = calls.filter((c) => c.url?.includes("/protected"));
    expect(refreshCalls).toHaveLength(1);
    expect(protectedCalls).toHaveLength(2);
  });

  it("mutualise les refreshes concurrents (un seul refresh pour N 401 simultanés)", async () => {
    let protectedCalls = 0;
    let refreshCalls = 0;

    secureApi.defaults.adapter = async (config) => {
      const url = config.url ?? "";
      if (url.includes("/auth/refresh")) {
        refreshCalls++;
        await new Promise((r) => setTimeout(r, 10));
        return {
          data: {},
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        } as never;
      }

      protectedCalls++;
      const isFirstCall = protectedCalls <= 3;
      if (isFirstCall) {
        const error = Object.assign(new Error("401"), {
          isAxiosError: true,
          config,
          response: {
            status: 401,
            data: {},
            statusText: "",
            headers: {},
            config,
          },
        });
        throw error;
      }
      return {
        data: { ok: true },
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      } as never;
    };

    const responses = await Promise.all([
      secureApi.get("/a"),
      secureApi.get("/b"),
      secureApi.get("/c"),
    ]);

    expect(responses.every((r) => r.status === 200)).toBe(true);
    expect(refreshCalls).toBe(1);
  });

  it("ne déclenche PAS de refresh sur un 401 renvoyé par /auth/login", async () => {
    let refreshCalls = 0;
    let loginCalls = 0;

    secureApi.defaults.adapter = async (config) => {
      const url = config.url ?? "";
      if (url.includes("/auth/refresh")) {
        refreshCalls++;
        return {
          data: {},
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        } as never;
      }
      if (url.includes("/auth/login")) {
        loginCalls++;
        const error = Object.assign(new Error("Bad credentials"), {
          isAxiosError: true,
          config,
          response: {
            status: 401,
            data: {},
            statusText: "",
            headers: {},
            config,
          },
        });
        throw error;
      }
      return {
        data: {},
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      } as never;
    };

    await expect(
      secureApi.post("/auth/login", { email: "a", password: "b" }),
    ).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(loginCalls).toBe(1);
    expect(refreshCalls).toBe(0);
  });

  it("ne rejoue pas à l'infini si le refresh échoue", async () => {
    let protectedCalls = 0;
    let refreshCalls = 0;

    secureApi.defaults.adapter = async (config) => {
      const url = config.url ?? "";
      if (url.includes("/auth/refresh")) {
        refreshCalls++;
        const error = Object.assign(new Error("Refresh failed"), {
          isAxiosError: true,
          config,
          response: {
            status: 401,
            data: {},
            statusText: "",
            headers: {},
            config,
          },
        });
        throw error;
      }
      protectedCalls++;
      const error = Object.assign(new Error("401"), {
        isAxiosError: true,
        config,
        response: {
          status: 401,
          data: {},
          statusText: "",
          headers: {},
          config,
        },
      });
      throw error;
    };

    await expect(secureApi.get("/protected")).rejects.toBeDefined();

    expect(protectedCalls).toBe(1);
    expect(refreshCalls).toBe(1);
  });
});
