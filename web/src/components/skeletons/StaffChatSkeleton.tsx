import { Skeleton } from "@/components/ui/Skeleton"
import { Send, MessageSquare } from "lucide-react"

export default function StaffChatSkeleton() {
  return (
    <div className="h-full w-full flex flex-col bg-background">
      {/* Header Placeholder */}
       <div className="flex h-16 items-center border-b border-border bg-card px-8 gap-4 shrink-0">
           <div className="bg-muted w-10 h-10 rounded-lg flex items-center justify-center">
               <MessageSquare className="w-5 h-5 opacity-20" />
           </div>
           <Skeleton className="h-6 w-32" />
       </div>

      <div className="flex-1 flex flex-col p-8 overflow-hidden">
        <div className="flex-1 overflow-hidden p-4 space-y-4 bg-muted/10 shadow-inner rounded-xl border border-border mb-4 flex flex-col justify-end">
            {[...Array(5)].map((_, i) => (
                <div key={i} className={`flex w-full ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                    <div className={`flex flex-col max-w-[70%] min-w-[120px] rounded-lg px-2 py-2 shadow-sm space-y-2 ${i % 2 === 0 ? 'bg-card border border-border rounded-tl-none' : 'bg-primary/20 rounded-tr-none'}`}>
                        {i % 2 === 0 && <Skeleton className="h-2 w-20" />}
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-2 w-10 self-end" />
                    </div>
                </div>
            ))}
        </div>

        <div className="flex gap-3 items-center bg-muted/50 p-2 rounded-xl border border-border">
            <div className="flex-1 h-11 bg-transparent border-none flex items-center px-3">
                 <Skeleton className="h-4 w-24" />
            </div>
            <div className="h-10 w-10 shrink-0 bg-primary/20 rounded-lg flex items-center justify-center">
                 <Send className="h-5 w-5 opacity-20" />
            </div>
        </div>
      </div>
    </div>
  )
}
