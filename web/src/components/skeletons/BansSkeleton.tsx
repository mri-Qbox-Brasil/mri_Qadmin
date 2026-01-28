import { Skeleton } from "@/components/ui/Skeleton"
import { Gavel } from "lucide-react"

export default function BansSkeleton() {
  return (
    <div className="h-full w-full flex flex-col bg-background">
      {/* Header Placeholder */}
       <div className="flex h-16 items-center border-b border-border bg-card px-8 gap-4 shrink-0">
           <Skeleton className="h-6 w-32" />
           <div className="flex-1" />
           <Skeleton className="h-10 w-72 rounded-xl" /> {/* Search */}
           <Skeleton className="h-10 w-10 rounded-md" />  {/* Refresh */}
       </div>

      <div className="flex-1 overflow-hidden p-8">
        <div className="w-full h-full border border-border rounded-xl bg-card overflow-hidden">
            <div className="bg-muted/50 border-b border-border p-4 flex gap-4">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/6" />
                <Skeleton className="h-4 w-1/6" />
                <Skeleton className="h-4 w-1/12" />
            </div>
            <div className="divide-y divide-border">
                {[...Array(10)].map((_, i) => (
                    <div key={i} className="p-4 flex gap-4 items-center">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-4 w-1/6" />
                        <Skeleton className="h-4 w-1/6" />
                        <div className="flex-1" />
                        <Skeleton className="h-8 w-24 rounded-md" />
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  )
}
