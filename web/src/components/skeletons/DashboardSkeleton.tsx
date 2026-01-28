import { Skeleton } from "@/components/ui/Skeleton"
import { MriPageHeader } from '@mriqbox/ui-kit'
import { LayoutDashboard } from "lucide-react"

export default function DashboardSkeleton() {
  return (
    <div className="h-full w-full flex flex-col bg-background">
      {/* Header Mimic */}
      <MriPageHeader title="Dashboard" icon={LayoutDashboard} />

      <div className="flex-1 overflow-hidden p-8">

        {/* Stats Grid Mimic */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
             {[...Array(8)].map((_, i) => (
                 <div key={i} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
                     <Skeleton className="w-12 h-12 rounded-lg shrink-0" />
                     <div className="space-y-2">
                         <Skeleton className="h-4 w-24" />
                         <Skeleton className="h-6 w-32" />
                     </div>
                 </div>
             ))}
        </div>

        {/* Table Mimic */}
        <div className="flex-1 flex flex-col relative h-[600px]">
            <div className="flex items-center justify-between mb-4 shrink-0">
                 <Skeleton className="h-7 w-32" /> {/* Title: Players */}
                 <Skeleton className="h-10 w-80" /> {/* Search Input */}
            </div>

            <div className="border border-border rounded-xl bg-card flex-1 min-h-0 relative overflow-hidden">
                 {/* Table Header */}
                 <div className="bg-muted border-b border-border h-12 flex items-center px-6 gap-4">
                     <Skeleton className="h-4 w-[30%]" />
                     <Skeleton className="h-4 w-[15%]" />
                     <Skeleton className="h-4 w-[20%]" />
                     <Skeleton className="h-4 w-[20%]" />
                     <Skeleton className="h-4 w-[15%]" />
                 </div>

                 {/* Table Rows */}
                 <div className="p-0">
                     {[...Array(10)].map((_, i) => (
                         <div key={i} className="flex items-center px-6 py-4 gap-4 border-b border-border/50">
                             <div className="w-[30%] flex items-center gap-3">
                                 <Skeleton className="h-8 w-8 rounded-full" />
                                 <div className="space-y-1">
                                     <Skeleton className="h-4 w-32" />
                                     <Skeleton className="h-3 w-16" />
                                 </div>
                             </div>
                             <Skeleton className="h-4 w-[15%]" />
                             <Skeleton className="h-4 w-[20%]" />
                             <Skeleton className="h-4 w-[20%]" />
                             <Skeleton className="h-4 w-[15%]" />
                         </div>
                     ))}
                 </div>
            </div>
        </div>

      </div>
    </div>
  )
}
