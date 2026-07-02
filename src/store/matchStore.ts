import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type { GameState } from "../types/game";
import type { GameCommand, GameEvent, SequencedGameEvent } from "../types/events";
import type { Transport, WireMessage, PersistedMatch } from "../types/transport";
import { applyGameEvent, createInitialGameState } from "../game/reducer";
import { commandToEvent } from "../game/commands";
import { buildCardInstances, shuffleWithSeed, getPresetById } from "../cardPool";
import { defaultMatchSettings } from "../types/game";
import type { MatchSettings } from "../types/game";

const STORAGE_KEY = "dandan-persisted-match";

/**
 * ゲーム状態内の特定playerIdを別のIdに置き換える
 * ホストが偽guestIdを実guestIdに更新するために使う
 */
function replacePlayerIdInState(state: GameState, oldId: string, newId: string, newDisplayName: string): GameState {
  const updatedPlayers = { ...state.players };
  if (updatedPlayers[oldId]) {
    updatedPlayers[newId] = { ...updatedPlayers[oldId], playerId: newId, displayName: newDisplayName };
    delete updatedPlayers[oldId];
  }
  const updatedHands = { ...state.hands };
  if (updatedHands[oldId] !== undefined) {
    updatedHands[newId] = updatedHands[oldId];
    delete updatedHands[oldId];
  }
  return {
    ...state,
    players: updatedPlayers,
    hands: updatedHands,
    playerOrder: state.playerOrder.map((id) => (id === oldId ? newId : id)),
    priority: {
      ...state.priority,
      holderPlayerId:
        state.priority.holderPlayerId === oldId ? newId : state.priority.holderPlayerId,
    },
    turnPlayerId: state.turnPlayerId === oldId ? newId : state.turnPlayerId,
    activePlayerId: state.activePlayerId === oldId ? newId : state.activePlayerId,
    mulliganPending: (state.mulliganPending ?? []).map((id) => (id === oldId ? newId : id)),
  };
}

export type MatchRole = "host" | "guest";

export type MatchStoreState = {
  // 接続・マッチ情報
  matchId: string | null;
  role: MatchRole | null;
  playerId: string;
  opponentId: string | null;
  clientId: string;
  localPlayerName: string;
  opponentName: string | null;

  // ゲーム状態
  gameState: GameState | null;
  eventLog: SequencedGameEvent[];
  lastSeq: number;

  // Transport
  transport: Transport | null;

  // アクション
  setLocalPlayerName(name: string): void;
  initAsHost(settings?: Partial<MatchSettings>, transport?: Transport): {
    matchId: string;
    playerId: string;
  };
  initAsGuest(transport: Transport, hostPlayerId: string): void;
  joinGame(displayName: string, opponentDisplayName?: string): void;
  startGame(): void;
  sendCommand(command: GameCommand): void;
  applyEvent(seqEvent: SequencedGameEvent): void;
  broadcastEvent(event: GameEvent): void;
  setTransport(transport: Transport): void;
  loadPersistedMatch(): boolean;
  clearPersistedMatch(): void;
  setOpponentInfo(playerId: string, displayName: string): void;
};

