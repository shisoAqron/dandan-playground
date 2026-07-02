import type { Transport, WireMessage, ConnectionStatus } from "../types/transport";

type MessageHandler = (message: WireMessage) => void;
type StatusHandler = (status: ConnectionStatus) => void;

/**
 * ローカル2人対戦用のモックTransport
 * 同一ブラウザ内でホスト/ゲストの2つのTransportを接続する
 */
export class MockTransport implements Transport {
  private messageHandlers: MessageHandler[] = [];
  private statusHandlers: StatusHandler[] = [];
  private peer: MockTransport | null = null;
  private _status: ConnectionStatus = "idle";

  connect(): Promise<void> {
    this.setStatus("connected");
    return Promise.resolve();
  }

  disconnect(): void {
    this.setStatus("closed");
  }

  send(message: WireMessage): void {
    if (!this.peer) return;
    // 非同期で相手に届ける（マイクロタスクキュー経由）
    Promise.resolve().then(() => {
      this.peer?.receive(message);
    });
  }

  onMessage(handler: MessageHandler): void {
    this.messageHandlers.push(handler);
  }

  onStatusChange(handler: StatusHandler): void {
    this.statusHandlers.push(handler);
  }

  receive(message: WireMessage): void {
    for (const handler of this.messageHandlers) {
      handler(message);
    }
  }

  private setStatus(status: ConnectionStatus): void {
    this._status = status;
    for (const handler of this.statusHandlers) {
      handler(status);
    }
  }

  get status(): ConnectionStatus {
    return this._status;
  }

  /**
   * 2つのMockTransportを接続する
   */
  static createPair(): [MockTransport, MockTransport] {
    const t1 = new MockTransport();
    const t2 = new MockTransport();
    t1.peer = t2;
    t2.peer = t1;
    return [t1, t2];
  }
}
