
type SignalingMessage =
  | { type: 'register', playerId: string }
  | { type: 'offer', data: any, targetId: string, sourceId: string }
  | { type: 'answer', data: any, targetId: string, sourceId: string }
  | { type: 'candidate', data: any, targetId: string, sourceId: string }
  | { type: 'iceServers', data: any[] }
  | { type: 'error', message: string };

type Handler = (msg: SignalingMessage) => void;

class SignalingService {
    private ws: WebSocket | null = null;
    private handlers: Handler[] = [];
    private url: string = 'wss://localhost:3000'; // Default
    private playerId: string | null = null;
    private queue: SignalingMessage[] = [];
    private connectCallbacks: Array<() => void> = [];
    private isConnected: boolean = false;

    init(url: string, playerId: string) {
        // Force WSS if on HTTPS page (which FiveM NUI is)
        if (url.startsWith('ws://')) {
            this.url = url.replace('ws://', 'wss://');
            console.log('[WebRTC] Upgrading to WSS for Mixed Content compliance:', this.url);
        } else {
            this.url = url;
        }

        this.playerId = playerId;
        this.connect();
    }

    private connect() {
        if (this.ws) return;

        console.log('[WebRTC] Connecting to Signaling:', this.url);
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
            console.log('[WebRTC] Connected.');
            this.isConnected = true;
            this.send({ type: 'register', playerId: this.playerId! });

            // Flush send queue
            while (this.queue.length > 0) {
                const msg = this.queue.shift();
                if (msg) this.send(msg);
            }

            // Fire and flush connect callbacks
            const cbs = this.connectCallbacks.splice(0);
            cbs.forEach(cb => cb());
        };

        this.ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                this.handlers.forEach(h => h(msg));
            } catch (e) {
                console.error('Signaling parse error', e);
            }
        };

        this.ws.onclose = () => {
             console.log('[WebRTC] Disconnected. Reconnecting in 5s...');
             this.isConnected = false;
             this.ws = null;
             setTimeout(() => this.connect(), 5000);
        };

        this.ws.onerror = (err) => {
            console.error('[WebRTC] Socket Error (Cert accepted?):', err);
        };
    }

    send(msg: SignalingMessage) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(msg));
        } else {
            // console.log('[WebRTC] Queueing:', msg.type)
            this.queue.push(msg);
        }
    }

    /** Fires `cb` immediately if already connected, otherwise queues it for next connection. */
    onConnect(cb: () => void) {
        if (this.isConnected) {
            cb();
        } else {
            this.connectCallbacks.push(cb);
        }
    }

    onMessage(handler: Handler) {
        this.handlers.push(handler);
        return () => {
            this.handlers = this.handlers.filter(h => h !== handler);
        };
    }
}

export const signaling = new SignalingService();
