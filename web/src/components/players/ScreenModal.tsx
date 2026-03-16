import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
    MriModal,
    MriPlayerScreenStream,
    MriPlayerVitals,
    MriVitalAdjustModal
} from '@mriqbox/ui-kit';
import { useNui } from '@/context/NuiContext';
import { useAppState } from '@/context/AppState';
import { useI18n } from '@/hooks/useI18n';
import { Camera, Maximize2, Minimize2, RefreshCw, Wifi, Keyboard } from 'lucide-react';
import { isEnvBrowser } from '@/utils/misc';
import { signaling } from '@/utils/signaling';
import { subscribeFromCF } from '@/utils/cf-sfu';
import { cn } from '@/lib/utils';

interface ScreenModalProps {
    playerId: number | null
    onClose: () => void
    playerName?: string
}

interface Vitals {
    health: number   // 0-200 (FiveM entity health)
    armor: number   // 0-100
    ping: number   // ms
    metadata: {
        hunger?: number   // 0-100
        thirst?: number   // 0-100
        stress?: number   // 0-100
        [key: string]: any
    }
}

// ─── Badge ───────────────────────────────────────────────────────────────────
function Badge({ children, color }: { children: React.ReactNode, color: string }) {
    return (
        <div className={cn("flex items-center gap-1 text-xs font-mono px-2 py-1 rounded border", color)}>
            {children}
        </div>
    );
}

