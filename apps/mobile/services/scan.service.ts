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

    const response = await secureApi.post<ScanRecognizeResponse>(
      "/scan/recognize",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );

    return response.data;
  },
};
