import React from "react";
import { Card, CardContent, CardHeader } from "../ui/card";

type CardLinkProps = {
  title: string;
  description: string;
  link: string;
  icon: React.ReactNode;
};

const CardLink = ({ title, description, link, icon }: CardLinkProps) => {
  return (
    <Card className="w-full md:w-1/4 bg-opacity-50 bg-background backdrop-blur-md">
      <CardHeader className="flex flex-row items-center gap-2 mb-4">
        {icon}
        <h2 className="text-2xl font-bold text-center">{title}</h2>
      </CardHeader>
      <CardContent>
        <p className="mb-2 text-sm text-default-900 h-10">{description}</p>
        <a
          href={link}
          color="primary"
        >
          Voir plus
        </a>
      </CardContent>
    </Card>
  );
};

export default CardLink;
