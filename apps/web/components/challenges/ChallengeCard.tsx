"use client";

import {
  ActiveChallengeData,
  challengeService,
} from "@/services/challenge.service";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { CheckCircle2, Gift } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

interface ChallengeCardProps {
  activeChallenge: ActiveChallengeData;
  onClaimed?: (reward: number) => void;
}

export function ChallengeCard({
  activeChallenge,
  onClaimed,
}: ChallengeCardProps) {
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimed, setClaimed] = useState(activeChallenge.isClaimed);

  const { challenge, progress, isCompleted } = activeChallenge;
  // Ensure progress doesn't exceed target visually
  const currentProgress = Math.min(progress, challenge.targetValue);
  const percentage = (currentProgress / challenge.targetValue) * 100;

  const handleClaim = async () => {
    if (!isCompleted || claimed) return;
    setIsClaiming(true);
    try {
      const res = await challengeService.claimChallenge(activeChallenge.id);
      if (res.success) {
        setClaimed(true);
        toast.success(`+${res.reward} XP gained!`);
        if (onClaimed) onClaimed(res.reward);
      }
    } catch (err) {
      toast.error("Failed to claim reward");
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <Card className="relative overflow-hidden w-full transition-all hover:border-primary/50">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-4">
          <div>
            <CardTitle className="text-lg font-bold">
              {challenge.title}
            </CardTitle>
            <CardDescription className="text-sm mt-1">
              {challenge.description}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full whitespace-nowrap">
            <Gift className="w-4 h-4" />
            <span>{challenge.rewardXp} XP</span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col gap-3 mt-2">
          {/* Progress bar area */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <span>Progress</span>
              <span>
                {currentProgress} / {challenge.targetValue}
              </span>
            </div>
            <Progress value={percentage} className="h-2" />
          </div>

          <AnimatePresence mode="popLayout">
            {/* Buttons & Status */}
            {claimed ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-2 mt-2 p-2 bg-green-500/10 text-green-500 rounded-md font-medium"
              >
                <CheckCircle2 className="w-5 h-5" />
                Reward Claimed
              </motion.div>
            ) : isCompleted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mt-2"
              >
                <Button
                  onClick={handleClaim}
                  disabled={isClaiming}
                  className="w-full relative shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)] animate-pulse hover:animate-none"
                >
                  {isClaiming ? "Claiming..." : "Claim Reward !"}
                </Button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
