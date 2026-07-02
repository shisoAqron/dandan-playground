import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useMatchStore } from "../../store/matchStore";
import { buildCardInstances, shuffleWithSeed, getPresetById } from "../../cardPool";
import ConnectionStatusBadge from "../shared/ConnectionStatusBadge";
import ToastContainer, { showToast } from "../shared/ToastContainer";
import PlayerInfo from "./PlayerInfo";
import BattlefieldView from "./BattlefieldView";
import HandView from "./HandView";
import StackView from "./StackView";
import PriorityControl from "./PriorityControl";
import SharedGraveyardView from "./SharedGraveyardView";
import ExileView from "./ExileView";
import LibraryModal from "./LibraryModal";
import type { Phase } from "../../types/game";
import { v4 as uuidv4 } from "uuid";
import type { CardInstance } from "../../types/card";

const PHASE_LABELS: Record<Phase, string> = {
  upkeep: "アップキープ",
  draw: "ドロー",
  "precombat-main": "メイン1",
  combat: "戦闘",
  "postcombat-main": "メイン2",
  ending: "エンド",
};

type Props = {
  isLocal: boolean;
};

export default function GameBoard({ isLocal }: Props) {
  const gameState = useMatchStore((s) => s.gameState);
  const sendCommand = useMatchStore((s) => s.sendCommand);
  const playerId = useMatchStore((s) => s.playerId);
  const opponentId = useMatchStore((s) => s.opponentId);
  const role = useMatchStore((s) => s.role);
  const clearPersistedMatch = useMatchStore((s) => s.clearPersistedMatch);
  const navigate = useNavigate();

  const [showGraveyard, setShowGraveyard] = useState(false);
  const [showExile, setShowExile] = useState(false);
  const [showLibraryTop, setShowLibraryTop] = useState(false);
  const [showEventLog, setShowEventLog] = useState(false);
  const [showDrawModal, setShowDrawModal] = useState(false);
  const eventLog = useMatchStore((s) => s.eventLog);

  // 新着イベントをトーストで表示
  const lastNotifiedSeq = useRef(0);
  useEffect(() => {
    if (!gameState) return;
    const ZONE_LABEL: Record<string, string> = {
      "shared-library": "ライブラリー",
      "hand": "手札",
      "battlefield": "戦場",
      "shared-graveyard": "墓地",
      "exile": "追放",
      "stack": "スタック",
    };
    const newEntries = eventLog.filter((e) => e.seq > lastNotifiedSeq.current);
    for (const e of newEntries) {
      const ev = e.event;
      let detail = "";
      if (ev.type === "card-drawn") {
        const who = gameState.players[ev.playerId]?.displayName ?? ev.playerId;
        const ids = (ev.cardInstanceIds ?? []) as string[];
        detail = `${who} が ${ids.length}枚 ドローした`;
      } else if (ev.type === "library-top-revealed") {
        const who = gameState.players[ev.playerId]?.displayName ?? ev.playerId;
        const ids = (ev.cardInstanceIds ?? []) as string[];
        if (ev.private) {
          detail = `${who} がトップ ${ids.length} 枚を確認（非公開）`;
        } else {
          const names = ids.map((id) => gameState.cardInstances[id]?.name ?? id).join(", ");
          detail = `${who} が公開: ${names}`;
        }
      } else if (ev.type === "library-shuffled") {
        const who = gameState.players[ev.playerId]?.displayName ?? ev.playerId;
        detail = `${who} がライブラリーをシャッフルした`;
      } else if (ev.type === "library-top-reordered") {
        const who = gameState.players[ev.playerId]?.displayName ?? ev.playerId;
        const ids = (ev.cardInstanceIds ?? []) as string[];
        detail = `${who} が ${ids.length}枚 トップに戻した`;
      } else if (ev.type === "land-played") {
        const who = gameState.players[ev.playerId]?.displayName ?? ev.playerId;
        const cardName = gameState.cardInstances[ev.cardInstanceId]?.name ?? ev.cardInstanceId;
        detail = `${who} が土地をプレイ: ${cardName}`;
      } else if (ev.type === "spell-cast") {
        const who = gameState.players[ev.playerId]?.displayName ?? ev.playerId;
        const cardName = gameState.cardInstances[ev.cardInstanceId]?.name ?? ev.cardInstanceId;
        detail = `${who} が呪文を唱えた: ${cardName}`;
      } else if (ev.type === "controller-set") {
        const who = gameState.players[ev.controllerPlayerId]?.displayName ?? ev.controllerPlayerId;
        const cardName = gameState.cardInstances[ev.cardInstanceId]?.name ?? ev.cardInstanceId;
        detail = `${who} が ${cardName} のコントロールを得た`;
      } else if (ev.type === "card-tapped") {
        const who = gameState.players[ev.playerId]?.displayName ?? ev.playerId;
        const cardName = gameState.cardInstances[ev.cardInstanceId]?.name ?? ev.cardInstanceId;
        detail = `${who}: ${cardName} を${ev.tapped ? "タップ" : "アンタップ"}`;
      } else if (ev.type === "stack-top-resolved") {
        const cardName = gameState.cardInstances[ev.cardInstanceId]?.name ?? ev.cardInstanceId;
        const dest = ev.destination === "battlefield" ? "戦場へ" : "墓地へ";
        detail = `${cardName} が解決された → ${dest}`;
      } else if (ev.type === "spell-countered") {
        const cardName = gameState.cardInstances[ev.cardInstanceId]?.name ?? ev.cardInstanceId;
        const dest = ev.toLibraryTop ? "ライブラリートップへ" : "墓地へ";
        detail = `${cardName} が打ち消された → ${dest}`;
      } else if (ev.type === "mulligan-declared") {
        const who = gameState.players[ev.playerId]?.displayName ?? ev.playerId;
        detail = `${who} がマリガンを宣言した`;
      } else if (ev.type === "hand-kept") {
        const who = gameState.players[ev.playerId]?.displayName ?? ev.playerId;
        detail = `${who} が手札をキープした`;
      } else if (ev.type === "phase-set") {
        detail = `フェイズ → ${PHASE_LABELS[ev.phase]}`;
      } else if (ev.type === "turn-ended") {
        const who = gameState.players[ev.nextPlayerId]?.displayName ?? ev.nextPlayerId;
        detail = `ターン終了 → ${who} のターン`;
      } else if (ev.type === "extra-turn-started") {
        const who = gameState.players[ev.playerId]?.displayName ?? ev.playerId;
        detail = `${who} が追加ターンを得た`;
      } else if (ev.type === "card-moved") {
        const cardName = ev.revealed !== false
          ? (gameState.cardInstances[ev.cardInstanceId]?.name ?? ev.cardInstanceId)
          : "？（非公開）";
        const fromLabel = ZONE_LABEL[ev.from] ?? ev.from;
        const toLabel = ZONE_LABEL[ev.to] ?? ev.to;
        const posLabel = ev.position === "top" ? "（トップ）" : ev.position === "bottom" ? "（ボトム）" : "";
        const who = gameState.players[ev.playerId]?.displayName ?? ev.playerId;
        detail = `${who}: ${cardName} ${fromLabel} → ${toLabel}${posLabel}`;
      }
      if (detail) showToast(detail);
      lastNotifiedSeq.current = e.seq;
    }
  }, [eventLog, gameState]);

  // ゲーム開始（カードを配る）
  const handleStartGame = () => {
    if (!gameState) return;
    const preset = getPresetById(gameState.settings.cardPoolPresetId);
    if (!preset) return;

    const instances = buildCardInstances(preset);
    const seed = uuidv4();
    const shuffledIds = shuffleWithSeed(instances.map((i) => i.instanceId), seed);

    const cardInstancesMap: Record<string, CardInstance> = {};
    for (const inst of instances) {
      cardInstancesMap[inst.instanceId] = inst;
    }

    // game-started をホストで適用しゲストへも送信
    useMatchStore.getState().broadcastEvent({
      type: "game-started",
      startedAt: Date.now(),
      libraryCardInstanceIds: shuffledIds,
      cardInstances: cardInstancesMap,
    });

    // 各プレイヤーに7枚配る
    const pids = gameState.playerOrder;
    for (const pid of pids) {
      sendCommand({ type: "draw-card", playerId: pid, count: 7 });
    }
  };

  if (!gameState) return null;

  const { players, playerOrder, phase, priority, sharedLibrary, sharedGraveyard } = gameState;
  const mulliganPending = gameState.mulliganPending ?? [];

  // ローカル対戦ではplayerIdsのどちらでも操作できる
  // WebRTC対戦ではopponentId = 相手
  const gameStarted = sharedLibrary.cardInstanceIds.length > 0 || Object.values(gameState.hands).some(h => (h?.length ?? 0) > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      <ToastContainer />
      {/* ヘッダー */}
      <div style={{ padding: "8px 12px", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", flexShrink: 0 }}>
        <div style={{ fontWeight: "bold", color: "var(--accent)" }}>Dandân</div>
        <ConnectionStatusBadge status={isLocal ? "connected" : gameState.connectionStatus} />
        <div style={{ color: "var(--text-muted)", fontSize: "12px" }}>
          ターン: <span style={{ color: "var(--text)" }}>{players[gameState.turnPlayerId ?? ""]?.displayName ?? "—"}</span>
        </div>
        <div style={{ color: "var(--text-muted)", fontSize: "12px" }}>
          フェイズ: <span style={{ color: "var(--text)" }}>{PHASE_LABELS[phase]}</span>
        </div>
        <div style={{ color: "var(--text-muted)", fontSize: "12px" }}>
          📚 {sharedLibrary.cardInstanceIds.length}枚
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: "6px" }}>
          {!gameStarted && (
            <button
              className="primary small"
              onClick={handleStartGame}
              disabled={!isLocal && role !== "host"}
              title={!isLocal && role !== "host" ? "ホストのみ操作可能" : undefined}
            >
              ゲーム開始
            </button>
          )}
          <button className="secondary small" onClick={() => setShowEventLog(!showEventLog)}>
            ログ
          </button>
          <button className="danger small" onClick={() => {
            if (confirm("ゲームを終了しますか？")) {
              clearPersistedMatch();
              navigate("/");
            }
          }}>
            終了
          </button>
        </div>
      </div>

      {/* メインエリア */}
      <div style={{ flex: 1, overflow: "auto", padding: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
        {/* 相手エリア（ローカル対戦時は2人目、WebRTC時は相手） */}
        {isLocal ? (
          /* ローカル: 2人目 */
          playerOrder.length > 1 && (() => {
            const p2id = playerOrder[1];
            const p2 = players[p2id];
            if (!p2) return null;
            return (
              <div key={p2id}>
                <PlayerInfo
                  player={p2}
                  isLocal={false}
                  handCount={gameState.hands[p2id]?.length ?? 0}
                  battlefieldCount={gameState.battlefield.filter(c => c.controllerPlayerId === p2id).length}
                  isActive={gameState.activePlayerId === p2id}
                  hasPriority={priority.holderPlayerId === p2id}
                  mulliganPending={mulliganPending.includes(p2id)}
                  onMulligan={() => sendCommand({ type: "mulligan", playerId: p2id })}
                  onKeepHand={() => sendCommand({ type: "keep-hand", playerId: p2id })}
                />
                <div style={{ marginTop: "6px" }}>
                  <HandView playerId={p2id} isOpponent={false} />
                </div>
                <div style={{ marginTop: "6px" }}>
                  <BattlefieldView playerId={p2id} label={`${p2.displayName}の戦場`} />
                </div>
              </div>
            );
          })()
        ) : (
          opponentId && players[opponentId] && (
            <div>
              <PlayerInfo
                player={players[opponentId]}
                isLocal={false}
                handCount={gameState.hands[opponentId]?.length ?? 0}
                battlefieldCount={gameState.battlefield.filter(c => c.controllerPlayerId === opponentId).length}
                isActive={gameState.activePlayerId === opponentId}
                hasPriority={priority.holderPlayerId === opponentId}
                mulliganPending={mulliganPending.includes(opponentId)}
              />
              <div style={{ marginTop: "6px" }}>
                <HandView playerId={opponentId} isOpponent={true} />
              </div>
              <div style={{ marginTop: "6px" }}>
                <BattlefieldView playerId={opponentId} label="相手の戦場" />
              </div>
            </div>
          )
        )}

        {/* スタック + アクションボタン */}
        <div style={{ display: "flex", gap: "8px", alignItems: "stretch" }}>
          <div className="panel" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", flexShrink: 0, alignContent: "start" }}>
            <button className="secondary small" onClick={() => setShowGraveyard(true)}>
              墓地 ({sharedGraveyard.cardInstanceIds.length})
            </button>
            <button className="secondary small" onClick={() => setShowExile(true)}>
              追放 ({gameState.exile.length})
            </button>
            <button className="secondary small" onClick={() => setShowLibraryTop(true)}>
              ライブラリー ({sharedLibrary.cardInstanceIds.length})
            </button>
            <button className="primary small" onClick={() => {
              if (isLocal) {
                setShowDrawModal(true);
              } else {
                sendCommand({ type: "draw-card", playerId, count: 1 });
              }
            }}>
              ドロー
            </button>
          </div>
          <div style={{ flex: 1, minWidth: 0, height: "100%" }}>
            <StackView />
          </div>
        </div>

        {/* フェイズ / ターン / 優先権バー — スタックと自分の戦場の間 */}
        <PriorityControl isLocal={isLocal} />

        {/* 自分のエリア */}
        {(() => {
          const p1id = isLocal ? playerOrder[0] : playerId;
          const p1 = players[p1id];
          if (!p1) return null;
          return (
            <div>
              <div style={{ marginBottom: "6px" }}>
                <BattlefieldView playerId={p1id} label={isLocal ? `${p1.displayName}の戦場` : "自分の戦場"} />
              </div>
              <div style={{ marginBottom: "6px" }}>
                <HandView playerId={p1id} isOpponent={false} />
              </div>
              <PlayerInfo
                player={p1}
                isLocal={true}
                handCount={gameState.hands[p1id]?.length ?? 0}
                battlefieldCount={gameState.battlefield.filter(c => c.controllerPlayerId === p1id).length}
                isActive={gameState.activePlayerId === p1id}
                hasPriority={priority.holderPlayerId === p1id}
                mulliganPending={mulliganPending.includes(p1id)}
                onMulligan={() => sendCommand({ type: "mulligan", playerId: p1id })}
                onKeepHand={() => sendCommand({ type: "keep-hand", playerId: p1id })}
              />
            </div>
          );
        })()}
      </div>

      {/* モーダル */}
      {showDrawModal && isLocal && (
        <div className="modal-overlay" onClick={() => setShowDrawModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "320px" }}>
            <h2 style={{ marginBottom: "16px" }}>どちらがドローしますか？</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {playerOrder.map((pid) => (
                <button
                  key={pid}
                  className="primary"
                  onClick={() => {
                    sendCommand({ type: "draw-card", playerId: pid, count: 1 });
                    setShowDrawModal(false);
                  }}
                >
                  {players[pid]?.displayName ?? pid}
                </button>
              ))}
            </div>
            <button className="secondary" style={{ width: "100%", marginTop: "12px" }} onClick={() => setShowDrawModal(false)}>
              キャンセル
            </button>
          </div>
        </div>
      )}
      {showGraveyard && <SharedGraveyardView onClose={() => setShowGraveyard(false)} />}
      {showExile && <ExileView onClose={() => setShowExile(false)} />}
      {showLibraryTop && <LibraryModal onClose={() => setShowLibraryTop(false)} />}

      {/* イベントログ */}
      {showEventLog && (
        <div style={{ position: "fixed", right: "0", top: "0", bottom: "0", width: "300px", background: "var(--bg-secondary)", borderLeft: "1px solid var(--border)", padding: "12px", overflowY: "auto", zIndex: 500 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <h3 style={{ fontSize: "14px" }}>イベントログ</h3>
            <button className="secondary small" onClick={() => setShowEventLog(false)}>×</button>
          </div>
          {[...eventLog].reverse().map((e) => {
            const ev = e.event;
            const ZONE_LABEL: Record<string, string> = {
              "shared-library": "ライブラリー",
              "hand": "手札",
              "battlefield": "戦場",
              "shared-graveyard": "墓地",
              "exile": "追放",
              "stack": "スタック",
            };
            let detail = "";
            if (ev.type === "card-drawn") {
              const who = gameState.players[ev.playerId]?.displayName ?? ev.playerId;
              const ids = (ev.cardInstanceIds ?? []) as string[];
              detail = `${who} が ${ids.length}枚 ドローした`;
            } else if (ev.type === "library-top-revealed") {
              const who = gameState.players[ev.playerId]?.displayName ?? ev.playerId;
              const ids = (ev.cardInstanceIds ?? []) as string[];
              if (ev.private) {
                detail = `${who} がトップ ${ids.length} 枚を確認（非公開）`;
              } else {
                const names = ids
                  .map((id) => gameState.cardInstances[id]?.name ?? id)
                  .join(", ");
                detail = `${who} が公開: ${names}`;
              }
            } else if (ev.type === "library-shuffled") {
              const who = gameState.players[ev.playerId]?.displayName ?? ev.playerId;
              detail = `${who} がライブラリーをシャッフルした`;
            } else if (ev.type === "library-top-reordered") {
              const who = gameState.players[ev.playerId]?.displayName ?? ev.playerId;
              const ids = (ev.cardInstanceIds ?? []) as string[];
              detail = `${who} が ${ids.length}枚 トップに戻した`;
            } else if (ev.type === "land-played") {
              const who = gameState.players[ev.playerId]?.displayName ?? ev.playerId;
              const cardName = gameState.cardInstances[ev.cardInstanceId]?.name ?? ev.cardInstanceId;
              detail = `${who} が土地をプレイ: ${cardName}`;
            } else if (ev.type === "spell-cast") {
              const who = gameState.players[ev.playerId]?.displayName ?? ev.playerId;
              const cardName = gameState.cardInstances[ev.cardInstanceId]?.name ?? ev.cardInstanceId;
              detail = `${who} が呪文を唱えた: ${cardName}`;
            } else if (ev.type === "controller-set") {
              const who = gameState.players[ev.controllerPlayerId]?.displayName ?? ev.controllerPlayerId;
              const cardName = gameState.cardInstances[ev.cardInstanceId]?.name ?? ev.cardInstanceId;
              detail = `${who} が ${cardName} のコントロールを得た`;
            } else if (ev.type === "card-tapped") {
              const who = gameState.players[ev.playerId]?.displayName ?? ev.playerId;
              const cardName = gameState.cardInstances[ev.cardInstanceId]?.name ?? ev.cardInstanceId;
              detail = `${who}: ${cardName} を${ev.tapped ? "タップ" : "アンタップ"}`;
            } else if (ev.type === "stack-top-resolved") {
              const cardName = gameState.cardInstances[ev.cardInstanceId]?.name ?? ev.cardInstanceId;
              const dest = ev.destination === "battlefield" ? "戦場へ" : "墓地へ";
              detail = `${cardName} が解決された → ${dest}`;
            } else if (ev.type === "spell-countered") {
              const cardName = gameState.cardInstances[ev.cardInstanceId]?.name ?? ev.cardInstanceId;
              const dest = ev.toLibraryTop ? "ライブラリートップへ" : "墓地へ";
              detail = `${cardName} が打ち消された → ${dest}`;
            } else if (ev.type === "mulligan-declared") {
              const who = gameState.players[ev.playerId]?.displayName ?? ev.playerId;
              const returnedIds = (ev.returnedCardInstanceIds ?? []) as string[];
              const names = returnedIds
                .map((id) => gameState.cardInstances[id]?.name ?? id)
                .join(", ");
              detail = `${who} がマリガン: [${names}] を返した`;
            } else if (ev.type === "hand-kept") {
              const who = gameState.players[ev.playerId]?.displayName ?? ev.playerId;
              detail = `${who} が手札をキープした`;
            } else if (ev.type === "phase-set") {
              detail = `フェイズ → ${PHASE_LABELS[ev.phase]}`;
            } else if (ev.type === "turn-ended") {
              const who = gameState.players[ev.nextPlayerId]?.displayName ?? ev.nextPlayerId;
              detail = `ターン終了 → ${who} のターン`;
            } else if (ev.type === "extra-turn-started") {
              const who = gameState.players[ev.playerId]?.displayName ?? ev.playerId;
              detail = `${who} が追加ターンを得た`;
            } else if (ev.type === "card-moved") {
              const cardName = ev.revealed !== false
                ? (gameState.cardInstances[ev.cardInstanceId]?.name ?? ev.cardInstanceId)
                : "？（非公開）";
              const fromLabel = ZONE_LABEL[ev.from] ?? ev.from;
              const toLabel = ZONE_LABEL[ev.to] ?? ev.to;
              const posLabel = ev.position === "top" ? "（トップ）" : ev.position === "bottom" ? "（ボトム）" : "";
              const who = gameState.players[ev.playerId]?.displayName ?? ev.playerId;
              detail = `${who}: ${cardName} ${fromLabel} → ${toLabel}${posLabel}`;
            }
            return (
              <div key={e.seq} style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px", padding: "4px", background: "var(--bg-card)", borderRadius: "4px" }}>
                <span style={{ color: "var(--accent)" }}>#{e.seq}</span> {ev.type}
                {detail && <div style={{ color: "var(--text)", marginTop: "2px" }}>{detail}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
