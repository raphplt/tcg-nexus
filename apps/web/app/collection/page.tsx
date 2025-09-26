"use client";

import React, { useEffect, useState } from "react";
import { collectionService } from "@/services/collection.service";
import { Collection } from "@/types/collection";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button"; // <-- ajout du bouton
import { H1 } from "@/components/Shared/Titles";
import { useRouter } from "next/navigation";

const Page = () => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const fetchCollections = async () => {
      if (!user?.id) {
        console.error("User ID is not available");
        setLoading(false);
        return;
      }

      try {
        const result = await collectionService.getByUserId(user.id);
        console.log("Fetched collections for user:", result);
        setCollections(result || []);
      } catch (error) {
        console.error("Error fetching collections:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCollections();
  }, [user?.id]);

  if (loading) {
    return <div>Loading...</div>;
  }

  const onPressSmash = () => {
    router.push("/pokemon/smash-or-pass");
  };

  return (
    <div className="flex flex-col items-center">
      <H1 className="mt-4">Collections</H1>

      <Button
        variant="default"
        className="mt-1 mb-2"
        onClick={onPressSmash}
      >
        Card Swipe
      </Button>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 justify-center">
        {collections.map((collection) => (
          <Card
            key={collection.id}
            className="w-64 h-64 bg-card rounded-xl shadow p-4 flex flex-col justify-between"
          >
            <div>
              <h2 className="text-lg font-semibold">{collection.name}</h2>
              <p className="text-sm text-gray-500">
                <strong>Created At:</strong>{" "}
                {isNaN(new Date(collection.startDate).getTime())
                  ? "N/A"
                  : new Date(collection.startDate).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-500">
                <strong>Updated At:</strong>{" "}
                {isNaN(new Date(collection.updateDate).getTime())
                  ? "N/A"
                  : new Date(collection.updateDate).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-500">
                <strong>Public:</strong> {collection.isPublic ? "Yes" : "No"}
              </p>
              <p className="text-sm text-gray-700 line-clamp-3 break-words overflow-hidden">
                {collection.description}
              </p>
            </div>
            <Button
              variant="default"
              className="w-full mt-2"
            >
              Voir
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Page;
