import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Search } from "lucide-react";

const url = process.env.NEXT_PUBLIC_API_URL;

const SearchBar = () => {
  const [search, setSearch] = useState("");
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="flex items-center justify-center w-full max-w-2xl mx-auto">
      <Input
        value={search}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Rechercher"
        className="max-w-xl"
      />
      <Button
        onClick={handleSearch}
        className="ml-2"
        disabled={!search}
      >
        <Search className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default SearchBar;
