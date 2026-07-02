#!/usr/bin/env node
/**
 * Scryfall APIからDandânデッキのカードデータを取得してJSONを生成するスクリプト
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const decklist = [
  { name: "Island", count: 20 },
  { name: "Dandân", count: 10 },
  { name: "Memory Lapse", count: 8 },
  { name: "Accumulated Knowledge", count: 4 },
  { name: "Magical Hack", count: 2 },
  { name: "Mystic Sanctuary", count: 2 },
  { name: "Brainstorm", count: 2 },
  { name: "Capture of Jingzhou", count: 2 },
  { name: "Chart a Course", count: 2 },
  { name: "Control Magic", count: 2 },
  { name: "Crystal Spray", count: 2 },
  { name: "Day's Undoing", count: 2 },
  { name: "Mental Note", count: 2 },
  { name: "Metamorphose", count: 2 },
  { name: "Predict", count: 2 },
  { name: "Telling Time", count: 2 },
  { name: "Unsubstantiate", count: 2 },
  { name: "Halimar Depths", count: 2 },
  { name: "Haunted Fengraf", count: 2 },
  { name: "Lonely Sandbar", count: 2 },
  { name: "Remote Isle", count: 2 },
  { name: "The Surgical Bay", count: 2 },
  { name: "Svyelunite Temple", count: 2 },
];

const HEADERS = {
  'User-Agent': 'dandan-playground/0.1.0 (fan-made card game helper)',
  'Accept': 'application/json',
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchJson(url, retry = 3) {
  const response = await fetch(url, { headers: HEADERS });
  if (response.status === 429) {
    if (retry <= 0) throw new Error(`429 Too Many Requests`);
    const wait = 65000; // 65秒待機してリトライ
    console.warn(`  Rate limited. Waiting ${wait / 1000}s...`);
    await sleep(wait);
    return fetchJson(url, retry - 1);
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status} ${response.statusText} - ${text}`);
  }
  return response.json();
}

async function fetchCard(name) {
  console.log(`Fetching: ${name}`);

  // Step 1: Secret Lair Dandân Deck版（SLD）のカードアートを取得
  let sldData = null;
  await sleep(400);
  const sldQuery = encodeURIComponent(`!"${name}" set:sld`);
  try {
    const sldResult = await fetchJson(
      `https://api.scryfall.com/cards/search?q=${sldQuery}&order=released&dir=desc`
    );
    if (sldResult.data?.length > 0) {
      // highres_scanを優先
      const sorted = sldResult.data.sort((a, b) =>
        (b.image_status === 'highres_scan' ? 1 : 0) - (a.image_status === 'highres_scan' ? 1 : 0)
      );
      sldData = sorted[0];
      console.log(`  → SLD art (#${sldData.collector_number} ${sldData.image_status}): ${sldData.name}`);
    }
  } catch (e) {
    console.warn(`  SLD search failed: ${e.message.slice(0, 60)}`);
  }

  // Step 2: 日本語テキストを別版から取得（SLDは英語のみ）
  let jaData = null;
  await sleep(400);
  const jaQuery = encodeURIComponent(`!"${name}" lang:ja`);
  try {
    const jaResult = await fetchJson(
      `https://api.scryfall.com/cards/search?q=${jaQuery}&order=released&dir=desc&unique=prints`
    );
    if (jaResult.data?.length > 0) {
      const sorted = jaResult.data.sort((a, b) => {
        const score = (c) =>
          (c.image_status === 'highres_scan' ? 2 : 0) +
          (!c.name.includes('//') ? 1 : 0);
        return score(b) - score(a);
      });
      jaData = sorted[0];
      console.log(`  → Japanese text (${jaData.set}): ${jaData.printed_name ?? jaData.name}`);
    }
  } catch (e) {
    if (!e.message.startsWith('404')) {
      console.warn(`  Japanese search failed: ${e.message.slice(0, 60)}`);
    } else {
      console.log(`  → No Japanese version found`);
    }
  }

  const baseData = sldData ?? jaData;
  if (!baseData) throw new Error(`Failed to fetch "${name}": no data found`);

  // SLD版の画像を使用し、日本語テキストをオーバーレイする
  const imgSrc = sldData ?? jaData;
  return {
    id: baseData.id,
    oracleId: baseData.oracle_id,
    name: baseData.name,
    printedName: jaData?.printed_name ?? undefined,
    manaCost: baseData.mana_cost ?? '',
    cmc: baseData.cmc ?? 0,
    typeLine: baseData.type_line ?? '',
    printedTypeLine: jaData?.printed_type_line ?? undefined,
    oracleText: baseData.oracle_text ?? '',
    printedText: jaData?.printed_text ?? undefined,
    power: baseData.power,
    toughness: baseData.toughness,
    colors: baseData.colors ?? [],
    colorIdentity: baseData.color_identity ?? [],
    layout: baseData.layout ?? 'normal',
    imageUris: imgSrc?.image_uris ? {
      small: imgSrc.image_uris.small,
      normal: imgSrc.image_uris.normal,
      large: imgSrc.image_uris.large,
      artCrop: imgSrc.image_uris.art_crop,
    } : undefined,
  };
}

async function main() {
  const cards = [];
  const uniqueNames = decklist.map(e => e.name);

  for (const name of uniqueNames) {
    try {
      const card = await fetchCard(name);
      cards.push(card);
      // sleepはfetchCard内で管理しているため追加待機不要
    } catch (err) {
      console.error(`Error fetching ${name}:`, err.message);
    }
  }

  const dataDir = join(__dirname, '..', 'src', 'data');
  mkdirSync(dataDir, { recursive: true });

  writeFileSync(
    join(dataDir, 'dandan-cards.json'),
    JSON.stringify(cards, null, 2),
    'utf-8'
  );

  writeFileSync(
    join(dataDir, 'dandan-decklist.json'),
    JSON.stringify(decklist, null, 2),
    'utf-8'
  );

  console.log(`\nDone! Fetched ${cards.length} cards.`);
  console.log(`Output: src/data/dandan-cards.json`);
  console.log(`Output: src/data/dandan-decklist.json`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
