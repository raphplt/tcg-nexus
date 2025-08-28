"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { Tournament } from "@/types/tournament";
import { playerService } from "@/services/player.service";
import { useAuth } from "@/contexts/AuthContext";

interface UserTournamentsContextType {
  tournaments: Tournament[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

const UserTournamentsContext = createContext<
  UserTournamentsContextType | undefined
>(undefined);

export const UserTournamentsProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchTournaments = useCallback(async () => {
    if (!user?.id) {
      setTournaments([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await playerService.getTournamentsByUserId(user.id);

      setTournaments(data);
    } catch (e: any) {
      setError(e instanceof Error ? e : new Error("Unknown error"));
      setTournaments([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  const value: UserTournamentsContextType = {
    tournaments,
    isLoading,
    error,
    refresh: fetchTournaments,
  };

  return (
    <UserTournamentsContext.Provider value={value}>
      {children}
    </UserTournamentsContext.Provider>
  );
};

export const useUserTournaments = (): UserTournamentsContextType => {
  const ctx = useContext(UserTournamentsContext);
  if (!ctx) {
    throw new Error(
      "useUserTournaments must be used within a UserTournamentsProvider",
    );
  }
  return ctx;
};
