export type Zone =
  | "shared-library"
  | "hand"
  | "battlefield"
  | "shared-graveyard"
  | "exile"
  | "stack";

export type ZonePosition =
  | "top"
  | "bottom"
  | { index: number };

export type Phase =
  | "beginning"
  | "precombat-main"
  | "combat"
  | "postcombat-main"
  | "ending";

export type ConnectionStatus =
  | "idle"
  | "creating"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "failed"
  | "closed";

export type MatchSettings = {
  startingLife: number;
  cardPoolPresetId: string;
  enableManualPriority: boolean;
  enablePhaseTracking: boolean;
  enableFreeMulliganRule: boolean;
};

export const defaultMatchSettings: MatchSettings = {
  startingLife: 20,
  cardPoolPresetId: "dandan-secret-lair-2026",
  enableManualPriority: true,
  enablePhaseTracking: true,
  enableFreeMulliganRule: true,
};

export type PlayerState = {
  playerId: string;
  displayName: string;
  life: number;
  landsPlayedThisTurn: number;
};

export type PriorityState = {
  holderPlayerId: string | null;
  consecutivePasses: number;
  lastActionSeq: number;
};

export type SharedLibraryState = {
  cardInstanceIds: string[];
};

export type SharedGraveyardState = {
  cardInstanceIds: string[];
};

export type StackItem = {
  stackItemId: string;
  cardInstanceId: string;
  controllerPlayerId: string;
};

import type { CardInstance } from "./card";

export type GameState = {
  matchId: string;
  settings: MatchSettings;
  players: Record<string, PlayerState>;
  playerOrder: string[];
  turnPlayerId: string | null;
  activePlayerId: string | null;
  phase: Phase;
  priority: PriorityState;
  sharedLibrary: SharedLibraryState;
  sharedGraveyard: SharedGraveyardState;
  battlefield: CardInstance[];
  hands: Record<string, string[]>;
  exile: string[];
  stack: StackItem[];
  cardInstances: Record<string, CardInstance>;
  revealedLibraryTop: string[];
  mulliganPending: string[];
  latestSeq: number;
  connectionStatus: ConnectionStatus;
};
