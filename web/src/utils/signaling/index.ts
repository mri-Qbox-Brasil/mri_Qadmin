/**
 * Signaling provider factory.
 *
 * The active provider is selected by the `signalingProvider` field in
 * `gameData` (forwarded from `Config.SignalingProvider` in config.lua).
 *
 * All consumers import from `@/utils/signaling` — this file is the
 * drop-in replacement for the old singleton `signaling.ts`.
 */
import { WebSocketProvider } from './websocket';
import { FiveMNativeProvider } from './fivem-native';
import type { SignalingProvider, ProviderType } from './types';

export type { SignalMessage, SignalingProvider, ProviderType } from './types';

// ─── Provider Registry (keeps instances alive to preserve handlers/state) ──────
const _instances: Record<string, SignalingProvider> = {
    'websocket': new WebSocketProvider(),
    'fivem-native': new FiveMNativeProvider(),
};

/**
 * Thin proxy that mirrors the old SignalingService API so existing code
 * needs zero changes.
 */
export const signaling = {
    /** The currently active provider instance */
    _active: _instances['websocket'] as SignalingProvider,

    /** Call once to configure the active backend. Idempotent per provider type. */
    init(url: string | null, playerId: string, providerType: ProviderType = 'websocket') {
        const signalingType = providerType === 'cloudflare-sfu' ? 'fivem-native' : providerType;

        // Switch active provider if necessary
        if (this._active.type !== signalingType) {
            this._active = _instances[signalingType] || _instances['websocket'];
            console.log('[Signaling] Switched to provider:', signalingType, '(streaming:', providerType, ')');
        }

        // Always call connect on the active provider (idempotent for FiveM native)
        this._active.connect(url, playerId);
    },

    send: (msg: import('./types').SignalMessage) => signaling._active.send(msg),
    onMessage: (fn: import('./types').SignalHandler): (() => void) => signaling._active.onMessage(fn),
    onConnect: (fn: () => void) => signaling._active.onConnect(fn),
    disconnect: () => signaling._active.disconnect(),

    get connected() { return signaling._active.connected; },
    get type() { return signaling._active.type; },
    get isConnected() { return () => signaling._active.connected; } // Compat for UI kit calls
};
