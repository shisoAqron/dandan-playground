# Agents.md

## プロジェクト概要

Dandân / Forgetful Fish をオンラインで遊ぶためのWebアプリを作成する。

本アプリは、Magic: The GatheringのカジュアルフォーマットであるDandânを、ブラウザ上で2人対戦できるようにするツールである。

初期版ではGitHub Pagesのみで公開できる静的Webアプリとして実装する。
サーバーは用意せず、ブラウザネイティブのWebRTCを利用してP2P通信を行う。

カードプールは初期版では固定とする。
必要なカードデータは事前にJSONとして取得し、リポジトリに含める。

将来的には以下を検討する。

* SkyWay Roomへの置き換え
* サーバーサイドのトークン発行API
* カードプール編集機能
* 複数のDandânデッキプリセット
* マッチ設定の保存
* TURN利用

そのため、通信層・カードプール管理・ゲームロジックは分離して実装する。

---

## 目的

* Dandânをオンラインで2人対戦できるようにする
* PCブラウザで快適に遊べるUIを提供する
* スマホからでも最低限プレイできるレスポンシブUIにする
* GitHub Pagesのみで公開できる構成にする
* 初期版ではサーバーや秘密情報を必要としない
* 初期版では推奨の固定カードプールで遊べるようにする
* 将来的にSkyWay Roomへ差し替えやすい設計にする
* 将来的にカードプール編集機能を追加しやすい設計にする
* 完全なMTGルールエンジンではなく、手動進行を補助するオンライン卓として作る

---

## 非目的

初期版では以下を目指さない。

* Magic: The Gatheringの完全なルールエンジン実装
* Arenaのような完全自動処理
* 誘発型能力、継続的効果、置換効果の完全自動処理
* 戦闘の完全合法性チェック
* スタック上の対象適正チェック
* フェイズごとの自動優先権付与
* APNAP順の厳密な自動処理
* 不特定多数向けのマッチング機能
* アカウント機能
* サーバーサイドでのRoom管理
* SkyWayの本番利用
* TURNサーバー利用
* ホスト交代
* 観戦機能
* 初期版でのカードプール編集
* 初期版での任意カード検索追加

---

## 技術スタック

* React
* TypeScript
* Vite
* GitHub Pages
* ブラウザネイティブ WebRTC
* RTCDataChannel
* Zustand または Jotai
* Framer Motion
* localStorage
* 事前生成したカードJSON

---

## 全体アーキテクチャ

```txt
React App
  ├─ UI Layer
  │   ├─ Top Screen
  │   ├─ Match Create Screen
  │   ├─ Join Screen
  │   ├─ Game Board
  │   ├─ Priority Control UI
  │   ├─ Stack UI
  │   ├─ Shared Graveyard UI
  │   ├─ Shared Library UI
  │   └─ Connection Status UI
  │
  ├─ Game Layer
  │   ├─ GameState
  │   ├─ GameEvent
  │   ├─ GameCommand
  │   ├─ PriorityState
  │   ├─ TurnState
  │   ├─ Reducer / Event Applier
  │   └─ Validation
  │
  ├─ Card Pool Layer
  │   ├─ Fixed Dandân Pool
  │   ├─ Card DB Loader
  │   ├─ Deck Builder
  │   └─ Future: Card Pool Editor
  │
  └─ Transport Layer
      ├─ Transport Interface
      ├─ NativeWebRtcManualTransport
      └─ Future: SkyWayTransport
```

---

## Dandânの基本ルール

初期版では以下をサポートする。

* 2人対戦
* 両プレイヤーは1つのライブラリーを共有する
* 両プレイヤーは1つの墓地を共有する
* 初期ライフは20点
* 初期手札は7枚
* 最大手札枚数は7枚
* ライブラリーから引けない場合は通常通り敗北する
* 「あなたのライブラリー」「あなたの墓地」を参照する効果は共有ライブラリー・共有墓地を参照する
* スタック上の呪文や戦場のパーマネントのオーナーは、その呪文を唱えたプレイヤーとして扱う
* 複数プレイヤーが同時にカードを引く場合、アクティブプレイヤーから1枚ずつ引く
* 通常のMagicと同じく、土地は1ターンに1枚まで
* 通常のMagicと同じく、ターン進行・スタック・優先権は存在する
* ただし、初期版では完全自動処理せず、手動進行を補助する

---

## 初期固定カードプール

初期版では固定カードプールを使う。
カードプール編集機能は後回しにする。

デフォルトの推奨プールは、Secret Lair Dandân Deck相当の80枚とする。

### 初期固定リスト

```ts
export const defaultDandanDecklist: DeckCardEntry[] = [
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
```

合計80枚。

---

## カードデータ方針

### 初期版

カードデータは事前生成したJSONをリポジトリに含める。

* 実行時にScryfall APIへ問い合わせない
* 必要なカードだけJSON化する
* カード画像URLはJSONに含めてよい
* カード画像そのものはリポジトリに含めない
* カードDB全体は含めない

