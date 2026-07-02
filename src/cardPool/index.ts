import type { CardData, DeckCardEntry, CardPoolPreset, CardInstance } from "../types/card";
import dandanCardsRaw from "../data/dandan-cards.json";
import dandanDecklistRaw from "../data/dandan-decklist.json";
import { v4 as uuidv4 } from "uuid";

export const dandanCards: CardData[] = dandanCardsRaw as CardData[];
export const defaultDandanDecklist: DeckCardEntry[] = dandanDecklistRaw as DeckCardEntry[];

export const presetDandanSecretLair: CardPoolPreset = {
  id: "dandan-secret-lair-2026",
  name: "Dandân Recommended Pool",
  description: "Default fixed Dandân pool for the first prototype.",
  decklist: defaultDandanDecklist,
  cardData: dandanCards,
  version: "1.0.0",
};

export const allPresets: CardPoolPreset[] = [presetDandanSecretLair];

export function getPresetById(id: string): CardPoolPreset | undefined {
  return allPresets.find((p) => p.id === id);
}

/**
 * デッキリストとカードデータからCardInstanceの配列を生成する
 */
export function buildCardInstances(preset: CardPoolPreset): CardInstance[] {
  const cardMap = new Map(preset.cardData.map((c) => [c.name, c]));
  const instances: CardInstance[] = [];

  for (const entry of preset.decklist) {
    const card = cardMap.get(entry.name);
    if (!card) {
      console.warn(`Card not found in pool: ${entry.name}`);
      continue;
    }
    for (let i = 0; i < entry.count; i++) {
      instances.push({
        instanceId: uuidv4(),
        cardId: card.id,
        oracleId: card.oracleId,
        name: card.name,
        typeLine: card.typeLine,
        ownerPlayerId: null,
        controllerPlayerId: null,
        tapped: false,
        faceDown: false,
        counters: [],
      });
    }
  }

  return instances;
}

/**
 * シードを使ってFisher-Yatesシャッフルを行う（決定論的）
 */
export function shuffleWithSeed(arr: string[], seed: string): string[] {
  const result = [...arr];
  // 簡易なシード付き乱数生成
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  const rand = () => {
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h ^= h >>> 16;
    return (h >>> 0) / 0x100000000;
  };
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
