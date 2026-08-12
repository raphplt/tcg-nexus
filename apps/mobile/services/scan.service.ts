import type { ScanRecognizeResponse } from "@repo/scan-contract";
import { secureApi } from "./secureApi";

export const scanService = {
  async recognize(
    imageUris: string | string[],
    game?: string,
  ): Promise<ScanRecognizeResponse> {
    const uris = Array.isArray(imageUris) ? imageUris : [imageUris];
    const formData = new FormData();
    uris.forEach((uri, i) => {
      formData.append("images", {
        uri,
        name: `scan-${i}.jpg`,
        type: "image/jpeg",
      } as unknown as Blob);
    });

    if (game) {
      formData.append("game", game);
    }

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
