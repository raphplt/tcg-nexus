import { Input } from "@heroui/react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

const url = process.env.NEXT_PUBLIC_API_URL;

const SearchBar = () => {
  const [search, setSearch] = useState("");
  const router = useRouter();

  // Met à jour simplement la valeur saisie
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  // Effectue la recherche et redirige
  const handleSearch = () => {
    if (search) {
      fetch(`${url}/pokemon-card/search/${search}`)
        .then((response) => response.json())
        .then((data) => {
          router.push(
            `/result?results=${encodeURIComponent(JSON.stringify(data))}`,
          );
        });
    }
  };

  // Déclenche la recherche lors de l'appui sur "Entrée"
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div>
      <Input
        isClearable
        value={search}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onClear={() => setSearch("")}
        placeholder="Rechercher"
        endContent={
          <Search
            width={20}
            height={20}
            color="gray"
            className="cursor-pointer"
            onClick={handleSearch}
          />
        }
        className="flex-1 w-96"
      />
    </div>
  );
};

export default SearchBar;
