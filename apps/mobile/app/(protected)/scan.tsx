import { useCameraPermissions } from "expo-camera";
import { CameraScanView } from "@/components/scan/CameraScanView";
import {
  PermissionLoading,
  PermissionRequest,
} from "@/components/scan/PermissionGate";
import { ScanReview } from "@/components/scan/ScanReview";
import { useScanFlow } from "@/hooks/useScanFlow";

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const scan = useScanFlow();

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
