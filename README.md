# Dandân Playground

**Dandân / Forgetful Fish** をブラウザ上でオンライン対戦できるウェブアプリです。

> **このアプリはファンメイドのコンテンツです。**  
> Wizards of the Coast の公式製品・サービスではありません。

[公開ページ](https://shisoaqron.github.io/dandan-playground/)

---

## 遊び方

### 推奨環境

- PC ブラウザ（Chrome / Edge / Firefox 最新版）
- スマートフォンでも最低限プレイ可能

### 接続手順

1. **ホスト**が「マッチを作成」を押して招待リンクをコピーする
2. **ゲスト**が招待リンクをブラウザで開き、回答コードを生成してホストへ送る
3. **ホスト**が回答コードを入力して接続完了
4. 双方に接続確認が出たらゲーム開始

> シグナリングサーバーを使わないため、ネットワーク環境によって接続できない場合があります。

---

## 主な機能

- 固定カードプール（Secret Lair Dandân Deck 相当の 80 枚）を使用した 2 人対戦
- 共有ライブラリー・共有墓地の管理
- スタック・優先権の手動進行補助
- ライブラリートップの公開・並び替え・手札への取り込み（Brainstorm / Telling Time / Halimar Depths 等に対応）
- マリガン（無限フリーマリガン）
- 追加ターン機能
- ゲームイベントの P2P リアルタイム同期（WebRTC DataChannel）
- 切断時の状態復元（localStorage）

---

## 技術スタック

| 用途 | 技術 |
|------|------|
| フレームワーク | React 19 + TypeScript |
| ビルドツール | Vite 6 (SWC) |
| 状態管理 | Zustand 5 |
| 通信 | ブラウザネイティブ WebRTC (RTCDataChannel) |
| ルーティング | React Router v7 (HashRouter) |
| アニメーション | Framer Motion |
| ホスティング | GitHub Pages |

---

## ローカルで動かす

```bash
git clone https://github.com/shisoAqron/dandan-playground.git
cd dandan-playground
npm install
npm run dev
```

ブラウザで `http://localhost:5173/dandan-playground/` を開いてください。

---

## カードデータについて

カードデータは [Scryfall API](https://scryfall.com/docs/api) から事前取得した JSON を日本語表記と結合させた上でリポジトリに含めています。  
実行時に Scryfall へのリクエストは行いません。  
カード画像は Scryfall の CDN URL を参照しています。

---

## 免責事項・ライセンス

```
This is unofficial Fan Content permitted under the Fan Content Policy.
Not approved/endorsed by Wizards.
Portions of the materials used are property of Wizards of the Coast.
© Wizards of the Coast LLC.
```

本アプリはファンが非公式に制作したコンテンツです。  
Wizards of the Coast の承認・推奨を受けたものではありません。  
使用している素材の一部は Wizards of the Coast LLC の所有物です。

Magic: The Gathering は Wizards of the Coast LLC の登録商標です。
