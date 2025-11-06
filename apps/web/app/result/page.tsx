"use client";
import { useSearchParams } from "next/navigation";
import React from "react";

const Result = () => {
  const searchParams = useSearchParams();
  const results = searchParams.get("results");
  const searchResults = results ? JSON.parse(results) : [];

  return (
    <div>
      <h1>Résultats</h1>
      <ul>
        {searchResults.map((result: any, index: number) => (
          <li key={index}>{result.name}</li>
        ))}
      </ul>
    </div>
  );
};

export default Result;
