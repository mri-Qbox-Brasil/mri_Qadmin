import type { SignalingProvider, SignalMessage, SignalHandler } from './types';

/**
 * WebSocket-based signaling provider.
 * Connects to an external WS server (e.g. ws.gf2.in or a local Node server).
 */
export class WebSocketProvider implements SignalingProvider {
    readonly type = 'websocket' as const;

    private ws: WebSocket | null = null;
    private url: string = 'wss://ws.gf2.in';
    private playerId: string | null = null;
    private handlers: SignalHandler[] = [];
    private queue: SignalMessage[] = [];
    private connectCallbacks: Array<() => void> = [];
    private _connected = false;

    get connected() { return this._connected; }

    connect(url: string | null, playerId: string) {
        // Force WSS — FiveM NUI pages are served over HTTPS
        const raw = url || 'wss://ws.gf2.in';
        this.url = raw.startsWith('ws://') ? raw.replace('ws://', 'wss://') : raw;
        this.playerId = playerId;
        this._open();
    }

    private _open() {
        if (this.ws) return;
        console.log('[Signaling/WS] Connecting to', this.url);
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
            console.log('[Signaling/WS] Connected.');
            this._connected = true;
            this.send({ type: 'register', playerId: this.playerId! });
            // Flush queued messages
            while (this.queue.length > 0) { const m = this.queue.shift(); if (m) this.send(m); }
            // Fire queued connect callbacks
            this.connectCallbacks.splice(0).forEach(cb => cb());
        };

        this.ws.onmessage = (e) => {
            try { const msg = JSON.parse(e.data); this.handlers.forEach(h => h(msg)); }
            catch (err) { console.error('[Signaling/WS] Parse error', err); }
        };

        this.ws.onclose = () => {
            console.log('[Signaling/WS] Disconnected — reconnecting in 5s...');
            this._connected = false;
            this.ws = null;
            setTimeout(() => this._open(), 5000);
        };

        this.ws.onerror = (err) => {
            console.error('[Signaling/WS] Error (cert accepted?):', err);
        };
    }

    send(msg: SignalMessage) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(msg));
        } else {
            this.queue.push(msg);
        }
    }

    onConnect(fn: () => void) {
        if (this._connected) fn(); else this.connectCallbacks.push(fn);
    }

    onMessage(fn: SignalHandler): () => void {
        this.handlers.push(fn);
        return () => { this.handlers = this.handlers.filter(h => h !== fn); };
    }
}
