import { useEffect, useState, useRef, useMemo } from 'react'
import { useAppState } from '@/context/AppState'
import { useNui } from '@/context/NuiContext'
import { MriButton, MriInput, MriPageHeader } from '@mriqbox/ui-kit'
import { Send, MessageSquare, AtSign } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso'
import StaffChatSkeleton from '@/components/skeletons/StaffChatSkeleton'
import { MOCK_GAME_DATA } from '@/utils/mockData'
import { cn } from '@/lib/utils'
import { hasPermission } from '@/utils/permissions'

interface ChatMessage {
    message: string
    citizenid: string
    fullname: string
    role?: string | null
    createdAt: number
}

interface StaffPlayer {
    citizenid: string
    name: string
}

function findMentionQuery(text: string): string | null {
    const lastAt = text.lastIndexOf('@')
    if (lastAt === -1) return null
    const after = text.substring(lastAt + 1)
    if (after.startsWith('[')) return null // already a completed @[Name]
    return after
}

function renderText(text: string) {
    return text.split(/(@\[[^\]]+\])/g).map((part, i) => {
        const m = part.match(/^@\[(.+)\]$/)
        return m
            ? <span key={i} className="font-semibold text-yellow-400 dark:text-yellow-300">@{m[1]}</span>
            : <span key={i}>{part}</span>
    })
}

