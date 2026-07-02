import type { GameState, MatchSettings, PlayerState } from "../types/game";
import type { GameEvent } from "../types/events";
import type { CardInstance } from "../types/card";

export function createInitialGameState(
  matchId: string,
  settings: MatchSettings,
  player1Id: string,
  player2Id: string
): GameState {
  const players: Record<string, PlayerState> = {
    [player1Id]: {
      playerId: player1Id,
      displayName: player1Id,
      life: settings.startingLife,
      landsPlayedThisTurn: 0,
    },
    [player2Id]: {
      playerId: player2Id,
      displayName: "接続待機中",
      life: settings.startingLife,
      landsPlayedThisTurn: 0,
    },
  };

  return {
    matchId,
    settings,
    players,
    playerOrder: [player1Id, player2Id],
    turnPlayerId: player1Id,
    activePlayerId: player1Id,
    phase: "precombat-main",
    priority: {
      holderPlayerId: player1Id,
      consecutivePasses: 0,
      lastActionSeq: 0,
    },
    sharedLibrary: { cardInstanceIds: [] },
    sharedGraveyard: { cardInstanceIds: [] },
    battlefield: [],
    hands: { [player1Id]: [], [player2Id]: [] },
    exile: [],
    stack: [],
    cardInstances: {},
    revealedLibraryTop: [],
    mulliganPending: [],
    latestSeq: 0,
    connectionStatus: "idle",
  };
}

