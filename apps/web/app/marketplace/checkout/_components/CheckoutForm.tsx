"use client";

import { useState } from "react";
import {
  useStripe,
  useElements,
  PaymentElement,
} from "@stripe/react-stripe-js";
import { useCartStore, useCartTotal } from "@/store/cart.store";
import { paymentService } from "@/services/payment.service";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";
import { useCurrencyStore } from "@/store/currency.store";
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [shippingAddress, setShippingAddress] = useState("");
  const { clearCart } = useCartStore();
  const total = useCartTotal();
  const { currency } = useCurrencyStore();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const {
    ready,
    value,
    setValue,
    suggestions: { status, data },
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      /* Define search scope here */
    },
    debounce: 300,
  });

  const handleSelect = async (address: string) => {
    setValue(address, false);
    setShippingAddress(address);
    clearSuggestions();
    setOpen(false);

    try {
      const results = await getGeocode({ address });
      const { lat, lng } = await getLatLng(results[0]);
      console.log("Coordinates: ", { lat, lng });
    } catch (error) {
      console.log("Error: ", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/marketplace/orders`,
      },
      redirect: "if_required",
    });

    if (error) {
      setMessage(error.message ?? "Une erreur inattendue est survenue.");
      setIsLoading(false);
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      try {
        await paymentService.createOrder({
          paymentIntentId: paymentIntent.id,
          shippingAddress,
        });
        await clearCart();
        toast.success("Commande passée avec succès !");
        router.push("/marketplace/orders");
      } catch (err) {
        console.error(err);
        setMessage(
          "Le paiement a réussi mais la création de la commande a échoué. Veuillez contacter le support.",
        );
        setIsLoading(false);
      }
    } else {
      setMessage("Statut du paiement : " + paymentIntent?.status);
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      <div className="space-y-2">
        <Label htmlFor="shipping-address">Adresse de livraison</Label>
        <Popover
          open={open}
          onOpenChange={setOpen}
        >
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
              disabled={!ready}
            >
              {value || "Rechercher une adresse..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0">
            <Command>
              <CommandInput
                placeholder="Rechercher une adresse..."
                value={value}
                onValueChange={setValue}
              />
              <CommandList>
                <CommandEmpty>Aucune adresse trouvée.</CommandEmpty>
                <CommandGroup>
                  {status === "OK" &&
                    data.map(({ place_id, description }) => (
                      <CommandItem
                        key={place_id}
                        value={description}
                        onSelect={handleSelect}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            shippingAddress === description
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                        {description}
                      </CommandItem>
                    ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <PaymentElement id="payment-element" />

      {message && <div className="text-red-500 text-sm">{message}</div>}

      <Button
        disabled={isLoading || !stripe || !elements}
        className="w-full"
      >
        {isLoading ? "Traitement..." : `Payer ${total.toFixed(2)} ${currency}`}
      </Button>
    </form>
  );
}
