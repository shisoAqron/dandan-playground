import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { setupLocalMatch } from "../store/matchStore";
import { useMatchStore } from "../store/matchStore";
import GameBoard from "../components/game/GameBoard";

export default function LocalGamePage() {
  const [player1Name, setPlayer1Name] = useState("Player 1");
  const [player2Name, setPlayer2Name] = useState("Player 2");
  const [started, setStarted] = useState(false);
  const navigate = useNavigate();
  const gameState = useMatchStore((s) => s.gameState);

  const handleStart = () => {
    setupLocalMatch(player1Name, player2Name);
    setStarted(true);
  };

  if (started && gameState) {
    return <GameBoard isLocal />;
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "24px", padding: "24px" }}>
      <h1 style={{ color: "var(--accent)" }}>ローカル対戦設定</h1>

      <div className="panel" style={{ width: "100%", maxWidth: "400px" }}>
        <div className="flex-col">
          <div>
            <label style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}>
              プレイヤー1の名前
            </label>
            <input
              value={player1Name}
              onChange={(e) => setPlayer1Name(e.target.value)}
              placeholder="Player 1"
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}>
              プレイヤー2の名前
            </label>
            <input
              value={player2Name}
              onChange={(e) => setPlayer2Name(e.target.value)}
              placeholder="Player 2"
            />
          </div>
          <button className="primary" onClick={handleStart}>
            ゲーム開始
          </button>
          <button className="secondary" onClick={() => navigate("/")}>
            戻る
          </button>
        </div>
      </div>
    </div>
  );
}
