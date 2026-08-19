import {
  cleanName,
  extractNameCandidates,
  normalize,
  parseNumber,
  parseOcrText,
} from "./scan-parser";

describe("ScanParser", () => {
  describe("normalize", () => {
    it("should remove accents and normalize spaces", () => {
      expect(normalize("Électhor   de Galar")).toBe("Electhor de Galar");
    });
  });

  describe("parseNumber", () => {
    it("should parse card number and total from formatted text", () => {
      expect(parseNumber("025/102")).toEqual({
        setCode: "025/102",
        setNumber: "025",
        setTotal: "102",
      });
      expect(parseNumber("No number here")).toEqual({});
    });
  });

  describe("cleanName", () => {
    it("should strip OCR noise and extra whitespace", () => {
      expect(cleanName("  Pikachu  \n VMAX !?# ")).toBe("Pikachu VMAX");
    });
  });

  describe("extractNameCandidates", () => {
    it("should extract words and filter stopwords", () => {
      const candidates = extractNameCandidates("Dracaufeu EX", [
        "PV 180 Basic",
        "Flamme Rouge",
      ]);
      expect(candidates).toContain("Dracaufeu EX");
      expect(candidates).toContain("Dracaufeu");
      expect(candidates).toContain("Flamme");
      expect(candidates).not.toContain("basic");
    });
  });

  describe("parseOcrText", () => {
    it("should parse card name, set metadata, and text lines", () => {
      const text = "Mewtwo\n150 HP\n053/068 - Destinées Occultes";
      const result = parseOcrText(text);
      expect(result.lines).toHaveLength(3);
      expect(result.fields.cardName).toBe("Mewtwo");
      expect(result.fields.setNumber).toBe("053");
      expect(result.fields.setTotal).toBe("068");
      expect(result.fields.setName).toBe("Destinées Occultes");
    });
  });
});
