// Mocks pour la page d'accueil

export interface Deck {
  name: string;
  percent: string;
  place: string;
  image?: string;
}

export const trendingDecks: Deck[] = [
  {
    name: "Dragapult ex",
    percent: "28%",
    place: "2nd Place Regional Atlante",
  },
  {
    name: "Gholdengo ex",
    percent: "14%",
    place: "5th Place Regional Atlante",
  },
  {
    name: "Noctowl",
    percent: "9%",
    place: "13th Regional of London",
  },
  {
    name: "Gardevoir ex",
    percent: "7%",
    place: "15th Place Regional Atlante",
  },
  {
    name: "Archéomir ex",
    percent: "5%",
    place: "24nd Place Regional Atlante",
  },
  {
    name: "Favianos ex",
    percent: "28%",
    place: "5th Place tournoi ETNA",
  },
];

export const articles = [
  {
    title: "Nouvelle extension sur Pokemon Pocket",
    image: "/images/article1.jpg",
    link: "#",
  },
  {
    title: "Nouvelle rareté sur  Pokemon Pocket",
    image: "/images/article2.jpg",
    link: "#",
  },
];

export const myCollection = [
  {
    name: "Ursaring EX",
    image: "/images/ursaringex.jpg",
    desc: "Body text for whatever you'd like to say.",
  },
  {
    name: "Chef de Fer EX",
    image: "/images/chefdeferex.jpg",
    desc: "Body text for whatever you'd like to say.",
  },
  {
    name: "Anphinobi EX",
    image: "/images/anphinobiex.jpg",
    desc: "Body text for whatever you'd like to say.",
  },
];
