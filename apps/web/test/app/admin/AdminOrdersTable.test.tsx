import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AdminOrdersTable } from "@/app/(protected)/admin/_components/AdminOrdersTable";
import { adminService } from "@/services/admin.service";
import { OrderStatus, type Order } from "@/types/order";
import type { PaginatedResult } from "@/types/pagination";
import { UserRole } from "@/types/auth";
import { CardState, Currency } from "@/utils/enums";
import { Rarity } from "@/types/listing";

vi.mock("@/services/admin.service", () => ({
  adminService: {
    getOrders: vi.fn(),
    updateOrderStatus: vi.fn(),
  },
}));

const baseUser = {
  avatarUrl: "",
  isActive: true,
  isPro: false,
  preferredCurrency: "EUR",
  createdAt: new Date().toISOString() as unknown as Date,
};

const sampleOrder: Order = {
  id: 1,
  buyer: {
    ...baseUser,
    id: 10,
    email: "buyer@example.com",
    firstName: "Ada",
    lastName: "Lovelace",
    role: UserRole.USER,
  },
  totalAmount: 120,
  status: OrderStatus.PAID,
  currency: "EUR",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  orderItems: [
    {
      id: 1,
      quantity: 2,
      unitPrice: 60,
      listing: {
        id: 99,
        seller: {
          ...baseUser,
          id: 4,
          email: "seller@example.com",
          firstName: "Bob",
          lastName: "Seller",
          role: UserRole.USER,
        },
        pokemonCard: {
          id: "card-1",
          name: "Pikachu",
          image: "/pikachu",
          rarity: Rarity.RARE,
          set: { id: "set1", name: "Base" },
          hp: 60,
          types: ["electric"],
        },
        price: 60,
        currency: Currency.EUR,
        quantityAvailable: 5,
        cardState: CardState.NM,
        createdAt: new Date(),
        expiresAt: new Date(),
      },
    },
  ],
};

const paginatedOrders: PaginatedResult<Order> = {
  data: [sampleOrder],
  meta: {
    totalItems: 1,
    itemCount: 1,
    itemsPerPage: 10,
    totalPages: 1,
    currentPage: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  },
};

const mockedGetOrders = vi.mocked(adminService.getOrders);
const mockedUpdateStatus = vi.mocked(adminService.updateOrderStatus);

describe("AdminOrdersTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetOrders.mockResolvedValue(paginatedOrders);
    mockedUpdateStatus.mockResolvedValue({
      ...sampleOrder,
      status: OrderStatus.SHIPPED,
    });
  });

  it("affiche les commandes et permet de voir le détail", async () => {
    render(<AdminOrdersTable />);

    await waitFor(() =>
      expect(
        screen.getByText(/Ada Lovelace/i),
      ).toBeInTheDocument(),
    );

    expect(mockedGetOrders).toHaveBeenCalled();

    await userEvent.click(
      screen.getByRole("button", { name: /Voir commande 1/i }),
    );
    await screen.findByText(/Pikachu/);
    // Use getAllByText since the amount appears multiple times in the dialog
    expect(
      screen.getAllByText(/120\.00\s*EUR/i).length,
    ).toBeGreaterThan(0);
  });

  it("met à jour le statut d'une commande", async () => {
    render(<AdminOrdersTable />);
    await screen.findByText(/Ada Lovelace/);

    // Open the status update dialog
    await userEvent.click(
      screen.getByRole("button", { name: /Mettre à jour le statut de 1/i }),
    );

    // Verify the dialog is open and contains the update button
    const updateButton = await screen.findByRole("button", { name: /Mettre à jour/i });
    expect(updateButton).toBeInTheDocument();
    
    // Click the update button (uses current status from modal state)
    await userEvent.click(updateButton);

    await waitFor(() =>
      expect(mockedUpdateStatus).toHaveBeenCalledWith(1, expect.any(String)),
    );
  });
});
