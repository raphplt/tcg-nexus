import puppeteer, { Browser, Page } from "puppeteer";

export interface PokecardexItem {
  seriesId: string;
  setName: string;
  name: string;
  productType: string;
  imageUrl: string;
  imageFilename: string;
}

export interface PokecardexSeries {
  id: string;
  name: string;
}

/**
 * Service de scraping pokecardex.com via Puppeteer (headless browser).
 * Le site est une SPA React, donc on rend le JS avant de scraper le DOM.
 */
export class PokecardexService {
  private readonly baseUrl = "https://www.pokecardex.com";
  private readonly userAgent =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
  private browser: Browser | null = null;

  async init(): Promise<void> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  private async newPage(): Promise<Page> {
    if (!this.browser) await this.init();
    const page = await this.browser!.newPage();
    await page.setUserAgent(this.userAgent);
    return page;
  }

  /**
   * Récupère la liste des séries depuis la page /series.
   */
  async fetchSeriesList(): Promise<PokecardexSeries[]> {
    const page = await this.newPage();
    try {
      await page.goto(`${this.baseUrl}/series`, {
        waitUntil: "networkidle2",
        timeout: 45000,
      });

      await page.waitForSelector('a[href*="/series/"]', { timeout: 15000 });

      return await page.evaluate(() => {
        const seen = new Set<string>();
        const results: { id: string; name: string }[] = [];

        document.querySelectorAll('a[href*="/series/"]').forEach((el) => {
          const href = el.getAttribute("href");
          if (!href) return;
          const match = href.match(/\/series\/([A-Za-z0-9]+)$/);
          if (!match) return;
          const id = match[1];

          // Récupérer le nom depuis un élément texte à côté
          let name = "";
          const parent = el.closest("[class]");
          if (parent) {
            const textEls = parent.querySelectorAll("span, p, div");
            for (const t of textEls) {
              const txt = t.textContent?.trim();
              if (txt && txt.length > 2 && txt.length < 60) {
                name = txt;
                break;
              }
            }
          }
          if (!name) name = el.textContent?.trim() || id;

          if (id && !seen.has(id)) {
            seen.add(id);
            results.push({ id, name });
          }
        });
        return results;
      });
    } finally {
      await page.close();
    }
  }

  /**
   * Scrape les produits scellés d'une série en cliquant sur l'onglet "Produits".
   *
   * Les images de produits suivent le pattern :
   * https://www.pokecardex.com/assets/images/sets/{CODE}/{category}/{file}.png
   * Le sous-dossier ({category}) indique le type : boosters, portfolio, divers, etc.
   */
  async scrapeSeriesItems(seriesId: string): Promise<PokecardexItem[]> {
    const page = await this.newPage();
    try {
      await page.goto(`${this.baseUrl}/series/${seriesId}`, {
        waitUntil: "networkidle2",
        timeout: 45000,
      });

      // Cliquer sur le bouton "Produits"
      const clicked = await page.evaluate(() => {
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
        );
        while (walker.nextNode()) {
          if (walker.currentNode.textContent?.trim() === "Produits") {
            (walker.currentNode.parentElement as HTMLElement).click();
            return true;
          }
        }
        return false;
      });

      if (!clicked) return [];

      // Laisser le contenu se charger
      await new Promise((r) => setTimeout(r, 2500));

      const setName = await page.title().then((t) => {
        const match = t.match(/^(?:Série\s+)?(.+?)\s*\|/);
        return match ? match[1].trim() : seriesId;
      });

      return await page.evaluate(
        (seriesId: string, setName: string, baseUrl: string) => {
          const results: {
            seriesId: string;
            setName: string;
            name: string;
            productType: string;
            imageUrl: string;
            imageFilename: string;
          }[] = [];
          const seenUrls = new Set<string>();

          // Filtrer uniquement les images de produits (pattern d'URL spécifique)
          const productImgPattern =
            /\/assets\/images\/sets\/[^/]+\/([^/]+)\/(.+)$/;

          document.querySelectorAll("img").forEach((img) => {
            const src = img.src || "";
            const match = src.match(productImgPattern);
            if (!match) return;
            if (seenUrls.has(src)) return;
            seenUrls.add(src);

            const category = match[1].toLowerCase();
            const filename = decodeURIComponent(match[2]);

            let productType = "other";
            if (category.includes("booster")) productType = "booster";
            else if (category.includes("portfolio")) productType = "portfolio";
            else if (category.includes("etb")) productType = "etb";
            else if (category.includes("coffret") || category.includes("box"))
              productType = "box";
            else if (category.includes("tin")) productType = "tin";
            else if (category.includes("display")) productType = "display";
            else if (category.includes("deck")) productType = "deck";
            else if (category.includes("tripack")) productType = "tripack";
            else if (category === "divers") {
              // Catégorie "divers" = coffrets, collection boxes, etc.
              const nameLower = (img.alt || filename).toLowerCase();
              if (
                nameLower.includes("etb") ||
                nameLower.includes("elite") ||
                nameLower.includes("dresseur")
              )
                productType = "etb";
              else if (nameLower.includes("bundle")) productType = "etb";
              else if (
                nameLower.includes("coffret") ||
                nameLower.includes("collection")
              )
                productType = "collection_box";
              else if (nameLower.includes("tin")) productType = "tin";
              else productType = "box";
            }

            const name =
              img.alt && img.alt.length > 3
                ? img.alt.replace(/\.\w+$/, "")
                : filename.replace(/\.\w+$/, "").replace(/_/g, " ");

            results.push({
              seriesId,
              setName,
              name,
              productType,
              imageUrl: src,
              imageFilename: filename,
            });
          });

          return results;
        },
        seriesId,
        setName,
        this.baseUrl,
      );
    } finally {
      await page.close();
    }
  }
}
