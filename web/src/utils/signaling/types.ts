
/** Messages exchanged between publisher and subscriber */
export type SignalMessage =
    | { type: 'register';  playerId: string }
    | { type: 'offer';     data: any; targetId: string; sourceId: string }
    | { type: 'answer';    data: any; targetId: string; sourceId: string }
    | { type: 'candidate'; data: any; targetId: string; sourceId: string }
    | { type: 'iceServers'; data: any[] }
    | { type: 'cf-track-ready'; sessionId: string; trackName: string; targetId: string; sourceId: string }
    | { type: 'error';     message: string };

export type SignalHandler = (msg: SignalMessage) => void;

/** Which backend to use — set in Config.lua → sent via NUI gameData */
export type ProviderType = 'websocket' | 'fivem-native' | 'cloudflare-sfu';

/** Common interface all signaling providers must satisfy */
export interface SignalingProvider {
    readonly type: ProviderType;
    connect(url: string | null, playerId: string): void;
    send(msg: SignalMessage): void;
    /** Subscribe to incoming messages. Returns an unsubscribe function. */
    onMessage(fn: SignalHandler): () => void;
    /** Fires `fn` immediately if already connected, otherwise queues it. */
    onConnect(fn: () => void): void;
    readonly connected: boolean;
}