### 配置例

```txt
src/
  data/
    dandan-cards.json
    dandan-decklist.json
```

または

```txt
public/
  data/
    dandan-cards.json
    dandan-decklist.json
```

初期版では実装しやすい方を選択してよい。

---

## カードJSON形式

```ts
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
```

### DeckCardEntry

```ts
export type DeckCardEntry = {
  name: string;
  count: number;
};
```

### CardInstance

デッキ内の各カードは、同名カードでも別インスタンスとして扱う。

```ts
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
```

Dandânでは、ライブラリーや墓地にあるカードの `ownerPlayerId` は `null` でよい。
スタック上の呪文や戦場のパーマネントになった時点で、そのカードを唱えたプレイヤーを `ownerPlayerId` として設定する。

---

## カードプール編集への将来拡張

初期版では固定プールのみとするが、将来のカードプール編集を見越して以下の設計にする。

```ts
export type CardPoolPreset = {
  id: string;
  name: string;
  description: string;
  decklist: DeckCardEntry[];
  cardData: CardData[];
  version: string;
};
```

初期版では以下のみを提供する。

```ts
export const presetDandanSecretLair: CardPoolPreset = {
  id: "dandan-secret-lair-2026",
  name: "Dandân Recommended Pool",
  description: "Default fixed Dandân pool for the first prototype.",
  decklist: defaultDandanDecklist,
  cardData: dandanCards,
  version: "1.0.0",
};
```

将来追加する機能:

* プリセット選択
* カード追加
* カード削除
* 枚数変更
* デッキ枚数チェック
* JSONインポート
* JSONエクスポート
* 共有リンクへのカードプールID埋め込み

---

## 通信方針

### 初期版

初期版では、GitHub Pagesのみで完結させるため、外部サービスのシークレットを必要とする通信SDKは利用しない。

* ブラウザネイティブWebRTCを利用する
* ゲームイベントの同期には `RTCDataChannel` を利用する
* シグナリングサーバーは用意しない
* SDP Offer / Answer は圧縮・エンコードした文字列として手動交換する
* 初回接続は「招待リンク + 回答コード」方式にする
* Trickle ICEは利用しない
* ICE gathering完了後のSDPを1回だけ交換する
* STUNのみ利用する
* TURNは初期版では利用しない
* ネットワーク環境によって接続できない場合があることをUI上で明示する

### 将来版

将来的には以下を検討する。

* SkyWay Room
* SkyWay DataStream
* サーバーサイドでのSkyWay Auth Token発行
* Room IDによる簡易入室
* 再接続性の改善
* TURN利用
* 簡易マッチ管理API

そのため、ゲームロジックは直接 `RTCPeerConnection` や `RTCDataChannel` に依存してはいけない。

---

## Transport抽象化

通信層は必ず以下のようなinterfaceで抽象化する。

```ts
export type ConnectionStatus =
  | "idle"
  | "creating"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "failed"
  | "closed";

export interface Transport {
  connect(): Promise<void>;
  disconnect(): void;
  send(message: WireMessage): void;
  onMessage(handler: (message: WireMessage) => void): void;
  onStatusChange(handler: (status: ConnectionStatus) => void): void;
}
```

初期実装では以下を作る。

```ts
class NativeWebRtcManualTransport implements Transport {
  // RTCPeerConnection + RTCDataChannel
}
```

将来の差し替え候補として以下を想定する。

```ts
class SkyWayTransport implements Transport {
  // SkyWay Room + DataStream
}
```

ゲームロジック側は `Transport` interfaceのみを利用する。

---

## 手動シグナリング仕様

### 接続方式

ホスト側はOfferを生成し、招待リンクとしてゲストへ渡す。
ゲスト側は招待リンクからOfferを読み込み、Answerを生成する。
ホストはAnswerコードを貼り付けて接続を完了する。

### SignalPayload

```ts
export type SignalPayload = {
  v: 1;
  app: "dandan";
  kind: "offer" | "answer";
  sdp: RTCSessionDescriptionInit;
  createdAt: number;
};
```

### コード形式

```txt
DD1.<compressed-base64url-json>
```

### 招待リンク形式

```txt
https://<github-pages-url>/#/join?offer=DD1.xxxxx
```

または

```txt
https://<github-pages-url>/#offer=DD1.xxxxx
```

実装しやすい方を選択してよい。

---

## DataChannel仕様

初期版では以下の設定でDataChannelを作成する。

```ts
const channel = peerConnection.createDataChannel("game", {
  ordered: true,
});
```

* `ordered: true`
* ゲームイベントはJSON文字列として送信する
* 大きなデータは送信しない
* カードDBやカード画像はDataChannelで送らない
* DataChannelではGameCommand、GameEvent、同期要求のみを送る

---

## ゲーム同期方針

ゲーム状態はホスト権威型で管理する。

### ホストの責務

