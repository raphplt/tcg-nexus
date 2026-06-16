import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { Image } from "react-native";

//Recadrage, redimensionnement et compression. A voir si toujours nécessaire.
// TODO (à supprimer je pense, laisser le backend faire le travail)

const getImageSize = (
  uri: string,
): Promise<{ width: number; height: number }> =>
  new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });

export const ocrService = {
  async optimizeImage(uri: string): Promise<string> {
    const { width, height } = await getImageSize(uri);

    const cropWidth = Math.floor(width * 0.9);
    const cropHeight = Math.floor(height * 0.72);
    const originX = Math.max(0, Math.floor((width - cropWidth) / 2));
    const originY = Math.max(0, Math.floor((height - cropHeight) / 2));

    const optimized = await manipulateAsync(
      uri,
      [
        {
          crop: { originX, originY, width: cropWidth, height: cropHeight },
        },
        {
          resize: { width: 1200 },
        },
      ],
      {
        compress: 0.68,
        format: SaveFormat.JPEG,
      },
    );

    return optimized.uri;
  },
};
