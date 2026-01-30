
type SignalingMessage =
  | { type: 'register', playerId: string }
  | { type: 'offer', data: any, targetId: string, sourceId: string }
  | { type: 'answer', data: any, targetId: string, sourceId: string }
  | { type: 'candidate', data: any, targetId: string, sourceId: string }
  | { type: 'error', message: string };

type Handler = (msg: SignalingMessage) => void;

class SignalingService {
    private ws: WebSocket | null = null;
    private handlers: Handler[] = [];
    private url: string = 'ws://localhost:3000';
    private playerId: string | null = null;

    private queue: SignalingMessage[] = [];

    init(url: string, playerId: string) {
        this.url = url;
        this.playerId = playerId;
        this.connect();
    }

    private connect() {
        if (this.ws) return;

        console.log('[WebRTC] Connecting to Signaling Server:', this.url);
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
            console.log('[WebRTC] Connected to Signaling.');
            this.send({ type: 'register', playerId: this.playerId! });

            // Flush Queue
            while (this.queue.length > 0) {
                const msg = this.queue.shift();
                if (msg) this.send(msg);
            }
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
             this.ws = null;
             setTimeout(() => this.connect(), 5000);
        };
    }

    send(msg: SignalingMessage) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(msg));
        } else {
            console.log('[WebRTC] Socket not open, queuing message:', msg.type);
            this.queue.push(msg);
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
