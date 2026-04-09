import * as cheerio from "cheerio";

/**
 * Type d'un item scellé scrapé depuis pokecardex.com
 */
export interface PokecardexItem {
  /** Code de la série pokecardex (ex : "AQ", "SFA") */
  seriesId: string;
  /** Nom de la série tel qu'affiché sur la page */
  setName: string;
  /** Nom du produit (issu de l'attribut alt de l'image) */
  name: string;
  /** Type de produit normalisé */
  productType: string;
  /** URL absolue de l'image source sur pokecardex.com */
  imageUrl: string;
  /** Nom de fichier (basename de l'imageUrl) — sert d'identifiant stable */
  imageFilename: string;
}

export interface PokecardexSeries {
  id: string;
  name: string;
}

/**
 * Service de scraping pokecardex.com pour récupérer la liste des items scellés Pokémon.
 * Porté depuis poke-ventory (project personnel) vers tcg-nexus.
 */
export class PokecardexService {
  private readonly baseUrl = "https://www.pokecardex.com";

  /**
   * Récupère la liste de toutes les séries pokecardex depuis la sidebar du site.
   */
  async fetchSeriesList(): Promise<PokecardexSeries[]> {
    const response = await fetch(`${this.baseUrl}/series/SFA/decks`);
    if (!response.ok) {
      throw new Error(`Pokecardex series list failed: HTTP ${response.status}`);
    }
    const html = await response.text();
    const $ = cheerio.load(html);
    const seriesList: PokecardexSeries[] = [];
    const seen = new Set<string>();

    $(".menu-serie-container a").each((_, element) => {
      const href = $(element).attr("href");
      if (!href || !href.includes("/series/")) return;

      const parts = href.split("/").filter(Boolean);
      const id = parts[parts.length - 1];
      const name = $(element).find(".nom_ext").text().trim();

      if (id && name && !seen.has(id)) {
        seen.add(id);
        seriesList.push({ id, name });
      }
    });

    return seriesList;
  }

  /**
   * Scrape la page /series/{id}/decks d'une série pour en extraire la liste
   * des produits scellés (booster, ETB, deck, coffret, tin, portfolio, ...).
   */
  async scrapeSeriesItems(seriesId: string): Promise<PokecardexItem[]> {
    const url = `${this.baseUrl}/series/${seriesId}/decks`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Pokecardex scrape failed for ${seriesId}: HTTP ${response.status}`,
      );
    }
    const html = await response.text();
    const $ = cheerio.load(html);
    const items: PokecardexItem[] = [];

    const setLogoImg = $("img.serie-logo-big");
    const setName = setLogoImg.attr("alt") || "Unknown Set";

    $("h3").each((_, header) => {
      const sectionTitle = $(header).text().trim();
      const productType = this.normalizeProductType(sectionTitle);

      const sectionContent = $(header).nextUntil("h3");

      sectionContent.find("img").each((_, imgEl) => {
        const img = $(imgEl);
        const imgSrc = img.attr("src");
        const imgAlt = img.attr("alt");

        if (!imgSrc) return;
        if (imgSrc.includes("icon") || imgSrc.includes("symboles")) return;

        const absoluteUrl = imgSrc.startsWith("http")
          ? imgSrc
          : `${this.baseUrl}${imgSrc}`;
        const imageFilename = absoluteUrl.split("/").pop() ?? "";

        items.push({
          seriesId,
          setName,
          name: imgAlt || `${setName} - ${productType}`,
          productType,
          imageUrl: absoluteUrl,
          imageFilename,
        });
      });
    });

    return items;
  }

  /**
   * Normalise un titre de section pokecardex en valeur d'enum SealedProductType.
   */
  private normalizeProductType(sectionTitle: string): string {
    if (
      sectionTitle.includes("ETB") ||
      sectionTitle.includes("Elite Trainer Box")
    )
      return "etb";
    if (sectionTitle.includes("Display")) return "display";
    if (sectionTitle.includes("Coffret")) return "box";
    if (sectionTitle.includes("Tin")) return "tin";
    if (sectionTitle.includes("Portfolio")) return "portfolio";
    if (sectionTitle.includes("Tripack")) return "tripack";
    if (sectionTitle.includes("Booster")) return "booster";
    if (sectionTitle.includes("Deck")) return "deck";
    if (sectionTitle.includes("Collection")) return "collection_box";
    return "other";
  }
}
