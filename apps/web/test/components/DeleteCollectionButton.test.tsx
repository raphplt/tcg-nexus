import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import toast from "react-hot-toast";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DeleteCollectionButton } from "@/app/[locale]/(main)/collection/_components/DeleteCollectionButton";
import { collectionService } from "@/services/collection.service";
import { UserRole } from "@/types/auth";
import type { Collection } from "@/types/collection";

vi.mock("@/services/collection.service", () => ({
  collectionService: {
    deleteCollection: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const collection = {
  id: "collection-42",
  name: "My favourites",
  description: "A custom collection",
  isPublic: false,
  items: [],
  user: {
    avatarUrl: "",
    id: 7,
    email: "owner@example.com",
    firstName: "Collection",
    lastName: "Owner",
    role: UserRole.USER,
    isPro: false,
    isActive: true,
    createdAt: new Date("2026-08-21T00:00:00.000Z"),
  },
  created_at: "2026-08-21T00:00:00.000Z",
} satisfies Collection;

describe("DeleteCollectionButton", () => {
  beforeEach(() => {
    vi.mocked(collectionService.deleteCollection).mockResolvedValue(undefined);
  });

  it("deletes the collection after confirmation", async () => {
    const onDeleted = vi.fn();
    const user = userEvent.setup();

    render(
      <DeleteCollectionButton collection={collection} onDeleted={onDeleted} />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Supprimer la collection My favourites",
      }),
    );
    expect(
      screen.getByRole("alertdialog", {
        name: "Supprimer « My favourites » ?",
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Supprimer" }));

    await waitFor(() => {
      expect(collectionService.deleteCollection).toHaveBeenCalledWith(
        "collection-42",
      );
      expect(onDeleted).toHaveBeenCalledWith("collection-42");
    });
    expect(toast.success).toHaveBeenCalledWith(
      "La collection « My favourites » a été supprimée.",
    );
  });

  it("keeps the collection and dialog when deletion fails", async () => {
    const onDeleted = vi.fn();
    const user = userEvent.setup();
    vi.mocked(collectionService.deleteCollection).mockRejectedValueOnce(
      new Error("Network error"),
    );

    render(
      <DeleteCollectionButton collection={collection} onDeleted={onDeleted} />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Supprimer la collection My favourites",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Supprimer" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Impossible de supprimer la collection. Réessayez dans quelques instants.",
      );
    });
    expect(onDeleted).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });
});