* matchIdを作成する
* ライブラリーseedを決める
* 固定カードプールから共有ライブラリーを生成する
* 初期ゲーム状態を作る
* ゲストからのCommandを受け取る
* Commandを検証する
* GameEventに変換する
* `seq` を採番する
* 確定済みGameEventを全員へ配信する
* イベントログを保持する
* sync-requestに応答する

### ゲストの責務

* 自分の操作をCommandとしてホストへ送る
* ホストから受け取ったGameEventを順番に適用する
* `lastSeq` を管理する
* 欠損を検知したらsync-requestを送る
* 再接続後にhelloを送る

---

## WireMessage

```ts
export type WireMessage =
  | {
      type: "hello";
      messageId: string;
      clientId: string;
      playerId: string;
      lastSeq: number;
      sentAt: number;
    }
  | {
      type: "command";
      messageId: string;
      clientId: string;
      playerId: string;
      command: GameCommand;
      sentAt: number;
    }
  | {
      type: "event";
      messageId: string;
      seq: number;
      event: GameEvent;
      sentAt: number;
    }
  | {
      type: "sync-request";
      messageId: string;
      clientId: string;
      playerId: string;
      lastSeq: number;
      sentAt: number;
    }
  | {
      type: "sync-response";
      messageId: string;
      fromSeq: number;
      events: SequencedGameEvent[];
      snapshot?: GameSnapshot;
      sentAt: number;
    }
  | {
      type: "ping";
      messageId: string;
      clientId: string;
      lastSeq: number;
      sentAt: number;
    }
  | {
      type: "pong";
      messageId: string;
      clientId: string;
      lastSeq: number;
      sentAt: number;
    };
```

---

## SequencedGameEvent

```ts
export type SequencedGameEvent = {
  seq: number;
  eventId: string;
  actorPlayerId: string;
  createdAt: number;
  event: GameEvent;
};
```

### seq管理

* ホストのみが `seq` を採番する
* `seq` は1から開始する
* クライアントは `lastSeq` を保持する
* 期待する `seq` より古いイベントは重複として無視する
* 期待する `seq` より新しいイベントが来た場合は欠損とみなし、sync-requestを送る

---

## 再接続・ネットワーク不調対応

### 軽い切断

`iceConnectionState` が `disconnected` になった場合、すぐにゲーム終了扱いにしない。

* UIに「再接続中」を表示する
* 操作は一時停止する
* 一定時間は復帰を待つ
* `connected` に戻ったらsync-requestを送る
* 差分同期が完了したら操作可能に戻す

### 重い切断

以下の場合は手動再接続を促す。

* `iceConnectionState` が `failed` になった
* 長時間 `disconnected` のまま戻らない
* DataChannelがcloseした
* タブリロードでPeerConnectionが失われた

この場合、初回接続と同じように再接続用Offer / Answerを交換する。

### 再接続後

再接続後は必ず `hello` を送る。

```ts
{
  type: "hello",
  clientId,
  playerId,
  lastSeq
}
```

ホストは `lastSeq` 以降のイベントを `sync-response` で返す。

---

## localStorage永続化

リロードや一時切断に備え、ゲーム状態をlocalStorageへ保存する。

```ts
export type PersistedMatch = {
  matchId: string;
  role: "host" | "guest";
  playerId: string;
  clientId: string;
  latestSeq: number;
  events: SequencedGameEvent[];
  snapshot?: GameSnapshot;
  matchSettings: MatchSettings;
  updatedAt: number;
};
```

保存対象:

* matchId
* role
* playerId
* clientId
* latestSeq
* GameEventログ
* Snapshot
* MatchSettings

保存しないもの:

* WebRTCのPeerConnection
* DataChannel
* 一時的な接続状態

---

## 優先権の扱い

初期版では、Magic: The Gatheringの優先権を完全自動処理しない。

ただし、ゲーム進行補助として「現在どちらが優先権を持っているか」を管理する。
優先権は厳密なルールエンジンではなく、手動進行を補助するためのトークンとして扱う。

### 基本方針

* 優先権は `PriorityState` としてGameStateに保持する
* 優先権を持つプレイヤーだけが、呪文・能力・対応・スタック解決に関わる主要操作を行える
* 優先権を持つプレイヤーは `パス` できる
* パスすると相手へ優先権が移る
* スタックがある状態で両者が連続してパスした場合、スタック最上段を解決する
* スタック解決後はアクティブプレイヤーに優先権を戻す
* スタックが空の状態で両者が連続してパスした場合、フェイズまたはターン進行の確認UIを表示する
* 初期版ではフェイズごとの完全な優先権自動処理は行わない
* 誘発型能力、状況起因処理、呪文の適正タイミングは完全自動判定しない
* 優先権状態はプレイヤーが手動で調整できるようにする

### PriorityState

```ts
export type PriorityState = {
  holderPlayerId: string | null;
  consecutivePasses: number;
  lastActionSeq: number;
};
```

---

## ターン・フェイズ管理

