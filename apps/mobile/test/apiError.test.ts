import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getApiErrorMessage, isUnauthorizedError } from "../utils/apiError.js";

describe("Mobile ApiError", () => {
  it("extracts error message from standard Error instance", () => {
    const error = new Error("Custom error message");
    assert.equal(getApiErrorMessage(error), "Custom error message");
  });

  it("extracts message from Axios error response", () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        data: {
          message: "Email déjà utilisé",
        },
      },
    };

    assert.equal(getApiErrorMessage(axiosError), "Email déjà utilisé");
  });

  it("extracts array of messages joined with newline", () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        data: {
          message: ["Le champ nom est requis", "L'email est invalide"],
        },
      },
    };

    assert.equal(
      getApiErrorMessage(axiosError),
      "Le champ nom est requis\nL'email est invalide",
    );
  });

  it("identifies network error", () => {
    const networkError = {
      isAxiosError: true,
      code: "ERR_NETWORK",
      message: "Network Error",
    };

    const msg = getApiErrorMessage(networkError);
    assert.ok(msg.includes("Impossible de joindre l'API"));
  });

  it("identifies 401 unauthorized errors", () => {
    assert.equal(
      isUnauthorizedError({ isAxiosError: true, response: { status: 401 } }),
      true,
    );
    assert.equal(
      isUnauthorizedError({ isAxiosError: true, response: { status: 500 } }),
      false,
    );
  });
});
