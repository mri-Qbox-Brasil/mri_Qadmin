import { Skeleton } from "@/components/ui/Skeleton"

interface GridSkeletonProps {
    count?: number;
}

export default function GridSkeleton({ count = 12 }: GridSkeletonProps) {
    return (
        <div className="h-full w-full flex flex-col bg-background">
            {/* Header Placeholder: Title + Search + Button */}
            <div className="flex h-16 items-center border-b border-border bg-card px-8 gap-4 shrink-0">
                <div className="bg-muted w-10 h-10 rounded-lg flex items-center justify-center">
                    <Skeleton className="w-5 h-5 rounded" />
                </div>
                <div className="flex flex-col gap-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                </div>
                <div className="flex-1" />
                <Skeleton className="h-10 w-64 rounded-xl" /> {/* Search */}
                <Skeleton className="h-10 w-10 rounded-md" />  {/* Action Button */}
            </div>

            <div className="flex-1 overflow-hidden p-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                    {[...Array(count)].map((_, i) => (
                        <div key={i} className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
                            <div className="flex items-start justify-between">
                                <Skeleton className="w-12 h-12 rounded-lg" />
                                <Skeleton className="w-6 h-6 rounded" />
                            </div>
                            <div className="space-y-2 mt-2">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
