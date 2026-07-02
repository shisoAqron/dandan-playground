import type { Phase, Zone, ZonePosition, MatchSettings } from "./game";

export type GameCommand =
  | { type: "draw-card"; playerId: string; count: number }
  | { type: "play-land"; playerId: string; cardInstanceId: string }
  | { type: "cast-spell"; playerId: string; cardInstanceId: string }
  | {
      type: "move-card";
      playerId: string;
      cardInstanceId: string;
      from: Zone;
      to: Zone;
      position?: ZonePosition;
      revealed?: boolean;
    }
  | {
      type: "reorder-library-top";
      playerId: string;
      cardInstanceIds: string[];
    }
  | { type: "put-card-on-library-top"; playerId: string; cardInstanceId: string }
  | { type: "put-card-on-library-bottom"; playerId: string; cardInstanceId: string }
  | { type: "reveal-library-top"; playerId: string; count: number; private?: boolean }
  | { type: "set-life"; playerId: string; life: number }
  | { type: "tap-card"; playerId: string; cardInstanceId: string; tapped: boolean }
  | {
      type: "set-controller";
      playerId: string;
      cardInstanceId: string;
      controllerPlayerId: string;
    }
  | { type: "pass-priority"; playerId: string }
  | { type: "resolve-top-of-stack"; playerId: string }
  | { type: "set-priority"; playerId: string; holderPlayerId: string }
  | { type: "reset-priority-passes"; playerId: string }
  | { type: "set-phase"; playerId: string; phase: Phase }
  | { type: "end-turn"; playerId: string }
  | { type: "take-extra-turn"; playerId: string }
  | { type: "discard-card"; playerId: string; cardInstanceId: string }
  | { type: "counter-spell"; playerId: string; stackItemId: string; toLibraryTop?: boolean }
  | { type: "shuffle-library"; playerId: string }
  | { type: "mulligan"; playerId: string }
  | { type: "keep-hand"; playerId: string };

export type GameEvent =
  | {
      type: "match-created";
      matchId: string;
      settings: MatchSettings;
      seed: string;
      cardPoolPresetId: string;
    }
  | { type: "player-joined"; playerId: string; displayName: string }
  | {
      type: "game-started";
      startedAt: number;
      libraryCardInstanceIds: string[];
      cardInstances: Record<string, import("./card").CardInstance>;
    }
  | { type: "card-drawn"; playerId: string; cardInstanceIds: string[] }
  | { type: "land-played"; playerId: string; cardInstanceId: string }
  | { type: "spell-cast"; playerId: string; cardInstanceId: string; stackItemId: string }
  | {
      type: "card-moved";
      playerId: string;
      cardInstanceId: string;
      from: Zone;
      to: Zone;
      position?: ZonePosition;
      revealed?: boolean;
    }
  | { type: "library-shuffled"; playerId: string; cardInstanceIds: string[] }
  | { type: "library-top-reordered"; playerId: string; cardInstanceIds: string[] }
  | { type: "library-top-revealed"; playerId: string; cardInstanceIds: string[]; private?: boolean }
  | { type: "life-set"; playerId: string; life: number }
  | { type: "card-tapped"; playerId: string; cardInstanceId: string; tapped: boolean }
  | {
      type: "controller-set";
      playerId: string;
      cardInstanceId: string;
      controllerPlayerId: string;
    }
  | { type: "priority-set"; holderPlayerId: string | null }
  | {
      type: "priority-passed";
      playerId: string;
      nextHolderPlayerId: string;
      consecutivePasses: number;
    }
  | { type: "priority-passes-reset" }
  | {
      type: "stack-top-resolved";
      resolvedStackItemId: string;
      cardInstanceId: string;
      destination: "graveyard" | "battlefield";
      nextPriorityHolderPlayerId: string;
    }
  | { type: "phase-set"; phase: Phase }
  | { type: "turn-ended"; playerId: string; nextPlayerId: string }
  | { type: "extra-turn-started"; playerId: string }
  | { type: "spell-countered"; stackItemId: string; cardInstanceId: string; toLibraryTop: boolean }
  | { type: "mulligan-declared"; playerId: string; returnedCardInstanceIds: string[] }
  | { type: "hand-kept"; playerId: string };

export type SequencedGameEvent = {
  seq: number;
  eventId: string;
  actorPlayerId: string;
  createdAt: number;
  event: GameEvent;
};

export type GameSnapshot = {
  state: import("./game").GameState;
  seq: number;
};
