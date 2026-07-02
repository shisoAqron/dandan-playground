import type { Transport, WireMessage, ConnectionStatus, SignalPayload } from "../types/transport";
import { strToU8, strFromU8, deflateSync, inflateSync } from "fflate";

type MessageHandler = (message: WireMessage) => void;
type StatusHandler = (status: ConnectionStatus) => void;

const STUN_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export class NativeWebRtcManualTransport implements Transport {
  private pc: RTCPeerConnection | null = null;
  private channel: RTCDataChannel | null = null;
  private messageHandlers: MessageHandler[] = [];
  private statusHandlers: StatusHandler[] = [];
  private _status: ConnectionStatus = "idle";

  connect(): Promise<void> {
    return Promise.resolve();
  }

  disconnect(): void {
    this.channel?.close();
    this.pc?.close();
    this.pc = null;
    this.channel = null;
    this.setStatus("closed");
  }

  send(message: WireMessage): void {
    if (this.channel?.readyState === "open") {
      this.channel.send(JSON.stringify(message));
    }
  }

  onMessage(handler: MessageHandler): void {
    this.messageHandlers.push(handler);
  }

  onStatusChange(handler: StatusHandler): void {
    this.statusHandlers.push(handler);
  }

  get status(): ConnectionStatus {
    return this._status;
  }

  private setStatus(status: ConnectionStatus): void {
    this._status = status;
    for (const handler of this.statusHandlers) {
      handler(status);
    }
  }

  private setupConnectionHandlers(pc: RTCPeerConnection): void {
    pc.oniceconnectionstatechange = () => {
      switch (pc.iceConnectionState) {
        case "connected":
        case "completed":
          this.setStatus("connected");
          break;
        case "disconnected":
          this.setStatus("disconnected");
          break;
        case "failed":
          this.setStatus("failed");
          break;
        case "closed":
          this.setStatus("closed");
          break;
      }
    };
  }

  private setupChannelHandlers(channel: RTCDataChannel): void {
    channel.onopen = () => {
      this.setStatus("connected");
    };
    channel.onclose = () => {
      this.setStatus("closed");
    };
    channel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data as string) as WireMessage;
        for (const handler of this.messageHandlers) {
          handler(message);
        }
      } catch (e) {
        console.error("Failed to parse message", e);
      }
    };
  }

  /**
   * ホスト: Offer を生成して返す
   * ICE gathering 完了後のSDPを含む
   */
  async createOffer(): Promise<string> {
    this.setStatus("creating");
    const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
    this.pc = pc;
    this.setupConnectionHandlers(pc);

    const channel = pc.createDataChannel("game", { ordered: true });
    this.channel = channel;
    this.setupChannelHandlers(channel);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // ICE gathering 完了を待つ
    await waitForIceGathering(pc);

    const payload: SignalPayload = {
      v: 1,
      app: "dandan",
      kind: "offer",
      sdp: pc.localDescription!,
      createdAt: Date.now(),
    };
    this.setStatus("connecting");
    return encodeSignal(payload);
  }

  /**
   * ゲスト: Offer を受け取り Answer を生成して返す
   */
  async createAnswer(offerCode: string): Promise<string> {
    this.setStatus("creating");
    const payload = decodeSignal(offerCode);
    if (payload.kind !== "offer") {
      throw new Error("Expected offer signal");
    }

    const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
    this.pc = pc;
    this.setupConnectionHandlers(pc);

    pc.ondatachannel = (event) => {
      this.channel = event.channel;
      this.setupChannelHandlers(event.channel);
    };

    await pc.setRemoteDescription(payload.sdp);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    await waitForIceGathering(pc);

    const answerPayload: SignalPayload = {
      v: 1,
      app: "dandan",
      kind: "answer",
      sdp: pc.localDescription!,
      createdAt: Date.now(),
    };
    this.setStatus("connecting");
    return encodeSignal(answerPayload);
  }

  /**
   * ホスト: Answer を受け取って接続完了
   */
  async receiveAnswer(answerCode: string): Promise<void> {
    const payload = decodeSignal(answerCode);
    if (payload.kind !== "answer") {
      throw new Error("Expected answer signal");
    }
    if (!this.pc) throw new Error("No peer connection");
    await this.pc.setRemoteDescription(payload.sdp);
  }
}

async function waitForIceGathering(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === "complete") return;
  return new Promise((resolve) => {
    const onStateChange = () => {
      if (pc.iceGatheringState === "complete") {
        pc.removeEventListener("icegatheringstatechange", onStateChange);
        resolve();
      }
    };
    pc.addEventListener("icegatheringstatechange", onStateChange);
    // タイムアウト: 10秒
    setTimeout(() => {
      pc.removeEventListener("icegatheringstatechange", onStateChange);
      resolve();
    }, 10000);
  });
}

const SIGNAL_PREFIX = "DD1.";

function encodeSignal(payload: SignalPayload): string {
  const json = JSON.stringify(payload);
  const bytes = strToU8(json);
  const compressed = deflateSync(bytes);
  const b64 = btoa(String.fromCharCode(...compressed))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return SIGNAL_PREFIX + b64;
}

function decodeSignal(code: string): SignalPayload {
  if (!code.startsWith(SIGNAL_PREFIX)) {
    throw new Error("Invalid signal code format");
  }
  const b64 = code.slice(SIGNAL_PREFIX.length)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const decompressed = inflateSync(bytes);
  const json = strFromU8(decompressed);
  return JSON.parse(json) as SignalPayload;
}
