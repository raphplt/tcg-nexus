"use client";

import {
  FolderHeart,
  Library,
  ShoppingBag,
  Sparkles,
  Swords,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface OnboardingWelcomeDialogProps {
  firstName: string;
  open: boolean;
  onStart: () => void;
  onSkip: () => void;
}

const features = [
  { key: "collection", icon: FolderHeart },
  { key: "decks", icon: Library },
  { key: "play", icon: Swords },
  { key: "marketplace", icon: ShoppingBag },
] as const;

/** Presents the optional product tour to a newly registered user. */
export function OnboardingWelcomeDialog({
  firstName,
  open,
  onStart,
  onSkip,
}: OnboardingWelcomeDialogProps) {
  const t = useTranslations("Onboarding.welcome");

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onSkip()}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-2xl">
        <div className="bg-linear-to-br from-primary/15 via-background to-secondary/15 p-6 sm:p-8">
          <DialogHeader className="items-center text-center sm:text-center">
            <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
              <Sparkles className="size-6" aria-hidden="true" />
            </div>
            <DialogTitle className="font-heading text-2xl sm:text-3xl">
              {t("title", { firstName })}
            </DialogTitle>
            <DialogDescription className="max-w-xl text-base">
              {t("description")}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {features.map(({ key, icon: Icon }) => (
              <div
                key={key}
                className="flex flex-col items-center gap-2 rounded-lg border border-border/70 bg-background/80 p-3 text-center shadow-sm"
              >
                <Icon className="size-5 text-primary" aria-hidden="true" />
                <span className="text-sm font-medium">
                  {t(`features.${key}`)}
                </span>
              </div>
            ))}
          </div>

          <DialogFooter className="mt-7 sm:justify-center">
            <Button variant="ghost" onClick={onSkip}>
              {t("skip")}
            </Button>
            <Button onClick={onStart} className="gap-2">
              <Sparkles className="size-4" aria-hidden="true" />
              {t("start")}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
