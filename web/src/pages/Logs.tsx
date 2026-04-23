import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNui } from '@/context/NuiContext'
import { MriButton, MriPageHeader, MriInput, MriSelect, MriCard } from '@mriqbox/ui-kit'
import {
    RefreshCw, ChevronDown, ChevronRight, Circle, Download, ScrollText,
    Settings, X, Plus, Trash2, Save, Database, Webhook, Radio, LayoutList,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/hooks/useI18n'
import { MOCK_LOGS, MOCK_LOG_SETTINGS } from '@/utils/mockData'
import { MriTabs, MriTabItem } from '@/components/ui/MriTabs'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LogEntry {
    id?: number
    resource: string
    category: string
    level: 'info' | 'success' | 'warn' | 'error'
    message: string
    data?: Record<string, any>
    admin: string
    created_at: number | string
}

interface LogCategory {
    id: string
    label: string
    webhook: string
    db: boolean
    discord: boolean
    relay: boolean
}

interface ResourceEntry {
    name: string
    db: boolean
    discord: boolean
    relay: boolean
}

interface LogSettingsData {
    categories: LogCategory[]
    resourceEntries: ResourceEntry[]
    resourceMode: 'blacklist' | 'whitelist'
    fallbackWebhook: string
    dbEnabled: boolean
    maxMemory: number
    forwardEvent: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LEVEL_STYLES: Record<string, { badge: string; row: string }> = {
    info: { badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30', row: 'border-l-blue-500/50' },
    success: { badge: 'bg-green-500/20 text-green-400 border-green-500/30', row: 'border-l-green-500/50' },
    warn: { badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', row: 'border-l-yellow-500/50' },
    error: { badge: 'bg-red-500/20 text-red-400 border-red-500/30', row: 'border-l-red-500/50' },
}

const PAGE_SIZE = 100

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(ts: number | string): string {
    let d: Date
    if (typeof ts === 'number') {
        // oxmysql returns TIMESTAMP as milliseconds; plain unix seconds are always < 1e10
        d = new Date(ts > 1e10 ? ts : ts * 1000)
    } else {
        // Normalize MySQL "YYYY-MM-DD HH:MM:SS" → ISO "YYYY-MM-DDTHH:MM:SS" for reliable parsing
        d = new Date(String(ts).replace(' ', 'T'))
    }
    if (isNaN(d.getTime())) return '—'
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// ─── LogRow ───────────────────────────────────────────────────────────────────

function LogRow({ log, categoryMap }: { log: LogEntry; categoryMap: Record<string, string> }) {
    const [expanded, setExpanded] = useState(false)
    const hasData = log.data && Object.keys(log.data).length > 0
    const style = LEVEL_STYLES[log.level] || LEVEL_STYLES.info
    const categoryLabel = categoryMap[log.category] || log.category

    return (
        <div className={cn('border-l-2 bg-card/30 hover:bg-card/60 transition-colors', style.row)}>
            <div
                className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none"
                onClick={() => hasData && setExpanded(e => !e)}
            >
                <span className="text-muted-foreground/40 w-3 shrink-0">
                    {hasData
                        ? (expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />)
                        : <span className="w-3 h-3 block" />}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground/60 w-28 shrink-0">
                    {formatTime(log.created_at)}
                </span>
                <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider shrink-0', style.badge)}>
                    {log.level}
                </span>
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground border border-border/30 shrink-0 max-w-[110px] truncate" title={categoryLabel}>
                    {categoryLabel}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground/50 shrink-0 max-w-[80px] truncate" title={log.resource}>
                    {log.resource}
                </span>
                <span className="text-xs text-foreground/90 flex-1 truncate" title={log.message}>
                    {log.message}
                </span>
                <span className="text-[10px] text-muted-foreground/60 shrink-0 hidden md:block max-w-[100px] truncate" title={log.admin}>
                    {log.admin}
                </span>
            </div>
            {expanded && hasData && (
                <div className="px-8 pb-2">
                    <pre className="text-[10px] font-mono text-muted-foreground bg-background/60 border border-border/30 rounded p-2 overflow-x-auto max-h-32">
                        {JSON.stringify(log.data, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    )
}

// ─── Toggle helper (matches Settings.tsx peer pattern) ────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input type="checkbox" className="sr-only peer" checked={checked} onChange={e => onChange(e.target.checked)} />
            <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary border border-border" />
        </label>
    )
}

// ─── ToggleBtn (for category table) ──────────────────────────────────────────

function ToggleBtn({ active, onClick, icon: Icon, title }: {
    active: boolean; onClick: () => void; icon: React.ElementType; title: string
}) {
    return (
        <button
            onClick={onClick}
            title={title}
            className={cn(
                'w-7 h-7 flex items-center justify-center rounded transition-colors',
                active
                    ? 'bg-primary/15 text-primary hover:bg-primary/25'
                    : 'text-muted-foreground/30 hover:bg-muted hover:text-muted-foreground'
            )}
        >
            <Icon className="w-3.5 h-3.5" />
        </button>
    )
}

// ─── Settings view ────────────────────────────────────────────────────────────

const EMPTY_CAT = { id: '', label: '', webhook: '', db: true, discord: false, relay: false }
const EMPTY_RES = { name: '', db: true, discord: false, relay: false }

function LogSettingsView({ draft, saving, onChange, onSave, onCancel }: {
    draft: LogSettingsData
    saving: boolean
    onChange: (data: LogSettingsData) => void
    onSave: () => void
    onCancel: () => void
}) {
    const { t } = useI18n()
    const [newCat, setNewCat] = useState({ ...EMPTY_CAT })
    const [newRes, setNewRes] = useState({ ...EMPTY_RES })

    const updateCategory = (idx: number, patch: Partial<LogCategory>) =>
        onChange({ ...draft, categories: draft.categories.map((c, i) => i === idx ? { ...c, ...patch } : c) })

    const removeCategory = (idx: number) =>
        onChange({ ...draft, categories: draft.categories.filter((_, i) => i !== idx) })

    const addCategory = () => {
        const id = newCat.id.trim().toLowerCase().replace(/\s+/g, '_')
        const label = newCat.label.trim()
        if (!id || !label || draft.categories.some(c => c.id === id)) return
        onChange({ ...draft, categories: [...draft.categories, { ...newCat, id, label }] })
        setNewCat({ ...EMPTY_CAT })
    }

    const updateResource = (idx: number, patch: Partial<ResourceEntry>) =>
        onChange({ ...draft, resourceEntries: draft.resourceEntries.map((r, i) => i === idx ? { ...r, ...patch } : r) })

    const removeResource = (idx: number) =>
        onChange({ ...draft, resourceEntries: draft.resourceEntries.filter((_, i) => i !== idx) })

    const addResource = () => {
        const name = newRes.name.trim()
        if (!name || draft.resourceEntries.some(r => r.name === name)) return
        onChange({ ...draft, resourceEntries: [...draft.resourceEntries, { ...newRes, name }] })
        setNewRes({ ...EMPTY_RES })
    }

    return (
        <div className="flex-1 overflow-auto animate-in fade-in duration-300">
            <div className="max-w-5xl mx-auto p-6 flex flex-col gap-8">

                {/* ── Categories ─────────────────────────────────────────── */}
                <div>
                    <div className="flex items-center gap-2 text-lg font-medium text-foreground pb-3 border-b border-border mb-4">
                        <Database className="w-5 h-5 text-primary" />
                        {t('logs.settings.categories.title')}
                    </div>
                    <p className="text-[11px] text-muted-foreground/70 leading-relaxed italic mb-4">
                        {t('logs.settings.categories.description')}
                    </p>

                    <MriCard className="overflow-hidden bg-card border-border p-0">
                        {/* header */}
                        <div className="grid bg-muted/40 border-b border-border px-4 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider items-center gap-3"
                            style={{ gridTemplateColumns: '0.6fr 0.8fr 1.4fr auto auto auto auto' }}>
                            <span>{t('logs.columns.id')}</span>
                            <span>{t('logs.columns.label')}</span>
                            <span>{t('logs.columns.webhook_discord')}</span>
                            <span>{t('logs.columns.destination')}</span>
                            <span className="w-7" />
                        </div>

                        {draft.categories.map((cat, idx) => (
                            <div key={cat.id}
                                className="grid items-center gap-3 px-4 py-2 border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors"
                                style={{ gridTemplateColumns: '0.6fr 0.8fr 1.4fr auto auto auto auto' }}>
                                <MriInput
                                    value={cat.id}
                                    disabled
                                    className="h-7 text-xs font-mono opacity-50 cursor-not-allowed"
                                />
                                <MriInput
                                    value={cat.label}
                                    onChange={e => updateCategory(idx, { label: (e.target as HTMLInputElement).value })}
                                    placeholder="Label"
                                    className="h-7 text-xs"
                                />
                                <MriInput
                                    value={cat.webhook}
                                    onChange={e => updateCategory(idx, { webhook: (e.target as HTMLInputElement).value })}
                                    placeholder="https://discord.com/api/webhooks/..."
                                    className="h-7 text-[10px]"
                                />
                                <ToggleBtn active={cat.db} onClick={() => updateCategory(idx, { db: !cat.db })} icon={Database} title={t('logs.columns.db')} />
                                <ToggleBtn active={cat.discord} onClick={() => updateCategory(idx, { discord: !cat.discord })} icon={Webhook} title={t('logs.columns.discord')} />
                                <ToggleBtn active={cat.relay} onClick={() => updateCategory(idx, { relay: !cat.relay })} icon={Radio} title={t('logs.columns.relay')} />
                                <button onClick={() => removeCategory(idx)}
                                    className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-500/10 text-muted-foreground/30 hover:text-red-400 transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}

                        {/* Add row — same grid, all fields editable */}
                        <div className="grid items-center gap-3 px-4 py-2.5 bg-muted/20 border-t border-border/50"
                            style={{ gridTemplateColumns: '0.6fr 0.8fr 1.4fr auto auto auto auto' }}>
                            <MriInput
                                value={newCat.id}
                                onChange={e => setNewCat(p => ({ ...p, id: (e.target as HTMLInputElement).value }))}
                                onKeyDown={e => e.key === 'Enter' && addCategory()}
                                placeholder={t('logs.category.id_placeholder')}
                                className="h-7 text-xs font-mono"
                            />
                            <MriInput
                                value={newCat.label}
                                onChange={e => setNewCat(p => ({ ...p, label: (e.target as HTMLInputElement).value }))}
                                onKeyDown={e => e.key === 'Enter' && addCategory()}
                                placeholder={t('logs.category.label_placeholder')}
                                className="h-7 text-xs"
                            />
                            <MriInput
                                value={newCat.webhook}
                                onChange={e => setNewCat(p => ({ ...p, webhook: (e.target as HTMLInputElement).value }))}
                                placeholder={t('logs.category.webhook_placeholder')}
                                className="h-7 text-[10px]"
                            />
                            <ToggleBtn active={newCat.db} onClick={() => setNewCat(p => ({ ...p, db: !p.db }))} icon={Database} title={t('logs.columns.db')} />
                            <ToggleBtn active={newCat.discord} onClick={() => setNewCat(p => ({ ...p, discord: !p.discord }))} icon={Webhook} title={t('logs.columns.discord')} />
                            <ToggleBtn active={newCat.relay} onClick={() => setNewCat(p => ({ ...p, relay: !p.relay }))} icon={Radio} title={t('logs.columns.relay')} />
                            <button onClick={addCategory} disabled={!newCat.id.trim() || !newCat.label.trim()}
                                className="w-7 h-7 flex items-center justify-center rounded border border-border hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                <Plus className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </MriCard>
                </div>

                {/* ── Resources ──────────────────────────────────────────── */}
                <div>
                    <div className="flex items-center gap-2 pb-3 border-b border-border mb-4">
                        <Radio className="w-5 h-5 text-primary shrink-0" />
                        <span className="text-lg font-medium text-foreground flex-1">{t('logs.settings.resources.title')}</span>
                        <div className="flex items-center rounded-lg border border-border overflow-hidden text-[11px] font-medium shrink-0">
                            {(['blacklist', 'whitelist'] as const).map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => onChange({ ...draft, resourceMode: mode })}
                                    className={cn(
                                        'px-3 py-1.5 capitalize transition-colors',
                                        draft.resourceMode === mode
                                            ? 'bg-primary text-primary-foreground'
                                            : 'text-muted-foreground hover:bg-muted'
                                    )}
                                >
                                    {mode}
                                </button>
                            ))}
                        </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground/70 leading-relaxed italic mb-4">
                        {draft.resourceMode === 'whitelist'
                            ? t('logs.settings.resources.desc_whitelist')
                            : t('logs.settings.resources.desc_blacklist')}
                    </p>

                    <MriCard className="overflow-hidden bg-card border-border p-0">
                        <div className="grid bg-muted/40 border-b border-border px-4 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider items-center gap-3"
                            style={{ gridTemplateColumns: '1fr auto auto auto auto' }}>
                            <span>{t('logs.settings.resources.title')}</span>
                            <span>{t('logs.columns.destination')}</span>
                            <span className="w-7" />
                        </div>

                        {draft.resourceEntries.length === 0 && (
                            <p className="text-[11px] text-muted-foreground/50 text-center py-5 italic">{t('logs.settings.resources.empty')}</p>
                        )}

                        {draft.resourceEntries.map((res, idx) => (
                            <div key={res.name}
                                className="grid items-center gap-3 px-4 py-2 border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors"
                                style={{ gridTemplateColumns: '1fr auto auto auto auto' }}>
                                <MriInput value={res.name} disabled className="h-7 text-xs font-mono opacity-50 cursor-not-allowed" />
                                <ToggleBtn active={res.db} onClick={() => updateResource(idx, { db: !res.db })} icon={Database} title={t('logs.columns.db')} />
                                <ToggleBtn active={res.discord} onClick={() => updateResource(idx, { discord: !res.discord })} icon={Webhook} title={t('logs.columns.discord')} />
                                <ToggleBtn active={res.relay} onClick={() => updateResource(idx, { relay: !res.relay })} icon={Radio} title={t('logs.columns.relay')} />
                                <button onClick={() => removeResource(idx)}
                                    className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-500/10 text-muted-foreground/30 hover:text-red-400 transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}

                        {/* Add row */}
                        <div className="grid items-center gap-3 px-4 py-2.5 bg-muted/20 border-t border-border/50"
                            style={{ gridTemplateColumns: '1fr auto auto auto auto' }}>
                            <MriInput
                                value={newRes.name}
                                onChange={e => setNewRes(p => ({ ...p, name: (e.target as HTMLInputElement).value }))}
                                onKeyDown={e => e.key === 'Enter' && addResource()}
                                placeholder={t('logs.settings.resources.placeholder')}
                                className="h-7 text-xs font-mono"
                            />
                            <ToggleBtn active={newRes.db} onClick={() => setNewRes(p => ({ ...p, db: !p.db }))} icon={Database} title={t('logs.columns.db')} />
                            <ToggleBtn active={newRes.discord} onClick={() => setNewRes(p => ({ ...p, discord: !p.discord }))} icon={Webhook} title={t('logs.columns.discord')} />
                            <ToggleBtn active={newRes.relay} onClick={() => setNewRes(p => ({ ...p, relay: !p.relay }))} icon={Radio} title={t('logs.columns.relay')} />
                            <button onClick={addResource} disabled={!newRes.name.trim()}
                                className="w-7 h-7 flex items-center justify-center rounded border border-border hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                <Plus className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </MriCard>
                </div>

                {/* ── General ────────────────────────────────────────────── */}
                <div>
                    <div className="flex items-center gap-2 text-lg font-medium text-foreground pb-3 border-b border-border mb-4">
                        <Settings className="w-5 h-5 text-primary" />
                        {t('logs.settings.general.title')}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col space-y-2 p-4 bg-muted/10 border border-border/40 rounded-xl hover:bg-muted/20 transition-colors">
                            <label className="text-xs font-bold font-mono text-muted-foreground pl-1">{t('logs.settings.general.fallback_webhook')}</label>
                            <MriInput
                                value={draft.fallbackWebhook}
                                onChange={e => onChange({ ...draft, fallbackWebhook: (e.target as HTMLInputElement).value })}
                                placeholder={t('logs.category.webhook_placeholder')}
                                className="h-10 bg-background border-border"
                            />
                            <p className="text-[10px] text-muted-foreground/70 leading-relaxed italic pl-1">{t('logs.settings.general.fallback_webhook_desc')}</p>
                        </div>

                        <div className="flex flex-col space-y-2 p-4 bg-muted/10 border border-border/40 rounded-xl hover:bg-muted/20 transition-colors">
                            <label className="text-xs font-bold font-mono text-muted-foreground pl-1">
                                {t('logs.settings.general.relay_event')} <span className="text-primary font-normal not-italic normal-case">(server-side)</span>
                            </label>
                            <MriInput
                                value={draft.forwardEvent}
                                onChange={e => onChange({ ...draft, forwardEvent: (e.target as HTMLInputElement).value })}
                                placeholder="myResource:onLog"
                                className="h-10 bg-background border-border"
                            />
                            <p className="text-[10px] text-muted-foreground/70 leading-relaxed italic pl-1">{t('logs.settings.general.relay_event_desc')}</p>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-muted/10 border border-border/40 rounded-xl hover:bg-muted/20 transition-colors">
                            <div>
                                <p className="text-xs font-bold font-mono text-muted-foreground">{t('logs.settings.general.db_global')}</p>
                                <p className="text-[10px] text-muted-foreground/70 leading-relaxed italic mt-0.5">{t('logs.settings.general.db_global_desc')}</p>
                            </div>
                            <Toggle checked={draft.dbEnabled} onChange={v => onChange({ ...draft, dbEnabled: v })} />
                        </div>

                        <div className="flex flex-col space-y-2 p-4 bg-muted/10 border border-border/40 rounded-xl hover:bg-muted/20 transition-colors">
                            <label className="text-xs font-bold font-mono text-muted-foreground pl-1">{t('logs.settings.general.max_memory')}</label>
                            <MriInput
                                value={String(draft.maxMemory)}
                                onChange={e => {
                                    const v = parseInt((e.target as HTMLInputElement).value)
                                    if (!isNaN(v) && v > 0) onChange({ ...draft, maxMemory: v })
                                }}
                                placeholder="500"
                                className="h-10 bg-background border-border w-28"
                            />
                            <p className="text-[10px] text-muted-foreground/70 leading-relaxed italic pl-1">{t('logs.settings.general.max_memory_desc')}</p>
                        </div>
                    </div>
                </div>

                {/* Save / Cancel */}
                <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                    <MriButton variant="ghost" size="sm" onClick={onCancel} disabled={saving}>{t('common.cancel_label')}</MriButton>
                    <MriButton size="sm" onClick={onSave} isLoading={saving} disabled={saving} className="gap-1.5">
                        {!saving && <Save className="w-3.5 h-3.5" />}
                        {t('logs.settings.save')}
                    </MriButton>
                </div>
            </div>
        </div>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Logs() {
    const { t } = useI18n()
    const { sendNui, on, off } = useNui()

    const [activeView, setActiveView] = useState<'logs' | 'settings'>('logs')

    const [logs, setLogs] = useState<LogEntry[]>([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [loading, setLoading] = useState(false)
    const [newCount, setNewCount] = useState(0)
    const [isLive, setIsLive] = useState(true)

    const [filterCategories, setFilterCategories] = useState<string[]>([])
    const [filterLevels, setFilterLevels] = useState<string[]>([])
    const [filterResource, setFilterResource] = useState('')
    const [filterSearch, setFilterSearch] = useState('')

    const [logSettings, setLogSettings] = useState<LogSettingsData | null>(null)
    const [settingsDraft, setSettingsDraft] = useState<LogSettingsData | null>(null)
    const [settingsSaving, setSettingsSaving] = useState(false)

    const pendingSearch = useRef<ReturnType<typeof setTimeout> | null>(null)
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [debouncedResource, setDebouncedResource] = useState('')

    useEffect(() => {
        if (pendingSearch.current) clearTimeout(pendingSearch.current)
        pendingSearch.current = setTimeout(() => {
            setDebouncedSearch(filterSearch)
            setDebouncedResource(filterResource)
        }, 400)
        return () => { if (pendingSearch.current) clearTimeout(pendingSearch.current) }
    }, [filterSearch, filterResource])

    const levelOptions = useMemo(() => [
        { value: 'info', label: 'ℹ️ Info' },
        { value: 'success', label: '✅ Success' },
        { value: 'warn', label: '⚠️ Warn' },
        { value: 'error', label: '❌ Error' },
    ], [])

    const logTabs: MriTabItem[] = useMemo(() => [
        { id: 'logs', label: t('logs.tabs.logs'), icon: LayoutList },
        { id: 'settings', label: t('logs.tabs.settings'), icon: Settings },
    ], [t])

    const categoryOptions = useMemo(() =>
        (logSettings?.categories || []).map(c => ({ value: c.id, label: c.label }))
        , [logSettings])

    const categoryMap = useMemo(() => {
        const map: Record<string, string> = {}
        logSettings?.categories.forEach(c => { map[c.id] = c.label })
        return map
    }, [logSettings])

    const fetchSettings = useCallback(async () => {
        const res = await sendNui('mri_Qadmin:callback:GetLogSettings', {}, MOCK_LOG_SETTINGS) as any
        if (res) {
            const normalized: LogSettingsData = {
                categories: Array.isArray(res.categories) ? res.categories : [],
                resourceEntries: Array.isArray(res.resourceEntries) ? res.resourceEntries : [],
                resourceMode: res.resourceMode === 'whitelist' ? 'whitelist' : 'blacklist',
                fallbackWebhook: res.fallbackWebhook ?? '',
                dbEnabled: res.dbEnabled !== false,
                maxMemory: typeof res.maxMemory === 'number' ? res.maxMemory : 500,
                forwardEvent: res.forwardEvent ?? '',
            }
            setLogSettings(normalized)
            setSettingsDraft(JSON.parse(JSON.stringify(normalized)))
        }
    }, [sendNui])

    const fetchLogs = useCallback(async (p: number = 1) => {
        setLoading(true)
        try {
            const res = await sendNui('mri_Qadmin:callback:GetLogs', {
                page: p, limit: PAGE_SIZE,
                categories: filterCategories,
                levels: filterLevels,
                resource: debouncedResource, search: debouncedSearch,
            }, MOCK_LOGS)
            if (res) {
                setLogs((res as any).logs || [])
                setTotal((res as any).total || 0)
                setPage(p)
                setNewCount(0)
            }
        } finally {
            setLoading(false)
        }
    }, [sendNui, filterCategories, filterLevels, debouncedSearch, debouncedResource])

    useEffect(() => { fetchSettings() }, [fetchSettings])
    useEffect(() => { fetchLogs(1) }, [fetchLogs])

    useEffect(() => {
        const handler = (log: LogEntry) => {
            if (!isLive) return
            const matchesCategory = filterCategories.length === 0 || filterCategories.includes(log.category)
            const matchesLevel = filterLevels.length === 0 || filterLevels.includes(log.level)
            const matchesResource = !debouncedResource || log.resource.includes(debouncedResource)
            const matchesSearch = !debouncedSearch || log.message.toLowerCase().includes(debouncedSearch.toLowerCase()) || log.admin.toLowerCase().includes(debouncedSearch.toLowerCase())
            if (matchesCategory && matchesLevel && matchesResource && matchesSearch) {
                if (page === 1) {
                    setLogs(prev => [log, ...prev.slice(0, PAGE_SIZE - 1)])
                    setTotal(prev => prev + 1)
                } else {
                    setNewCount(prev => prev + 1)
                }
            }
        }
        on('newLog', handler)
        return () => off('newLog', handler)
    }, [on, off, isLive, page, filterCategories, filterLevels, debouncedSearch, debouncedResource])

    const totalPages = Math.ceil(total / PAGE_SIZE)

    const saveSettings = async () => {
        if (!settingsDraft) return
        setSettingsSaving(true)
        try {
            await sendNui('mri_Qadmin:callback:SaveLogSettings', settingsDraft)
            setLogSettings(settingsDraft)
            setActiveView('logs')
        } finally {
            setSettingsSaving(false)
        }
    }

    const cancelSettings = () => {
        setSettingsDraft(logSettings ? JSON.parse(JSON.stringify(logSettings)) : null)
        setActiveView('logs')
    }

    useEffect(() => {
        if (activeView === 'settings' && !settingsDraft) fetchSettings()
    }, [activeView])

    const handleExport = () => {
        const content = logs.map(l =>
            `[${formatTime(l.created_at)}] [${l.level.toUpperCase()}] [${l.category}] ${l.resource} | ${l.message} | by ${l.admin}`
        ).join('\n')
        const blob = new Blob([content], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `logs_${new Date().toISOString().slice(0, 10)}.txt`
        a.click(); URL.revokeObjectURL(url)
    }

    return (
        <div className="h-full w-full flex flex-col bg-background">
            <MriPageHeader
                title={t('qadmin.page.logs')}
                icon={ScrollText}
                countLabel={t('logs.records')}
                count={total}
            >
                <MriTabs
                    items={logTabs}
                    value={activeView}
                    onChange={setActiveView}
                    variant="premium"
                />

                {activeView === 'logs' && <>
                    {categoryOptions.length > 0 && (
                        <MriSelect
                            multiple
                            options={categoryOptions}
                            value={filterCategories}
                            onChange={v => { setFilterCategories(v as string[]); setPage(1) }}
                            placeholder={t('logs.filter.all_categories')}
                            className="h-10 text-xs w-44"
                        />
                    )}
                    <MriSelect
                        multiple
                        options={levelOptions}
                        value={filterLevels}
                        onChange={v => { setFilterLevels(v as string[]); setPage(1) }}
                        placeholder={t('logs.filter.all_levels')}
                        className="h-10 text-xs w-36"
                    />
                    <MriInput
                        value={filterResource}
                        onChange={e => setFilterResource((e.target as HTMLInputElement).value)}
                        placeholder={t('logs.filter.resource_placeholder')}
                        className="h-10 text-xs w-32"
                    />
                    <MriInput
                        value={filterSearch}
                        onChange={e => setFilterSearch((e.target as HTMLInputElement).value)}
                        placeholder={t('logs.filter.search_placeholder')}
                        className="h-10 text-xs w-48"
                    />
                    {(filterCategories.length > 0 || filterLevels.length > 0 || filterResource || filterSearch) && (
                        <MriButton
                            variant="ghost"
                            size="icon"
                            className="border-input bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground h-10 w-10 p-0 shrink-0"
                            title="Limpar filtros"
                            onClick={() => {
                                setFilterCategories([]); setFilterLevels([])
                                setFilterResource(''); setFilterSearch('')
                                setDebouncedSearch(''); setDebouncedResource('')
                            }}
                        >
                            <X className="w-4 h-4" />
                        </MriButton>
                    )}
                    <MriButton
                        variant="outline"
                        onClick={() => setIsLive(v => !v)}
                        className={cn(
                            'h-10 px-3 gap-1.5 text-xs font-medium shrink-0',
                            isLive
                                ? 'border-green-500/40 bg-green-500/10 text-green-400 hover:bg-green-500/20'
                                : 'border-input bg-transparent text-muted-foreground hover:bg-muted'
                        )}
                    >
                        <Circle className={cn('w-2 h-2 fill-current', isLive && 'animate-pulse')} />
                        {isLive ? t('logs.btn.live') : t('logs.btn.paused')}
                    </MriButton>
                    <MriButton
                        variant="outline"
                        onClick={handleExport}
                        title="Exportar"
                        className="border-input bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground h-10 w-10 p-0 shrink-0"
                    >
                        <Download className="w-4 h-4" />
                    </MriButton>
                    <MriButton
                        variant="outline"
                        onClick={() => fetchLogs(page)}
                        disabled={loading}
                        isLoading={loading}
                        className="border-input bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground h-10 w-10 p-0 shrink-0"
                    >
                        {!loading && <RefreshCw className="w-4 h-4" />}
                    </MriButton>
                </>}
            </MriPageHeader>

            {activeView === 'settings' ? (
                settingsDraft ? (
                    <LogSettingsView
                        draft={settingsDraft}
                        saving={settingsSaving}
                        onChange={setSettingsDraft}
                        onSave={saveSettings}
                        onCancel={cancelSettings}
                    />
                ) : (
                    <div className="flex items-center justify-center flex-1 text-muted-foreground text-sm">
                        {t('logs.loading')}
                    </div>
                )
            ) : (
                <div className="flex-1 overflow-hidden flex flex-col gap-3 p-2 pt-0">
                    {newCount > 0 && page !== 1 && (
                        <button
                            onClick={() => fetchLogs(1)}
                            className="shrink-0 w-full text-center text-xs py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-colors"
                        >
                            {t('logs.new_records', [newCount])}
                        </button>
                    )}

                    <div className="flex-1 overflow-y-auto rounded-lg border border-border/50 bg-background/20 divide-y divide-border/30">
                        {loading ? (
                            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">{t('logs.loading')}</div>
                        ) : logs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
                                <ScrollText className="w-10 h-10 opacity-20" />
                                <span className="text-sm">{t('logs.empty')}</span>
                            </div>
                        ) : (
                            logs.map((log, i) => <LogRow key={log.id ?? `tmp-${i}`} log={log} categoryMap={categoryMap} />)
                        )}
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between shrink-0 text-xs text-muted-foreground">
                            <MriButton variant="outline" size="sm" className="h-7 text-xs" disabled={page <= 1 || loading} onClick={() => fetchLogs(page - 1)}>
                                {t('logs.pagination.prev')}
                            </MriButton>
                            <span>{t('logs.pagination.page_x_of_y', [page, totalPages])}</span>
                            <MriButton variant="outline" size="sm" className="h-7 text-xs" disabled={page >= totalPages || loading} onClick={() => fetchLogs(page + 1)}>
                                {t('logs.pagination.next')}
                            </MriButton>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
