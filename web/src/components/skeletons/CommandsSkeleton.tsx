import { Skeleton } from "@/components/ui/Skeleton"

export default function CommandsSkeleton() {
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[...Array(12)].map((_, i) => (
                        <div key={i} className="bg-card rounded-xl border border-border p-4 flex gap-4 h-[80px]">
                            <Skeleton className="w-12 h-12 rounded-lg shrink-0" />
                            <div className="flex-1 flex flex-col justify-center space-y-2">
                                <Skeleton className="h-4 w-1/2" />
                                <Skeleton className="h-3 w-3/4" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
