import React, { useState, useEffect } from 'react'
import { useNui } from '@/context/NuiContext'
import { useI18n } from '@/hooks/useI18n'
import { MriButton, MriInput } from '@mriqbox/ui-kit'
import { PriorityBadge } from './PriorityBadge'
import { cn } from '@/lib/utils'
import { X, ClipboardList, BookOpen, Trash, User } from 'lucide-react'
import { isEnvBrowser } from '@/utils/misc'

interface PlayerInfoPanelProps {
    playerId: string
    playerName: string
    reportId?: number
    onClose: () => void
}

type ActiveTab = "history" | "notes"

const IDENTIFIER_CONFIG = [
    { key: "license", label: "License" },
    { key: "steam", label: "Steam" },
    { key: "discord", label: "Discord" },
    { key: "fivem", label: "FiveM" },
]

export function PlayerInfoPanel({ playerId, playerName, onClose }: PlayerInfoPanelProps) {
    const { sendNui } = useNui()
    const { t } = useI18n()

    const [activeTab, setActiveTab] = useState<ActiveTab>("history")
    const [newNote, setNewNote] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [loading, setLoading] = useState(true)

    const [historyData, setHistoryData] = useState<any>({ reports: [], notes: [], identifiers: {} })

    useEffect(() => {
        fetchHistory()
    }, [playerId])

    const fetchHistory = async () => {
        setLoading(true)
        if (isEnvBrowser()) {
            setHistoryData({
                reports: [
                    { id: 1, subject: 'Test Report 1', category: 'bug', status: 'resolved', priority: 1, created_at: Date.now() },
                    { id: 2, subject: 'Test Report 2', category: 'player', status: 'open', priority: 2, created_at: Date.now() - 86400000 },
                ],
                notes: [
                    { id: 1, admin_name: 'Dev Admin', note: 'This is a test note.', created_at: Date.now() }
                ],
                identifiers: {
                    license: 'license:test_12345',
                    discord: 'discord:123456789'
                }
            })
            setLoading(false)
            return
        }

        try {
            const data = await sendNui('mri_Qadmin:callback:GetPlayerHistory', { playerId })
            if (data) {
                setHistoryData(data)
            }
        } catch (e) {
            console.error(e)
        }
        setLoading(false)
    }

    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newNote.trim() || isSubmitting) return

        setIsSubmitting(true)
        if (isEnvBrowser()) {
            setHistoryData((prev: any) => ({
                ...prev,
                notes: [{ id: Math.random(), admin_name: 'Dev Admin', note: newNote.trim(), created_at: Date.now() }, ...prev.notes]
            }))
        } else {
            await sendNui('mri_Qadmin:callback:AddPlayerNote', { playerId, note: newNote.trim() })
            await fetchHistory()
        }
        setNewNote("")
        setIsSubmitting(false)
    }

    const formatDate = (dateString: string | number) => {
        if (!dateString) return ''
        const date = new Date(dateString)
        return date.toLocaleString()
    }

    const renderIdentifiers = () => {
        const identifiers = historyData?.identifiers || {}
        if (Object.keys(identifiers).length === 0) return null

        return (
            <div className="px-6 py-3 border-b border-border bg-muted/30">
                <div className="grid grid-cols-2 gap-2">
                    {IDENTIFIER_CONFIG.map(({ key, label }) => {
                        const value = identifiers[key]
                        if (!value) return null

                        return (
                            <div key={key} className="flex flex-col bg-card p-2 rounded border border-border">
                                <span className="text-xs text-muted-foreground">{label}</span>
                                <span className="text-sm truncate" title={value}>{value}</span>
                            </div>
                        )
                    })}
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-[100]" onClick={onClose}>
            <div
                className="bg-card border border-border rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary">
                            <User className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">{playerName}</h2>
                            <p className="text-xs text-muted-foreground font-mono">{playerId}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {renderIdentifiers()}

                {/* Report Tabs */}
                <div className="flex border-b border-border bg-muted/10">
                    <button
                        onClick={() => setActiveTab("history")}
                        className={cn(
                            "flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center justify-center gap-2",
                            activeTab === "history"
                                ? "border-primary text-foreground"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <ClipboardList className="w-4 h-4" />
                        {t('tickets_tab_history')}
                    </button>
                    <button
                        onClick={() => setActiveTab("notes")}
                        className={cn(
                            "flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center justify-center gap-2",
                            activeTab === "notes"
                                ? "border-primary text-foreground"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <BookOpen className="w-4 h-4" />
                        {t('tickets_tab_notes')}
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto bg-muted/5 relative">
                    {loading ? (
                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                            {t('tickets_loading')}
                        </div>
                    ) : activeTab === "history" ? (
                        <div className="p-4 space-y-3">
                            {!historyData?.reports || historyData.reports.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    {t('tickets_no_history')}
                                </p>
                            ) : (
                                historyData.reports.map((report: any) => (
                                    <div key={report.id} className="p-4 bg-card border border-border rounded-lg shadow-sm">
                                        <div className="flex items-start justify-between gap-3 mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs text-muted-foreground">#{report.id}</span>
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                                    report.status === 'open' ? "bg-green-500/20 text-green-500" :
                                                        report.status === 'claimed' ? "bg-yellow-500/20 text-yellow-500" :
                                                            "bg-gray-500/20 text-gray-500"
                                                )}>
                                                    {t(`tickets_status_${report.status}`)}
                                                </span>
                                                <PriorityBadge priority={report.priority ?? 1} size="sm" />
                                            </div>
                                            <span className="text-xs text-muted-foreground">{formatDate(report.created_at)}</span>
                                        </div>
                                        <h4 className="text-sm font-semibold mb-1">{report.subject}</h4>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                                            <span className="px-2 py-0.5 bg-muted rounded">{t(`tickets_category_${report.category}`)}</span>
                                            {report.claimed_by_name && (
                                                <span className="text-yellow-500/80">
                                                    {t('tickets_claimed_by')} {report.claimed_by_name}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col h-full">
                            <div className="flex-1 p-4 space-y-3">
                                {!historyData?.notes || historyData.notes.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-8">
                                        {t('tickets_no_notes')}
                                    </p>
                                ) : (
                                    historyData.notes.map((note: any) => (
                                        <div key={note.id} className="p-3 bg-muted/50 rounded-lg border border-border">
                                            <div className="flex items-start justify-between gap-2 mb-2 border-b border-border/50 pb-2">
                                                <span className="text-xs font-semibold text-primary">{note.admin_name}</span>
                                                <span className="text-[10px] text-muted-foreground">{formatDate(note.created_at)}</span>
                                            </div>
                                            <p className="text-sm whitespace-pre-wrap">{note.note}</p>
                                        </div>
                                    ))
                                )}
                            </div>

                            <form onSubmit={handleAddNote} className="p-4 border-t border-border bg-card">
                                <div className="flex gap-2">
                                    <textarea
                                        value={newNote}
                                        onChange={(e) => setNewNote(e.target.value)}
                                        placeholder={t('tickets_add_note_placeholder')}
                                        className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-lg resize-none focus:outline-none focus:border-primary placeholder:text-muted-foreground"
                                        rows={2}
                                        maxLength={1000}
                                    />
                                    <MriButton
                                        type="submit"
                                        disabled={!newNote.trim() || isSubmitting}
                                        className="self-end"
                                    >
                                        {t('tickets_btn_send')}
                                    </MriButton>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
