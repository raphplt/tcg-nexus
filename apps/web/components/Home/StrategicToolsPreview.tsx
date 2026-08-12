import React from "react";
import { H2 } from "../Shared/Titles";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

const StrategicToolsPreview = () => {
  const t = useTranslations("Home");

  return (
    <Card className="p-6">
      <H2 className="mb-4">{t("strategy.title")}</H2>
      <div className="relative h-32 rounded-lg overflow-hidden mb-4 border bg-background group">
        <Image
          src="/images/strategic-tools.png"
          alt={t("strategy.imageAlt")}
          fill
          className="object-cover w-full h-full group-hover:scale-105 transition-transform"
          style={{ objectFit: "cover" }}
          priority
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/strategy" className="flex items-center gap-2">
              {t("strategy.open")}
              <ArrowRight className="mr-2 w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default StrategicToolsPreview;
