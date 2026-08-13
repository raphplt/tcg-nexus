import { useTranslations } from "next-intl";
import React from "react";
import { Spinner } from "../ui/spinner";

type LoaderProps = {
  message?: string;
};

const Loader = ({ message }: LoaderProps) => {
  const t = useTranslations("States");

  return (
    <div className="bg-background">
      <span className="text-center text-sm text-foreground mb-4">
        {message ?? t("loading")}
      </span>
      <Spinner />
    </div>
  );
};

export default Loader;
