/**
 * Signaling provider factory.
 *
 * The active provider is selected by the `signalingProvider` field in
 * `gameData` (forwarded from `Config.SignalingProvider` in config.lua).
 *
 * All consumers import from `@/utils/signaling` — this file is the
 * drop-in replacement for the old singleton `signaling.ts`.
 */
import { WebSocketProvider }   from './websocket';
import { FiveMNativeProvider } from './fivem-native';

export type { SignalMessage, SignalingProvider, ProviderType } from './types';

// ─── Singleton instance (initialized lazily by `signaling.init()`) ───────────
let _provider: WebSocketProvider | FiveMNativeProvider = new WebSocketProvider();

/**
 * Thin proxy that mirrors the old SignalingService API so existing code
 * (ScreenModal, WebRTCStreamer, LiveScreensPage) needs zero changes.
 */
export const signaling = {
    /** Call once to configure the active backend. Idempotent per provider type. */
    init(url: string | null, playerId: string, providerType: 'websocket' | 'fivem-native' | 'cloudflare-sfu' = 'websocket') {
        // CF SFU uses FiveM-native signaling just for exchanging track metadata
        const signalingType = providerType === 'cloudflare-sfu' ? 'fivem-native' : providerType;

        // Re-create the provider only if the underlying signaling type changed
        if (_provider.type !== signalingType) {
            _provider = signalingType === 'fivem-native'
                ? new FiveMNativeProvider()
                : new WebSocketProvider();
            console.log('[Signaling] Switched to provider:', signalingType, '(streaming:', providerType, ')');
        }
        _provider.connect(url, playerId);
    },

    send:      (msg: import('./types').SignalMessage)                   => _provider.send(msg),
    onMessage: (fn: import('./types').SignalHandler): (() => void)      => _provider.onMessage(fn),
    onConnect: (fn: () => void)                                         => _provider.onConnect(fn),

    get connected() { return _provider.connected; },
    get type()      { return _provider.type; },
};
