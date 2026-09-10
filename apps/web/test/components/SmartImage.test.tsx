import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SmartImage } from "@/components/ui/SmartImage";

describe("SmartImage", () => {
  it("renders image with opacity-100 when noSkeleton is true", () => {
    render(
      <SmartImage
        src="https://example.com/card.png"
        alt="Pikachu"
        noSkeleton
        loading="eager"
      />,
    );

    const img = screen.getByRole("img", { name: "Pikachu" });
    expect(img).toBeInTheDocument();
    expect(img).toHaveClass("opacity-100");
    expect(img).not.toHaveClass("opacity-0");
  });

  it("handles image load event and switches opacity", () => {
    render(
      <SmartImage
        src="https://example.com/card.png"
        alt="Charizard"
      />,
    );

    const img = screen.getByRole("img", { name: "Charizard" });
    expect(img).toHaveClass("opacity-0");

    fireEvent.load(img);
    expect(img).toHaveClass("opacity-100");
  });

  it("switches to fallbackSrc on load error", () => {
    render(
      <SmartImage
        src="https://example.com/invalid.png"
        fallbackSrc="/images/carte-pokemon-dos.jpg"
        alt="Mewtwo"
      />,
    );

    const img = screen.getByRole("img", { name: "Mewtwo" }) as HTMLImageElement;
    expect(img.src).toContain("invalid.png");

    fireEvent.error(img);
    expect(img.src).toContain("carte-pokemon-dos.jpg");
  });
});
