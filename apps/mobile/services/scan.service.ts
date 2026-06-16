import type { ScanRecognizeResponse } from "@repo/scan-contract";
import { secureApi } from "./secureApi";

// Envoi de l'image au backend
export const scanService = {
  async recognize(
    imageUri: string,
    game?: string,
  ): Promise<ScanRecognizeResponse> {
    const formData = new FormData();
    formData.append("image", {
      uri: imageUri,
      name: "scan.jpg",
      type: "image/jpeg",
    } as unknown as Blob);

    if (game) {
      formData.append("game", game);
    }

    // le pipeline (vision + OCR) peut être long, surtout au 1er scan :
    // on relève le timeout bien au-delà des 10s par défaut de secureApi
    const response = await secureApi.post<ScanRecognizeResponse>(
      "/scan/recognize",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60000,
      },
    );

    return response.data;
  },
};
