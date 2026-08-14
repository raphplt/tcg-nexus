import { instanceToPlain } from "class-transformer";
import { UserRole } from "src/common/enums/user";
import { SELF_SERIALIZATION_GROUP } from "src/common/serialization-groups";
import { User } from "./user.entity";

const buildUser = (): User =>
  Object.assign(new User(), {
    id: 1,
    email: "victim@example.com",
    firstName: "Ada",
    lastName: "L",
    password: "hashed",
    role: UserRole.ADMIN,
    isActive: true,
    emailVerified: true,
    refreshToken: "refresh",
  });

describe("User serialization", () => {
  it("hides credentials and private fields by default", () => {
    const plain = instanceToPlain(buildUser());

    expect(plain).not.toHaveProperty("password");
    expect(plain).not.toHaveProperty("refreshToken");
    expect(plain).not.toHaveProperty("email");
    expect(plain).not.toHaveProperty("role");
    expect(plain).not.toHaveProperty("isActive");
    expect(plain).not.toHaveProperty("emailVerified");
    expect(plain.firstName).toBe("Ada");
  });

  it("hides them through a nested relation too", () => {
    const plain = instanceToPlain({ deck: { id: 3, user: buildUser() } }) as {
      deck: { user: Record<string, unknown> };
    };

    expect(plain.deck.user).not.toHaveProperty("email");
    expect(plain.deck.user).not.toHaveProperty("role");
  });

  it("exposes them for the self group, without ever leaking credentials", () => {
    const plain = instanceToPlain(buildUser(), {
      groups: [SELF_SERIALIZATION_GROUP],
    });

    expect(plain.email).toBe("victim@example.com");
    expect(plain.role).toBe(UserRole.ADMIN);
    expect(plain).not.toHaveProperty("password");
    expect(plain).not.toHaveProperty("refreshToken");
  });
});
