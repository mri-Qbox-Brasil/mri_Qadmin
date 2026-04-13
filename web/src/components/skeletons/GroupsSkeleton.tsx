import { Skeleton } from "@/components/ui/Skeleton"
import { Briefcase, Skull } from "lucide-react"

export default function GroupsSkeleton() {
    return (
        <div className="h-full w-full flex flex-col bg-background">
            {/* Header Placeholder */}
            <div className="flex h-16 items-center border-b border-border bg-card px-8 gap-4 shrink-0">
                <div className="bg-muted w-10 h-10 rounded-lg flex items-center justify-center">
                    <Briefcase className="w-5 h-5 opacity-20" />
                </div>
                <div className="flex flex-col gap-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                </div>
                <div className="flex-1" />
                <Skeleton className="h-10 w-64 rounded-xl" /> {/* Search */}
                <Skeleton className="h-10 w-10 rounded-md" />  {/* Refresh */}
            </div>

            <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-6 p-8 pb-4">

                {/* Jobs Column */}
                <div className="flex flex-col gap-4 h-full overflow-hidden">
                    <div className="flex items-center gap-2 pb-2 border-b border-border shrink-0">
                        <Briefcase className="h-5 w-5 text-blue-500 opacity-50" />
                        <Skeleton className="h-6 w-32" />
                    </div>
                    <div className="flex-1 overflow-hidden space-y-3">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="bg-card rounded-xl border border-border p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="w-10 h-10 rounded-lg" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-3 w-20" />
                                    </div>
                                </div>
                                <Skeleton className="w-6 h-6 rounded" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Gangs Column */}
                <div className="flex flex-col gap-4 h-full overflow-hidden">
                    <div className="flex items-center gap-2 pb-2 border-b border-border shrink-0">
                        <Skull className="h-5 w-5 text-red-500 opacity-50" />
                        <Skeleton className="h-6 w-32" />
                    </div>
                    <div className="flex-1 overflow-hidden space-y-3">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="bg-card rounded-xl border border-border p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="w-10 h-10 rounded-lg" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-3 w-20" />
                                    </div>
                                </div>
                                <Skeleton className="w-6 h-6 rounded" />
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    )
}
