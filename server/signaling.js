const WebSocket = require('ws');

// Configuration
const PORT = 3000;
let wss = null;

// Store connected clients: map ID -> WebSocket
const clients = new Map();

function startSignalingServer() {
    try {
        wss = new WebSocket.Server({ port: PORT });

        console.log(`^2[mri_Qadmin] WebRTC Signaling Server started on port ${PORT}^7`);

        wss.on('connection', (ws) => {
            ws.isAlive = true;
            ws.on('pong', () => { ws.isAlive = true; });

            ws.on('message', (message) => {
                try {
                    const parsed = JSON.parse(message);
                    handleMessage(ws, parsed);
                } catch (e) {
                    console.error('^1[mri_Qadmin] Error parsing message:^7', e);
                }
            });

            ws.on('close', () => {
                if (ws.playerId) {
                    clients.delete(ws.playerId);
                    // Notify others?
                }
            });
        });

        // Keep-alive
        setInterval(() => {
            wss.clients.forEach((ws) => {
                if (ws.isAlive === false) return ws.terminate();
                ws.isAlive = false;
                ws.ping();
            });
        }, 30000);

    } catch (error) {
        console.error('^1[mri_Qadmin] Failed to start signaling server:^7', error);
    }
}

function handleMessage(ws, msg) {
    const { type, data, targetId, sourceId } = msg;

    // Register user
    if (type === 'register') {
        const playerId = String(msg.playerId);
        ws.playerId = playerId;
        clients.set(playerId, ws);
        console.log(`^3[mri_Qadmin] Client registered: ${playerId}^7`);
        return;
    }

    // Signaling
    if (type === 'offer' || type === 'answer' || type === 'candidate') {
        const targetWs = clients.get(String(targetId));
        if (targetWs && targetWs.readyState === WebSocket.OPEN) {
            console.log(`^3[mri_Qadmin] Relaying ${type} from ${sourceId} to ${targetId}^7`);
            targetWs.send(JSON.stringify({
                type: type,
                data: data,
                sourceId: sourceId,
                targetId: targetId
            }));
        } else {
            console.log(`^1[mri_Qadmin] Target ${targetId} not found or offline. (Available: ${Array.from(clients.keys()).join(',')})^7`);
            ws.send(JSON.stringify({ type: 'error', message: 'Target offline' }));
        }
    }
}

// Start immediately when resource starts
startSignalingServer();
