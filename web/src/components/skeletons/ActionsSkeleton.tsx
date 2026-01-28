import { Skeleton } from "@/components/ui/Skeleton"
import { Zap } from "lucide-react"

export default function ActionsSkeleton() {
  return (
    <div className="h-full w-full flex flex-col bg-background">
      {/* Header Placeholder */}
       <div className="flex h-16 items-center border-b border-border bg-card px-8 gap-4 shrink-0">
           <Skeleton className="h-6 w-32" />
           <div className="flex-1" />
           <Skeleton className="h-10 w-48 rounded-xl" /> {/* Search */}
           <Skeleton className="h-10 w-10 rounded-md" />  {/* Refresh */}
       </div>

      <div className="flex-1 overflow-hidden p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(12)].map((_, i) => (
                  <div key={i} className="bg-card rounded-xl border border-border p-4 h-[100px] flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                          <Skeleton className="w-9 h-9 rounded-lg" />
                          <Skeleton className="w-5 h-5 rounded-full" />
                      </div>
                      <Skeleton className="h-4 w-3/4" />
                  </div>
              ))}
          </div>
      </div>
    </div>
  )
}
