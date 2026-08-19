import { describe, expect, it } from "vitest";
import {
  extractApiErrorCode,
  extractApiErrorMessage,
  extractApiErrorParams,
  translateApiError,
} from "@/utils/api-error";

describe("api-error utilities", () => {
  describe("extractApiErrorCode", () => {
    it("extracts error code from standard API error payload", () => {
      const error = {
        response: {
          data: {
            code: "DECK_NOT_FOUND",
          },
        },
      };
      expect(extractApiErrorCode(error)).toBe("DECK_NOT_FOUND");
    });

    it("returns null if no code is present", () => {
      expect(extractApiErrorCode(new Error("Generic"))).toBeNull();
      expect(extractApiErrorCode(null)).toBeNull();
    });
  });

  describe("extractApiErrorParams", () => {
    it("extracts error params map", () => {
      const error = {
        response: {
          data: {
            params: { minSize: 60, currentSize: 58 },
          },
        },
      };
      expect(extractApiErrorParams(error)).toEqual({
        minSize: 60,
        currentSize: 58,
      });
    });

    it("returns empty object if no params present", () => {
      expect(extractApiErrorParams({})).toEqual({});
    });
  });

  describe("extractApiErrorMessage", () => {
    it("extracts single string message", () => {
      const error = {
        response: {
          data: {
            message: "Deck is invalid",
          },
        },
      };
      expect(extractApiErrorMessage(error, "Fallback")).toBe("Deck is invalid");
    });

    it("joins array of validation messages with comma", () => {
      const error = {
        response: {
          data: {
            message: ["Name is required", "Format is invalid"],
          },
        },
      };
      expect(extractApiErrorMessage(error, "Fallback")).toBe(
        "Name is required, Format is invalid",
      );
    });

    it("uses fallback when message is empty or missing", () => {
      expect(extractApiErrorMessage({}, "Default fallback")).toBe(
        "Default fallback",
      );
    });
  });

  describe("translateApiError", () => {
    it("translates known domain code with params", () => {
      const error = {
        response: {
          data: {
            code: "DECK_TOO_SMALL",
            params: { count: 50 },
          },
        },
      };
      const t = (key: string, values?: any) =>
        key === "DECK_TOO_SMALL"
          ? `Deck contains ${values.count} cards`
          : "default";

      expect(translateApiError(error, t, "Fallback")).toBe(
        "Deck contains 50 cards",
      );
    });

    it("falls back to API message when translation returns untranslated key", () => {
      const error = {
        response: {
          data: {
            code: "UNKNOWN_CODE",
            message: "Direct API message",
          },
        },
      };
      const t = (key: string) => key; // Untranslated fallback

      expect(translateApiError(error, t, "Fallback")).toBe(
        "Direct API message",
      );
    });
  });
});