export default function ScreenModal({ playerId, onClose, playerName }: ScreenModalProps) {
    const { sendNui, on, off } = useNui();
    const { settings, gameData } = useAppState();
    const { t } = useI18n();
    const [fps, setFps] = useState<number | null>(null);
    const [vitals, setVitals] = useState<Vitals | null>(null);
    const [showVital, setShowVital] = useState<{ vital: 'health' | 'armor' | 'hunger' | 'thirst' | 'stress', label: string, value: number } | null>(null);
    const [isMaximized, setIsMaximized] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [showKeyboard, setShowKeyboard] = useState(false);

    const isMock = isEnvBrowser();

    // ── Vitals polling ──────────────────────────────────────────────────────
    const fetchVitals = useCallback(() => {
        if (!playerId) return;
        sendNui('GetPlayerVitals', { targetId: playerId }).then((v: any) => {
            if (v && !v.error) {
                // Normalize for MriPlayerVitals component
                setVitals({
                    ...v,
                    health: Math.max(0, Math.min(100, (v.health || 100) - 100)),
                    hunger: v.metadata?.hunger,
                    thirst: v.metadata?.thirst,
                    stress: v.metadata?.stress,
                });
            }
        }).catch(() => { });
    }, [playerId, sendNui]);

    const selfIdRef = useRef((gameData as any)?.selfId);
    const targetIdRef = useRef(playerId);

    const selfIdFromState = (gameData as any)?.selfId;
    useEffect(() => { selfIdRef.current = selfIdFromState }, [selfIdFromState]);
    useEffect(() => { targetIdRef.current = playerId }, [playerId]);

    // Initialize signaling for the viewer role
    useEffect(() => {
        if (!selfIdRef.current) return;
        const url = settings?.WebRTCUrl || gameData.webrtcUrl || null;
        const provider = (settings?.SignalingProvider || gameData.signalingProvider || 'websocket') as any;
        signaling.init(url, String(selfIdRef.current), provider);
    }, [gameData.webrtcUrl, gameData.signalingProvider, settings?.WebRTCUrl, settings?.SignalingProvider]);

    const startingRef = useRef(false);

    const wrappedSendNui = useCallback((event: string, data: any) => {
        if ((event === 'GetPlayerScreen' || event === 'StopPlayerScreen') && !data.viewerId) {
            const target = data.targetId || targetIdRef.current || 'unknown';
            data.viewerId = `modal-${selfIdRef.current || 'unknown'}-${target}`;
        }
        return sendNui(event, data);
    }, [sendNui]);

    const startStream = useCallback(() => {
        if (!playerId || startingRef.current) return;
        startingRef.current = true;
        wrappedSendNui('GetPlayerScreen', { targetId: playerId }).catch(() => {
            startingRef.current = false;
        });
    }, [playerId, wrappedSendNui]);

    useEffect(() => {
        if (!playerId) return;
        fetchVitals();
        startStream();
        const id = setInterval(fetchVitals, 3000);
        return () => {
            clearInterval(id);
            wrappedSendNui('StopPlayerScreen', { targetId: playerId }).catch(() => { });
            startingRef.current = false;
        };
    }, [playerId, fetchVitals, startStream, wrappedSendNui]);

    // ── Derived values ──────────────────────────────────────────────
    const ping = vitals ? vitals.ping : null;
    const isDead = vitals ? vitals.health < 101 : false;

    const fpsBadgeColor = fps === null ? '' :
        fps >= 30 ? 'text-green-400 border-green-500/30 bg-green-500/10' :
            fps >= 15 ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' :
                'text-red-400    border-red-500/30    bg-red-500/10';

    const pingColor = ping === null ? '' :
        ping < 80 ? 'text-green-400  border-green-500/30  bg-green-500/10' :
            ping < 150 ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' :
                'text-red-400    border-red-500/30    bg-red-500/10';

    const streamLabels = useMemo(() => ({
        connecting: t('stream_connecting'),
        error_title: t('stream_error_title'),
        error_desc: t('stream_error_desc'),
        retry: t('stream_retry'),
        live: t('stream_live'),
        stable: t('stream_stable'),
        mock_active: t('stream_mock_active'),
        simulator: t('stream_simulator')
    }), [t]);

    if (!playerId) return null;

    return (
        <MriModal
            onClose={onClose}
            className={cn(
                "flex flex-col p-5 bg-card border-border transition-all duration-300 ease-in-out",
                isMaximized ? "w-[98vw] max-w-none h-[95vh]" : "w-[1100px] max-w-6xl h-[700px]"
            )}
        >
            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="flex items-center gap-2 mb-4 shrink-0">
                <Camera className="w-4 h-4 text-primary flex-shrink-0" />
                <div className="font-bold text-base flex-1 truncate">
                    {playerName || `Player #${playerId}`}
                    {isDead && <span className="ml-2 text-xs text-red-400 font-normal">💀 Morto</span>}
                </div>

                {/* Ping */}
                {ping !== null && (
                    <Badge color={pingColor}>
                        {ping}ms
                    </Badge>
                )}

                {/* FPS */}
                {fps !== null && (
                    <Badge color={fpsBadgeColor}>
                        <Wifi className="w-3 h-3" />
                        {fps}fps
                    </Badge>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setShowKeyboard(!showKeyboard)}
                        title={showKeyboard ? "Ocultar teclado" : "Mostrar teclado"}
                        className={cn(
                            "p-1.5 rounded transition-colors",
                            showKeyboard ? "bg-primary text-primary-foreground" : "hover:bg-accent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Keyboard className="w-4 h-4" />
                    </button>

                    <button
                        onClick={() => setIsMaximized(!isMaximized)}
                        title={isMaximized ? "Minimizar" : "Maximizar"}
                        className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>

                    <button
                        onClick={() => { setRefreshKey(prev => prev + 1); setFps(null); }}
                        title="Atualizar stream"
                        className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* ── Body: video + vitals ────────────────────────────────── */}
            <div className="flex flex-1 gap-3 min-h-0">
                <MriPlayerScreenStream
                    key={`${playerId}-${refreshKey}`}
                    playerId={playerId}
                    playerName={playerName}
                    isMock={isMock}
                    onFpsUpdate={setFps}
                    showKeyboard={showKeyboard}
                    className="flex-1 rounded-lg border border-input shadow-inner bg-black"
                    onSendNui={wrappedSendNui}
                    onNuiEvent={((event: string, cb: any) => {
                        on(event, cb);
                        return () => off(event, cb);
                    }) as any}
                    signaling={signaling as any}
                    subscribeFromCF={subscribeFromCF}
                    webrtcConfig={settings?.webrtc}
                    selfId={`modal-${(gameData as any)?.selfId || 'unknown'}-${playerId}`}
                    labels={streamLabels}
                />

                {/* Vitals panel */}
                <div className="w-48 flex flex-col gap-3 flex-shrink-0">
                    <div className="bg-muted/30 border border-border rounded-lg p-3 flex flex-col gap-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">Vitais</p>

                        {vitals ? (
                            <MriPlayerVitals
                                vitals={vitals as any}
                                size="compact"
                                onAction={(vital: any, label: string, val: number) => setShowVital({ vital, label, value: val })}
                                labels={{
                                    health: t('vitals_health'),
                                    armor: t('vitals_armor'),
                                    hunger: t('vitals_hunger'),
                                    thirst: t('vitals_thirst'),
                                    stress: t('vitals_stress')
                                }}
                            />
                        ) : (
                            <div className="text-xs text-muted-foreground italic">Carregando...</div>
                        )}
                    </div>
                </div>
            </div>

            <MriVitalAdjustModal
                isOpen={!!showVital}
                playerName={playerName || `Player #${playerId}`}
                vital={(showVital?.vital || 'health') as any}
                currentValue={showVital?.value || 0}
                onClose={() => setShowVital(null)}
                onSubmit={(val: number) => {
                    let serverVal = val;
                    if (showVital?.vital === 'health') {
                        serverVal = Math.round(val + 100);
                    }
                    sendNui('mri_Qadmin:server:SetVital', {
                        targetId: playerId,
                        vital: showVital?.vital,
                        value: serverVal
                    });
                    setShowVital(null);
                }}
                labels={{
                    health: t('vitals_health'),
                    armor: t('vitals_armor'),
                    hunger: t('vitals_hunger'),
                    thirst: t('vitals_thirst'),
                    stress: t('vitals_stress'),
                    newValue: t('new_value'),
                    confirm: t('confirm'),
                    cancel: t('cancel')
                }}
            />
        </MriModal>
    );
}
