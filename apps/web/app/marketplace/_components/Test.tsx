"use client";

import { H2 } from "@/components/Shared/Titles";
import { Button } from "@/components/ui/button";
import { Listing } from "@/types/listing";
import { authedFetch } from "@/utils/fetch";
import React, { useEffect, useState } from "react";

const Test = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchListings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authedFetch<{ data: Listing[] }>(
        "GET",
        "/listings",
      );
      setListings(response.data);
    } catch {
      setError("Erreur lors du chargement des ventes");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      const testData = {
        sellerId: 1,
        pokemonCardId: "1aa2c248-5ad5-4ec7-a707-c7b77d98ef02",
        price: 12.5,
        currency: "EUR",
        quantityAvailable: 3,
        cardState: "NM",
        expiresAt: "2024-12-31T23:59:59.000Z",
      };
      await authedFetch("POST", "/listings", { data: testData });
      await fetchListings();
    } catch {
      setError("Erreur lors de la création de la vente");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  console.log(listings);

  return (
    <div className="flex flex-col gap-4 container mx-auto">
      <H2>Test de requête authentifiée</H2>
      <Button
        onClick={handleCreate}
        disabled={loading}
      >
        Créer une nouvelle vente
      </Button>
      {loading && <div>Chargement...</div>}
      {error && <div style={{ color: "red" }}>{error}</div>}
      <ul>
        {listings.map((listing) => (
          <li
            key={listing.id}
            style={{ margin: "1em 0", borderBottom: "1px solid #eee" }}
          >
            <strong>{listing.pokemonCard?.name || "Carte inconnue"}</strong> —
            {listing.price} {listing.currency} — Qté:{" "}
            {listing.quantityAvailable} — État: {listing.cardState} — Expire:{" "}
            {listing.expiresAt
              ? new Date(listing.expiresAt).toLocaleDateString()
              : "N/A"}{" "}
            — Vendeur: {listing.seller?.firstName} {listing.seller?.lastName}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Test;
