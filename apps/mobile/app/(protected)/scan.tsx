import { useCameraPermissions } from "expo-camera";
import { CameraScanView } from "@/components/scan/CameraScanView";
import {
  PermissionLoading,
  PermissionRequest,
} from "@/components/scan/PermissionGate";
import { ScanReview } from "@/components/scan/ScanReview";
import { useScanFlow } from "@/hooks/useScanFlow";

// ─── Composant principal ──────────────────────────────────────────────────────
export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const scan = useScanFlow();

  const runManualSearch = async () => {
    const q = manualQuery.trim();
    if (!q || isManualSearching) return;
    setIsManualSearching(true);
    setInlineError(null);
    try {
      const cards = await cardService.searchCards(q);
      setManualResults(cards);
      if (cards.length === 0) setInlineError("Aucune carte trouvée.");
    } catch (e) { setInlineError(getApiErrorMessage(e)); }
    finally { setIsManualSearching(false); }
  };

  // ── Permission caméra ─────────────────────────────────────────────────────
  if (!permission) {
    return <PermissionLoading />;
  }

  if (!permission.granted) {
    return <PermissionRequest onRequest={() => void requestPermission()} />;
  }

  if (scan.mode === "camera") {
    return <CameraScanView scan={scan} />;
  }

  return <ScanReview scan={scan} />;
}