MVPでは、フェイズを厳密に自動管理しない。

ただし、最低限以下の表示と操作を持つ。

```ts
export type Phase =
  | "upkeep"
  | "draw"
  | "precombat-main"
  | "combat"
  | "postcombat-main"
  | "ending";
```

### 初期版フェイズボタン表示順

メイン1・戦闘・メイン2 の順ですべてのフェイズをボタン表示する。

### 初期版の扱い

* 現在のターンプレイヤーを表示する
* 現在のフェイズを表示する
* ホストまたはアクティブプレイヤーがフェイズを進められる
* スタックが空で両者がパスした場合、次フェイズへの進行確認を出す
* 戦闘処理は完全自動化しない
* 攻撃・ブロックは手動で記録するか、MVPでは簡易的に扱う

---

## 共有ライブラリー・共有墓地

Dandânでは共有ライブラリーと共有墓地が重要である。

### 共有ライブラリー

```ts
export type SharedLibraryState = {
  cardInstanceIds: string[];
};
```

* ライブラリーは1つだけ存在する
* 両プレイヤーは同じライブラリーからドローする
* ライブラリー順はホストがseedから生成する
* ライブラリートップ操作をサポートする
* ライブラリーを見る効果は、対象カードの効果に応じて手動処理する

### 共有墓地

```ts
export type SharedGraveyardState = {
  cardInstanceIds: string[];
};
```

* 墓地は1つだけ存在する
* 両プレイヤーは同じ墓地を参照する
* Accumulated Knowledgeなど、墓地の同名カード数を参照するカードは共有墓地を参照する
* 墓地順が必要になる可能性があるため、配列順を保持する

---

## 初期版で重要なカード処理

初期版ではカード効果を完全自動化しない。
ただし、Dandânでは特に以下の操作が頻出するため、手動操作として扱いやすくする。

### Memory Lapse

用途:

* 呪文を打ち消す
* 打ち消されたカードを共有ライブラリーの一番上に置く

必要なUI:

* スタック上のカードを選択
* 「打ち消してライブラリートップへ」を選択
* 対象カードをスタックから共有ライブラリートップへ移動
* Memory Lapse本体を共有墓地へ移動

### Accumulated Knowledge

用途:

* 共有墓地にあるAccumulated Knowledgeの枚数を参照してドロー枚数が増える

必要なUI:

* 共有墓地内のAccumulated Knowledge枚数を表示
* 解決時に推奨ドロー枚数を表示
* 実際のドローはプレイヤーが確定する

### Brainstorm

用途:

* 3枚引く
* 手札から2枚をライブラリートップへ戻す

必要なUI:

* 3枚ドロー
* 手札から2枚選択
* 選択した順番で共有ライブラリートップへ戻す

### Predict

用途:

* カード名を指定する
* 共有ライブラリートップを公開する
* 一致していれば墓地へ置いて2枚引く
* 不一致なら公開カードを戻す

必要なUI:

* カード名入力
* ライブラリートップ公開
* 墓地へ置く / 戻す
* ドロー処理

### Telling Time

用途:

* ライブラリートップ3枚を見る
* 1枚を手札へ
* 1枚をライブラリートップへ
* 1枚をライブラリーボトムへ

必要なUI:

* トップ3枚を見る
* 3枚の行き先を選択
* 順番を確定する

### Halimar Depths

用途:

* 戦場に出たとき、ライブラリートップ3枚を見て好きな順番で戻す

必要なUI:

* トップ3枚を見る
* 並び替えて戻す

### Mystic Sanctuary

用途:

* 条件を満たす場合、墓地のインスタントかソーサリーをライブラリートップへ戻す

必要なUI:

* 共有墓地から対象を選ぶ
* 共有ライブラリートップへ置く

### Dandân

用途:

* 主な勝ち手段
* 防御プレイヤーがIslandをコントロールしていない場合、攻撃できない
* 自分がIslandをコントロールしていない場合、生け贄に捧げられる

初期版では完全自動判定しない。
ただし、UI上で各プレイヤーのIsland有無を見やすくする。

---

## GameCommand

```ts
export type GameCommand =
  | {
      type: "draw-card";
      playerId: string;
      count: number;
    }
  | {
      type: "play-land";
      playerId: string;
      cardInstanceId: string;
    }
  | {
      type: "cast-spell";
      playerId: string;
      cardInstanceId: string;
    }
  | {
      type: "move-card";
      playerId: string;
      cardInstanceId: string;
      from: Zone;
      to: Zone;
      position?: ZonePosition;
    }
  | {
      type: "reorder-library-top";
      playerId: string;
      cardInstanceIds: string[];
    }
  | {
      type: "put-card-on-library-top";
      playerId: string;
      cardInstanceId: string;
    }
  | {
      type: "put-card-on-library-bottom";
      playerId: string;
      cardInstanceId: string;
    }
  | {
      type: "reveal-library-top";
      playerId: string;
      count: number;
    }
  | {
      type: "set-life";
      playerId: string;
      life: number;
    }
  | {
      type: "tap-card";
      playerId: string;
      cardInstanceId: string;
      tapped: boolean;
    }
  | {
      type: "set-controller";
      playerId: string;
      cardInstanceId: string;
      controllerPlayerId: string;
    }
  | {
      type: "pass-priority";
      playerId: string;
    }
  | {
      type: "resolve-top-of-stack";
      playerId: string;
    }
  | {
      type: "set-priority";
      playerId: string;
      holderPlayerId: string;
    }
  | {
      type: "reset-priority-passes";
      playerId: string;
    }
  | {
      type: "set-phase";
      playerId: string;
      phase: Phase;
    }
  | {
      type: "end-turn";
      playerId: string;
    };
```

