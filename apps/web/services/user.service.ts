import { User } from "@/types/auth";
import { authedFetch } from "@/utils/fetch";
import type { PublicUser } from "@/types/public-profile";

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  email?: string;
  avatarUrl?: string;
  preferredCurrency?: string;
}

export interface UpdatePasswordData {
  password: string;
}

export const userService = {
  async updateProfile(data: UpdateProfileData): Promise<User> {
    return authedFetch<User>("PATCH", "/users/me", { data });
  },

  async updatePassword(data: UpdatePasswordData): Promise<User> {
    return authedFetch<User>("PATCH", "/users/me", { data });
  },

  async getPublicProfile(userId: number): Promise<PublicUser> {
    return authedFetch<PublicUser>("GET", `/users/${userId}/public`);
  },
};
