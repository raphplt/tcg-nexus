export const slugify = (text: string) => {
  return text.toLowerCase().replace(/ /g, "_");
};