---

## GameEvent

```ts
export type GameEvent =
  | {
      type: "match-created";
      matchId: string;
      settings: MatchSettings;
      seed: string;
      cardPoolPresetId: string;
    }
  | {
      type: "player-joined";
      playerId: string;
      displayName: string;
    }
  | {
      type: "game-started";
      startedAt: number;
      libraryCardInstanceIds: string[];
    }
  | {
      type: "card-drawn";
      playerId: string;
      cardInstanceIds: string[];
    }
  | {
      type: "land-played";
      playerId: string;
      cardInstanceId: string;
    }
  | {
      type: "spell-cast";
      playerId: string;
      cardInstanceId: string;
      stackItemId: string;
    }
  | {
      type: "card-moved";
      playerId: string;
      cardInstanceId: string;
      from: Zone;
      to: Zone;
      position?: ZonePosition;
    }
  | {
      type: "library-top-reordered";
      playerId: string;
      cardInstanceIds: string[];
    }
  | {
      type: "library-top-revealed";
      playerId: string;
      cardInstanceIds: string[];
    }
  | {
      type: "life-set";
      playerId: string;
      life: number;
    }
  | {
      type: "card-tapped";
      playerId: string;
      cardInstanceId: string;
      tapped: boolean;
    }
  | {
      type: "controller-set";
      playerId: string;
      cardInstanceId: string;
      controllerPlayerId: string;
    }
  | {
      type: "priority-set";
      holderPlayerId: string | null;
    }
  | {
      type: "priority-passed";
      playerId: string;
      nextHolderPlayerId: string;
      consecutivePasses: number;
    }
  | {
      type: "priority-passes-reset";
    }
  | {
      type: "stack-top-resolved";
      resolvedStackItemId: string;
      nextPriorityHolderPlayerId: string;
    }
  | {
      type: "phase-set";
      phase: Phase;
    }
  | {
      type: "turn-ended";
      playerId: string;
      nextPlayerId: string;
    };
```

---

## Zone

```ts
export type Zone =
  | "shared-library"
  | "hand"
  | "battlefield"
  | "shared-graveyard"
  | "exile"
  | "stack";
```

### ZonePosition

```ts
export type ZonePosition =
  | "top"
  | "bottom"
  | {
      index: number;
    };
```

---

## MatchSettings

```ts
export type MatchSettings = {
  startingLife: number;
  cardPoolPresetId: string;
  enableManualPriority: boolean;
  enablePhaseTracking: boolean;
  enableFreeMulliganRule: boolean;
};
```

初期値:

```ts
export const defaultMatchSettings: MatchSettings = {
  startingLife: 20,
  cardPoolPresetId: "dandan-secret-lair-2026",
  enableManualPriority: true,
  enablePhaseTracking: true,
  enableFreeMulliganRule: true,
};
```

---

## GameState

```ts
export type GameState = {
  matchId: string;
  settings: MatchSettings;
  players: Record<string, PlayerState>;
  turnPlayerId: string | null;
  activePlayerId: string | null;
  phase: Phase;
  priority: PriorityState;
  sharedLibrary: SharedLibraryState;
  sharedGraveyard: SharedGraveyardState;
  battlefield: Record<string, CardInstance[]>;
  hands: Record<string, string[]>;
  exile: string[];
  stack: StackItem[];
  latestSeq: number;
  connectionStatus: ConnectionStatus;
};
```

---

## UI方針

### 基本方針

* 主対象はPCブラウザ
* スマホでも最低限プレイ可能にする
* Magic Onlineより現代的な見た目にする
* Arenaほどの派手なアニメーションは不要
* 操作は手動進行を前提にする
* 誤操作を防ぐ確認UIを入れる
* 接続状態を常に見えるようにする
* 優先権保持者を常に見えるようにする
* 共有ライブラリーと共有墓地を見やすくする
* ライブラリートップ操作を快適にする

### 画面一覧

* トップ画面
* マッチ作成画面
* 招待リンク表示画面
* マッチ参加画面
* 回答コード表示画面
* 接続待機画面
* ゲーム画面
* 優先権操作UI
* スタックUI
* 共有墓地ビュー
* ライブラリートップ操作モーダル
* 接続エラー / 再接続画面
* Future: カードプール編集画面