export function applyGameEvent(state: GameState, event: GameEvent): GameState {
  switch (event.type) {
    case "match-created": {
      return { ...state, matchId: event.matchId, settings: event.settings };
    }

    case "player-joined": {
      const existing = state.players[event.playerId];
      return {
        ...state,
        players: {
          ...state.players,
          [event.playerId]: {
            playerId: event.playerId,
            displayName: event.displayName,
            life: existing?.life ?? state.settings.startingLife,
            landsPlayedThisTurn: existing?.landsPlayedThisTurn ?? 0,
          },
        },
        // handsにエントリがない場合は空配列で初期化
        hands: {
          ...state.hands,
          [event.playerId]: state.hands[event.playerId] ?? [],
        },
      };
    }

    case "game-started": {
      return {
        ...state,
        sharedLibrary: { cardInstanceIds: event.libraryCardInstanceIds },
        cardInstances: event.cardInstances,
        mulliganPending: [...state.playerOrder],
      };
    }

    case "card-drawn": {
      const newLibrary = [...state.sharedLibrary.cardInstanceIds];
      const drawnIds = newLibrary.splice(0, event.cardInstanceIds.length);
      // ownerPlayerId を設定
      const updatedInstances = { ...state.cardInstances };
      for (const id of drawnIds) {
        updatedInstances[id] = {
          ...updatedInstances[id],
          ownerPlayerId: event.playerId,
          controllerPlayerId: event.playerId,
        };
      }
      const newHand = [...(state.hands[event.playerId] ?? []), ...drawnIds];
      return {
        ...state,
        sharedLibrary: { cardInstanceIds: newLibrary },
        hands: { ...state.hands, [event.playerId]: newHand },
        cardInstances: updatedInstances,
        revealedLibraryTop: [],
      };
    }

    case "land-played": {
      const playerId = event.playerId;
      const cardId = event.cardInstanceId;
      const newHand = state.hands[playerId].filter((id) => id !== cardId);
      const updatedInstances = {
        ...state.cardInstances,
        [cardId]: {
          ...state.cardInstances[cardId],
          ownerPlayerId: playerId,
          controllerPlayerId: playerId,
        },
      };
      return {
        ...state,
        hands: { ...state.hands, [playerId]: newHand },
        battlefield: [...state.battlefield, updatedInstances[cardId]],
        cardInstances: updatedInstances,
        players: {
          ...state.players,
          [playerId]: {
            ...state.players[playerId],
            landsPlayedThisTurn: state.players[playerId].landsPlayedThisTurn + 1,
          },
        },
      };
    }

    case "spell-cast": {
      const playerId = event.playerId;
      const cardId = event.cardInstanceId;
      const newHand = state.hands[playerId].filter((id) => id !== cardId);
      const updatedInstances = {
        ...state.cardInstances,
        [cardId]: {
          ...state.cardInstances[cardId],
          ownerPlayerId: playerId,
          controllerPlayerId: playerId,
        },
      };
      return {
        ...state,
        hands: { ...state.hands, [playerId]: newHand },
        stack: [
          ...state.stack,
          {
            stackItemId: event.stackItemId,
            cardInstanceId: cardId,
            controllerPlayerId: playerId,
          },
        ],
        cardInstances: updatedInstances,
        priority: {
          ...state.priority,
          consecutivePasses: 0,
        },
      };
    }

    case "card-moved": {
      const cardId = event.cardInstanceId;
      const instance = state.cardInstances[cardId];

      let newLibrary = [...state.sharedLibrary.cardInstanceIds];
      let newGraveyard = [...state.sharedGraveyard.cardInstanceIds];
      let newBattlefield = [...state.battlefield];
      let newExile = [...state.exile];
      let newStack = [...state.stack];
      const newHands = { ...state.hands };
      // ライブラリーから移動する場合は公開リストからも除去
      let newRevealedTop = state.revealedLibraryTop;

      // from zone から削除
      switch (event.from) {
        case "shared-library":
          newLibrary = newLibrary.filter((id) => id !== cardId);
          newRevealedTop = newRevealedTop.filter((id) => id !== cardId);
          break;
        case "shared-graveyard":
          newGraveyard = newGraveyard.filter((id) => id !== cardId);
          break;
        case "battlefield":
          newBattlefield = newBattlefield.filter((c) => c.instanceId !== cardId);
          break;
        case "exile":
          newExile = newExile.filter((id) => id !== cardId);
          break;
        case "stack":
          newStack = newStack.filter((s) => s.cardInstanceId !== cardId);
          break;
        case "hand":
          for (const pid of Object.keys(newHands)) {
            newHands[pid] = newHands[pid].filter((id) => id !== cardId);
          }
          break;
      }

      // to zone へ追加
      const updatedInstance: CardInstance = {
        ...instance,
        tapped: false,
        ownerPlayerId:
          event.to === "battlefield" || event.to === "stack"
            ? event.playerId
            : instance.ownerPlayerId,
        controllerPlayerId:
          event.to === "battlefield" || event.to === "stack"
            ? event.playerId
            : instance.controllerPlayerId,
      };

      switch (event.to) {
        case "shared-library": {
          if (event.position === "top") {
            newLibrary = [cardId, ...newLibrary];
          } else if (event.position === "bottom") {
            newLibrary = [...newLibrary, cardId];
          } else if (event.position && typeof event.position === "object") {
            newLibrary.splice(event.position.index, 0, cardId);
          } else {
            newLibrary = [cardId, ...newLibrary];
          }
          break;
        }
        case "shared-graveyard":
          newGraveyard = [...newGraveyard, cardId];
          break;
        case "battlefield":
          newBattlefield = [...newBattlefield, updatedInstance];
          break;
        case "exile":
          newExile = [...newExile, cardId];
          break;
        case "stack":
          // card-moved でスタックへ直接置く場合
          newStack = [
            ...newStack,
            {
              stackItemId: cardId,
              cardInstanceId: cardId,
              controllerPlayerId: event.playerId,
            },
          ];
          break;
        case "hand":
          newHands[event.playerId] = [...(newHands[event.playerId] ?? []), cardId];
          break;
      }

      return {
        ...state,
        sharedLibrary: { cardInstanceIds: newLibrary },
        sharedGraveyard: { cardInstanceIds: newGraveyard },
        battlefield: newBattlefield,
        exile: newExile,
        stack: newStack,
        hands: newHands,
        revealedLibraryTop: newRevealedTop,
        cardInstances: {
          ...state.cardInstances,
          [cardId]: updatedInstance,
        },
      };
    }

    case "library-shuffled": {
      // state変更は library-top-reordered が行うため no-op
      return state;
    }

    case "library-top-reordered": {
      const topCount = event.cardInstanceIds.length;
      const rest = state.sharedLibrary.cardInstanceIds.slice(topCount);
      return {
        ...state,
        sharedLibrary: { cardInstanceIds: [...event.cardInstanceIds, ...rest] },
        revealedLibraryTop: [],
      };
    }

    case "library-top-revealed": {
      return {
        ...state,
        revealedLibraryTop: event.cardInstanceIds,
      };
    }

    case "life-set": {
      return {
        ...state,
        players: {
          ...state.players,
          [event.playerId]: {
            ...state.players[event.playerId],
            life: event.life,
          },
        },
      };
    }

    case "card-tapped": {
      const cardId = event.cardInstanceId;
      const updatedInstances = {
        ...state.cardInstances,
        [cardId]: { ...state.cardInstances[cardId], tapped: event.tapped },
      };
      const updatedBattlefield = state.battlefield.map((c) =>
        c.instanceId === cardId ? updatedInstances[cardId] : c
      );
      return {
        ...state,
        cardInstances: updatedInstances,
        battlefield: updatedBattlefield,
      };
    }

    case "controller-set": {
      const cardId = event.cardInstanceId;
      const updatedInstances = {
        ...state.cardInstances,
        [cardId]: {
          ...state.cardInstances[cardId],
          controllerPlayerId: event.controllerPlayerId,
        },
      };
      const updatedBattlefield = state.battlefield.map((c) =>
        c.instanceId === cardId ? updatedInstances[cardId] : c
      );
      return {
        ...state,
        cardInstances: updatedInstances,
        battlefield: updatedBattlefield,
      };
    }

    case "priority-set": {
      return {
        ...state,
        priority: {
          ...state.priority,
          holderPlayerId: event.holderPlayerId,
          consecutivePasses: 0,
        },
      };
    }

    case "priority-passed": {
      return {
        ...state,
        priority: {
          holderPlayerId: event.nextHolderPlayerId,
          consecutivePasses: event.consecutivePasses,
          lastActionSeq: state.latestSeq,
        },
      };
    }

    case "priority-passes-reset": {
      return {
        ...state,
        priority: {
          ...state.priority,
          consecutivePasses: 0,
        },
      };
    }

    case "stack-top-resolved": {
      const resolvedItem = state.stack.find(
        (s) => s.stackItemId === event.resolvedStackItemId
      );
      const newStack = state.stack.filter(
        (s) => s.stackItemId !== event.resolvedStackItemId
      );
      let newGraveyard = [...state.sharedGraveyard.cardInstanceIds];
      let newBattlefield = [...state.battlefield];

      if (resolvedItem) {
        if (event.destination === "battlefield") {
          const inst = state.cardInstances[resolvedItem.cardInstanceId];
          if (inst) {
            newBattlefield = [
              ...newBattlefield,
              { ...inst, controllerPlayerId: resolvedItem.controllerPlayerId },
            ];
          }
        } else {
          newGraveyard = [...newGraveyard, resolvedItem.cardInstanceId];
        }
      }
      return {
        ...state,
        stack: newStack,
        sharedGraveyard: { cardInstanceIds: newGraveyard },
        battlefield: newBattlefield,
        priority: {
          holderPlayerId: event.nextPriorityHolderPlayerId,
          consecutivePasses: 0,
          lastActionSeq: state.latestSeq,
        },
      };
    }

    case "spell-countered": {
      const item = state.stack.find(
        (s) => s.stackItemId === event.stackItemId
      );
      const newStack = state.stack.filter(
        (s) => s.stackItemId !== event.stackItemId
      );
      let newLibrary = [...state.sharedLibrary.cardInstanceIds];
      let newGraveyard = [...state.sharedGraveyard.cardInstanceIds];

      if (item) {
        if (event.toLibraryTop) {
          newLibrary = [item.cardInstanceId, ...newLibrary];
        } else {
          newGraveyard = [...newGraveyard, item.cardInstanceId];
        }
      }
      return {
        ...state,
        stack: newStack,
        sharedLibrary: { cardInstanceIds: newLibrary },
        sharedGraveyard: { cardInstanceIds: newGraveyard },
      };
    }

    case "phase-set": {
      return { ...state, phase: event.phase };
    }

    case "turn-ended": {
      const nextPlayer = event.nextPlayerId;
      // 全戦場のカードをアンタップ
      const updatedInstances = { ...state.cardInstances };
      const updatedBattlefield = state.battlefield.map((c) => {
        if (c.controllerPlayerId === nextPlayer) {
          updatedInstances[c.instanceId] = { ...c, tapped: false };
          return updatedInstances[c.instanceId];
        }
        return c;
      });
      return {
        ...state,
        turnPlayerId: nextPlayer,
        activePlayerId: nextPlayer,
        phase: "beginning",
        priority: {
          holderPlayerId: nextPlayer,
          consecutivePasses: 0,
          lastActionSeq: state.latestSeq,
        },
        battlefield: updatedBattlefield,
        cardInstances: updatedInstances,
        players: {
          ...state.players,
          [nextPlayer]: {
            ...state.players[nextPlayer],
            landsPlayedThisTurn: 0,
          },
        },
      };
    }

    case "mulligan-declared": {
      // ログ用イベント、state変更なし（card-moved/shuffle/draw が続いて適用される）
      return state;
    }

    case "hand-kept": {
      return {
        ...state,
        mulliganPending: state.mulliganPending.filter((id) => id !== event.playerId),
      };
    }

    default:
      return state;
  }
}

