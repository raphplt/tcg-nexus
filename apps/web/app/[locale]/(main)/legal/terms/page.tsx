import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { useTranslations } from "next-intl";

export default function TermsPage() {
  const t = useTranslations("Legal.terms");

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl space-y-8 animate-in fade-in-50 duration-300">
      <div className="space-y-3 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl text-primary mb-2 shadow-sm">
          <FileText className="w-8 h-8" />
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
        <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>{t("section1Content")}</p>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/40 backdrop-blur-sm shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">{t("section2Title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>{t("section2Content")}</p>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/40 backdrop-blur-sm shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">{t("section3Title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>{t("section3Content")}</p>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/40 backdrop-blur-sm shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">{t("section4Title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>{t("section4Content")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