---

## ゲーム画面

PC向けレイアウト:

```txt
┌──────────────────────────────────┐
│ 接続状態 / ターン / フェイズ / 優先権 │
├──────────────────────────────────┤
│ 相手情報                          │
│ ライフ / 手札枚数 / 土地枚数       │
├──────────────────────────────────┤
│ 相手の戦場                        │
├──────────────────────────────────┤
│ スタック / ライブラリートップ情報   │
├──────────────────────────────────┤
│ 自分の戦場                        │
├──────────────────────────────────┤
│ 自分の手札                        │
├──────────────────────────────────┤
│ 共有墓地 / 共有ライブラリー / 操作   │
└──────────────────────────────────┘
```

スマホ向けでは縦積みにし、手札とアクションを下部に寄せる。

---

## カード操作

手札のカードを選択したときに表示する操作:

* 土地としてプレイ
* 呪文として唱える
* 捨てる
* 追放する
* ライブラリートップへ置く
* ライブラリーボトムへ置く
* 詳細を見る

戦場のカードを選択したときに表示する操作:

* タップ / アンタップ
* 墓地へ送る
* 追放する
* 手札へ戻す
* コントロール変更
* カウンターを増減する
* メモを付ける

スタック上のカードを選択したときに表示する操作:

* 解決する
* 打ち消す
* ライブラリートップへ置く
* 墓地へ送る
* 手札へ戻す

共有墓地のカードを選択したときに表示する操作:

* ライブラリートップへ置く
* 手札へ戻す
* 追放する
* 詳細を見る

---

## 初期版で実装するゲーム機能

### 必須

* マッチ作成
* マッチ参加
* プレイヤー名入力
* 固定カードプール読み込み
* 共有ライブラリー生成
* 共有墓地
* 初期手札配布
* ドロー
* 土地プレイ
* 呪文を唱える
* スタックに置く
* スタック解決補助
* 共有ライブラリートップへ置く
* 共有ライブラリーボトムへ置く
* ライブラリートップ公開
* ライブラリートップ並び替え
* 共有墓地の表示
* 戦場、墓地、追放、スタックの手動管理
* ライフ変更
* ターン表示
* フェイズ表示
* 優先権表示
* 優先権パス
* 接続状態表示
* イベントログ同期
* 再同期

### 後回し

* 完全な優先権自動制御
* 完全なフェイズ進行
* 自動戦闘処理
* 自動ダメージ計算
* 誘発型能力の自動処理
* DandânのIsland条件の完全自動判定
* Control Magicなどの継続的効果の完全自動処理
* トークン生成の詳細UI
* 観戦
* チャット
* リプレイ
* マッチ履歴
* カードプール編集

---

## 実装順序

### Step 1: 基礎プロジェクト作成

* Vite + React + TypeScript
* ESLint / Prettier
* GitHub Pagesデプロイ設定
* ルーティング
* 基本レイアウト

### Step 2: 固定カードJSON作成

* 必要カードだけScryfall等から取得
* `dandan-cards.json` を作成
* `dandan-decklist.json` を作成
* アプリから読み込めるようにする

### Step 3: ローカル2人対戦モード

通信なしで同一ブラウザ内の2人対戦を作る。

* マッチ作成
* 共有ライブラリー生成
* 初期手札
* ドロー
* 土地プレイ
* 呪文を唱える
* スタック管理
* 共有墓地
* ライブラリートップ操作
* 優先権表示
* 優先権パス
* GameEvent適用

### Step 4: Transport interface

* Transport interfaceを定義
* MockTransportを作成
* ゲームロジックがTransportに依存するよう整理

### Step 5: Native WebRTC実装

* Offer生成
* Answer生成
* エンコード / デコード
* 招待リンク
* 回答コード
* DataChannel接続
* WireMessage送受信

### Step 6: イベント同期

* host authority
* seq採番
* command送信
* event配信
* lastSeq管理
* 重複排除
* 欠損検知
* sync-request / sync-response

### Step 7: 切断・再接続

* connectionStatus表示
* disconnected時のUI
* failed時の手動再接続導線
* localStorage保存
* helloによる差分同期

### Step 8: UI改善

* PC向け盤面レイアウト
* スマホ向けレスポンシブ
* カード移動アニメーション
* スタック表示改善
* ライブラリートップ操作改善
* 優先権表示の改善
* 操作モーダル改善

### Step 9: 将来SkyWay対応の準備

* `NativeWebRtcManualTransport` に通信依存を閉じ込める
* `SkyWayTransport` を追加しやすい構成にする
* Transport以外の層にWebRTC固有処理を漏らさない

### Step 10: 将来カードプール編集対応の準備

* CardPoolPreset形式を維持する
* decklistとcardDataを分離する
* UIにカードプール選択の余地を残す

---

## 受け入れ条件

MVP完了条件は以下。

