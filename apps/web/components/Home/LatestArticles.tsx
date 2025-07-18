import React from "react";
import { H2 } from "../Shared/Titles";
import { Card } from "../ui/card";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";

interface Article {
  id: number;
  title: string;
  image?: string | null;
  link?: string | null;
  content?: string | null;
  publishedAt?: string | null;
}

const fetchArticles = async (): Promise<Article[]> => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/articles`,
  );
  if (!res.ok) throw new Error("Erreur lors du chargement des articles");
  return res.json();
};

const LatestArticles = () => {
  const {
    data: articles,
    isLoading,
    error,
  } = useQuery<Article[]>({
    queryKey: ["articles", "latest"],
    queryFn: fetchArticles,
  });

  return (
    <Card className="bg-card rounded-xl shadow p-6 mt-8">
      <H2 className="mb-4">Derniers articles</H2>
      {isLoading && <div>Chargement...</div>}
      {error && (
        <div className="text-red-500">
          Erreur lors du chargement des articles.
        </div>
      )}
      <div className="flex flex-col gap-4">
        {articles?.map((article) => (
          <a
            key={article.id}
            href={article.link || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg overflow-hidden border bg-background shadow hover:shadow-lg hover:scale-[1.02] transition group"
          >
            <div className="relative h-32 w-full">
              {article.image ? (
                <Image
                  src={article.image}
                  alt={article.title}
                  fill
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform"
                  style={{ objectFit: "cover" }}
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full bg-gray-200 text-gray-500">
                  Pas d'image
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                <span className="text-white font-semibold text-sm drop-shadow">
                  {article.title.slice(0, 50)}...
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </Card>
  );
};

export default LatestArticles;
