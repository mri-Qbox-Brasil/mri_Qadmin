import { useEffect, useState, useRef } from 'react'
import { useAppState } from '@/context/AppState'
import { useNui } from '@/context/NuiContext'
import { MriButton, MriInput, MriPageHeader } from '@mriqbox/ui-kit'
import { Send, MessageSquare } from 'lucide-react'
import { useI18n } from '@/context/I18n'
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso'
import StaffChatSkeleton from '@/components/skeletons/StaffChatSkeleton'

import { MOCK_GAME_DATA } from '@/utils/mockData'
import { cn } from '@/lib/utils'

export default function StaffChat() {
  const { staffMessages, setStaffMessages } = useAppState()
  const { sendNui } = useNui()
  const { t } = useI18n()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const virtuosoRef = useRef<VirtuosoHandle>(null)

  const [myCitizenid, setMyCitizenid] = useState<string | null>(null)

  // Polling messages
  useEffect(() => {
    const fetchMessages = async () => {
        try {
            const result = await sendNui<any>('GetMessages', {}, MOCK_GAME_DATA.staffMessages)

            if (result) {
                let newMessages: any[] = []
                let newId: string | null = null

                if (Array.isArray(result)) {
                    newMessages = result
                } else if (typeof result === 'object' && 'messages' in result) {
                    newMessages = result.messages
                    if (result.myCitizenid) {
                        newId = result.myCitizenid
                    }
                }

                // Optimization: Only update if changed
                // Simple check: length diff or last msg timestamp diff
                const hasChanged = newMessages.length !== staffMessages.length ||
                                   (newMessages.length > 0 && staffMessages.length > 0 && newMessages[newMessages.length - 1].createdAt !== staffMessages[staffMessages.length - 1].createdAt) ||
                                   (staffMessages.length === 0 && newMessages.length > 0)

                if (hasChanged) {
                    setStaffMessages(newMessages)
                }

                if (newId && newId !== myCitizenid) {
                    setMyCitizenid(newId)
                }
            }
        } catch (e) {
            console.error('[StaffChat] Error fetching messages:', e)
        } finally {
            setLoading(false)
        }
    }

    fetchMessages() // Initial fetch
    const interval = setInterval(fetchMessages, 1000)
    return () => clearInterval(interval)
  }, [sendNui, setStaffMessages, staffMessages, myCitizenid])

  const sendMessage = async () => {
    if (!input.trim()) return
    await sendNui('SendMessage', { message: input })
    setInput('')
    // Optimistically scroll to bottom? Virtuoso handles auto scroll if we are at bottom.
  }

  if (loading && staffMessages.length === 0) {
      return <StaffChatSkeleton />
  }

  return (
    <div className="h-full w-full flex flex-col bg-background">
      <MriPageHeader title={t('staffchat_title')} icon={MessageSquare} />

      <div className="flex-1 flex flex-col p-8 overflow-hidden">

      <div className="flex-1 overflow-hidden p-4 space-y-4 bg-muted/10 shadow-inner rounded-xl border border-border mb-4">
          {staffMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground/50 gap-2">
                  <MessageSquare className="w-12 h-12 opacity-20" />
                  <p>{t('staffchat_no_messages')}</p>
              </div>
          ) : (
              <Virtuoso
                 ref={virtuosoRef}
                 style={{ height: '100%' }}
                 data={staffMessages}
                 initialTopMostItemIndex={staffMessages.length - 1} // Start at bottom
                 followOutput="auto"
                 itemContent={(index, msg) => {
                    const isMine = myCitizenid ? msg.citizenid === myCitizenid : false
                    return (
                        <div className={cn("flex w-full py-1", isMine ? "justify-end" : "justify-start")}>
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
                 }}
              />
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
