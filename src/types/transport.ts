import type { GameCommand, GameEvent, SequencedGameEvent, GameSnapshot } from "./events";
import type { MatchSettings } from "./game";

export type WireMessage =
  | {
      type: "hello";
      messageId: string;
      clientId: string;
      playerId: string;
      displayName?: string;
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

export type SignalPayload = {
  v: 1;
  app: "dandan";
  kind: "offer" | "answer";
  sdp: RTCSessionDescriptionInit;
  createdAt: number;
};

export type ConnectionStatus = import("./game").ConnectionStatus;

export interface Transport {
  connect(): Promise<void>;
  disconnect(): void;
  send(message: WireMessage): void;
  onMessage(handler: (message: WireMessage) => void): void;
  onStatusChange(handler: (status: ConnectionStatus) => void): void;
}

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
