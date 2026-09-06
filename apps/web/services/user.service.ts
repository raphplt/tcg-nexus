import { User } from "@/types/auth";
import type { PublicUser } from "@/types/public-profile";
import type { UserJourneyNextActions } from "@/types/user-journey";
import { authedFetch } from "@/utils/fetch";

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  email?: string;
  avatarUrl?: string;
  preferredCurrency?: string;
  preferredLocale?: string;
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

  async getNextActions(): Promise<UserJourneyNextActions> {
    return authedFetch<UserJourneyNextActions>(
      "GET",
      "/users/me/journey/next-actions",
    );
  },
};
