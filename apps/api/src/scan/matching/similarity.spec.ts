import { jaroWinkler } from "./similarity";

describe("Similarity (Jaro-Winkler)", () => {
  it("should return 1 for identical strings", () => {
    expect(jaroWinkler("Pikachu", "Pikachu")).toBe(1);
    expect(jaroWinkler("", "")).toBe(1);
  });

  it("should return 0 when one string is empty", () => {
    expect(jaroWinkler("Pikachu", "")).toBe(0);
    expect(jaroWinkler("", "Pikachu")).toBe(0);
  });

  it("should return higher score for strings with matching prefix", () => {
    const withPrefix = jaroWinkler("Charizard", "Chariz");
    const withoutPrefix = jaroWinkler("Charizard", "drziraahC");
    expect(withPrefix).toBeGreaterThan(withoutPrefix);
    expect(withPrefix).toBeGreaterThan(0.8);
  });

  it("should handle strings with no common characters", () => {
    expect(jaroWinkler("abc", "xyz")).toBe(0);
  });
});
