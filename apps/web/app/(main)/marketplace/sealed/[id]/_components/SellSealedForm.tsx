"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { sealedProductService } from "@/services/sealed-product.service";
import { SealedCondition, sealedConditionLabels } from "@/types/sealed-product";
import { currencyOptions } from "@/utils/variables";

interface SellSealedFormProps {
  sealedProductId: string;
}

export default function SellSealedForm({
  sealedProductId,
}: SellSealedFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [quantity, setQuantity] = useState(1);
  const [condition, setCondition] = useState<SealedCondition>(
    SealedCondition.SEALED,
  );
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      toast.error("Vous devez être connecté pour vendre.");
      router.push("/auth/login");
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error("Prix invalide.");
      return;
    }

    setLoading(true);
    try {
      await sealedProductService.createListing({
        sealedProductId,
        price: priceNum,
        currency,
        quantityAvailable: quantity,
        sealedCondition: condition,
        description: description || undefined,
      });
      toast.success("Annonce créée !");
      queryClient.invalidateQueries({
        queryKey: ["sealed-products", sealedProductId, "listings"],
      });
      setPrice("");
      setDescription("");
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        "Erreur lors de la création de l'annonce.";
      toast.error(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="sealed-price">Prix</Label>
          <Input
            id="sealed-price"
            type="number"
            step="0.01"
            min="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="sealed-currency">Devise</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger id="sealed-currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currencyOptions.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="sealed-quantity">Quantité</Label>
          <Input
            id="sealed-quantity"
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="sealed-condition">État</Label>
          <Select
            value={condition}
            onValueChange={(v) => setCondition(v as SealedCondition)}
          >
            <SelectTrigger id="sealed-condition">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(SealedCondition).map((c) => (
                <SelectItem key={c} value={c}>
                  {sealedConditionLabels[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="sealed-description">Description (optionnelle)</Label>
        <Textarea
          id="sealed-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Mettre en vente
      </Button>
    </form>
  );
}
