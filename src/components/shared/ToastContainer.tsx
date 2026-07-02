import { useState, useEffect, useCallback } from "react";

export type Toast = {
  id: number;
  message: string;
};

let _nextId = 1;
let _dispatch: ((msg: string) => void) | null = null;

/** GameBoard 外からトーストを発火するための関数（シングルトン） */
export function showToast(message: string) {
  _dispatch?.(message);
}

/** useToasts フックで管理するトーストリスト */
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const add = useCallback((message: string) => {
    const id = _nextId++;
    setToasts((prev) => [...prev, { id, message }]);
    // 5秒後に自動削除
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // グローバルdispatchを登録
  useEffect(() => {
    _dispatch = add;
    return () => {
      _dispatch = null;
    };
  }, [add]);

  return { toasts, remove };
}

/** 画面上部に固定表示するトースト一覧 */
export default function ToastContainer() {
  const { toasts, remove } = useToasts();

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "12px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        alignItems: "center",
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            pointerEvents: "auto",
            background: "rgba(20,24,32,0.95)",
            border: "1px solid var(--accent)",
            borderRadius: "8px",
            padding: "8px 14px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "13px",
            color: "var(--text)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
            maxWidth: "480px",
            animation: "toastIn 0.2s ease",
          }}
        >
          <span style={{ flex: 1 }}>{t.message}</span>
          <button
            onClick={() => remove(t.id)}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "0 2px",
              fontSize: "14px",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      ))}
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
