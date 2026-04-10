import type { SignalingProvider, SignalMessage, SignalHandler } from './types';

/**
 * FiveM Native signaling provider.
 *
 * Uses FiveM's own event relay instead of an external WebSocket server:
 *   SEND:    NUI → fetch → client Lua → TriggerServerEvent → server Lua
 *            → TriggerClientEvent(targetId) → SendNUIMessage → window.message
 *   RECEIVE: window.addEventListener('message') filtering action === 'Signal'
 *
 * Zero external dependencies — works offline/LAN.
 */
export class FiveMNativeProvider implements SignalingProvider {
    readonly type = 'fivem-native' as const;

    private playerId: string | null = null;
    private handlers: SignalHandler[] = [];
    private registerTimeout: any = null;
    private connectCallbacks: Array<() => void> = [];
    private _connected = false;
    private _listener: ((e: MessageEvent) => void) | null = null;
    private _refCount = 0;

    get connected() { return this._connected; }

    disconnect() {
        this._refCount = Math.max(0, this._refCount - 1);
        console.log('[Signaling/Native] Disconnect request. Remaining clients:', this._refCount);

        if (this._refCount > 0) return;

        if (this.registerTimeout) {
            clearTimeout(this.registerTimeout);
            this.registerTimeout = null;
        }
        if (this._listener) {
            window.removeEventListener('message', this._listener);
            this._listener = null;
        }
        this._connected = false;
        console.log('[Signaling/Native] Final listener removed.');
    }

    connect(_url: string | null, playerId: string) {
        const isNewPlayer = this.playerId !== playerId;
        this.playerId = playerId;
        this._refCount++;
        console.log('[Signaling/Native] Connect request for', playerId, 'Total clients:', this._refCount);

        if (this._listener && !isNewPlayer && this._connected) return; // Already setup and registered

        // Every message from Lua arrives as a window message with action='Signal'
        this._listener = (e: MessageEvent) => {
            try {
                const { action, data } = e.data || {};
                if (action !== 'Signal') return;
                console.log(`[Signaling/Native] Signal arrived — type:${data?.type} src:${data?.sourceId} handlers:${this.handlers.length}`);
                this.handlers.forEach(h => h(data as SignalMessage));
            } catch (err) {
                console.error('[Signaling/Native] Message parse error:', err);
            }
        };
        window.addEventListener('message', this._listener);

        // Register our player ID with Lua so the relay knows who we are.
        // We treat the initial NUI call success as "connected".
        this._register();
    }

    private _register() {
        this._fetchNui('SignalRegister', { playerId: this.playerId })
            .then(() => {
                console.log('[Signaling/Native] Registered as', this.playerId);
                this._connected = true;
                this.connectCallbacks.splice(0).forEach(cb => cb());
            })
            .catch(err => {
                console.error('[Signaling/Native] Register failed — retrying in 3s', err);
                this.registerTimeout = setTimeout(() => this._register(), 3000);
            });
    }

    send(msg: SignalMessage) {
        console.log(`[Signaling/Native] 📤 SEND: type=${msg.type} target=${(msg as any).targetId || 'N/A'}`);
        // Fire-and-forget NUI fetch — Lua relays to the correct target
        this._fetchNui('Signal', msg).catch(err =>
            console.error('[Signaling/Native] send error:', err)
        );
    }

    onConnect(fn: () => void) {
        if (this._connected) fn(); else this.connectCallbacks.push(fn);
    }

    onMessage(fn: SignalHandler): () => void {
        this.handlers.push(fn);
        return () => { this.handlers = this.handlers.filter(h => h !== fn); };
    }

    /** Minimal NUI fetch — mirrors NuiContext.sendNui without React dependency */
    private _fetchNui(event: string, data: unknown): Promise<any> {
        const win = window as any;
        const resourceName = win.GetParentResourceName?.() ?? win.__psResourceName ?? 'mri_Qadmin';
        return fetch(`https://${resourceName}/${event}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=UTF-8' },
            body: JSON.stringify(data),
        }).then(r => r.json());
    }
}
