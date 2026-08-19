import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { H1, H2, H3, H4, H5 } from "@/components/Shared/Titles";

describe("Typography Title components", () => {
  it("renders H1 with default, muted, and primary variants", () => {
    const { rerender } = render(<H1>Main Title</H1>);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Main Title",
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveClass("text-default");

    rerender(<H1 variant="muted">Muted Title</H1>);
    expect(screen.getByRole("heading", { level: 1 })).toHaveClass(
      "text-muted-foreground",
    );

    rerender(<H1 variant="primary">Primary Title</H1>);
    expect(screen.getByRole("heading", { level: 1 })).toHaveClass("text-primary");
  });

  it("renders H2, H3, H4, and H5 tags appropriately", () => {
    render(
      <div>
        <H2>Heading 2</H2>
        <H3>Heading 3</H3>
        <H4>Heading 4</H4>
        <H5>Heading 5</H5>
      </div>,
    );

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Heading 2");
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Heading 3");
    expect(screen.getByRole("heading", { level: 4 })).toHaveTextContent("Heading 4");
    expect(screen.getByRole("heading", { level: 5 })).toHaveTextContent("Heading 5");
  });
});
