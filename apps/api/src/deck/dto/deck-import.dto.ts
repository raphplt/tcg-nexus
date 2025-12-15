export class DeckImportDto {
  id: number;
  name: string;
  isPublic: boolean;
  views: number;
  format: {
    id: number;
    name: string;
  };
  coverCard?: {
    id: string;
    name: string;
  };
  cards: {
    cardId: string;
    qty: number;
    role: string;
  }[];
}
