import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNui } from '@/context/NuiContext'
import { MriButton, MriPageHeader, MriInput, MriSelect, MriCard } from '@mriqbox/ui-kit'
import {
    RefreshCw, ChevronDown, ChevronRight, Circle, Download, ScrollText,
    Settings, X, Plus, Trash2, Save, Database, Webhook, Radio, LayoutList,
    GripVertical, Power, PowerOff, Wand2, CheckCircle2, ArrowRight, AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/hooks/useI18n'
import { MOCK_LOGS, MOCK_LOG_SETTINGS } from '@/utils/mockData'
import { MriSegmentedTabs as MriTabs, type MriSegmentedTabsItem as MriTabItem } from '@mriqbox/ui-kit'

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
    disabled?: boolean
}

interface ResourceEntry {
    name: string
    db: boolean
    discord: boolean
    relay: boolean
    disabled?: boolean
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
    info:    { badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',   row: 'border-l-blue-500/50'   },
    success: { badge: 'bg-green-500/20 text-green-400 border-green-500/30', row: 'border-l-green-500/50'  },
    warn:    { badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', row: 'border-l-yellow-500/50' },
    error:   { badge: 'bg-red-500/20 text-red-400 border-red-500/30',      row: 'border-l-red-500/50'    },
}

const PAGE_SIZE = 100
const EMPTY_CAT: LogCategory = { id: '', label: '', webhook: '', db: true, discord: false, relay: false, disabled: false }
const EMPTY_RES: ResourceEntry = { name: '', db: true, discord: false, relay: false, disabled: false }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(ts: number | string): string {
    let d: Date
    if (typeof ts === 'number') {
        d = new Date(ts > 1e10 ? ts : ts * 1000)
    } else {
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
                <span className="font-mono text-[10px] text-muted-foreground/60 w-28 shrink-0">{formatTime(log.created_at)}</span>
                <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider shrink-0', style.badge)}>{log.level}</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground border border-border/30 shrink-0 max-w-[110px] truncate" title={categoryLabel}>{categoryLabel}</span>
                <span className="text-[10px] font-mono text-muted-foreground/50 shrink-0 max-w-[80px] truncate" title={log.resource}>{log.resource}</span>
                <span className="text-xs text-foreground/90 flex-1 truncate" title={log.message}>{log.message}</span>
                <span className="text-[10px] text-muted-foreground/60 shrink-0 hidden md:block max-w-[100px] truncate" title={log.admin}>{log.admin}</span>
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

// ─── Primitives ───────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input type="checkbox" className="sr-only peer" checked={checked} onChange={e => onChange(e.target.checked)} />
            <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary border border-border" />
        </label>
    )
}

function ToggleBtn({ active, onClick, icon: Icon, title, danger }: {
    active: boolean; onClick: () => void; icon: React.ElementType; title: string; danger?: boolean
}) {
    return (
        <button onClick={onClick} title={title}
            className={cn(
                'w-7 h-7 flex items-center justify-center rounded transition-colors',
                active
                    ? danger
                        ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
                        : 'bg-primary/15 text-primary hover:bg-primary/25'
                    : 'text-muted-foreground/30 hover:bg-muted hover:text-muted-foreground'
            )}
        >
            <Icon className="w-3.5 h-3.5" />
        </button>
    )
}

// ─── WizardModal ──────────────────────────────────────────────────────────────

function WizardModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-in fade-in duration-150">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                    <h2 className="text-sm font-semibold text-foreground">{title}</h2>
                    <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                {children}
            </div>
        </div>
    )
}

function WizardStepDots({ total, current }: { total: number; current: number }) {
    return (
        <div className="flex items-center gap-1.5">
            {Array.from({ length: total }).map((_, i) => (
                <div key={i} className={cn(
                    'rounded-full transition-all',
                    i === current ? 'w-4 h-2 bg-primary' : i < current ? 'w-2 h-2 bg-primary/40' : 'w-2 h-2 bg-muted-foreground/20'
                )} />
            ))}
        </div>
    )
}

// ─── SetupWizard ──────────────────────────────────────────────────────────────

