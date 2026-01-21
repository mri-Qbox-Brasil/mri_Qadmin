import { useEffect, useState, useRef } from 'react'
import { useAppState } from '@/context/AppState'
import { useNui } from '@/context/NuiContext'
import { MriButton, MriInput, MriPageHeader } from '@mriqbox/ui-kit'
import { Send, MessageSquare } from 'lucide-react'
import { useI18n } from '@/context/I18n'

import { MOCK_GAME_DATA } from '@/utils/mockData'
import { cn } from '@/lib/utils'

export default function StaffChat() {
  const { staffMessages, setStaffMessages, players } = useAppState()
  const { sendNui } = useNui()
  const { t } = useI18n()
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Simple timeAgo function
  const timeAgo = (date: number) => {
    const seconds = Math.floor((new Date().getTime() - date) / 1000)
    let interval = seconds / 31536000
    if (interval > 1) return t('time_years_ago', [Math.floor(interval)])
    interval = seconds / 2592000
    if (interval > 1) return t('time_months_ago', [Math.floor(interval)])
    interval = seconds / 86400
    if (interval > 1) return t('time_days_ago', [Math.floor(interval)])
    interval = seconds / 3600
    if (interval > 1) return t('time_hours_ago', [Math.floor(interval)])
    interval = seconds / 60
    if (interval > 1) return t('time_minutes_ago', [Math.floor(interval)])
    return t('time_seconds_ago', [Math.floor(seconds)])
  }

  // Polling messages
  useEffect(() => {
    const fetchMessages = async () => {
        try {
            const result = await sendNui('GetMessages', {}, MOCK_GAME_DATA.staffMessages)
            if (result && Array.isArray(result)) {
                setStaffMessages(result)
            }
        } catch (e) {
            console.error(e)
        }
    }

    fetchMessages() // Initial fetch
    const interval = setInterval(fetchMessages, 1000)
    return () => clearInterval(interval)
  }, [sendNui, setStaffMessages])

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [staffMessages])

  const sendMessage = async () => {
    if (!input.trim()) return
    await sendNui('SendMessage', { message: input })
    setInput('')
  }

  return (
    <div className="h-full w-full flex flex-col bg-background">
      <MriPageHeader title={t('staffchat_title')} icon={MessageSquare} />

      <div className="flex-1 flex flex-col p-8 overflow-hidden">

      <div className="flex-1 overflow-auto p-4 space-y-4 bg-muted/10 shadow-inner rounded-xl border border-border mb-4" ref={scrollRef}>
          {staffMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground/50 gap-2">
                  <MessageSquare className="w-12 h-12 opacity-20" />
                  <p>{t('staffchat_no_messages')}</p>
              </div>
          ) : (
              <div className="flex flex-col gap-2">
                {staffMessages.map((msg: any, idx) => {
                  const isMine = msg.fullname === 'John Doe' // Mock check
                  return (
                    <div key={idx} className={cn("flex w-full", isMine ? "justify-end" : "justify-start")}>
                        <div className={cn(
                            "flex flex-col max-w-[70%] min-w-[80px] rounded-lg px-2 py-1 shadow-sm text-[13px] break-words relative group leading-snug",
                            isMine
                                ? "bg-primary text-primary-foreground rounded-tr-none"
                                : "bg-card border border-border text-foreground rounded-tl-none"
                        )}>
                            {!isMine && (
                                <span className={cn("text-[10px] font-bold mb-0.5 opacity-90", isMine ? "text-primary-foreground" : "text-primary")}>{msg.fullname}</span>
                            )}
                            <div className="flex flex-wrap gap-x-2 items-end justify-between">
                                <span className="mr-2">{msg.message}</span>
                                <span className={cn(
                                    "text-[9px] whitespace-nowrap opacity-70 ml-auto",
                                    isMine ? "text-primary-foreground" : "text-muted-foreground"
                                )}>
                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    </div>
                  )
                })}
              </div>
          )}
      </div>

      <div className="flex gap-3 items-center bg-muted/50 p-2 rounded-xl border border-border">
          <MriInput
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={t('staffchat_placeholder')}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            className="flex-1 h-11 bg-transparent border-none focus-visible:ring-0 text-foreground placeholder:text-muted-foreground"
          />
          <MriButton onClick={sendMessage} size="icon" className="h-10 w-10 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg">
              <Send className="h-5 w-5" />
          </MriButton>
      </div>
      </div>
    </div>
  )
}
