import { Button, Card, CardBody, CardHeader } from "@heroui/react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import React from "react";

type CardLinkProps = {
  title: string;
  description: string;
  link: string;
  icon: React.ReactNode;
};

const CardLink = ({ title, description, link, icon }: CardLinkProps) => {
  return (
    <Card
      className="w-full md:w-1/4 bg-white bg-opacity-50 backdrop-blur-md"
      isHoverable
    >
      <CardHeader className="flex flex-row items-center gap-2 mb-4">
        {icon}
        <h2 className="text-2xl font-bold text-center">{title}</h2>
      </CardHeader>
      <CardBody>
        <p className="mb-2 text-sm text-default-900 h-10">{description}</p>
        <Button
          as={Link}
          href={link}
          color="primary"
          size="sm"
          endContent={<ArrowRight width={20} />}
        >
          Voir plus
        </Button>
      </CardBody>
    </Card>
  );
};

export default CardLink;
