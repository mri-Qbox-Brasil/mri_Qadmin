import { Skeleton } from "@/components/ui/Skeleton"
import { Users } from "lucide-react"

export default function PlayersSkeleton() {
  return (
    <div className="h-full w-full flex flex-col bg-background">
      {/* Header Placeholder: Title + Stats + Toggles + Search */}
      <div className="flex h-16 items-center border-b border-border bg-card px-8 gap-4 shrink-0">
         <div className="bg-muted w-10 h-10 rounded-lg flex items-center justify-center">
             <Users className="w-5 h-5 opacity-20" />
         </div>
         <div className="flex flex-col gap-1">
             <Skeleton className="h-4 w-24" />
             <Skeleton className="h-3 w-16" />
         </div>
         <div className="flex-1" />

         <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-20 rounded-md" /> {/* View Toggle */}
            <Skeleton className="h-10 w-64 rounded-xl" /> {/* Search */}
            <Skeleton className="h-10 w-10 rounded-md" />  {/* Refresh */}
         </div>
      </div>

      <div className="flex-1 overflow-hidden p-4 relative">
         {/* Simulate Grid View */}
         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
             {[...Array(18)].map((_, i) => (
                 <div key={i} className="bg-card border border-border rounded-xl p-3 flex flex-col gap-2 relative overflow-hidden">
                     {/* Header Card part */}
                     <div className="flex items-center gap-3 border-b border-border/50 pb-2">
                        <Skeleton className="w-10 h-10 rounded-lg" />
                        <div className="flex-1 space-y-1">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-12" />
                        </div>
                        <Skeleton className="w-2 h-2 rounded-full" />
                     </div>
                     {/* Stats part */}
                     <div className="grid grid-cols-3 gap-2 py-2">
                         <div className="flex flex-col items-center gap-1">
                             <Skeleton className="h-3 w-3 rounded-full" />
                             <Skeleton className="h-2 w-8" />
                         </div>
                         <div className="flex flex-col items-center gap-1 border-x border-border/50">
                             <Skeleton className="h-3 w-3 rounded-full" />
                             <Skeleton className="h-2 w-8" />
                         </div>
                         <div className="flex flex-col items-center gap-1">
                             <Skeleton className="h-3 w-3 rounded-full" />
                             <Skeleton className="h-2 w-8" />
                         </div>
                     </div>
                      {/* Footer part */}
                     <div className="mt-auto pt-2 border-t border-border/50 flex justify-between items-center">
                         <Skeleton className="h-2 w-16" />
                         <Skeleton className="h-3 w-10" />
                     </div>
                 </div>
             ))}
         </div>
      </div>
    </div>
  )
}