function SetupWizard({ draft, onChange, onClose }: {
    draft: LogSettingsData
    onChange: (data: LogSettingsData) => void
    onClose: () => void
}) {
    const { t } = useI18n()
    const [step, setStep] = useState(0)
    const [local, setLocal] = useState<LogSettingsData>(() => JSON.parse(JSON.stringify(draft)))

    const STEPS = [
        t('logs.wizard.setup.steps.welcome.title'),
        t('logs.wizard.setup.steps.categories.title'),
        t('logs.wizard.setup.steps.webhooks.title'),
        t('logs.wizard.setup.steps.resources.title'),
        t('logs.wizard.setup.steps.general.title'),
        t('logs.wizard.setup.steps.done.title'),
    ]
    const TOTAL = STEPS.length

    const updateCat = (idx: number, patch: Partial<LogCategory>) =>
        setLocal(p => ({ ...p, categories: p.categories.map((c, i) => i === idx ? { ...c, ...patch } : c) }))

    const finish = () => { onChange(local); onClose() }

    const renderStep = () => {
        switch (step) {
            case 0:
                return (
                    <div className="flex flex-col gap-6">
                        <p className="text-sm text-muted-foreground leading-relaxed">{t('logs.wizard.setup.steps.welcome.description')}</p>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { icon: Database, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', title: t('logs.destinations.db_title'), desc: t('logs.destinations.db_desc') },
                                { icon: Webhook,  color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20', title: t('logs.destinations.discord_title'), desc: t('logs.destinations.discord_desc') },
                                { icon: Radio,    color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20',   title: t('logs.destinations.relay_title'),   desc: t('logs.destinations.relay_desc') },
                            ].map(({ icon: Icon, color, bg, title: dtitle, desc }) => (
                                <div key={dtitle} className={cn('flex flex-col gap-2 p-4 rounded-xl border', bg)}>
                                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', bg)}>
                                        <Icon className={cn('w-4 h-4', color)} />
                                    </div>
                                    <p className="text-xs font-semibold text-foreground">{dtitle}</p>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed">{desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            case 1:
                return (
                    <div className="flex flex-col gap-3">
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{t('logs.wizard.setup.steps.categories.description')}</p>
                        <MriCard className="overflow-hidden p-0 border-border">
                            <div className="grid bg-muted/40 border-b border-border px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider gap-x-3 items-center"
                                style={{ gridTemplateColumns: '1fr 48px 72px 58px' }}>
                                <span>{t('logs.columns.label')}</span>
                                <span className="flex justify-center items-center gap-1"><Database className="w-3 h-3" />{t('logs.columns.db_short')}</span>
                                <span className="flex justify-center items-center gap-1"><Webhook className="w-3 h-3" />{t('logs.columns.discord')}</span>
                                <span className="flex justify-center items-center gap-1"><Radio className="w-3 h-3" />{t('logs.columns.relay_short')}</span>
                            </div>
                            <div className="max-h-52 overflow-y-auto">
                                {local.categories.map((cat, idx) => (
                                    <div key={cat.id} className="grid items-center gap-x-3 px-3 py-1.5 border-b border-border/40 last:border-0"
                                        style={{ gridTemplateColumns: '1fr 48px 72px 58px' }}>
                                        <span className="text-xs text-foreground truncate">{cat.label}</span>
                                        <div className="flex justify-center"><ToggleBtn active={cat.db}      onClick={() => updateCat(idx, { db:      !cat.db      })} icon={Database} title={t('logs.columns.db')} /></div>
                                        <div className="flex justify-center"><ToggleBtn active={cat.discord} onClick={() => updateCat(idx, { discord: !cat.discord })} icon={Webhook}  title={t('logs.columns.discord')} /></div>
                                        <div className="flex justify-center"><ToggleBtn active={cat.relay}   onClick={() => updateCat(idx, { relay:   !cat.relay   })} icon={Radio}    title={t('logs.columns.relay')} /></div>
                                    </div>
                                ))}
                            </div>
                        </MriCard>
                    </div>
                )
            case 2:
                return (
                    <div className="flex flex-col gap-3">
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{t('logs.wizard.setup.steps.webhooks.description')}</p>
                        <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t('logs.settings.general.fallback_webhook')}</label>
                                <MriInput value={local.fallbackWebhook}
                                    onChange={e => setLocal(p => ({ ...p, fallbackWebhook: (e.target as HTMLInputElement).value }))}
                                    placeholder={t('logs.category.webhook_placeholder')}
                                    className="h-8 text-xs" />
                                <p className="text-[10px] text-muted-foreground/60 italic">{t('logs.settings.general.fallback_webhook_desc')}</p>
                            </div>
                            {local.categories.filter(c => c.discord).map((cat) => {
                                const realIdx = local.categories.findIndex(c => c.id === cat.id)
                                return (
                                    <div key={cat.id} className="flex flex-col gap-1">
                                        <label className="text-[10px] font-semibold text-muted-foreground">{cat.label}</label>
                                        <MriInput value={cat.webhook}
                                            onChange={e => updateCat(realIdx, { webhook: (e.target as HTMLInputElement).value })}
                                            placeholder={t('logs.category.webhook_placeholder')}
                                            className="h-8 text-xs" />
                                    </div>
                                )
                            })}
                            {local.categories.every(c => !c.discord) && (
                                <p className="text-[11px] text-muted-foreground/50 italic text-center py-4">
                                    {t('logs.wizard.setup.steps.webhooks.no_discord')}
                                </p>
                            )}
                        </div>
                    </div>
                )
            case 3:
                return (
                    <div className="flex flex-col gap-4">
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{t('logs.wizard.setup.steps.resources.description')}</p>
                        <div className="flex flex-col gap-2">
                            {(['blacklist', 'whitelist'] as const).map(mode => {
                                const active = local.resourceMode === mode
                                return (
                                    <button key={mode} onClick={() => setLocal(p => ({ ...p, resourceMode: mode }))}
                                        className={cn(
                                            'flex items-start gap-3 p-4 rounded-xl border text-left transition-all',
                                            active ? 'bg-primary/10 border-primary/40' : 'bg-muted/10 border-border/40 opacity-60 hover:opacity-80'
                                        )}
                                    >
                                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                                            active ? 'bg-primary/15' : 'bg-muted/30')}>
                                            <LayoutList className={cn('w-4 h-4', active ? 'text-primary' : 'text-muted-foreground')} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-foreground capitalize">{mode}</p>
                                            <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">
                                                {t(mode === 'blacklist' ? 'logs.settings.resources.desc_blacklist' : 'logs.settings.resources.desc_whitelist')}
                                            </p>
                                        </div>
                                        <div className={cn('w-4 h-4 rounded-full border-2 shrink-0 mt-1 flex items-center justify-center transition-colors',
                                            active ? 'border-primary bg-primary' : 'border-muted-foreground/30')}>
                                            {active && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                        <p className="text-[10px] text-muted-foreground/50 italic pl-1">{t('logs.wizard.setup.steps.resources.mode_hint')}</p>
                    </div>
                )
            case 4:
                return (
                    <div className="flex flex-col gap-4">
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{t('logs.wizard.setup.steps.general.description')}</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-center justify-between p-4 bg-muted/10 border border-border/40 rounded-xl">
                                <div>
                                    <p className="text-xs font-semibold text-foreground">{t('logs.settings.general.db_global')}</p>
                                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">{t('logs.settings.general.db_global_desc')}</p>
                                </div>
                                <Toggle checked={local.dbEnabled} onChange={v => setLocal(p => ({ ...p, dbEnabled: v }))} />
                            </div>
                            <div className="flex flex-col gap-2 p-4 bg-muted/10 border border-border/40 rounded-xl">
                                <label className="text-xs font-semibold text-foreground">{t('logs.settings.general.max_memory')}</label>
                                <MriInput value={String(local.maxMemory)}
                                    onChange={e => { const v = parseInt((e.target as HTMLInputElement).value); if (!isNaN(v) && v > 0) setLocal(p => ({ ...p, maxMemory: v })) }}
                                    className="h-8 text-xs w-24" />
                                <p className="text-[10px] text-muted-foreground/70">{t('logs.settings.general.max_memory_desc')}</p>
                            </div>
                            <div className="col-span-2 flex flex-col gap-2 p-4 bg-muted/10 border border-border/40 rounded-xl">
                                <label className="text-xs font-semibold text-foreground">{t('logs.settings.general.relay_event')}</label>
                                <MriInput value={local.forwardEvent}
                                    onChange={e => setLocal(p => ({ ...p, forwardEvent: (e.target as HTMLInputElement).value }))}
                                    placeholder="myResource:onLog"
                                    className="h-8 text-xs" />
                                <p className="text-[10px] text-muted-foreground/70">{t('logs.settings.general.relay_event_desc')}</p>
                            </div>
                        </div>
                    </div>
                )
            case 5:
                return (
                    <div className="flex flex-col items-center gap-4 py-6">
                        <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center">
                            <CheckCircle2 className="w-8 h-8 text-green-400" />
                        </div>
                        <div className="text-center">
                            <p className="text-base font-semibold text-foreground mb-2">{t('logs.wizard.setup.steps.done.title')}</p>
                            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">{t('logs.wizard.setup.steps.done.description')}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center mt-2">
                            {[
                                { label: t('logs.destinations.db_title'), val: local.categories.filter(c => c.db && !c.disabled).length },
                                { label: t('logs.destinations.discord_title'), val: local.categories.filter(c => c.discord && !c.disabled).length },
                                { label: t('logs.destinations.relay_title'), val: local.categories.filter(c => c.relay && !c.disabled).length },
                            ].map(({ label, val }) => (
                                <div key={label} className="p-3 rounded-xl bg-muted/20 border border-border/40">
                                    <p className="text-lg font-bold text-foreground">{val}</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )
        }
    }

    return (
        <WizardModal title={t('logs.wizard.setup.title')} onClose={onClose}>
            <div className="flex-1 overflow-y-auto px-6 py-5">
                <div className="flex items-center justify-between mb-5">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wider">{STEPS[step]}</p>
                    <WizardStepDots total={TOTAL} current={step} />
                </div>
                {renderStep()}
            </div>
            <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0">
                <MriButton variant="ghost" size="sm" onClick={() => step > 0 ? setStep(s => s - 1) : onClose()} disabled={false}>
                    {step === 0 ? t('common.cancel_label') : t('logs.wizard.setup.btn_prev')}
                </MriButton>
                <div className="flex items-center gap-2">
                    {step < TOTAL - 1 && (
                        <MriButton size="sm" onClick={() => setStep(s => s + 1)} className="gap-1.5">
                            {t('logs.wizard.setup.btn_next')} <ArrowRight className="w-3.5 h-3.5" />
                        </MriButton>
                    )}
                    {step === TOTAL - 1 && (
                        <MriButton size="sm" onClick={finish} className="gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {t('logs.wizard.setup.btn_finish')}
                        </MriButton>
                    )}
                </div>
            </div>
        </WizardModal>
    )
}

// ─── AddCategoryWizard ────────────────────────────────────────────────────────

function AddCategoryWizard({ existingIds, onAdd, onClose }: {
    existingIds: string[]
    onAdd: (cat: LogCategory) => void
    onClose: () => void
}) {
    const { t } = useI18n()
    const [step, setStep] = useState(0)
    const [cat, setCat] = useState<LogCategory>({ ...EMPTY_CAT })



    const idClean = cat.id.trim().toLowerCase().replace(/\s+/g, '_')
    const idValid = idClean.length > 0 && !existingIds.includes(idClean)
    const labelValid = cat.label.trim().length > 0
    const step0Valid = idValid && labelValid

    const finish = () => {
        if (!step0Valid) return
        onAdd({ ...cat, id: idClean, label: cat.label.trim() })
        onClose()
    }

    const canNext = step === 0 ? step0Valid : true

    const renderStep = () => {
        switch (step) {
            case 0:
                return (
                    <div className="flex flex-col gap-5">
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{t('logs.wizard.add_category.steps.name.description')}</p>
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-foreground">{t('logs.columns.id')}</label>
                                <MriInput
                                    value={cat.id}
                                    onChange={e => setCat(p => ({ ...p, id: (e.target as HTMLInputElement).value }))}
                                    onKeyDown={e => e.key === 'Enter' && canNext && setStep(1)}
                                    placeholder={t('logs.category.id_placeholder')}
                                    className={cn('h-9 text-xs font-mono', cat.id && !idValid && 'border-red-500/50')}
                                />
                                <p className="text-[10px] text-muted-foreground/60 italic pl-0.5">{t('logs.wizard.add_category.id_hint')}</p>
                                {cat.id && !idValid && (
                                    <p className="text-[10px] text-red-400 pl-0.5">
                                        {existingIds.includes(idClean) ? 'ID já existe.' : 'ID inválido.'}
                                    </p>
                                )}
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-foreground">{t('logs.columns.label')}</label>
                                <MriInput
                                    value={cat.label}
                                    onChange={e => setCat(p => ({ ...p, label: (e.target as HTMLInputElement).value }))}
                                    onKeyDown={e => e.key === 'Enter' && canNext && setStep(1)}
                                    placeholder={t('logs.category.label_placeholder')}
                                    className="h-9 text-xs"
                                />
                                <p className="text-[10px] text-muted-foreground/60 italic pl-0.5">{t('logs.wizard.add_category.label_hint')}</p>
                            </div>
                        </div>
                    </div>
                )
            case 1:
                return (
                    <div className="flex flex-col gap-4">
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{t('logs.wizard.add_category.steps.config.description')}</p>
                        <div className="flex flex-col gap-2">
                            {[
                                { key: 'db' as const,      icon: Database, color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',     title: t('logs.destinations.db_title'),      desc: t('logs.destinations.db_desc')      },
                                { key: 'discord' as const, icon: Webhook,  color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20', title: t('logs.destinations.discord_title'), desc: t('logs.destinations.discord_desc') },
                                { key: 'relay' as const,   icon: Radio,    color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20',   title: t('logs.destinations.relay_title'),   desc: t('logs.destinations.relay_desc')   },
                            ].map(({ key, icon: Icon, color, bg, title: dtitle, desc }) => (
                                <button key={key}
                                    onClick={() => setCat(p => ({ ...p, [key]: !p[key] }))}
                                    className={cn(
                                        'flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                                        cat[key] ? bg : 'bg-muted/10 border-border/40 opacity-60 hover:opacity-80'
                                    )}
                                >
                                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', cat[key] ? bg : 'bg-muted/30')}>
                                        <Icon className={cn('w-4 h-4', cat[key] ? color : 'text-muted-foreground')} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-foreground">{dtitle}</p>
                                        <p className="text-[10px] text-muted-foreground leading-relaxed">{desc}</p>
                                    </div>
                                    <div className={cn('w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors',
                                        cat[key] ? 'border-primary bg-primary' : 'border-muted-foreground/30')}>
                                        {cat[key] && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )
            case 2:
                return (
                    <div className="flex flex-col gap-4">
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                            {t('logs.wizard.add_category.webhook_desc', [cat.label])}
                        </p>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-foreground">{t('logs.columns.webhook_discord')}</label>
                            <MriInput
                                value={cat.webhook}
                                onChange={e => setCat(p => ({ ...p, webhook: (e.target as HTMLInputElement).value }))}
                                placeholder={t('logs.category.webhook_placeholder')}
                                className="h-9 text-xs"
                            />
                            <p className="text-[10px] text-muted-foreground/60 italic pl-0.5">{t('logs.settings.general.fallback_webhook_desc')}</p>
                        </div>
                    </div>
                )
        }
    }

    const steps = [
        t('logs.wizard.add_category.steps.name.title'),
        t('logs.wizard.add_category.steps.config.title'),
        ...(cat.discord ? [t('logs.columns.webhook_discord')] : []),
    ]

    return (
        <WizardModal title={t('logs.wizard.add_category.title')} onClose={onClose}>
            <div className="flex-1 overflow-y-auto px-6 py-5">
                <div className="flex items-center justify-between mb-5">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wider">{steps[step]}</p>
                    <WizardStepDots total={steps.length} current={step} />
                </div>
                {renderStep()}
            </div>
            <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0">
                <MriButton variant="ghost" size="sm" onClick={() => step > 0 ? setStep(s => s - 1) : onClose()}>
                    {step === 0 ? t('common.cancel_label') : t('logs.wizard.setup.btn_prev')}
                </MriButton>
                <div className="flex items-center gap-2">
                    {step < steps.length - 1 ? (
                        <MriButton size="sm" onClick={() => setStep(s => s + 1)} disabled={!canNext} className="gap-1.5">
                            {t('logs.wizard.setup.btn_next')} <ArrowRight className="w-3.5 h-3.5" />
                        </MriButton>
                    ) : (
                        <MriButton size="sm" onClick={finish} disabled={!step0Valid} className="gap-1.5">
                            <Plus className="w-3.5 h-3.5" />
                            {t('logs.wizard.add_category.btn_add')}
                        </MriButton>
                    )}
                </div>
            </div>
        </WizardModal>
    )
}

// ─── Settings view ────────────────────────────────────────────────────────────

type SettingsPanel = 'categories' | 'resources' | 'general'

function LogSettingsView({ draft, saving, onChange, onSave, onCancel }: {
    draft: LogSettingsData
    saving: boolean
    onChange: (data: LogSettingsData) => void
    onSave: () => void
    onCancel: () => void
}) {
    const { t } = useI18n()
    const [panel, setPanel] = useState<SettingsPanel>('categories')
    const [newRes, setNewRes] = useState({ ...EMPTY_RES })
    const [showSetupWizard, setShowSetupWizard] = useState(false)
    const [showAddWizard, setShowAddWizard] = useState(false)

    const [dragIdx, setDragIdx] = useState<number | null>(null)
    const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

    const updateCategory = (idx: number, patch: Partial<LogCategory>) =>
        onChange({ ...draft, categories: draft.categories.map((c, i) => i === idx ? { ...c, ...patch } : c) })
    const removeCategory = (idx: number) =>
        onChange({ ...draft, categories: draft.categories.filter((_, i) => i !== idx) })
    const addCategory = (cat: LogCategory) =>
        onChange({ ...draft, categories: [...draft.categories, cat] })

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

    const handleDragStart = (idx: number) => setDragIdx(idx)
    const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOverIdx(idx) }
    const handleDrop = (idx: number) => {
        if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setDragOverIdx(null); return }
        const cats = [...draft.categories]
        const [moved] = cats.splice(dragIdx, 1)
        cats.splice(idx, 0, moved)
        onChange({ ...draft, categories: cats })
        setDragIdx(null); setDragOverIdx(null)
    }
    const handleDragEnd = () => { setDragIdx(null); setDragOverIdx(null) }

    const catGrid = '24px 0.32fr 0.48fr 0.9fr 48px 72px 58px 62px 28px'

    const MEMORY_DISPLAY_MAX = 5000
    const memoryPct = Math.min(100, Math.round((draft.maxMemory / MEMORY_DISPLAY_MAX) * 100))

    const NAV: { id: SettingsPanel; icon: React.ElementType; label: string }[] = [
        { id: 'categories', icon: LayoutList, label: t('logs.settings.nav.categories') },
        { id: 'resources',  icon: Radio,      label: t('logs.settings.nav.resources')  },
        { id: 'general',    icon: Settings,   label: t('logs.settings.nav.general')    },
    ]

    const renderPanel = () => {
        if (panel === 'categories') return (
            <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                    <p className="text-[11px] text-muted-foreground/70 leading-relaxed italic flex-1">
                        {t('logs.settings.categories.description')}
                    </p>
                    <MriButton variant="ghost" size="sm" onClick={() => setShowSetupWizard(true)} className="gap-1.5 text-muted-foreground hover:text-foreground h-8 shrink-0">
                        <Wand2 className="w-3.5 h-3.5" />
                        {t('logs.wizard.setup.btn_open')}
                    </MriButton>
                    <MriButton size="sm" onClick={() => setShowAddWizard(true)} className="gap-1.5 h-8 shrink-0">
                        <Plus className="w-3.5 h-3.5" />
                        {t('logs.category.btn_add')}
                    </MriButton>
                </div>

                <MriCard className="overflow-hidden bg-card border-border p-0">
                    <div className="grid bg-muted/40 border-b border-border px-3 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider items-center gap-x-3"
                        style={{ gridTemplateColumns: catGrid }}>
                        <span />
                        <span>{t('logs.columns.id')}</span>
                        <span>{t('logs.columns.label')}</span>
                        <span>{t('logs.columns.webhook_discord')}</span>
                        <span className="flex justify-center items-center gap-1"><Database className="w-3 h-3" />{t('logs.columns.db_short')}</span>
                        <span className="flex justify-center items-center gap-1"><Webhook className="w-3 h-3" />{t('logs.columns.discord')}</span>
                        <span className="flex justify-center items-center gap-1"><Radio className="w-3 h-3" />{t('logs.columns.relay_short')}</span>
                        <span className="flex justify-center items-center gap-1"><Power className="w-3 h-3" />{t('logs.columns.enabled')}</span>
                        <span className="w-7" />
                    </div>
                    {draft.categories.map((cat, idx) => (
                        <div key={cat.id} draggable
                            onDragStart={() => handleDragStart(idx)}
                            onDragOver={e => handleDragOver(e, idx)}
                            onDrop={() => handleDrop(idx)}
                            onDragEnd={handleDragEnd}
                            className={cn(
                                'grid items-center gap-x-3 px-3 py-2 border-b border-border/50 last:border-0 transition-colors',
                                cat.disabled ? 'opacity-40' : 'hover:bg-muted/20',
                                dragOverIdx === idx && dragIdx !== idx && 'border-t-2 border-t-primary',
                                dragIdx === idx && 'opacity-50 bg-muted/30',
                            )}
                            style={{ gridTemplateColumns: catGrid }}
                        >
                            <button className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground transition-colors flex justify-center">
                                <GripVertical className="w-3.5 h-3.5" />
                            </button>
                            <span className={cn('text-[10px] font-mono text-muted-foreground truncate', cat.disabled && 'line-through')}>{cat.id}</span>
                            <MriInput value={cat.label} onChange={e => updateCategory(idx, { label: (e.target as HTMLInputElement).value })}
                                placeholder="Label" className="h-7 text-xs" disabled={cat.disabled} />
                            <MriInput value={cat.webhook} onChange={e => updateCategory(idx, { webhook: (e.target as HTMLInputElement).value })}
                                placeholder={t('logs.category.webhook_placeholder')} className="h-7 text-[10px]" disabled={cat.disabled} />
                            <div className="flex justify-center"><ToggleBtn active={cat.db}      onClick={() => updateCategory(idx, { db:      !cat.db      })} icon={Database} title={t('logs.columns.db')} /></div>
                            <div className="flex justify-center"><ToggleBtn active={cat.discord} onClick={() => updateCategory(idx, { discord: !cat.discord })} icon={Webhook}  title={t('logs.columns.discord')} /></div>
                            <div className="flex justify-center"><ToggleBtn active={cat.relay}   onClick={() => updateCategory(idx, { relay:   !cat.relay   })} icon={Radio}    title={t('logs.columns.relay')} /></div>
                            <div className="flex justify-center"><ToggleBtn active={!cat.disabled} onClick={() => updateCategory(idx, { disabled: !cat.disabled })}
                                icon={cat.disabled ? PowerOff : Power} title={t('logs.columns.enabled')} danger={!!cat.disabled} /></div>
                            <button onClick={() => removeCategory(idx)}
                                className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-500/10 text-muted-foreground/30 hover:text-red-400 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                    {draft.categories.length === 0 && (
                        <div className="flex flex-col items-center justify-center gap-3 py-10 text-muted-foreground/50">
                            <Database className="w-8 h-8 opacity-30" />
                            <p className="text-sm">{t('logs.settings.categories.empty')}</p>
                        </div>
                    )}
                </MriCard>
                <p className="text-[10px] text-muted-foreground/40 italic pl-1">{t('logs.settings.categories.drag_hint')}</p>
            </div>
        )

        if (panel === 'resources') return (
            <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                    <p className="text-[11px] text-muted-foreground/70 leading-relaxed italic flex-1">
                        {draft.resourceMode === 'whitelist' ? t('logs.settings.resources.desc_whitelist') : t('logs.settings.resources.desc_blacklist')}
                    </p>
                    <div className="flex items-center rounded-lg border border-border overflow-hidden text-[11px] font-medium shrink-0">
                        {(['blacklist', 'whitelist'] as const).map(mode => (
                            <button key={mode} onClick={() => onChange({ ...draft, resourceMode: mode })}
                                className={cn('px-3 py-1.5 capitalize transition-colors',
                                    draft.resourceMode === mode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                                )}>
                                {mode}
                            </button>
                        ))}
                    </div>
                </div>

                <MriCard className="overflow-hidden bg-card border-border p-0">
                    <div className="grid bg-muted/40 border-b border-border px-4 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider items-center gap-x-3"
                        style={{ gridTemplateColumns: '1fr 48px 72px 58px 62px 28px' }}>
                        <span>{t('logs.settings.resources.title')}</span>
                        <span className="flex justify-center items-center gap-1"><Database className="w-3 h-3" />{t('logs.columns.db_short')}</span>
                        <span className="flex justify-center items-center gap-1"><Webhook className="w-3 h-3" />{t('logs.columns.discord')}</span>
                        <span className="flex justify-center items-center gap-1"><Radio className="w-3 h-3" />{t('logs.columns.relay_short')}</span>
                        <span className="flex justify-center items-center gap-1"><Power className="w-3 h-3" />{t('logs.columns.enabled')}</span>
                        <span className="w-7" />
                    </div>
                    {draft.resourceEntries.length === 0 && (
                        <p className="text-[11px] text-muted-foreground/50 text-center py-5 italic">{t('logs.settings.resources.empty')}</p>
                    )}
                    {draft.resourceEntries.map((res, idx) => (
                        <div key={res.name} className={cn(
                            'grid items-center gap-x-3 px-4 py-2 border-b border-border/50 last:border-0 transition-colors',
                            res.disabled ? 'opacity-40' : 'hover:bg-muted/20',
                        )}
                            style={{ gridTemplateColumns: '1fr 48px 72px 58px 62px 28px' }}>
                            <MriInput value={res.name} disabled className="h-7 text-xs font-mono opacity-50 cursor-not-allowed" />
                            <div className="flex justify-center"><ToggleBtn active={res.db}      onClick={() => updateResource(idx, { db:      !res.db      })} icon={Database} title={t('logs.columns.db')} /></div>
                            <div className="flex justify-center"><ToggleBtn active={res.discord} onClick={() => updateResource(idx, { discord: !res.discord })} icon={Webhook}  title={t('logs.columns.discord')} /></div>
                            <div className="flex justify-center"><ToggleBtn active={res.relay}   onClick={() => updateResource(idx, { relay:   !res.relay   })} icon={Radio}    title={t('logs.columns.relay')} /></div>
                            <div className="flex justify-center"><ToggleBtn active={!res.disabled} onClick={() => updateResource(idx, { disabled: !res.disabled })}
                                icon={res.disabled ? PowerOff : Power} title={t('logs.columns.enabled')} danger={!!res.disabled} /></div>
                            <button onClick={() => removeResource(idx)}
                                className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-500/10 text-muted-foreground/30 hover:text-red-400 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                    <div className="grid items-center gap-x-3 px-4 py-2.5 bg-muted/20 border-t border-border/50"
                        style={{ gridTemplateColumns: '1fr 48px 72px 58px 62px 28px' }}>
                        <MriInput value={newRes.name}
                            onChange={e => setNewRes(p => ({ ...p, name: (e.target as HTMLInputElement).value }))}
                            onKeyDown={e => e.key === 'Enter' && addResource()}
                            placeholder={t('logs.settings.resources.placeholder')}
                            className="h-7 text-xs font-mono" />
                        <div className="flex justify-center"><ToggleBtn active={newRes.db}      onClick={() => setNewRes(p => ({ ...p, db:      !p.db      }))} icon={Database} title={t('logs.columns.db')} /></div>
                        <div className="flex justify-center"><ToggleBtn active={newRes.discord} onClick={() => setNewRes(p => ({ ...p, discord: !p.discord }))} icon={Webhook}  title={t('logs.columns.discord')} /></div>
                        <div className="flex justify-center"><ToggleBtn active={newRes.relay}   onClick={() => setNewRes(p => ({ ...p, relay:   !p.relay   }))} icon={Radio}    title={t('logs.columns.relay')} /></div>
                        <div className="flex justify-center"><ToggleBtn active={!newRes.disabled} onClick={() => setNewRes(p => ({ ...p, disabled: !p.disabled }))}
                            icon={newRes.disabled ? PowerOff : Power} title={t('logs.columns.enabled')} danger={!!newRes.disabled} /></div>
                        <button onClick={addResource} disabled={!newRes.name.trim()}
                            className="w-7 h-7 flex items-center justify-center rounded border border-border hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </MriCard>
            </div>
        )

        // General panel
        return (
            <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                {/* Row 1: Webhook + Relay */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-3 p-5 bg-muted/10 border border-border/50 rounded-xl hover:bg-muted/20 transition-colors">
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                                <Webhook className="w-3.5 h-3.5 text-violet-400" />
                            </div>
                            <p className="text-xs font-semibold text-foreground">{t('logs.settings.general.fallback_webhook')}</p>
                        </div>
                        <p className="text-[11px] text-muted-foreground/70 leading-relaxed">{t('logs.settings.general.fallback_webhook_desc')}</p>
                        <MriInput value={draft.fallbackWebhook}
                            onChange={e => onChange({ ...draft, fallbackWebhook: (e.target as HTMLInputElement).value })}
                            placeholder={t('logs.category.webhook_placeholder')}
                            className="h-9 bg-background border-border font-mono text-xs" />
                    </div>

                    <div className="flex flex-col gap-3 p-5 bg-muted/10 border border-border/50 rounded-xl hover:bg-muted/20 transition-colors">
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
                                <Radio className="w-3.5 h-3.5 text-green-400" />
                            </div>
                            <p className="text-xs font-semibold text-foreground">
                                {t('logs.settings.general.relay_event')}
                                <span className="text-[10px] text-muted-foreground font-normal ml-1.5">(server-side)</span>
                            </p>
                        </div>
                        <p className="text-[11px] text-muted-foreground/70 leading-relaxed">{t('logs.settings.general.relay_event_desc')}</p>
                        <MriInput value={draft.forwardEvent}
                            onChange={e => onChange({ ...draft, forwardEvent: (e.target as HTMLInputElement).value })}
                            placeholder="myResource:onLog"
                            className="h-9 bg-background border-border font-mono text-xs" />
                    </div>
                </div>

                {/* Row 2: DB Global */}
                <div className="flex flex-col gap-3 p-5 bg-muted/10 border border-border/50 rounded-xl transition-colors hover:bg-muted/20">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                                <Database className="w-3.5 h-3.5 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-foreground">{t('logs.settings.general.db_global')}</p>
                                <p className="text-[10px] text-muted-foreground/70 mt-0.5">{t('logs.settings.general.db_global_desc')}</p>
                            </div>
                        </div>
                        <Toggle checked={draft.dbEnabled} onChange={v => onChange({ ...draft, dbEnabled: v })} />
                    </div>
                    {draft.dbEnabled && (
                        <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-yellow-500/5 border border-yellow-500/20 animate-in fade-in duration-150">
                            <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
                            <p className="text-[10px] text-yellow-400/80 leading-relaxed">{t('logs.settings.general.db_global_warning')}</p>
                        </div>
                    )}
                </div>

                {/* Row 3: Memory */}
                <div className="flex flex-col gap-3 p-5 bg-muted/10 border border-border/50 rounded-xl hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                            <ScrollText className="w-3.5 h-3.5 text-orange-400" />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs font-semibold text-foreground">{t('logs.settings.general.max_memory')}</p>
                            <p className="text-[10px] text-muted-foreground/70 mt-0.5">{t('logs.settings.general.memory_hint')}</p>
                        </div>
                        <div className="flex items-baseline gap-1.5 shrink-0">
                            <MriInput value={String(draft.maxMemory)}
                                onChange={e => { const v = parseInt((e.target as HTMLInputElement).value); if (!isNaN(v) && v > 0) onChange({ ...draft, maxMemory: v }) }}
                                placeholder="500"
                                className="h-8 bg-background border-border w-20 text-xs font-mono text-right" />
                            <span className="text-[10px] text-muted-foreground/60 whitespace-nowrap">{t('logs.settings.general.memory_unit')}</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden">
                            <div
                                className={cn('h-full rounded-full transition-all duration-500',
                                    memoryPct > 80 ? 'bg-red-400' : memoryPct > 50 ? 'bg-yellow-400' : 'bg-primary'
                                )}
                                style={{ width: `${memoryPct}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-[9px] font-mono text-muted-foreground/40 uppercase tracking-wider">
                            <span>0</span>
                            <span>{memoryPct}% of {MEMORY_DISPLAY_MAX.toLocaleString()}</span>
                            <span>{MEMORY_DISPLAY_MAX.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <>
            {showSetupWizard && (
                <SetupWizard draft={draft} onChange={d => { onChange(d); setShowSetupWizard(false) }} onClose={() => setShowSetupWizard(false)} />
            )}
            {showAddWizard && (
                <AddCategoryWizard existingIds={draft.categories.map(c => c.id)}
                    onAdd={cat => { addCategory(cat); setShowAddWizard(false) }} onClose={() => setShowAddWizard(false)} />
            )}

            <div className="flex-1 flex overflow-hidden animate-in fade-in duration-300">
                {/* ── Sub-nav ──────────────────────────────────────────────── */}
                <nav className="w-48 shrink-0 border-r border-border flex flex-col py-3 gap-0.5 bg-background/40">
                    {NAV.map(({ id, icon: Icon, label }) => (
                        <button key={id} onClick={() => setPanel(id)}
                            className={cn(
                                'flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium transition-colors text-left border-l-2',
                                panel === id
                                    ? 'border-primary text-primary bg-primary/5'
                                    : 'border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                            )}>
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            {label}
                        </button>
                    ))}
                </nav>

                {/* ── Panel ────────────────────────────────────────────────── */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6">
                        {renderPanel()}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border shrink-0">
                        <MriButton variant="ghost" size="sm" onClick={onCancel} disabled={saving}>{t('common.cancel_label')}</MriButton>
                        <MriButton size="sm" onClick={onSave} isLoading={saving} disabled={saving} className="gap-1.5">
                            {!saving && <Save className="w-3.5 h-3.5" />}
                            {t('logs.settings.save')}
                        </MriButton>
                    </div>
                </div>
            </div>
        </>
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
        { value: 'info',    label: 'ℹ️ Info'    },
        { value: 'success', label: '✅ Success' },
        { value: 'warn',    label: '⚠️ Warn'    },
        { value: 'error',   label: '❌ Error'   },
    ], [])

    const logTabs: MriTabItem[] = useMemo(() => [
        { id: 'logs',     label: t('logs.tabs.logs'),     icon: LayoutList },
        { id: 'settings', label: t('logs.tabs.settings'), icon: Settings   },
    ], [t])

    const categoryOptions = useMemo(() =>
        (logSettings?.categories || []).filter(c => !c.disabled).map(c => ({ value: c.id, label: c.label }))
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
                categories:      Array.isArray(res.categories)      ? res.categories      : [],
                resourceEntries: Array.isArray(res.resourceEntries) ? res.resourceEntries : [],
                resourceMode:    res.resourceMode === 'whitelist'    ? 'whitelist'         : 'blacklist',
                fallbackWebhook: res.fallbackWebhook ?? '',
                dbEnabled:       res.dbEnabled !== false,
                maxMemory:       typeof res.maxMemory === 'number' ? res.maxMemory : 500,
                forwardEvent:    res.forwardEvent ?? '',
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
                resource: debouncedResource,
                search: debouncedSearch,
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
            const matchesLevel    = filterLevels.length === 0    || filterLevels.includes(log.level)
            const matchesResource = !debouncedResource || log.resource.includes(debouncedResource)
            const matchesSearch   = !debouncedSearch   || log.message.toLowerCase().includes(debouncedSearch.toLowerCase()) || log.admin.toLowerCase().includes(debouncedSearch.toLowerCase())
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
    }, [activeView, settingsDraft, fetchSettings])

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
            <MriPageHeader title={t('qadmin.page.logs')} icon={ScrollText} countLabel={t('logs.records')} count={total}>
                <MriTabs items={logTabs} value={activeView} onChange={setActiveView} variant="premium" />

                {activeView === 'logs' && <>
                    {categoryOptions.length > 0 && (
                        <MriSelect multiple options={categoryOptions} value={filterCategories}
                            onChange={v => { setFilterCategories(v as string[]); setPage(1) }}
                            placeholder={t('logs.filter.all_categories')} className="h-10 text-xs w-44" />
                    )}
                    <MriSelect multiple options={levelOptions} value={filterLevels}
                        onChange={v => { setFilterLevels(v as string[]); setPage(1) }}
                        placeholder={t('logs.filter.all_levels')} className="h-10 text-xs w-36" />
                    <MriInput value={filterResource} onChange={e => setFilterResource((e.target as HTMLInputElement).value)}
                        placeholder={t('logs.filter.resource_placeholder')} className="h-10 text-xs w-32" />
                    <MriInput value={filterSearch} onChange={e => setFilterSearch((e.target as HTMLInputElement).value)}
                        placeholder={t('logs.filter.search_placeholder')} className="h-10 text-xs w-48" />
                    {(filterCategories.length > 0 || filterLevels.length > 0 || filterResource || filterSearch) && (
                        <MriButton variant="ghost" size="icon"
                            className="border-input bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground h-10 w-10 p-0 shrink-0"
                            onClick={() => { setFilterCategories([]); setFilterLevels([]); setFilterResource(''); setFilterSearch(''); setDebouncedSearch(''); setDebouncedResource('') }}>
                            <X className="w-4 h-4" />
                        </MriButton>
                    )}
                    <MriButton variant="outline" onClick={() => setIsLive(v => !v)}
                        className={cn('h-10 px-3 gap-1.5 text-xs font-medium shrink-0',
                            isLive ? 'border-green-500/40 bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'border-input bg-transparent text-muted-foreground hover:bg-muted'
                        )}>
                        <Circle className={cn('w-2 h-2 fill-current', isLive && 'animate-pulse')} />
                        {isLive ? t('logs.btn.live') : t('logs.btn.paused')}
                    </MriButton>
                    <MriButton variant="outline" onClick={handleExport}
                        className="border-input bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground h-10 w-10 p-0 shrink-0">
                        <Download className="w-4 h-4" />
                    </MriButton>
                    <MriButton variant="outline" onClick={() => fetchLogs(page)} disabled={loading} isLoading={loading}
                        className="border-input bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground h-10 w-10 p-0 shrink-0">
                        {!loading && <RefreshCw className="w-4 h-4" />}
                    </MriButton>
                </>}
            </MriPageHeader>

            {activeView === 'settings' ? (
                settingsDraft ? (
                    <LogSettingsView draft={settingsDraft} saving={settingsSaving}
                        onChange={setSettingsDraft} onSave={saveSettings} onCancel={cancelSettings} />
                ) : (
                    <div className="flex items-center justify-center flex-1 text-muted-foreground text-sm">{t('logs.loading')}</div>
                )
            ) : (
                <div className="flex-1 overflow-hidden flex flex-col gap-3 p-2 pt-0">
                    {newCount > 0 && page !== 1 && (
                        <button onClick={() => fetchLogs(1)}
                            className="shrink-0 w-full text-center text-xs py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-colors">
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
