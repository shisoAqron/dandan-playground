export type CardData = {
  id: string;
  oracleId: string;
  name: string;
  printedName?: string;
  manaCost: string;
  cmc: number;
  typeLine: string;
  printedTypeLine?: string;
  oracleText?: string;
  printedText?: string;
  power?: string;
  toughness?: string;
  colors: string[];
  colorIdentity: string[];
  layout: string;
  imageUris?: {
    small?: string;
    normal?: string;
    large?: string;
    artCrop?: string;
  };
};

export type DeckCardEntry = {
  name: string;
  count: number;
};

export type Counter = {
  type: string;
  count: number;
};

export type CardInstance = {
  instanceId: string;
  cardId: string;
  oracleId: string;
  name: string;
  ownerPlayerId: string | null;
  controllerPlayerId: string | null;
  tapped: boolean;
  faceDown: boolean;
  counters: Counter[];
  annotations?: string;
};

export type CardPoolPreset = {
  id: string;
  name: string;
  description: string;
  decklist: DeckCardEntry[];
  cardData: CardData[];
  version: string;
};
