import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

export default function MentionsLegalesPage() {
  const t = useTranslations("Legal.mentions");

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl space-y-8 animate-in fade-in-50 duration-300">
      <div className="space-y-3 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl text-primary mb-2 shadow-sm">
          <Info className="w-8 h-8" />
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
          {t("title")}
        </h1>
        <p className="text-muted-foreground text-sm max-w-xl mx-auto">
          {t("subtitle")}
        </p>
      </div>

      <Card className="border-border/60 bg-card/40 backdrop-blur-sm shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">{t("section1Title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground leading-relaxed">
          <p>{t("section1Content")}</p>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/40 backdrop-blur-sm shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">{t("section2Title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground leading-relaxed">
          <p>{t("section2Content")}</p>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/40 backdrop-blur-sm shadow-sm border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <CardTitle className="text-xl text-primary">
              {t("section3Title")}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>{t("section3Content")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
