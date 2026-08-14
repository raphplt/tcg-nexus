// le type MIME du multipart est déclaré par le client : on renifle les octets
const SIGNATURES: Array<{ format: string; matches: (b: Buffer) => boolean }> = [
  {
    format: "jpeg",
    matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    format: "png",
    matches: (b) =>
      b
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    format: "webp",
    matches: (b) =>
      b.subarray(0, 4).toString("ascii") === "RIFF" &&
      b.subarray(8, 12).toString("ascii") === "WEBP",
  },
  {
    // HEIC/HEIF : conteneur ISO-BMFF, brand juste après la box `ftyp`
    format: "heic",
    matches: (b) =>
      b.subarray(4, 8).toString("ascii") === "ftyp" &&
      ["heic", "heix", "hevc", "mif1", "msf1"].includes(
        b.subarray(8, 12).toString("ascii"),
      ),
  },
];

/**
 * Vérifie qu'un buffer commence bien par une signature d'image supportée.
 *
 * @param buffer Octets bruts reçus.
 * @returns True si le contenu est un format image reconnu.
 */
export function isSupportedImage(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  return SIGNATURES.some((signature) => signature.matches(buffer));
}
