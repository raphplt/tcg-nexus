"use client";
import React from "react";
import { useParams } from "next/navigation";

const Page = () => {
  const { id } = useParams();
  //   const {
  //     data: listing,
  //     isLoading,
  //     error,
  //   } = useQuery({
  //     queryKey: ["listing", id],
  //     queryFn: () => marketplaceService.getListingById(id as string),
  //   });

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 flex flex-col gap-8">
      <h1>{id}</h1>
    </div>
  );
};

export default Page;
