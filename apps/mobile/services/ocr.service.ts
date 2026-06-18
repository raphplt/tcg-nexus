import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { Image } from "react-native";

const MAX_WIDTH = 1600;

const getImageSize = (
  uri: string,
): Promise<{ width: number; height: number }> =>
  new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });

export const ocrService = {
  async optimizeImage(uri: string): Promise<string> {
    const { width } = await getImageSize(uri);
    const actions = width > MAX_WIDTH ? [{ resize: { width: MAX_WIDTH } }] : [];

    const optimized = await manipulateAsync(uri, actions, {
      compress: 0.8,
      format: SaveFormat.JPEG,
    });

    return optimized.uri;
  },
};