function persistMatch(state: MatchStoreState) {
  if (!state.matchId || !state.role || !state.gameState) return;
  const persisted: PersistedMatch = {
    matchId: state.matchId,
    role: state.role,
    playerId: state.playerId,
    clientId: state.clientId,
    latestSeq: state.lastSeq,
    events: state.eventLog,
    matchSettings: state.gameState.settings,
    updatedAt: Date.now(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  } catch {
    // localStorage が使えない場合は無視
  }
}

export const useMatchStore = create<MatchStoreState>((set, get) => ({
  matchId: null,
  role: null,
  playerId: uuidv4(),
  opponentId: null,
  clientId: uuidv4(),
  localPlayerName: "Player",
  opponentName: null,
  gameState: null,
  eventLog: [],
  lastSeq: 0,
  transport: null,

  setLocalPlayerName(name) {
    set({ localPlayerName: name });
  },

  initAsHost(_settings, transport) {
    const matchId = uuidv4();
    const playerId = get().playerId;
    set({ matchId, role: "host" });
    if (transport) {
      get().setTransport(transport);
    }

    return { matchId, playerId };
  },

  initAsGuest(transport, _hostPlayerId) {
    set({ role: "guest" });
    get().setTransport(transport);
  },

  setOpponentInfo(playerId, displayName) {
    set({ opponentId: playerId, opponentName: displayName });
  },

  joinGame(displayName, opponentDisplayName) {
    set({ localPlayerName: displayName });
    if (opponentDisplayName) {
      // ローカル2人対戦用
    }
  },

  startGame() {
    const { matchId, gameState, role, playerId, opponentId } = get();
    if (!matchId || !gameState || role !== "host") return;

    const preset = getPresetById(gameState.settings.cardPoolPresetId);
    if (!preset) return;

    const instances = buildCardInstances(preset);
    const seed = uuidv4();
    const shuffledIds = shuffleWithSeed(
      instances.map((i) => i.instanceId),
      seed
    );

    const cardInstancesMap: Record<string, import("../types/card").CardInstance> = {};
    for (const inst of instances) {
      cardInstancesMap[inst.instanceId] = inst;
    }

    const event: GameEvent = {
      type: "game-started",
      startedAt: Date.now(),
      libraryCardInstanceIds: shuffledIds,
      cardInstances: cardInstancesMap,
    };

    // game-started イベントをホスト側に適用しゲストへも送信する
    get().broadcastEvent(event);

    // ホストが初期手札（各7枚）を配る
    const updatedState = get().gameState;
    if (!updatedState || !opponentId) return;

    // ホスト7枚ドロー
    get().sendCommand({ type: "draw-card", playerId, count: 7 });
    // ゲスト7枚ドロー
    get().sendCommand({ type: "draw-card", playerId: opponentId, count: 7 });
  },

  sendCommand(command) {
    const { role, gameState, playerId, transport, clientId, lastSeq } = get();
    if (!gameState) return;

    if (role === "host") {
      // ホストはコマンドを直接イベントに変換して適用
      const events = commandToEvent(gameState, command, playerId);
      for (const event of events) {
        const seqEvent: SequencedGameEvent = {
          seq: get().lastSeq + 1,
          eventId: uuidv4(),
          actorPlayerId: playerId,
          createdAt: Date.now(),
          event,
        };
        get().applyEvent(seqEvent);

        // ゲストへ送信
        if (transport) {
          const wireMsg: WireMessage = {
            type: "event",
            messageId: uuidv4(),
            seq: seqEvent.seq,
            event: seqEvent.event,
            sentAt: Date.now(),
          };
          transport.send(wireMsg);
        }
      }
    } else {
      // ゲストはコマンドをホストへ送信
      if (transport) {
        const wireMsg: WireMessage = {
          type: "command",
          messageId: uuidv4(),
          clientId,
          playerId,
          command,
          sentAt: lastSeq,
        };
        transport.send(wireMsg);
      }
    }
  },

  broadcastEvent(event) {
    const { role, playerId, transport } = get();
    const seqEvent: SequencedGameEvent = {
      seq: get().lastSeq + 1,
      eventId: uuidv4(),
      actorPlayerId: playerId,
      createdAt: Date.now(),
      event,
    };
    get().applyEvent(seqEvent);
    if (role === "host" && transport) {
      transport.send({
        type: "event",
        messageId: uuidv4(),
        seq: seqEvent.seq,
        event: seqEvent.event,
        sentAt: Date.now(),
      });
    }
  },

  applyEvent(seqEvent) {
    const { gameState, eventLog, lastSeq } = get();
    if (!gameState) return;

    // 重複チェック
    if (seqEvent.seq <= lastSeq) return;

    const newState = applyGameEvent(gameState, seqEvent.event);
    const newState2 = { ...newState, latestSeq: seqEvent.seq };
    const newLog = [...eventLog, seqEvent];

    set({
      gameState: newState2,
      eventLog: newLog,
      lastSeq: seqEvent.seq,
    });

    // 永続化
    persistMatch({ ...get(), gameState: newState2, eventLog: newLog, lastSeq: seqEvent.seq });
  },

  setTransport(transport) {
    set({ transport });

    transport.onStatusChange((status) => {
      set((state) => ({
        gameState: state.gameState
          ? { ...state.gameState, connectionStatus: status }
          : state.gameState,
      }));

      // 再接続時にsync-requestを送る
      if (status === "connected") {
        const { clientId, playerId, lastSeq, localPlayerName } = get();
        transport.send({
          type: "hello",
          messageId: uuidv4(),
          clientId,
          playerId,
          displayName: localPlayerName,
          lastSeq,
          sentAt: Date.now(),
        });
      }
    });

    transport.onMessage((msg) => {
      const { role, gameState, playerId, clientId, lastSeq, eventLog } = get();

      switch (msg.type) {
        case "event": {
          if (role === "guest") {
            // seq欠損チェック
            if (msg.seq > lastSeq + 1) {
              // sync-request
              transport.send({
                type: "sync-request",
                messageId: uuidv4(),
                clientId,
                playerId,
                lastSeq,
                sentAt: Date.now(),
              });
              return;
            }
            get().applyEvent({
              seq: msg.seq,
              eventId: msg.messageId,
              actorPlayerId: playerId,
              createdAt: msg.sentAt,
              event: msg.event,
            });
          }
          break;
        }

        case "command": {
          if (role === "host" && gameState) {
            const events = commandToEvent(gameState, msg.command, msg.playerId);
            for (const event of events) {
              const seqEvent: SequencedGameEvent = {
                seq: get().lastSeq + 1,
                eventId: uuidv4(),
                actorPlayerId: msg.playerId,
                createdAt: Date.now(),
                event,
              };
              get().applyEvent(seqEvent);
              // 全員へ配信
              transport.send({
                type: "event",
                messageId: uuidv4(),
                seq: seqEvent.seq,
                event: seqEvent.event,
                sentAt: Date.now(),
              });
            }
          }
          break;
        }

        case "hello": {
          if (role === "host") {
            const realGuestId = msg.playerId;
            const guestDisplayName = msg.displayName ?? msg.playerId;
            const fakeGuestId = get().opponentId;
            const currentState = get().gameState;

            // 偽のguestIdを本物のguestIdに置き換え、displayNameも正しく設定する
            if (currentState && fakeGuestId && fakeGuestId !== realGuestId) {
              const newState = replacePlayerIdInState(currentState, fakeGuestId, realGuestId, guestDisplayName);
              set({ gameState: newState, opponentId: realGuestId, opponentName: guestDisplayName });
            } else {
              set({ opponentId: realGuestId, opponentName: guestDisplayName });
            }

            // ホストのhelloをゲストへ返す（ゲストがホストのplayerIdを知るため）
            const hostName = get().localPlayerName;
            transport.send({
              type: "hello",
              messageId: uuidv4(),
              clientId,
              playerId,
              displayName: hostName,
              lastSeq: get().lastSeq,
              sentAt: Date.now(),
            });

            // 両プレイヤーのplayer-joinedをブロードキャスト（ゲストがgameStateを構築できるよう）
            get().broadcastEvent({ type: "player-joined", playerId, displayName: hostName });
            get().broadcastEvent({
              type: "player-joined",
              playerId: realGuestId,
              displayName: guestDisplayName,
            });

            // 差分同期
            const fromSeq = msg.lastSeq;
            const missingEvents = get().eventLog.filter((e) => e.seq > fromSeq);
            transport.send({
              type: "sync-response",
              messageId: uuidv4(),
              fromSeq,
              events: missingEvents,
              sentAt: Date.now(),
            });
          } else if (role === "guest") {
            // ホストのhelloを受けてホストの本当のplayerIdを記録する
            set({ opponentId: msg.playerId, opponentName: msg.displayName ?? msg.playerId });
          }
          break;
        }

        case "sync-request": {
          if (role === "host") {
            const fromSeq = msg.lastSeq;
            const missingEvents = eventLog.filter((e) => e.seq > fromSeq);
            transport.send({
              type: "sync-response",
              messageId: uuidv4(),
              fromSeq,
              events: missingEvents,
              sentAt: Date.now(),
            });
          }
          break;
        }

        case "sync-response": {
          if (role === "guest") {
            for (const seqEvent of msg.events) {
              get().applyEvent(seqEvent);
            }
          }
          break;
        }

        case "ping": {
          transport.send({
            type: "pong",
            messageId: uuidv4(),
            clientId,
            lastSeq,
            sentAt: Date.now(),
          });
          break;
        }
      }
    });
  },

  loadPersistedMatch() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const persisted = JSON.parse(raw) as PersistedMatch;
      // 1時間以上経過したセッションは無視
      if (Date.now() - persisted.updatedAt > 60 * 60 * 1000) return false;

      const preset = getPresetById(persisted.matchSettings.cardPoolPresetId);
      if (!preset) return false;

      // イベントを再適用してゲーム状態を復元
      const p1Id = persisted.playerId;
      const p2Id = "opponent";
      let state = createInitialGameState(persisted.matchId, persisted.matchSettings, p1Id, p2Id);

      for (const seqEvent of persisted.events) {
        state = { ...applyGameEvent(state, seqEvent.event), latestSeq: seqEvent.seq };
      }

      set({
        matchId: persisted.matchId,
        role: persisted.role,
        playerId: persisted.playerId,
        clientId: persisted.clientId,
        lastSeq: persisted.latestSeq,
        eventLog: persisted.events,
        gameState: state,
      });

      return true;
    } catch {
      return false;
    }
  },

  clearPersistedMatch() {
    localStorage.removeItem(STORAGE_KEY);
    set({
      matchId: null,
      role: null,
      opponentId: null,
      opponentName: null,
      gameState: null,
      eventLog: [],
      lastSeq: 0,
      transport: null,
    });
  },
}));

/**
 * ローカル2人対戦用セットアップ
 */
export function setupLocalMatch(
  player1Name: string,
  player2Name: string,
  settings?: Partial<MatchSettings>
): void {
  const store = useMatchStore.getState();
  const player1Id = store.playerId;
  const player2Id = uuidv4();
  const matchId = uuidv4();
  const mergedSettings = { ...defaultMatchSettings, ...settings };

  const initialState = createInitialGameState(matchId, mergedSettings, player1Id, player2Id);

  // player名を適用
  const stateWithNames = applyGameEvent(
    applyGameEvent(initialState, { type: "player-joined", playerId: player1Id, displayName: player1Name }),
    { type: "player-joined", playerId: player2Id, displayName: player2Name }
  );

  useMatchStore.setState({
    matchId,
    role: "host",
    opponentId: player2Id,
    opponentName: player2Name,
    localPlayerName: player1Name,
    gameState: stateWithNames,
    eventLog: [],
    lastSeq: 0,
  });
}
