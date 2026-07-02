import { useNavigate } from "react-router-dom";
import { useMatchStore } from "../store/matchStore";

export default function TopPage() {
  const navigate = useNavigate();
  const loadPersistedMatch = useMatchStore((s) => s.loadPersistedMatch);

  const handleResumeGame = () => {
    if (loadPersistedMatch()) {
      navigate("/game");
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "32px", padding: "24px" }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: "3rem", fontWeight: "bold", color: "var(--accent)", marginBottom: "8px" }}>
          Dandân Playground
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "1rem" }}>
          Forgetful Fish — オンライン2人対戦
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%", maxWidth: "300px" }}>
        <button className="primary" style={{ padding: "14px", fontSize: "16px" }} onClick={() => navigate("/local")}>
          ローカル対戦（同じブラウザ）
        </button>
        <button className="primary" style={{ padding: "14px", fontSize: "16px" }} onClick={() => navigate("/create")}>
          マッチを作成（ホスト）
        </button>
        <button className="secondary" style={{ padding: "14px", fontSize: "16px" }} onClick={() => navigate("/join")}>
          マッチに参加（ゲスト）
        </button>
        <button className="secondary" style={{ padding: "14px", fontSize: "16px" }} onClick={handleResumeGame}>
          前回のゲームを再開 <span style={{ fontSize: "11px", color: "var(--warning)", marginLeft: "4px" }}>(β)</span>
        </button>
      </div>

      <div style={{ textAlign: "center", maxWidth: "500px" }}>
        <p style={{ color: "var(--text-muted)", fontSize: "12px", lineHeight: "1.6" }}>
          ⚠️ WebRTC接続はSTUNのみ使用します。<br />
          ネットワーク環境によっては接続できない場合があります。
        </p>
      </div>

      <footer style={{ position: "fixed", bottom: "16px", left: "0", right: "0", textAlign: "center" }}>
        <p style={{ color: "var(--text-muted)", fontSize: "11px", lineHeight: "1.6" }}>
          This is unofficial Fan Content permitted under the Fan Content Policy.<br />
          Not approved/endorsed by Wizards.<br />
          Portions of the materials used are property of Wizards of the Coast.<br />
          © Wizards of the Coast LLC.
        </p>
      </footer>
    </div>
  );
}
