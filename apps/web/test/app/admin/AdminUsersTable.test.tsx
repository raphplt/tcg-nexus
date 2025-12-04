import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AdminUsersTable } from "@/app/(protected)/admin/_components/AdminUsersTable";
import { adminService } from "@/services/admin.service";
import { UserRole, type User } from "@/types/auth";

vi.mock("@/services/admin.service", () => ({
  adminService: {
    getUsers: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
  },
}));

const sampleUser: User = {
  id: 1,
  email: "admin@example.com",
  firstName: "Ada",
  lastName: "Lovelace",
  role: UserRole.ADMIN,
  isPro: false,
  isActive: true,
  avatarUrl: "",
  createdAt: new Date(),
};

const mockedGetUsers = vi.mocked(adminService.getUsers);
const mockedCreateUser = vi.mocked(adminService.createUser);
const mockedUpdateUser = vi.mocked(adminService.updateUser);
const mockedDeleteUser = vi.mocked(adminService.deleteUser);

describe("AdminUsersTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetUsers.mockResolvedValue([sampleUser]);
    mockedCreateUser.mockResolvedValue({ ...sampleUser, id: 2 });
    mockedUpdateUser.mockResolvedValue(sampleUser);
    mockedDeleteUser.mockResolvedValue();
  });

  it("charge et affiche la liste des utilisateurs", async () => {
    render(<AdminUsersTable />);
    await waitFor(() => expect(mockedGetUsers).toHaveBeenCalled());
    expect(
      screen.getByText(/admin@example.com/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Ada Lovelace/)).toBeInTheDocument();
  });

  it("permet de créer un utilisateur", async () => {
    render(<AdminUsersTable />);
    await screen.findByText(/admin@example.com/);

    await userEvent.click(screen.getByRole("button", { name: /Nouvel utilisateur/i }));
    await userEvent.type(screen.getByLabelText(/Prénom/), "Grace");
    await userEvent.type(screen.getByLabelText(/Nom/), "Hopper");
    await userEvent.type(screen.getByLabelText(/Email/), "grace@example.com");
    await userEvent.type(screen.getByLabelText(/Mot de passe/), "secret123");
    
    // Toggle switches
    await userEvent.click(screen.getByRole("switch", { name: /Compte pro/i }));
    
    // Click create button (uses default role from form state)
    await userEvent.click(screen.getByRole("button", { name: /Créer/i }));

    await waitFor(() =>
      expect(mockedCreateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: "Grace",
          lastName: "Hopper",
          email: "grace@example.com",
        }),
      ),
    );
  });

  it("permet de modifier un utilisateur", async () => {
    render(<AdminUsersTable />);
    await screen.findByText(/admin@example.com/);

    await userEvent.click(
      screen.getByRole("button", { name: /Éditer admin@example.com/i }),
    );
    const firstNameInput = screen.getByLabelText(/Prénom/);
    await userEvent.clear(firstNameInput);
    await userEvent.type(firstNameInput, "Alicia");
    await userEvent.click(screen.getByRole("switch", { name: /Compte pro/i }));
    await userEvent.click(screen.getByRole("button", { name: /Mettre à jour/i }));

    await waitFor(() =>
      expect(mockedUpdateUser).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ firstName: "Alicia", isPro: true }),
      ),
    );
  });
});
