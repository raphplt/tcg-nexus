"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@components/ui/popover";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { authedFetch } from "@utils/fetch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select";
import CardType from "@/types/card";
import {pokemonCardService} from "@/services/pokemonCard.service";
interface CardComboboxProps {
  onSelect: (card: CardType, qty: number, role: string) => void;
  onClose?: () => void;
  resetSignal?: number;
}

export function CardSelector({ onSelect, resetSignal }: CardComboboxProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [input, setInput] = useState("");
  const [cards, setCards] = useState<CardType[]>([]);
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);
  const [qty, setQty] = useState(1);
  const [role, setRole] = useState("main");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const listRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    setSelectedCard(null);
    setValue("");
    setInput("");
    setCards([]);
    setPage(1);
  }, [resetSignal]);

  // Fetch paginated cards
  useEffect(() => {
    if (!open) return;
    const fetchCards = async () => {
      setLoading(true);
      try {
        const res = await pokemonCardService.getPaginated({page: page, limit: 50})
        const newCards = res.data as CardType[];
        setCards((prev) => [...prev, ...newCards]);
        setHasMore(newCards.length === 50);
      } catch (err) {
        console.error("Erreur fetch cartes :", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCards();
  }, [page, open]);

  // Scroll pour charger plus
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const bottom =
      e.currentTarget.scrollTop + e.currentTarget.clientHeight >=
      e.currentTarget.scrollHeight - 50;
    if (bottom && !loading && hasMore) {
      setPage((p) => p + 1);
    }
  };

  const handleSelect = (cardId: string) => {
    const selected = cards.find((c) => c.id === cardId);
    if (selected) {
      setSelectedCard(selected);
      setValue(cardId);
    }
  };

  const handleAddCard = () => {
    if (!selectedCard || qty < 1) return;
    onSelect(selectedCard, qty, role);
    setSelectedCard(null);
    setQty(1);
    setValue("");
    setOpen(false);
  };

  // Search cards
  const handleSearchChange = (val: string) => {
    setInput(val);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(async () => {
      if (!val) return;
      setLoading(true);
      try {
        const res = await authedFetch(
          "GET",
          `/pokemon-card/search/${encodeURIComponent(val)}`,
        );
        setCards(res as CardType[]);
        setHasMore(false);
      } catch (err) {
        console.error("Erreur fetch cartes :", err);
      } finally {
        setLoading(false);
      }
    }, 500);
  };

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between"
        >
          {selectedCard ? selectedCard.name : "Sélectionner une carte"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-2">
        <Input
          placeholder="Rechercher une carte..."
          value={input}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
        <div
          className="max-h-60 overflow-y-auto mt-2"
          onScroll={handleScroll}
        >
          {cards.map((card) => (
            <div
              key={card.id}
              className="flex justify-between items-center p-2 cursor-pointer hover:bg-gray-100"
              onClick={() => handleSelect(card.id)}
            >
              <span>{card.name}</span>
            </div>
          ))}
          {loading && (
            <div className="p-2 text-sm text-muted-foreground">
              Chargement...
            </div>
          )}
        </div>

        {selectedCard !== null && (
          <div className="flex gap-2 mt-2 items-center">
            <Input
              type="number"
              value={qty}
              min={1}
              className="w-20"
              onChange={(e) => setQty(Number(e.target.value))}
            />
            <Select
              defaultValue={role}
              onValueChange={setRole}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Choisir" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="main">Principal</SelectItem>
                <SelectItem value="side">Secondaire</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleAddCard}>Ajouter</Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
