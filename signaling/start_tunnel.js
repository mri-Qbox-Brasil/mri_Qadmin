const localtunnel = require('localtunnel');

(async () => {
    console.log('Starting LocalTunnel on port 3000...');
    const tunnel = await localtunnel({ port: 3000 });

    console.log('---------------------------------------------------');
    console.log('✅ TUNNEL RUNNING!');
    console.log('---------------------------------------------------');
    console.log('Public URL:', tunnel.url);
    console.log('---------------------------------------------------');
    console.log('Please copy the URL above (replace https:// with wss://)');
    console.log('and update Config.WebRTCUrl in shared/config.lua');
    console.log('---------------------------------------------------');

    tunnel.on('close', () => {
        console.log('Tunnel closed');
    });
})();
