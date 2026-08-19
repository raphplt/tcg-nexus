import { describe, expect, it, vi } from "vitest";
import { authService } from "@/services/auth.service";
import { collectionService } from "@/services/collection.service";
import { pokemonCardService } from "@/services/pokemonCard.service";
import { userFollowService } from "@/services/user-follow.service";
import api, { authedFetch, fetcher, secureApi } from "@/utils/fetch";

vi.mock("@/utils/fetch", () => {
  const mockAxios = {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  };
  return {
    __esModule: true,
    default: mockAxios,
    api: mockAxios,
    secureApi: mockAxios,
    fetcher: vi.fn(),
    authedFetch: vi.fn(),
  };
});

describe("API service clients", () => {
  describe("authService", () => {
    it("logs in with credentials and remember-me header", async () => {
      const mockSession = { user: { id: 1, email: "test@example.com" } };
      vi.mocked(secureApi.post).mockResolvedValue({ data: mockSession });

      const res = await authService.login({
        email: "test@example.com",
        password: "password123",
        rememberMe: true,
      });

      expect(res).toEqual(mockSession);
      expect(secureApi.post).toHaveBeenCalledWith(
        "/auth/login",
        { email: "test@example.com", password: "password123" },
        { headers: { "x-remember-me": "true" } },
      );
    });

    it("registers a new user", async () => {
      const mockSession = { user: { id: 2, email: "new@example.com" } };
      vi.mocked(secureApi.post).mockResolvedValue({ data: mockSession });

      const res = await authService.register(
        { email: "new@example.com", password: "password123" } as any,
        false,
      );

      expect(res).toEqual(mockSession);
    });

    it("logs out, gets profile, and refreshes token", async () => {
      vi.mocked(secureApi.post).mockResolvedValue({ data: { id: 1 } });

      await authService.logout();
      expect(secureApi.post).toHaveBeenCalledWith("/auth/logout");

      const profile = await authService.getProfile();
      expect(profile).toEqual({ id: 1 });

      await authService.refreshToken(true);
      expect(secureApi.post).toHaveBeenCalledWith(
        "/auth/refresh",
        null,
        { headers: { "x-remember-me": "true" } },
      );
    });
  });

  describe("collectionService", () => {
    it("calls fetcher for public and user collections", async () => {
      vi.mocked(fetcher).mockResolvedValue({ data: [], meta: {} });

      await collectionService.getAll({ page: 1, limit: 10 });
      expect(fetcher).toHaveBeenCalledWith("/collection", {
        params: { page: 1, limit: 10 },
      });

      await collectionService.getByUserId(42, { page: 2 });
      expect(fetcher).toHaveBeenCalledWith("/collection/user/42", {
        params: { page: 2 },
      });

      await collectionService.getById("col-1");
      expect(fetcher).toHaveBeenCalledWith("/collection/col-1");

      await collectionService.getItemsPaginated("col-1", { page: 1 });
      expect(fetcher).toHaveBeenCalledWith("/collection/col-1/items", {
        params: { page: 1 },
      });

      await collectionService.getSetRarities("col-1");
      expect(fetcher).toHaveBeenCalledWith("/collection/col-1/rarities");
    });

    it("calls authedFetch for personal collections and mutations", async () => {
      vi.mocked(authedFetch).mockResolvedValue([{ id: 1 }]);

      await collectionService.getMyCollections();
      expect(authedFetch).toHaveBeenCalledWith("GET", "/collection/my/collections");

      await collectionService.createCollection({ name: "My Set" });
      expect(authedFetch).toHaveBeenCalledWith("POST", "/collection", {
        data: { name: "My Set" },
      });

      await collectionService.deleteCollection("col-1");
      expect(authedFetch).toHaveBeenCalledWith("DELETE", "/collection/col-1");

      await collectionService.addCardToCollection("col-1", "card-1");
      expect(authedFetch).toHaveBeenCalledWith("POST", "/collection/col-1/items", {
        data: { pokemonCardId: "card-1" },
      });

      await collectionService.removeCardFromCollection("col-1", "card-1");
      expect(authedFetch).toHaveBeenCalledWith(
        "POST",
        "/collection/col-1/items/remove",
        { data: { pokemonCardId: "card-1" } },
      );

      await collectionService.deleteCollectionItem("col-1", 100);
      expect(authedFetch).toHaveBeenCalledWith(
        "DELETE",
        "/collection/col-1/items/100",
      );
    });
  });

  describe("pokemonCardService", () => {
    it("queries paginated and specific pokemon cards", async () => {
      vi.mocked(api.get).mockResolvedValue({ data: [] });

      await pokemonCardService.getPaginated({ page: 1, search: "Pikachu" });
      expect(api.get).toHaveBeenCalledWith("/pokemon-card/paginated", {
        params: { page: 1, limit: 10, search: "Pikachu", setId: undefined, serieId: undefined, rarity: undefined, type: undefined },
      });

      await pokemonCardService.getAll();
      expect(api.get).toHaveBeenCalledWith("/pokemon-card");

      await pokemonCardService.getById("card-1");
      expect(api.get).toHaveBeenCalledWith("/pokemon-card/card-1");

      await pokemonCardService.search("Charizard");
      expect(api.get).toHaveBeenCalledWith("/pokemon-card/search/Charizard");

      await pokemonCardService.getRandom("serie-1");
      expect(api.get).toHaveBeenCalledWith("/pokemon-card/random", {
        params: { serieId: "serie-1" },
      });

      await pokemonCardService.getAllSeries();
      expect(api.get).toHaveBeenCalledWith("/pokemon-series");

      await pokemonCardService.getAllSets(5);
      expect(api.get).toHaveBeenCalledWith("/pokemon-set", {
        params: { limit: "5" },
      });

      await pokemonCardService.getSetRarities("set-1");
      expect(api.get).toHaveBeenCalledWith("/cards/set/set-1/rarities");
    });

    it("adds cards to wishlist, favorites, and collection", async () => {
      vi.mocked(api.post).mockResolvedValue({ data: { id: "item-1" } });

      await pokemonCardService.addToWishlist(1, "card-1");
      expect(api.post).toHaveBeenCalledWith("/collection-item/wishlist/1", {
        pokemonCardId: "card-1",
      });

      await pokemonCardService.addToFavorites(1, "card-1");
      expect(api.post).toHaveBeenCalledWith("/collection-item/favorites/1", {
        pokemonCardId: "card-1",
      });

      await pokemonCardService.addToCollection("col-1", "card-1");
      expect(api.post).toHaveBeenCalledWith("/collection-item/collection/col-1", {
        pokemonCardId: "card-1",
      });
    });
  });

  describe("userFollowService", () => {
    it("follows and unfollows users, retrieves followers and following", async () => {
      vi.mocked(authedFetch).mockResolvedValue([]);

      await userFollowService.follow(10);
      expect(authedFetch).toHaveBeenCalledWith("POST", "/users/10/follow");

      await userFollowService.unfollow(10);
      expect(authedFetch).toHaveBeenCalledWith("DELETE", "/users/10/follow");

      await userFollowService.getFollowers(10);
      expect(authedFetch).toHaveBeenCalledWith("GET", "/users/10/followers");

      await userFollowService.getFollowing(10);
      expect(authedFetch).toHaveBeenCalledWith("GET", "/users/10/following");
    });
  });
});
