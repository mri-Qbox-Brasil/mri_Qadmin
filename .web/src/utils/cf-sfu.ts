/**
 * Cloudflare Realtime SFU helpers.
 *
 * All CF API calls are proxied through the FiveM server (Lua → PerformHttpRequest)
 * so the App Secret never reaches the browser/NUI.
 *
 * Publisher (P2 — FiveM client being watched):
 *   publishToCF(stream) → { pc, sessionId, trackName }
 *
 * Subscriber (P1 — admin browser):
 *   subscribeFromCF(publisherSessionId, trackName) → { pc, stream }
 */

/** Minimal NUI fetch without React context */
async function _nui<T = any>(event: string, data: unknown = {}): Promise<T> {
    const win = window as any;
    const res = win.GetParentResourceName?.() ?? win.__psResourceName ?? 'mri_Qadmin';
    const r = await fetch(`https://${res}/${event}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify(data),
    });
    if (!r.ok) throw new Error(`NUI ${event} → HTTP ${r.status}`);
    return r.json();
}

/** Wait until ICE gathering completes (max 3 s). */
function _waitIce(pc: RTCPeerConnection): Promise<void> {
    return new Promise<void>((resolve) => {
        if (pc.iceGatheringState === 'complete') { resolve(); return; }
        const h = () => { if (pc.iceGatheringState === 'complete') { pc.removeEventListener('icegatheringstatechange', h); resolve(); } };
        pc.addEventListener('icegatheringstatechange', h);
        setTimeout(resolve, 3000);
    });
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface CFSession {
    sessionId: string;
    iceServers?: RTCIceServer[];
    error?: string;
}

interface CFPublishResult {
    sessionDescription: RTCSessionDescriptionInit;
    tracks: Array<{ mid: string; trackName: string }>;
    error?: string;
}

interface CFSubscribeResult {
    requiresImmediateRenegotiation: boolean;
    sessionDescription: RTCSessionDescriptionInit;
    tracks: Array<{ mid: string; sessionId: string; trackName: string }>;
    error?: string;
}

// ─── Publisher ────────────────────────────────────────────────────────────────
export async function publishToCF(stream: MediaStream): Promise<{
    pc: RTCPeerConnection;
    sessionId: string;
    trackName: string;
}> {
    console.log('[CF SFU] Starting publish...');

    // 1. Create CF session (server proxies the API call)
    const session = await _nui<CFSession>('CFCreateSession');
    if (!session || session.error || !session.sessionId) throw new Error('[CF SFU] CFCreateSession: ' + (session?.error ?? 'null response — check server console for CF API logs'));

    const iceServers = session.iceServers ?? [{ urls: 'stun:stun.cloudflare.com:3478' }];
    const pc = new RTCPeerConnection({ iceServers });
    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    // 2. Offer + ICE gathering
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await _waitIce(pc);

    // 3. Publish tracks via server → CF API
    const trackName = 'screen';
    const pub = await _nui<CFPublishResult>('CFPublishTracks', {
        sessionId: session.sessionId,
        offer: { type: pc.localDescription!.type, sdp: pc.localDescription!.sdp },
    });
    if (pub.error || !pub.sessionDescription) throw new Error('[CF SFU] CFPublishTracks: ' + pub.error);

    // 4. Apply CF's answer
    await pc.setRemoteDescription(new RTCSessionDescription(pub.sessionDescription));
    console.log('[CF SFU] Published. sessionId:', session.sessionId, 'trackName:', trackName);

    return { pc, sessionId: session.sessionId, trackName };
}

// ─── Subscriber ───────────────────────────────────────────────────────────────
export async function subscribeFromCF(publisherSessionId: string, trackName: string): Promise<{
    pc: RTCPeerConnection;
    stream: MediaStream;
}> {
    console.log('[CF SFU] Subscribing to', publisherSessionId, '/', trackName);

    // 1. Create subscriber session
    const session = await _nui<CFSession>('CFCreateSession');
    if (session.error || !session.sessionId) throw new Error('[CF SFU] CFCreateSession: ' + session.error);

    const iceServers = session.iceServers ?? [{ urls: 'stun:stun.cloudflare.com:3478' }];
    const pc = new RTCPeerConnection({ iceServers });
    const stream = new MediaStream();
    pc.ontrack = (e) => { if (e.track) stream.addTrack(e.track); };

    // 2. Subscribe — server → CF API sends an offer back
    const sub = await _nui<CFSubscribeResult>('CFSubscribe', {
        mySessionId: session.sessionId,
        publisherSessionId,
        trackName,
    });
    if (sub.error || !sub.sessionDescription) throw new Error('[CF SFU] CFSubscribe: ' + sub.error);

    // 3. Set CF's offer as remote desc
    await pc.setRemoteDescription(new RTCSessionDescription(sub.sessionDescription));

    // 4. Create & set answer
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    // 5. Renegotiate — send our answer to CF
    await _nui('CFRenegotiate', {
        sessionId: session.sessionId,
        answer: { type: pc.localDescription!.type, sdp: pc.localDescription!.sdp },
    });

    console.log('[CF SFU] Subscribed. Stream tracks:', stream.getTracks().length);
    return { pc, stream };
}
