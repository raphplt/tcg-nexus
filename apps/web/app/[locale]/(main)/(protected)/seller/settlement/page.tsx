"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  HelpCircle,
  History,
  Loader2,
  Lock,
  PlusCircle,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sellerSettlementService } from "@/services/seller-settlement.service";
import { useCurrencyStore } from "@/store/currency.store";
import type {
  SellerAllocation,
  SellerPayout,
  SellerSettlementSummary,
} from "@/types/seller-settlement";

export default function SellerSettlementPage() {
  const { formatExact } = useCurrencyStore();
  const [summary, setSummary] = useState<SellerSettlementSummary | null>(null);
  const [allocations, setAllocations] = useState<SellerAllocation[]>([]);
  const [payouts, setPayouts] = useState<SellerPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState<string>("");
  const [payoutSubmitting, setPayoutSubmitting] = useState(false);
  // Stable per-attempt key: a resubmitted request returns the same payout
  // instead of reserving the balance twice.
  const [payoutRequestKey, setPayoutRequestKey] = useState<string>(() =>
    crypto.randomUUID(),
  );
  const [payoutError, setPayoutError] = useState<string | null>(null);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [accountHolder, setAccountHolder] = useState("");
  const [iban, setIban] = useState("");
  const [bic, setBic] = useState("");
  const [bankName, setBankName] = useState("");
  const [settingsSubmitting, setSettingsSubmitting] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sum, allocRes, payRes] = await Promise.all([
        sellerSettlementService.getSummary(),
        sellerSettlementService.getAllocations({ limit: 20 }),
        sellerSettlementService.getPayouts({ limit: 20 }),
      ]);
      setSummary(sum);
      setAllocations(allocRes.data || []);
      setPayouts(payRes.data || []);
    } catch (err: any) {
      setError(
        err.message ||
          "Erreur lors du chargement des informations financières.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRequestPayout = async () => {
    const amount = parseFloat(payoutAmount);
    if (isNaN(amount) || amount <= 0) {
      setPayoutError("Montant invalide.");
      return;
    }
    if (summary && amount > summary.balanceAvailable) {
      setPayoutError("Le montant demandé dépasse votre solde disponible.");
      return;
    }
    if (summary && amount < summary.minimumPayoutAmount) {
      setPayoutError(
        `Le montant minimum de retrait est de ${summary.minimumPayoutAmount} ${summary.currency}.`,
      );
      return;
    }

    setPayoutSubmitting(true);
    setPayoutError(null);
    try {
      await sellerSettlementService.requestPayout({
        amount,
        requestKey: payoutRequestKey,
      });
      setIsPayoutModalOpen(false);
      setPayoutAmount("");
      setPayoutRequestKey(crypto.randomUUID());
      await loadData();
    } catch (err: any) {
      setPayoutError(err.message || "Échec de la demande de virement.");
    } finally {
      setPayoutSubmitting(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!iban.trim()) {
      setSettingsError("Veuillez renseigner un IBAN valide.");
      return;
    }

    setSettingsSubmitting(true);
    setSettingsError(null);
    try {
      await sellerSettlementService.updateSettings({
        accountHolderName: accountHolder.trim() || undefined,
        iban: iban.trim(),
        bic: bic.trim() || undefined,
        bankName: bankName.trim() || undefined,
      });
      setIsSettingsModalOpen(false);
      await loadData();
    } catch (err: any) {
      setSettingsError(
        err.message || "Impossible de mettre à jour les coordonnées bancaires.",
      );
    } finally {
      setSettingsSubmitting(false);
    }
  };

  const getAllocationBadge = (status: string) => {
    switch (status) {
      case "available":
        return <Badge className="bg-green-600 text-white">Disponible</Badge>;
      case "pending_delivery":
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-300">
            En cours de livraison
          </Badge>
        );
      case "in_payout":
        return <Badge variant="secondary">En virement</Badge>;
      case "paid":
        return <Badge className="bg-blue-600 text-white">Transféré</Badge>;
      case "disputed_hold":
        return <Badge variant="destructive">Litige en cours</Badge>;
      case "cancelled":
        return <Badge variant="outline">Annulé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPayoutBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-600 text-white">Payé</Badge>;
      case "processing":
        return (
          <Badge className="bg-amber-600 text-white">
            En cours de traitement
          </Badge>
        );
      case "requested":
        return (
          <Badge variant="outline" className="border-amber-300 text-amber-600">
            Demandé
          </Badge>
        );
      case "failed":
        return <Badge variant="destructive">Rejeté / Échoué</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-6xl py-12 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          Chargement de votre compte de règlement...
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Règlements & Séquestre
          </h1>
          <p className="text-muted-foreground">
            Suivez vos ventes, le séquestre sécurisé des commandes et gérez vos
            virements bancaires.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              if (summary?.payoutDetailsMasked) {
                setAccountHolder(
                  summary.payoutDetailsMasked.accountHolderName || "",
                );
                setBankName(summary.payoutDetailsMasked.bankName || "");
              }
              setIsSettingsModalOpen(true);
            }}
          >
            <Settings className="h-4 w-4" />
            Coordonnées bancaires
          </Button>
          <Button
            className="gap-2"
            disabled={!summary || summary.balanceAvailable <= 0}
            onClick={() => {
              setPayoutAmount(String(summary?.balanceAvailable || ""));
              setIsPayoutModalOpen(true);
            }}
          >
            <Banknote className="h-4 w-4" />
            Demander un virement
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-green-200/50 bg-green-50/20 dark:bg-green-950/10">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              <span>Solde disponible</span>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-green-700 dark:text-green-400">
              {formatExact(
                summary?.balanceAvailable ?? 0,
                summary?.currency ?? "EUR",
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Prêt à être transféré sur votre compte bancaire.
          </CardContent>
        </Card>

        <Card className="border-amber-200/50 bg-amber-50/20 dark:bg-amber-950/10">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              <span>En séquestre (En cours)</span>
              <Lock className="h-4 w-4 text-amber-600" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-700 dark:text-amber-400">
              {formatExact(
                summary?.balancePending ?? 0,
                summary?.currency ?? "EUR",
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {summary?.pendingDeliveriesCount ?? 0} commande(s) en attente de
            confirmation de livraison.
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              <span>Litiges & Retenues</span>
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold">
              {formatExact(
                summary?.balanceOnHold ?? 0,
                summary?.currency ?? "EUR",
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {summary?.disputedAllocationsCount ?? 0} allocation(s)
            temporairement réservée(s).
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              <span>Total viré (cumulé)</span>
              <CheckCircle2 className="h-4 w-4 text-primary" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold">
              {formatExact(
                summary?.balancePaidOut ?? 0,
                summary?.currency ?? "EUR",
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Gains à vie :{" "}
            {formatExact(
              summary?.lifetimeEarned ?? 0,
              summary?.currency ?? "EUR",
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Allocations & Payouts */}
      <Tabs defaultValue="allocations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="allocations" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Allocations par commande ({allocations.length})
          </TabsTrigger>
          <TabsTrigger value="payouts" className="gap-2">
            <History className="h-4 w-4" />
            Historique des virements ({payouts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="allocations">
          <Card>
            <CardHeader>
              <CardTitle>Journal des ventes & commissions</CardTitle>
              <CardDescription>
                Commission plateforme transparente de 5 % appliquée sur le
                montant brut hors frais de port.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {allocations.length === 0 ? (
                <div className="text-center py-12 text-sm text-muted-foreground">
                  Aucune vente enregistrée pour le moment.
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                        <th className="p-3">Commande</th>
                        <th className="p-3">Date</th>
                        <th className="p-3 text-right">Montant brut</th>
                        <th className="p-3 text-right">Commission (5%)</th>
                        <th className="p-3 text-right">Montant net</th>
                        <th className="p-3 text-center">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {allocations.map((alloc) => (
                        <tr
                          key={alloc.id}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          <td className="p-3 font-medium">#{alloc.orderId}</td>
                          <td className="p-3 text-muted-foreground">
                            {format(new Date(alloc.createdAt), "d MMM yyyy", {
                              locale: fr,
                            })}
                          </td>
                          <td className="p-3 text-right font-mono">
                            {formatExact(alloc.grossAmount, alloc.currency)}
                          </td>
                          <td className="p-3 text-right font-mono text-muted-foreground">
                            -
                            {formatExact(
                              alloc.commissionAmount,
                              alloc.currency,
                            )}
                          </td>
                          <td className="p-3 text-right font-mono font-semibold text-green-600 dark:text-green-400">
                            +{formatExact(alloc.netAmount, alloc.currency)}
                          </td>
                          <td className="p-3 text-center">
                            {getAllocationBadge(alloc.status)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts">
          <Card>
            <CardHeader>
              <CardTitle>Historique des virements bancaires</CardTitle>
              <CardDescription>
                Consultez l&apos;état d&apos;exécution de vos demandes de
                virement.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {payouts.length === 0 ? (
                <div className="text-center py-12 text-sm text-muted-foreground">
                  Aucune demande de virement effectuée.
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                        <th className="p-3">Référence</th>
                        <th className="p-3">Date de demande</th>
                        <th className="p-3">Mode</th>
                        <th className="p-3 text-right">Montant</th>
                        <th className="p-3 text-center">Statut</th>
                        <th className="p-3">Date d&apos;exécution</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {payouts.map((p) => (
                        <tr
                          key={p.id}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          <td className="p-3 font-mono font-medium">
                            {p.reference}
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {format(
                              new Date(p.createdAt),
                              "d MMM yyyy 'à' HH:mm",
                              { locale: fr },
                            )}
                          </td>
                          <td className="p-3 capitalize">
                            {p.payoutMethod.replace("_", " ")}
                          </td>
                          <td className="p-3 text-right font-mono font-semibold">
                            {formatExact(p.amount, p.currency)}
                          </td>
                          <td className="p-3 text-center">
                            {getPayoutBadge(p.status)}
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {p.completedAt ? (
                              format(new Date(p.completedAt), "d MMM yyyy", {
                                locale: fr,
                              })
                            ) : p.failureReason ? (
                              <span className="text-destructive text-xs">
                                {p.failureReason}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Request Payout Dialog */}
      <Dialog open={isPayoutModalOpen} onOpenChange={setIsPayoutModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Demander un virement</DialogTitle>
            <DialogDescription>
              Transférez vos gains disponibles directement vers vos coordonnées
              bancaires enregistrées.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {payoutError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {payoutError}
              </div>
            )}

            <div className="p-3 bg-muted rounded-md space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Solde disponible :</span>
                <span className="font-semibold text-foreground">
                  {formatExact(
                    summary?.balanceAvailable ?? 0,
                    summary?.currency ?? "EUR",
                  )}
                </span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Compte destinataire :</span>
                <span className="font-mono">
                  {summary?.payoutDetailsMasked?.ibanMasked || "Non configuré"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payout-amount">
                Montant à transférer ({summary?.currency})
              </Label>
              <Input
                id="payout-amount"
                type="number"
                step="0.01"
                min={summary?.minimumPayoutAmount ?? 10}
                max={summary?.balanceAvailable ?? 0}
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Montant minimum : {summary?.minimumPayoutAmount ?? 10}{" "}
                {summary?.currency}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPayoutModalOpen(false)}
              disabled={payoutSubmitting}
            >
              Annuler
            </Button>
            <Button
              onClick={handleRequestPayout}
              disabled={payoutSubmitting || !payoutAmount}
            >
              {payoutSubmitting && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Confirmer le virement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bank Settings Dialog */}
      <Dialog open={isSettingsModalOpen} onOpenChange={setIsSettingsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Coordonnées bancaires</DialogTitle>
            <DialogDescription>
              Renseignez vos identifiants bancaires (IBAN / SEPA) pour recevoir
              vos règlements de ventes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {settingsError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {settingsError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="account-holder">
                Titulaire du compte (Nom / Entreprise)
              </Label>
              <Input
                id="account-holder"
                placeholder="ex. Jean Dupont"
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="iban">IBAN</Label>
              <Input
                id="iban"
                placeholder="FR76 1234 5678 9012 3456 7890 123"
                value={iban}
                onChange={(e) => setIban(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bic">Code BIC / SWIFT</Label>
                <Input
                  id="bic"
                  placeholder="BNPAFRPP"
                  value={bic}
                  onChange={(e) => setBic(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank-name">Nom de la banque</Label>
                <Input
                  id="bank-name"
                  placeholder="BNP Paribas"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSettingsModalOpen(false)}
              disabled={settingsSubmitting}
            >
              Annuler
            </Button>
            <Button onClick={handleSaveSettings} disabled={settingsSubmitting}>
              {settingsSubmitting && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
