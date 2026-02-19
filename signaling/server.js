const http = require('http');
const https = require('https');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const USE_TLS = process.env.USE_TLS === 'true';

let server;

if (USE_TLS) {
    const keyPath = path.join(__dirname, 'key.pem');
    const certPath = path.join(__dirname, 'cert.pem');

    if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
        console.error('[Signaling] TLS enabled but cert files not found.');
        process.exit(1);
    }

    server = https.createServer({
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
    }, handler);

    console.log('[Signaling] Starting in HTTPS/WSS mode');

} else {
    server = http.createServer(handler);
    console.log('[Signaling] Starting in HTTP/WS mode');
}

function handler(req, res) {
    res.writeHead(200);
    res.end('WebRTC Signaling Server');
}

const clients = new Map();
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    ws.isAlive = true;

    ws.on('pong', () => ws.isAlive = true);

    ws.on('message', (message) => {
        try {
            const parsed = JSON.parse(message);
            handleMessage(ws, parsed);
        } catch (e) {
            console.error('[Signaling] Parse error:', e);
        }
    });

    ws.on('close', () => {
        if (ws.playerId) clients.delete(ws.playerId);
    });
});

function handleMessage(ws, msg) {
    const { type, data, targetId, sourceId } = msg;

    if (type === 'register') {
        ws.playerId = String(msg.playerId);
        clients.set(ws.playerId, ws);
        return;
    }

    if (['offer', 'answer', 'candidate'].includes(type)) {
        const targetWs = clients.get(String(targetId));
        if (targetWs?.readyState === WebSocket.OPEN) {
            targetWs.send(JSON.stringify({ type, data, sourceId, targetId }));
        }
    }
}

setInterval(() => {
    wss.clients.forEach((ws) => {
        if (!ws.isAlive) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Signaling] Listening on ${USE_TLS ? 'HTTPS/WSS' : 'HTTP/WS'} port ${PORT}`);
});
