import { useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMatchStore } from "../store/matchStore";
import { NativeWebRtcManualTransport } from "../transport/native-webrtc";
import { v4 as uuidv4 } from "uuid";
import { defaultMatchSettings } from "../types/game";

export default function JoinPage() {
  const [searchParams] = useSearchParams();
  const [playerName, setPlayerName] = useState("Guest");
  const [offerCode, setOfferCode] = useState(searchParams.get("offer") ?? "");
  const [answerCode, setAnswerCode] = useState("");
  const [step, setStep] = useState<"setup" | "answer" | "connected">("setup");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const transportRef = useRef<NativeWebRtcManualTransport | null>(null);

  const handleCreateAnswer = async () => {
    try {
      setLoading(true);
      setError("");
      const transport = new NativeWebRtcManualTransport();
      transportRef.current = transport;

      const code = await transport.createAnswer(offerCode.trim());
      setAnswerCode(code);
      setStep("answer");
      setLoading(false);

      // 接続確立を待つ
      transport.onStatusChange((status) => {
        if (status === "connected") {
          const storeState = useMatchStore.getState();
          const playerId = storeState.playerId;

          // ゲストのgameStateを最小限で初期化（applyEventがnullチェックで弾かれないように）
          useMatchStore.setState({
            role: "guest",
            opponentId: null, // ホストのhelloを受けてから更新する
            localPlayerName: playerName,
            gameState: {
              matchId: "pending",
              settings: defaultMatchSettings,
              players: { [playerId]: { playerId, displayName: playerName, life: defaultMatchSettings.startingLife, landsPlayedThisTurn: 0 } },
              playerOrder: [playerId],
              turnPlayerId: null,
              activePlayerId: null,
              phase: "precombat-main",
              priority: { holderPlayerId: null, consecutivePasses: 0, lastActionSeq: 0 },
              sharedLibrary: { cardInstanceIds: [] },
              sharedGraveyard: { cardInstanceIds: [] },
              battlefield: [],
              hands: { [playerId]: [] },
              exile: [],
              stack: [],
              cardInstances: {},
              revealedLibraryTop: [],
              mulliganPending: [],
              latestSeq: 0,
              connectionStatus: "connected",
            },
            eventLog: [],
            lastSeq: 0,
          });

          useMatchStore.getState().setTransport(transport);

          // setTransport後にtransportがすでにconnectedなので、helloを明示的に送信する
          transport.send({
            type: "hello",
            messageId: uuidv4(),
            clientId: useMatchStore.getState().clientId,
            playerId,
            displayName: playerName,
            lastSeq: 0,
            sentAt: Date.now(),
          });

          navigate("/game");
        }
      });
    } catch (e) {
      setError(String(e));
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "24px", padding: "24px" }}>
      <h1 style={{ color: "var(--accent)" }}>マッチに参加（ゲスト）</h1>

      {step === "setup" && (
        <div className="panel" style={{ width: "100%", maxWidth: "500px" }}>
          <div className="flex-col">
            <div>
              <label style={{ display: "block", marginBottom: "4px" }}>あなたの名前</label>
              <input value={playerName} onChange={(e) => setPlayerName(e.target.value)} />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "4px" }}>招待コード（DD1.xxxxx）</label>
              <textarea
                rows={4}
                value={offerCode}
                onChange={(e) => setOfferCode(e.target.value)}
                placeholder="ホストからの招待コードを貼り付けてください"
                style={{ fontSize: "11px", resize: "vertical" }}
              />
            </div>
            <button className="primary" onClick={handleCreateAnswer} disabled={!offerCode || loading}>
              {loading ? "生成中..." : "回答コードを生成する"}
            </button>
            <button className="secondary" onClick={() => navigate("/")}>戻る</button>
          </div>
        </div>
      )}

      {step === "answer" && (
        <div className="panel" style={{ width: "100%", maxWidth: "600px" }}>
          <div className="flex-col">
            <h2 style={{ color: "var(--accent)", fontSize: "1.1rem" }}>回答コードをホストへ送る</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
              以下のコードをホストに渡してください。ホストが入力すると接続が確立されます。
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              <input readOnly value={answerCode} style={{ fontSize: "11px" }} />
              <button className="secondary small" onClick={() => navigator.clipboard.writeText(answerCode)}>
                コピー
              </button>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
              ⏳ ホストの接続を待っています...
            </p>
          </div>
          {error && <p style={{ color: "var(--danger)", fontSize: "13px" }}>{error}</p>}
        </div>
      )}
    </div>
  );
}
