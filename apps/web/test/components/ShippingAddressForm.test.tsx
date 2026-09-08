import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ShippingAddressForm from "@/app/[locale]/(main)/marketplace/checkout/_components/ShippingAddressForm";

vi.mock("use-places-autocomplete", () => ({
  default: vi.fn(() => ({
    init: vi.fn(),
    ready: true,
    value: "",
    setValue: vi.fn(),
    suggestions: { status: "OK", data: [] },
    clearSuggestions: vi.fn(),
  })),
}));

vi.mock("@/components/GoogleMapsScript", () => ({
  GoogleMapsScript: () => null,
}));

describe("ShippingAddressForm", () => {
  it("renders the address form with label and submit button", () => {
    render(
      <ShippingAddressForm
        onSubmit={vi.fn()}
        isSubmitting={false}
        error={null}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Saisie manuelle" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /continuer/i }),
    ).toBeInTheDocument();
  });

  it("switches to manual mode and submits a valid address", () => {
    const onSubmit = vi.fn();
    const { container } = render(
      <ShippingAddressForm
        onSubmit={onSubmit}
        isSubmitting={false}
        error={null}
      />,
    );

    // Switch to manual mode
    fireEvent.click(screen.getByRole("button", { name: "Saisie manuelle" }));
    expect(
      screen.getByRole("button", { name: "Recherche automatique" }),
    ).toBeInTheDocument();

    const input = container.querySelector(
      "#shipping-address",
    ) as HTMLInputElement;
    expect(input).toBeInTheDocument();

    // Type valid address
    fireEvent.change(input, {
      target: { value: "10 Rue de la Paix, 75002 Paris" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continuer/i }));

    expect(onSubmit).toHaveBeenCalledWith("10 Rue de la Paix, 75002 Paris");
  });

  it("shows validation error when address is shorter than 10 characters", () => {
    const onSubmit = vi.fn();
    const { container } = render(
      <ShippingAddressForm
        onSubmit={onSubmit}
        isSubmitting={false}
        error={null}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Saisie manuelle" }));
    const input = container.querySelector(
      "#shipping-address",
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Short" } });
    fireEvent.click(screen.getByRole("button", { name: /continuer/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("displays server error message when provided", () => {
    render(
      <ShippingAddressForm
        onSubmit={vi.fn()}
        isSubmitting={false}
        error="Impossible de valider cette adresse"
      />,
    );

    expect(
      screen.getByText("Impossible de valider cette adresse"),
    ).toBeInTheDocument();
  });

  it("disables submit button and shows loader when isSubmitting is true", () => {
    render(
      <ShippingAddressForm
        onSubmit={vi.fn()}
        isSubmitting={true}
        error={null}
      />,
    );

    const submitBtn = screen.getByRole("button", { name: /continuer/i });
    expect(submitBtn).toBeDisabled();
    expect(submitBtn.querySelector(".animate-spin")).toBeInTheDocument();
  });
});
