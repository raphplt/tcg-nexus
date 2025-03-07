import { Input } from "@heroui/react";
import { Search } from "lucide-react";
import React from "react";

const SearchBar = () => {
  return (
    <div>
      <Input
        placeholder="Rechercher..."
        startContent={
          <Search
            width={20}
            height={20}
            color="gray"
          />
        }
        className="flex-1 w-96"
      />
    </div>
  );
};

export default SearchBar;