* GitHub Pagesで公開できる
* PCブラウザ2台で接続できる
* ホストが招待リンクを発行できる
* ゲストが回答コードを返せる
* DataChannel接続が成立する
* 固定カードプールを読み込める
* 共有ライブラリーを生成できる
* 共有墓地を扱える
* 初期手札を配れる
* ドローできる
* 土地をプレイできる
* 呪文を唱えてスタックに置ける
* スタック上のカードを解決できる
* Memory Lapse相当の「打ち消してライブラリートップへ」が手動操作できる
* Brainstorm相当の「引いて戻す」が手動操作できる
* Telling Time / Halimar Depths相当のトップ操作が手動操作できる
* Accumulated Knowledgeの共有墓地参照枚数を表示できる
* 優先権保持者を表示できる
* 優先権をパスできる
* 両者連続パス時にスタック解決補助ができる
* ホストが優先権を手動調整できる
* GameEventが両者で同期される
* seq欠損時にsync-requestできる
* 一時切断時に接続状態を表示できる
* リロード後にlocalStorageから状態を復元できる

---

## 将来のSkyWay移行方針

SkyWayへ移行する場合は、Transport層のみを差し替える。

### 変更対象

* `NativeWebRtcManualTransport`
* 手動Offer / Answer UI
* 招待リンク形式
* 再接続処理の一部

### 変更しない対象

* GameState
* GameEvent
* GameCommand
* PriorityState
* seq管理
* sync-request / sync-response
* 固定カードプール
* カードプールプリセット
* 共有ライブラリー処理
* 共有墓地処理
* 優先権の手動進行ロジック
* UIの大半

### SkyWay移行後の想定

```txt
GitHub Pages
  ├─ React App
  └─ SkyWayTransport

Server
  └─ SkyWay Auth Token発行API

SkyWay
  └─ P2P Room + DataStream
```

SkyWay利用時は、フロントエンドにsecretを置かない。
サーバー側で短命なSkyWay Auth Tokenを発行し、クライアントはそのTokenを使ってRoomに参加する。

---

## 注意事項

* 公開GitHub Pagesにシークレットを含めてはいけない
* Viteの `VITE_` 環境変数はブラウザに露出するため、secretの保存場所として使ってはいけない
* 初期版ではSkyWayの `CreateForDevelopment` は使わない
* 接続成功率よりも、まずゼロシークレット構成を優先する
* 接続できないネットワークがあることは仕様として許容する
* 将来的な改善としてSkyWayやTURNを検討する
* ゲームイベントの整合性は通信SDK任せにせず、必ずアプリ側で管理する
* 優先権は完全自動処理せず、手動進行の補助として実装する
* Magicの完全なルールエンジンを作ろうとしない
* 初期版ではカード効果を完全自動化しない
* ただし、Dandânで頻出するライブラリートップ操作は手動操作しやすくする

---

## 表示する免責文

アプリ内のフッターまたはAbout画面に以下を表示する。

```txt
This is unofficial Fan Content permitted under the Fan Content Policy.
Not approved/endorsed by Wizards.
Portions of the materials used are property of Wizards of the Coast.
© Wizards of the Coast LLC.
```

日本語UIの場合も、この英語文を併記する。

---

## 開発時の優先順位

最優先は「遊べること」。

見た目や細かいルール自動化よりも、以下を優先する。

1. 2人が接続できる
2. イベントが同期できる
3. 固定カードプールでゲームを開始できる
4. 共有ライブラリーと共有墓地を扱える
5. 手札・戦場・墓地・スタックが管理できる
6. ライブラリートップ操作が快適にできる
7. 優先権を手動で進行できる
8. 接続が不安定でも状態復元できる

Magicの完全自動処理を作ろうとしないこと。
本アプリはArenaの代替ではなく、Dandân用のオンライン卓である。

---

## 追加実装内容

### 実装済み機能（AGENTS.md 作成後に追加）

#### ゲームロジック

* **マリガン機能**
  * マリガン宣言 → 手札をライブラリーボトムへ戻してシャッフル → 7枚ドローの一連処理を実装
  * `mulligan-declared` / `hand-kept` / `mulligan` / `keep-hand` コマンド・イベントを追加
  * 全員がキープするまで `mulliganPending` 配列で追跡
  * マリガン中は手札のカード操作（プレイ・唱える・捨てる・追放・ライブラリー移動）を全て無効化

* **追加ターンボタン**
  * `take-extra-turn` コマンド / `extra-turn-started` イベントを追加
  * ターンプレイヤーを変えずに、自分がコントロールする戦場をアンタップし、フェイズをアップキープに戻し、土地プレイ回数をリセットする
  * マッチ時はターンプレイヤーのみ操作可能

* **呪文カウンター（打ち消し）**
  * `counter-spell` コマンド / `spell-countered` イベントを追加
  * 墓地送りとライブラリートップ送り（Memory Lapse用）の両方に対応

