"use client";
import React, { useState } from "react";
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery";
import { tournamentService, Tournament } from "@/services/tournament.service";
import type { PaginatedResult } from "@/type/pagination";

const TournamentsPage = () => {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = usePaginatedQuery<
    PaginatedResult<Tournament>
  >(["tournaments"], tournamentService.getPaginated, {
    page,
    limit: 5,
    sortBy: "startDate",
    sortOrder: "ASC",
  });

  if (isLoading) return <div className="pt-20 text-center">Chargement...</div>;
  if (error)
    return (
      <div className="pt-20 text-center text-red-500">
        Erreur lors du chargement des tournois
      </div>
    );

  return (
    <div>
      <h1 className="pt-20 text-4xl font-bold text-center mb-8">
        Liste des tournois
      </h1>
      <div className="max-w-3xl mx-auto">
        <table className="w-full border rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">Nom</th>
              <th className="p-2">Date</th>
              <th className="p-2">Lieu</th>
              <th className="p-2">Type</th>
              <th className="p-2">Statut</th>
            </tr>
          </thead>
          <tbody>
            {data?.data?.map((tournament: Tournament) => (
              <tr
                key={tournament.id}
                className="border-b"
              >
                <td className="p-2 font-medium">{tournament.name}</td>
                <td className="p-2">
                  {new Date(tournament.startDate).toLocaleDateString()} -{" "}
                  {new Date(tournament.endDate).toLocaleDateString()}
                </td>
                <td className="p-2">{tournament.location}</td>
                <td className="p-2">{tournament.type}</td>
                <td className="p-2">{tournament.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Pagination */}
        <div className="flex justify-center mt-6 gap-2">
          <button
            className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!data?.meta?.hasPreviousPage}
          >
            Précédent
          </button>
          <span className="px-2 py-1">
            Page {data?.meta?.currentPage} / {data?.meta?.totalPages}
          </span>
          <button
            className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50"
            onClick={() => setPage((p) => p + 1)}
            disabled={!data?.meta?.hasNextPage}
          >
            Suivant
          </button>
        </div>
      </div>
    </div>
  );
};

export default TournamentsPage;