export default function StaffChat() {
    const { staffMessages, setStaffMessages, myPermissions } = useAppState()
    const canDo = (perm: string) => hasPermission(myPermissions, perm)
    const { sendNui } = useNui()
    const { t } = useI18n()
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [myCitizenid, setMyCitizenid] = useState<string | null>(null)
    const virtuosoRef = useRef<VirtuosoHandle>(null)

    const [staffList, setStaffList] = useState<StaffPlayer[]>([])
    const [mentionSearch, setMentionSearch] = useState<string | null>(null)
    const [mentionIndex, setMentionIndex] = useState(0)
    const [mentionAlert, setMentionAlert] = useState<string | null>(null)
    const mentionMapRef = useRef<Record<string, string>>({})

    const filteredStaff = useMemo(() => {
        if (mentionSearch === null) return []
        const q = mentionSearch.toLowerCase()
        return staffList
            .filter(s => s.citizenid !== myCitizenid)
            .filter(s => !q || s.name.toLowerCase().includes(q))
            .slice(0, 6)
    }, [mentionSearch, staffList, myCitizenid])

    useEffect(() => { setMentionIndex(0) }, [mentionSearch])

    // Initial load
    useEffect(() => {
        sendNui<{ messages: ChatMessage[], myCitizenid: string | null }>('GetMessages', {}, MOCK_GAME_DATA.staffMessages)
            .then(result => {
                if (!result) return
                const msgs = Array.isArray(result) ? result : result.messages
                setStaffMessages(msgs || [])
                if (!Array.isArray(result) && result.myCitizenid) setMyCitizenid(result.myCitizenid)
            })
            .finally(() => setLoading(false))

        sendNui<StaffPlayer[]>('GetStaffPlayers', {}, []).then(list => {
            if (!list?.length) return
            setStaffList(list)
            const map: Record<string, string> = {}
            list.forEach(s => { map[s.name] = s.citizenid })
            mentionMapRef.current = map
        })
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Auto-dismiss mention alert after 5s
    useEffect(() => {
        if (!mentionAlert) return
        const t = setTimeout(() => setMentionAlert(null), 5000)
        return () => clearTimeout(t)
    }, [mentionAlert])

    // Listen for pushed messages and mentions
    useEffect(() => {
        const handler = (event: MessageEvent) => {
            const { type, message, senderName } = event.data ?? {}
            if (type === 'newMessage') {
                setStaffMessages(prev => [...prev, message as ChatMessage])
            } else if (type === 'mentioned') {
                setMentionAlert(senderName)
            }
        }
        window.addEventListener('message', handler)
        return () => window.removeEventListener('message', handler)
    }, [setStaffMessages])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setInput(value)
        setMentionSearch(findMentionQuery(value))
    }

    const selectMention = (staff: StaffPlayer) => {
        const lastAt = input.lastIndexOf('@')
        setInput(input.substring(0, lastAt) + `@[${staff.name}]`)
        setMentionSearch(null)
    }

    const extractMentions = (text: string): string[] => {
        const matches = [...text.matchAll(/@\[([^\]]+)\]/g)]
        return [...new Set(matches.map(m => mentionMapRef.current[m[1]]).filter(Boolean))]
    }

    const sendMessage = async () => {
        if (!canDo('qadmin.action.staff_chat_send')) return
        if (!input.trim() || sending) return
        const trimmed = input.trim()
        
        setSending(true)
        try {
            await sendNui('SendMessage', { message: trimmed, mentions: extractMentions(trimmed) })
            setInput('')
            setMentionSearch(null)
        } catch (e) {
            console.error(e)
        } finally {
            setSending(true) // Wait, should be false! Fixing below.
            setSending(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (mentionSearch !== null && filteredStaff.length > 0) {
            if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex(i => Math.min(i + 1, filteredStaff.length - 1)) }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIndex(i => Math.max(i - 1, 0)) }
            else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); selectMention(filteredStaff[mentionIndex]) }
            else if (e.key === 'Escape') setMentionSearch(null)
        } else if (e.key === 'Enter') {
            sendMessage()
        }
    }

    if (loading && staffMessages.length === 0) return <StaffChatSkeleton />

    return (
        <div className="h-full w-full flex flex-col bg-background">
            <MriPageHeader title={t('staffchat.title')} icon={MessageSquare} />

            <div className="flex-1 flex flex-col py-4 px-2 overflow-hidden">
                <div className="flex-1 overflow-hidden p-2 bg-muted/10 shadow-inner rounded-xl border border-border mb-4 relative">
                    {mentionAlert && (
                        <div className="absolute top-2 left-2 right-2 z-10 flex items-center gap-2 bg-yellow-400 text-yellow-950 px-3 py-2 rounded-lg shadow-lg text-[12px] font-semibold animate-in slide-in-from-top-2 duration-200">
                            <AtSign className="w-3.5 h-3.5 shrink-0" />
                            <span>{mentionAlert} te marcou no chat</span>
                            <button onClick={() => setMentionAlert(null)} className="ml-auto opacity-60 hover:opacity-100 text-xs leading-none">✕</button>
                        </div>
                    )}
                    {staffMessages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground/50 gap-2">
                            <MessageSquare className="w-12 h-12 opacity-20" />
                            <p>{t('staffchat.no_messages')}</p>
                        </div>
                    ) : (
                        <Virtuoso
                            ref={virtuosoRef}
                            style={{ height: '100%' }}
                            data={staffMessages as ChatMessage[]}
                            initialTopMostItemIndex={staffMessages.length - 1}
                            followOutput="auto"
                            itemContent={(_, msg: ChatMessage) => {
                                const isMine = myCitizenid ? msg.citizenid === myCitizenid : false
                                const displayName = msg.role ? `${msg.fullname} (${msg.role})` : msg.fullname
                                return (
                                    <div className={cn("flex w-full py-0.5", isMine ? "justify-end" : "justify-start")}>
                                        <div className={cn(
                                            "flex flex-col max-w-[85%] min-w-[80px] rounded-xl px-2.5 py-1 shadow-sm text-[13px] break-words leading-tight transition-all",
                                            isMine
                                                ? "bg-primary text-primary-foreground rounded-tr-none shadow-[0_1px_4px_rgba(var(--primary),0.15)]"
                                                : "bg-muted/50 border border-border/50 text-foreground rounded-tl-none"
                                        )}>
                                            {!isMine && (
                                                <span className="text-[9px] font-bold mb-0.5 tracking-wide uppercase text-primary/80">
                                                    {displayName}
                                                </span>
                                            )}
                                            <div className="flex flex-col gap-0.5">
                                                <span className="leading-snug">{renderText(msg.message)}</span>
                                                <span className={cn(
                                                    "text-[8px] font-medium opacity-60 self-end",
                                                    isMine ? "text-primary-foreground" : "text-muted-foreground"
                                                )}>
                                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            }}
                        />
                    )}
                </div>

                <div className="relative flex gap-3 items-center bg-muted/50 p-2 rounded-xl border border-border">
                    {mentionSearch !== null && filteredStaff.length > 0 && (
                        <div className="absolute bottom-full mb-2 left-0 right-0 bg-popover border border-border rounded-xl overflow-hidden shadow-xl z-50">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border/50 text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                                <AtSign className="w-3 h-3" />
                                Mencionar
                            </div>
                            {filteredStaff.map((staff, i) => (
                                <button
                                    key={staff.citizenid}
                                    onClick={() => selectMention(staff)}
                                    className={cn(
                                        "w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors",
                                        i === mentionIndex ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
                                    )}
                                >
                                    <span className="text-primary font-bold text-xs">@</span>
                                    {staff.name}
                                </button>
                            ))}
                        </div>
                    )}

                    <MriInput
                        value={input}
                        onChange={handleInputChange}
                        placeholder={canDo('qadmin.action.staff_chat_send') ? t('staffchat.placeholder') : "Você não tem permissão para enviar mensagens"}
                        onKeyDown={handleKeyDown}
                        disabled={!canDo('qadmin.action.staff_chat_send')}
                        className="flex-1 h-11 bg-transparent border-none focus-visible:ring-0 text-foreground placeholder:text-muted-foreground disabled:opacity-50"
                    />
                    <MriButton 
                        onClick={sendMessage} 
                        size="icon" 
                        isLoading={sending}
                        disabled={!canDo('qadmin.action.staff_chat_send') || sending}
                        className="h-10 w-10 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg disabled:opacity-50"
                    >
                        {!sending && <Send className="h-5 w-5" />}
                    </MriButton>
                </div>
            </div>
        </div>
    )
}