* **ライブラリーシャッフル**
  * `shuffle-library` コマンド / `library-shuffled` イベントを追加
  * 時刻ベースのシードで決定論的なFisher-Yatesシャッフル

* **カード捨て / 手札廃棄**
  * `discard-card` コマンドを追加

* **手札メニューのカード種別切り替え**
  * 手札のカードが土地（`typeLine` に `"Land"` を含む）かどうかを判定し、「土地としてプレイ」と「呪文として唱える」を自動で切り替えて表示

#### UI・UX

* **戦場のタップ / アンタップ操作**
  * 短押しでタップ / アンタップ、長押し / 右クリックでアクションメニューを表示
  * スマホでも操作しやすいようにポインターイベントで長押し検出を実装

* **カード詳細モーダル**
  * `CardActionMenu` 内から「詳細を見る」ボタンでカード画像・テキスト全文を表示するモーダルを追加

* **トースト通知**
  * ゲームイベント発生時（ドロー・呪文・土地プレイ・カード移動など）をトーストで画面上部に通知
  * `showToast` をグローバル関数として公開し、React ツリー外からも呼び出せる設計

* **イベントログパネル**
  * ゲーム画面右側に開閉式のイベントログパネルを追加
  * 全イベントを seq 番号付きで日本語テキスト付きで表示
  * フェイズ切り替え・ターン終了・追加ターンなどもログに記録

* **ローカル対戦のドロー選択モーダル**
  * ローカル対戦時に「ドロー」ボタンを押すとどちらのプレイヤーが引くか選択するモーダルを表示

* **戦場の並び順**
  * 非土地（クリーチャー・エンチャントなど）を左、土地を右に並べる

* **Islandコントロール表示**
  * 各プレイヤーの戦場にIslandがあるか否かをバッジで表示（「🏝️ Island有」/ 「⚠️ Island無」）

* **追放ゾーン表示**
  * `ExileView` を追加し、追放されたカードを確認・操作できるモーダルを実装
  * 「一括ライブラリーボトムへ」ボタンを追加

* **ライブラリー操作モーダルの強化**
  * 「公開」と「見る（非公開）」の2モードを分離
  * トップN枚を見るモードでは並び替え・個別に手札（公開 / 非公開）・墓地・ボトムへの移動が可能
  * シャッフルボタンを追加
  * 「墓地へ」「追放」の一括操作を追加

* **背景画像**
  * `public/background.png` を全画面背景レイヤーとして表示
  * `--bg-image-opacity` / `--bg-image-brightness` CSS変数で調整可能
  * `import.meta.env.BASE_URL` を使って開発・本番両対応

* **アプリ名・OGP設定**
  * アプリ名を「Dandân Playground」に変更
  * OGPメタタグ（og:title / og:image / og:url / twitter:card など）を `index.html` に追加

* **マリガンUIの統合**
  * `PlayerInfo` コンポーネント内にマリガン / キープボタンを組み込み、枠のハイライト色を変更

* **ライフ増減ボタン**
  * ±5 から ±4 に変更（Dandân の実情に合わせて調整）

* **招待コード / 招待リンク**
  * ゲスト側が招待リンクごと貼り付けた場合でも `offer=` パラメータを自動抽出するよう対応
  * 生成中のローディング表示を追加
  * SDPエンコードの `_` を `~` に変更（Markdown貼り付け時の文字化け対策）

---

## 当初から変わったこと・実装しなかったこと

### 変わったこと

* **フェイズの構成**
  * AGENTS.md では「メイン1・戦闘・メイン2 の順ですべてのフェイズをボタン表示する」と記載していたが、実際には `upkeep / draw / precombat-main / combat / postcombat-main / ending` の6フェイズすべてをボタン表示している

* **戦場のアンタップ対象**
  * AGENTS.md の設計では `turn-ended` 時に次のターンプレイヤーの戦場のみアンタップしていた
  * `extra-turn-started` は同プレイヤー継続なので、同じロジックで「自分がコントロールするカードのみ」をアンタップする形で実装

* **CardInstance の `typeLine` フィールド**
  * 型定義（`AGENTS.md`）には `typeLine` が `CardInstance` になかったが、実装上は `CardInstance` に `typeLine` を持たせることで土地判定などを行っている

* **マリガンのシャッフル方式**
  * 手札を返した後のライブラリーをシャッフルする際、時刻ベースのシード（`Date.now()`）を使用している（厳密な再現性より実用性を優先）

### 初期版では実装しなかったこと（AGENTS.md の「後回し」と一致）

* 完全な優先権自動制御
* 完全なフェイズ自動進行
* 自動戦闘処理・自動ダメージ計算
* 誘発型能力の自動処理
* DandânのIsland条件の完全自動判定
* Control Magicなどの継続的効果の完全自動処理
* トークン生成の詳細UI
* 観戦・チャット・リプレイ・マッチ履歴
* カードプール編集
* TURNサーバー / SkyWay 利用
