import React from "react";
import { Spinner } from "../ui/spinner";

type LoaderProps = {
  message?: string;
};

const Loader = ({ message = "Chargement en cours..." }: LoaderProps) => {
  return (
    <div className="bg-background">
      <span className="text-center text-sm text-foreground mb-4">
        {message}
      </span>
      <Spinner />
    </div>
  );
};

export default Loader;
