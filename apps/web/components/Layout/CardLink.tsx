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
    <a
      href={link}
      className="block w-full md:w-1/4 transition-transform hover:scale-105"
    >
      <Card className="h-full bg-opacity-50 bg-background backdrop-blur-md cursor-pointer hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center gap-2 mb-4">
          {icon}
          <h2 className="text-2xl font-bold text-center">{title}</h2>
        </CardHeader>
        <CardContent>
          <p className="mb-2 text-sm text-default-900 h-10">{description}</p>
          <span className="text-primary font-medium">Voir plus →</span>
        </CardContent>
      </Card>
    </a>
  );
};

export default CardLink;
