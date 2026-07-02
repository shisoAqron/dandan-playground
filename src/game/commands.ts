import type { GameState } from "../types/game";
import type { GameCommand, GameEvent } from "../types/events";
import { v4 as uuidv4 } from "uuid";

/**
 * ホスト側: GameCommand を GameEvent に変換する
 * ゲスト側からの command を受け取り、検証後にイベントに変換する
 */
export function commandToEvent(
  state: GameState,
  command: GameCommand,
  _actorPlayerId: string
): GameEvent[] {
  switch (command.type) {
    case "draw-card": {
      const { playerId, count } = command;
      const available = state.sharedLibrary.cardInstanceIds.length;
      if (available === 0) {
        // ライブラリーが空 - ゲームロジックとして処理しない（手動で敗北確認）
        return [];
      }
      const drawCount = Math.min(count, available);
      const drawnIds = state.sharedLibrary.cardInstanceIds.slice(0, drawCount);
      return [{ type: "card-drawn", playerId, cardInstanceIds: drawnIds }];
    }

    case "play-land": {
      const { playerId, cardInstanceId } = command;
      const hand = state.hands[playerId] ?? [];
      if (!hand.includes(cardInstanceId)) return [];
      return [{ type: "land-played", playerId, cardInstanceId }];
    }

    case "cast-spell": {
      const { playerId, cardInstanceId } = command;
      const hand = state.hands[playerId] ?? [];
      if (!hand.includes(cardInstanceId)) return [];
      const stackItemId = uuidv4();
      return [{ type: "spell-cast", playerId, cardInstanceId, stackItemId }];
    }

    case "move-card": {
      return [
        {
          type: "card-moved",
          playerId: command.playerId,
          cardInstanceId: command.cardInstanceId,
          from: command.from,
          to: command.to,
          position: command.position,
          revealed: command.revealed,
        },
      ];
    }

    case "reorder-library-top": {
      return [
        {
          type: "library-top-reordered",
          playerId: command.playerId,
          cardInstanceIds: command.cardInstanceIds,
        },
      ];
    }

    case "put-card-on-library-top": {
      const { playerId, cardInstanceId } = command;
      // 現在のゾーンを特定
      const from = findCardZone(state, cardInstanceId, playerId);
      return [
        {
          type: "card-moved",
          playerId,
          cardInstanceId,
          from,
          to: "shared-library",
          position: "top",
        },
      ];
    }

    case "put-card-on-library-bottom": {
      const { playerId, cardInstanceId } = command;
      const from = findCardZone(state, cardInstanceId, playerId);
      return [
        {
          type: "card-moved",
          playerId,
          cardInstanceId,
          from,
          to: "shared-library",
          position: "bottom",
        },
      ];
    }

    case "reveal-library-top": {
      const { playerId, count } = command;
      const topIds = state.sharedLibrary.cardInstanceIds.slice(0, count);
      return [{ type: "library-top-revealed", playerId, cardInstanceIds: topIds, private: command.private }];
    }

    case "set-life": {
      return [{ type: "life-set", playerId: command.playerId, life: command.life }];
    }

    case "tap-card": {
      return [
        {
          type: "card-tapped",
          playerId: command.playerId,
          cardInstanceId: command.cardInstanceId,
          tapped: command.tapped,
        },
      ];
    }

    case "set-controller": {
      return [
        {
          type: "controller-set",
          playerId: command.playerId,
          cardInstanceId: command.cardInstanceId,
          controllerPlayerId: command.controllerPlayerId,
        },
      ];
    }

    case "pass-priority": {
      const { playerId } = command;
      const playerIds = state.playerOrder;
      const currentIdx = playerIds.indexOf(state.priority.holderPlayerId ?? "");
      const nextIdx = (currentIdx + 1) % playerIds.length;
      const nextHolderPlayerId = playerIds[nextIdx];
      const newConsecutivePasses = state.priority.consecutivePasses + 1;
      return [
        {
          type: "priority-passed",
          playerId,
          nextHolderPlayerId,
          consecutivePasses: newConsecutivePasses,
        },
      ];
    }

    case "resolve-top-of-stack": {
      const top = state.stack[state.stack.length - 1];
      if (!top) return [];
      const nextPriorityHolderPlayerId = state.turnPlayerId ?? state.playerOrder[0];
      const cardInst = state.cardInstances[top.cardInstanceId];
      const typeLine = cardInst?.typeLine ?? "";
      const isSpell = typeLine.includes("Instant") || typeLine.includes("Sorcery");
      const destination: "graveyard" | "battlefield" = isSpell ? "graveyard" : "battlefield";
      return [
        {
          type: "stack-top-resolved",
          resolvedStackItemId: top.stackItemId,
          cardInstanceId: top.cardInstanceId,
          destination,
          nextPriorityHolderPlayerId,
        },
      ];
    }

    case "set-priority": {
      return [{ type: "priority-set", holderPlayerId: command.holderPlayerId }];
    }

    case "reset-priority-passes": {
      return [{ type: "priority-passes-reset" }];
    }

    case "set-phase": {
      return [{ type: "phase-set", phase: command.phase }];
    }

    case "end-turn": {
      const { playerId } = command;
      const playerIds = state.playerOrder;
      const currentIdx = playerIds.indexOf(playerId);
      const nextPlayerId = playerIds[(currentIdx + 1) % playerIds.length];
      return [{ type: "turn-ended", playerId, nextPlayerId }];
    }

    case "take-extra-turn": {
      return [{ type: "extra-turn-started", playerId: command.playerId }];
    }

    case "discard-card": {
      const { playerId, cardInstanceId } = command;
      return [
        {
          type: "card-moved",
          playerId,
          cardInstanceId,
          from: "hand",
          to: "shared-graveyard",
        },
      ];
    }

    case "shuffle-library": {
      const { playerId } = command;
      const shuffled = [...state.sharedLibrary.cardInstanceIds];
      let h = Date.now();
      const rand = () => {
        h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
        h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
        h ^= h >>> 16;
        return (h >>> 0) / 0x100000000;
      };
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return [
        { type: "library-shuffled", playerId, cardInstanceIds: shuffled },
        { type: "library-top-reordered", playerId, cardInstanceIds: shuffled },
      ];
    }

    case "mulligan": {
      const { playerId } = command;
      const hand = state.hands[playerId] ?? [];
      const events: GameEvent[] = [];

      // 1. 宣言（ログ用）
      events.push({ type: "mulligan-declared", playerId, returnedCardInstanceIds: hand });

      // 2. 手札を全てライブラリーボトムへ（公開扱い）
      for (const cardInstanceId of hand) {
        events.push({
          type: "card-moved",
          playerId,
          cardInstanceId,
          from: "hand",
          to: "shared-library",
          position: "bottom",
          revealed: true,
        });
      }

      // 3. 手札返却後のライブラリー順を計算してシャッフル
      const libraryAfterReturn = [
        ...state.sharedLibrary.cardInstanceIds,
        ...hand,
      ];
      const shuffled = [...libraryAfterReturn];
      let h = Date.now();
      const rand = () => {
        h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
        h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
        h ^= h >>> 16;
        return (h >>> 0) / 0x100000000;
      };
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      events.push({ type: "library-shuffled", playerId, cardInstanceIds: shuffled });
      events.push({ type: "library-top-reordered", playerId, cardInstanceIds: shuffled });

      // 4. 7枚ドロー
      const drawIds = shuffled.slice(0, 7);
      events.push({ type: "card-drawn", playerId, cardInstanceIds: drawIds });

      return events;
    }

    case "keep-hand": {
      return [{ type: "hand-kept", playerId: command.playerId }];
    }

    case "counter-spell": {
      const { playerId, stackItemId, toLibraryTop } = command;
      void playerId;
      const item = state.stack.find((s) => s.stackItemId === stackItemId);
      const cardInstanceId = item?.cardInstanceId ?? "";
      return [
        {
          type: "spell-countered",
          stackItemId,
          cardInstanceId,
          toLibraryTop: toLibraryTop ?? false,
        },
      ];
    }

    default:
      return [];
  }
}

function findCardZone(
  state: GameState,
  cardInstanceId: string,
  playerId: string
): import("../types/game").Zone {
  if (state.hands[playerId]?.includes(cardInstanceId)) return "hand";
  if (state.sharedGraveyard.cardInstanceIds.includes(cardInstanceId))
    return "shared-graveyard";
  if (state.sharedLibrary.cardInstanceIds.includes(cardInstanceId))
    return "shared-library";
  if (state.battlefield.some((c) => c.instanceId === cardInstanceId))
    return "battlefield";
  if (state.exile.includes(cardInstanceId)) return "exile";
  if (state.stack.some((s) => s.cardInstanceId === cardInstanceId)) return "stack";
  // どこにも見つからない場合は手札とする
  return "hand";
}
