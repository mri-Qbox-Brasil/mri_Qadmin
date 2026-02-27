import React, { useEffect, useState } from 'react'
import { useNui } from '@/context/NuiContext'
import { useI18n } from '@/hooks/useI18n'
import { useAppState } from '@/context/AppState'
import { MriCard, MriButton, MriInput } from '@mriqbox/ui-kit'
import { Plus, MessageSquare, CheckCircle, Clock, Eye, Crosshair, Download, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isEnvBrowser } from '@/utils/misc'
import { MOCK_REPORTS } from '@/utils/mockData'

interface TicketsProps {
    isPlayerMode: boolean; // if true, hide admin features
}

export default function Tickets({ isPlayerMode }: TicketsProps) {
    const { t } = useI18n()
    const { on, off, sendNui } = useNui()
    const { myPermissions } = useAppState()
    const [reports, setReports] = useState<any[]>([])
    const [selectedReport, setSelectedReport] = useState<any | null>(null)
    const [loading, setLoading] = useState(false)

    // Create new ticket state
    const [isCreating, setIsCreating] = useState(false)
    const [newSubject, setNewSubject] = useState('')
    const [newDescription, setNewDescription] = useState('')
    const [newCategory, setNewCategory] = useState('general')

    const fetchReports = async () => {
        setLoading(true)
        try {
            if (isEnvBrowser()) {
                // Dev mode mock injection
                setReports(isPlayerMode
                    ? MOCK_REPORTS.filter(r => r.player_name === 'John Doe')
                    : MOCK_REPORTS
                )
                setLoading(false)
                return
            }

            if (isPlayerMode) {
                const res = await sendNui('mri_Qadmin:callback:GetMyReports')
                setReports(Array.isArray(res) ? res : [])
            } else {
                // Admin Mode
                const res = await sendNui('mri_Qadmin:callback:GetAllReports', { filter: 'open' })
                setReports(Array.isArray(res) ? res : [])
            }
        } catch (e) {
            console.error(e)
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchReports()
    }, [isPlayerMode])

    // Listeners for NUI updates
    useEffect(() => {
        const onCreated = (report: any) => {
            setReports(prev => [report, ...prev])
            if (isCreating) {
                setIsCreating(false)
                setSelectedReport(report)
            }
        }

        const onAdminNew = (report: any) => {
            if (!isPlayerMode) {
                setReports(prev => [report, ...prev])
            }
        }

        const onUpdated = (report: any) => {
            setReports(prev => prev.map(r => r.id === report.id ? report : r))
            if (selectedReport && selectedReport.id === report.id) {
                setSelectedReport(report)
            }
        }

        const onMessage = (msg: any) => {
            // In a real scenario we'd push the message to the specific report
            // For simplicity we can refetch or manually update the selectedReport state if it matches
            if (selectedReport && selectedReport.id === msg.report_id) {
                const updated = { ...selectedReport }
                if (!updated.messages) updated.messages = []
                updated.messages.push(msg)
                setSelectedReport(updated)
            }
        }

        on('ReportCreated', onCreated)
        on('NewAdminReport', onAdminNew)
        on('ReportUpdated', onUpdated)
        on('NewReportMessage', onMessage)

        return () => {
            off('ReportCreated', onCreated)
            off('NewAdminReport', onAdminNew)
            off('ReportUpdated', onUpdated)
            off('NewReportMessage', onMessage)
        }
    }, [on, off, isPlayerMode, selectedReport, isCreating])

    const handleCreateReport = async () => {
        if (!newSubject || !newDescription) return

        if (isEnvBrowser()) {
            const newReport = {
                id: Math.floor(Math.random() * 10000) + 10,
                player_id: "license:test",
                player_name: isPlayerMode ? "John Doe" : "Dev Admin",
                subject: newSubject,
                category: newCategory,
                description: newDescription,
                status: "open",
                created_at: Date.now(),
                messages: []
            }
            setReports(prev => [newReport, ...prev])
            setIsCreating(false)
            setSelectedReport(newReport)
            setNewSubject('')
            setNewDescription('')
            return
        }

        await sendNui('mri_Qadmin:callback:CreateReport', {
            subject: newSubject,
            category: newCategory,
            description: newDescription
        })
        setNewSubject('')
        setNewDescription('')
    }

    const handleClaim = async (id: number) => {
        if (isEnvBrowser()) {
            setReports(prev => prev.map(r => r.id === id ? { ...r, status: 'claimed' } : r))
            if (selectedReport?.id === id) {
                setSelectedReport({ ...selectedReport, status: 'claimed' })
            }
            return
        }
        await sendNui('mri_Qadmin:callback:ClaimReport', { id })
    }

    const handleUnclaim = async (id: number) => {
        if (isEnvBrowser()) {
            setReports(prev => prev.map(r => r.id === id ? { ...r, status: 'open' } : r))
            if (selectedReport?.id === id) {
                setSelectedReport({ ...selectedReport, status: 'open' })
            }
            return
        }
        await sendNui('mri_Qadmin:callback:UnclaimReport', { id })
    }

    const handleResolve = async (id: number) => {
        if (isEnvBrowser()) {
            setReports(prev => prev.map(r => r.id === id ? { ...r, status: 'resolved' } : r))
            if (selectedReport?.id === id) {
                setSelectedReport({ ...selectedReport, status: 'resolved' })
            }
            return
        }
        await sendNui('mri_Qadmin:callback:ResolveReport', { id })
    }

    const [replyText, setReplyText] = useState('')
    const handleReply = async () => {
        if (!replyText || !selectedReport) return

        if (isEnvBrowser()) {
            const mockMsg = {
                id: Math.random(),
                report_id: selectedReport.id,
                sender_type: isPlayerMode ? "player" : "admin",
                sender_name: isPlayerMode ? "John Doe" : "Dev Admin",
                message: replyText,
                created_at: Date.now()
            }

            const updatedReport = { ...selectedReport }
            if (!updatedReport.messages) updatedReport.messages = []
            updatedReport.messages.push(mockMsg)

            setSelectedReport(updatedReport)
            setReports(prev => prev.map(r => r.id === updatedReport.id ? updatedReport : r))
            setReplyText('')
            return
        }

        await sendNui('mri_Qadmin:callback:SendReportMessage', {
            reportId: selectedReport.id,
            message: replyText
        })
        setReplyText('')
    }

    // Admin Actions integration
    const handleAdminAction = async (action: string) => {
        if (!selectedReport) return
        // Map to mri_Qadmin existing actions. We send the citizenid (player_id) 
        // because we don't have the native server ID in the report directly.
        // Actions might need modifications if they only accept server IDs, but `cid` is a standard fallback.
        await sendNui('clickButton', {
            data: action,
            selectedData: { cid: { value: selectedReport.player_id } }
        })
    }

    return (
        <div className="flex h-full w-full gap-4">
            {/* Left Col - List */}
            <MriCard className="w-1/3 flex flex-col h-full overflow-hidden">
                <div className="p-4 border-b border-border flex justify-between items-center">
                    <h2 className="text-xl font-bold">{isPlayerMode ? t('tickets_my_tickets') : t('tickets_active')}</h2>
                    {isPlayerMode && (
                        <MriButton size="sm" onClick={() => setIsCreating(true)}>
                            <Plus className="w-4 h-4 mr-2" /> {t('tickets_new_ticket')}
                        </MriButton>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {loading ? (
                        <div className="p-4 text-center text-muted-foreground">{t('tickets_loading')}</div>
                    ) : reports.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">{t('tickets_not_found')}</div>
                    ) : (
                        reports.map(r => (
                            <div
                                key={r.id}
                                onClick={() => { setSelectedReport(r); setIsCreating(false); }}
                                className={cn(
                                    "p-3 rounded-lg border cursor-pointer transition-colors",
                                    selectedReport?.id === r.id ? "bg-primary/10 border-primary" : "bg-card border-border hover:bg-muted"
                                )}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-semibold truncate max-w-[70%]">{r.subject}</span>
                                    <span className="text-xs text-muted-foreground">#{r.id}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs text-muted-foreground">
                                    <span>{r.player_name}</span>
                                    <span className={cn(
                                        "px-2 py-0.5 rounded-full text-[10px] font-bold",
                                        r.status === 'open' ? "bg-green-500/20 text-green-500" :
                                            r.status === 'claimed' ? "bg-yellow-500/20 text-yellow-500" :
                                                "bg-gray-500/20 text-gray-500"
                                    )}>
                                        {t(`tickets_status_${r.status}`)}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </MriCard>

            {/* Right Col - Details or Create */}
            <MriCard className="flex-1 flex flex-col h-full overflow-hidden">
                {isCreating ? (
                    <div className="p-6 flex flex-col h-full">
                        <h2 className="text-2xl font-bold mb-6">{t('tickets_create_title')}</h2>
                        <div className="space-y-4 flex-1">
                            <div>
                                <label className="text-sm text-muted-foreground mb-1 block">{t('tickets_subject')}</label>
                                <MriInput
                                    value={newSubject}
                                    onChange={(e) => setNewSubject(e.target.value)}
                                    placeholder={t('tickets_subject_placeholder')}
                                />
                            </div>
                            <div>
                                <label className="text-sm text-muted-foreground mb-1 block">{t('tickets_category')}</label>
                                <select
                                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    value={newCategory}
                                    onChange={(e) => setNewCategory(e.target.value)}
                                >
                                    <option value="general">{t('tickets_category_general')}</option>
                                    <option value="bug">{t('tickets_category_bug')}</option>
                                    <option value="player">{t('tickets_category_player')}</option>
                                    <option value="question">{t('tickets_category_question')}</option>
                                </select>
                            </div>
                            <div className="flex-1 flex flex-col">
                                <label className="text-sm text-muted-foreground mb-1 block">{t('tickets_description')}</label>
                                <textarea
                                    className="w-full flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                                    value={newDescription}
                                    onChange={(e) => setNewDescription(e.target.value)}
                                    placeholder={t('tickets_description_placeholder')}
                                />
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end gap-2">
                            <MriButton variant="outline" onClick={() => setIsCreating(false)}>{t('tickets_cancel')}</MriButton>
                            <MriButton onClick={handleCreateReport}>{t('tickets_submit')}</MriButton>
                        </div>
                    </div>
                ) : selectedReport ? (
                    <div className="flex flex-col h-full">
                        {/* Header */}
                        <div className="p-4 border-b border-border flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-bold mb-1">{selectedReport.subject}</h2>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                    <span>#{selectedReport.id}</span>
                                    <span>•</span>
                                    <span>{t('tickets_by')} {selectedReport.player_name}</span>
                                    <span>•</span>
                                    <span>{t('tickets_category')}: {t(`tickets_category_${selectedReport.category}`)}</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {!isPlayerMode && selectedReport.status === 'open' && (
                                    <MriButton size="sm" onClick={() => handleClaim(selectedReport.id)}>{t('tickets_btn_claim')}</MriButton>
                                )}
                                {!isPlayerMode && selectedReport.status === 'claimed' && (
                                    <>
                                        <MriButton size="sm" variant="warning" onClick={() => handleUnclaim(selectedReport.id)}>{t('tickets_btn_unclaim')}</MriButton>
                                        <MriButton size="sm" variant="success" onClick={() => handleResolve(selectedReport.id)}>{t('tickets_btn_resolve')}</MriButton>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Admin Action Bar */}
                        {!isPlayerMode && (
                            <div className="px-4 py-2 border-b border-border bg-card/50 flex gap-2 overflow-x-auto">
                                <MriButton size="sm" variant="outline" onClick={() => handleAdminAction('spectate_player')}>
                                    <Eye className="w-3.5 h-3.5 mr-1" /> {t('tickets_btn_spectate')}
                                </MriButton>
                                <MriButton size="sm" variant="outline" onClick={() => handleAdminAction('teleportToPlayer')}>
                                    <Crosshair className="w-3.5 h-3.5 mr-1" /> {t('tickets_btn_goto')}
                                </MriButton>
                                <MriButton size="sm" variant="outline" onClick={() => handleAdminAction('bringPlayer')}>
                                    <Download className="w-3.5 h-3.5 mr-1" /> {t('tickets_btn_bring')}
                                </MriButton>
                                <MriButton size="sm" variant="outline" onClick={() => handleAdminAction('revivePlayer')}>
                                    <Heart className="w-3.5 h-3.5 mr-1" /> {t('tickets_btn_revive')}
                                </MriButton>
                            </div>
                        )}

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30">
                            {/* Initial Description */}
                            <div className="flex flex-col items-start">
                                <span className="text-xs text-muted-foreground mb-1">{selectedReport.player_name}{t('tickets_author')}</span>
                                <div className="bg-card border border-border p-3 rounded-lg rounded-tl-none max-w-[80%] break-words">
                                    {selectedReport.description}
                                </div>
                            </div>

                            {/* Replies */}
                            {(selectedReport.messages || []).map((msg: any) => {
                                const isMe = isPlayerMode ? msg.sender_type === 'player' : msg.sender_type === 'admin'
                                return (
                                    <div key={msg.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                                        <span className="text-xs text-muted-foreground mb-1">
                                            {msg.sender_name} {msg.sender_type === 'admin' ? t('tickets_staff') : ''}
                                        </span>
                                        <div className={cn(
                                            "p-3 rounded-lg max-w-[80%] break-words",
                                            isMe ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-card border border-border rounded-tl-none"
                                        )}>
                                            {msg.message}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Reply Input */}
                        {selectedReport.status !== 'resolved' && (
                            <div className="p-4 border-t border-border flex gap-2">
                                <MriInput
                                    className="flex-1"
                                    placeholder={t('tickets_placeholder_reply')}
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleReply() }}
                                />
                                <MriButton onClick={handleReply}>{t('tickets_btn_send')}</MriButton>
                            </div>
                        )}
                        {selectedReport.status === 'resolved' && (
                            <div className="p-4 border-t border-border text-center text-muted-foreground bg-muted/50">
                                {t('tickets_closed_message')}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col gap-4">
                        <MessageSquare className="w-16 h-16 opacity-20" />
                        <p>{t('tickets_select_message')}</p>
                    </div>
                )}
            </MriCard>
        </div>
    )
}
