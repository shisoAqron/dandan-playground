import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useMatchStore } from "../store/matchStore";
import { NativeWebRtcManualTransport } from "../transport/native-webrtc";
import { v4 as uuidv4 } from "uuid";
import { createInitialGameState, applyGameEvent } from "../game/reducer";
import { defaultMatchSettings } from "../types/game";

export default function CreatePage() {
  const [playerName, setPlayerName] = useState("Host");
  const [offerCode, setOfferCode] = useState("");
  const [answerCode, setAnswerCode] = useState("");
  const [step, setStep] = useState<"setup" | "offer" | "waiting" | "connected">("setup");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const transportRef = useRef<NativeWebRtcManualTransport | null>(null);
  const matchIdRef = useRef<string>("");

  const handleCreateOffer = async () => {
    try {
      const transport = new NativeWebRtcManualTransport();
      transportRef.current = transport;

      const code = await transport.createOffer();
      setOfferCode(code);
      setStep("offer");
    } catch (e) {
      setError(String(e));
    }
  };

  const handleReceiveAnswer = async () => {
    try {
      if (!transportRef.current) return;
      await transportRef.current.receiveAnswer(answerCode.trim());

      const matchId = uuidv4();
      matchIdRef.current = matchId;
      const playerId = useMatchStore.getState().playerId;
      const mergedSettings = defaultMatchSettings;

      // ゲーム状態初期化（相手のplayerIdは後でhelloメッセージで取得）
      const opponentId = uuidv4(); // 仮ID
      let initialState = createInitialGameState(matchId, mergedSettings, playerId, opponentId);
      initialState = applyGameEvent(initialState, { type: "player-joined", playerId, displayName: playerName });

      useMatchStore.setState({
        matchId,
        role: "host",
        opponentId,
        localPlayerName: playerName,
        gameState: initialState,
        eventLog: [],
        lastSeq: 0,
      });

      useMatchStore.getState().setTransport(transportRef.current);

      setStep("connected");
      navigate("/game");
    } catch (e) {
      setError(String(e));
    }
  };

  const inviteLink = offerCode
    ? `${window.location.origin}${window.location.pathname}#/join?offer=${encodeURIComponent(offerCode)}`
    : "";

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "24px", padding: "24px" }}>
      <h1 style={{ color: "var(--accent)" }}>マッチを作成（ホスト）</h1>

      {step === "setup" && (
        <div className="panel" style={{ width: "100%", maxWidth: "500px" }}>
          <div className="flex-col">
            <div>
              <label style={{ display: "block", marginBottom: "4px" }}>あなたの名前</label>
              <input value={playerName} onChange={(e) => setPlayerName(e.target.value)} />
            </div>
            <button className="primary" onClick={handleCreateOffer}>
              招待コードを生成する
            </button>
            <button className="secondary" onClick={() => navigate("/")}>戻る</button>
          </div>
        </div>
      )}

      {step === "offer" && (
        <div className="panel" style={{ width: "100%", maxWidth: "600px" }}>
          <div className="flex-col">
            <h2 style={{ color: "var(--accent)", fontSize: "1.1rem" }}>Step 1: 招待リンクをゲストへ送る</h2>
            <div>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "13px" }}>招待リンク</label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input readOnly value={inviteLink} style={{ fontSize: "11px" }} />
                <button className="secondary small" onClick={() => navigator.clipboard.writeText(inviteLink)}>
                  コピー
                </button>
              </div>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "13px" }}>または招待コード</label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input readOnly value={offerCode} style={{ fontSize: "11px" }} />
                <button className="secondary small" onClick={() => navigator.clipboard.writeText(offerCode)}>
                  コピー
                </button>
              </div>
            </div>

            <h2 style={{ color: "var(--accent)", fontSize: "1.1rem", marginTop: "16px" }}>Step 2: ゲストの回答コードを入力する</h2>
            <textarea
              rows={4}
              value={answerCode}
              onChange={(e) => setAnswerCode(e.target.value)}
              placeholder="ゲストからの回答コード（DD1.xxxxx）を貼り付けてください"
              style={{ fontSize: "11px", resize: "vertical" }}
            />
            <button className="primary" onClick={handleReceiveAnswer} disabled={!answerCode}>
              接続する
            </button>
          </div>
          {error && <p style={{ color: "var(--danger)", marginTop: "8px", fontSize: "13px" }}>{error}</p>}
        </div>
      )}
    </div>
  );
}
