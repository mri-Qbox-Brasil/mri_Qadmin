import { Skeleton } from "@/components/ui/Skeleton"

export default function ResourcesSkeleton() {
    return (
        <div className="w-full h-full flex overflow-hidden bg-background">
            {/* Resource List Column */}
            <div className="w-1/2 h-full flex flex-col border-r border-border">
                <div className="flex h-16 items-center border-b border-border bg-card px-8 gap-4 shrink-0">
                    <Skeleton className="h-6 w-32" />
                    <div className="flex-1" />
                    <Skeleton className="h-10 w-72 rounded-xl" />
                    <Skeleton className="h-10 w-10 rounded-md" />
                </div>

                <div className="flex-1 overflow-hidden p-6 space-y-3">
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className="bg-card rounded-xl border border-border p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Skeleton className="w-2 h-2 rounded-full" />
                                <div className="space-y-1">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-3 w-20" />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Skeleton className="h-8 w-16 rounded-md" />
                                <Skeleton className="h-8 w-8 rounded-md" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Changelog Column */}
            <div className="w-1/2 h-full bg-muted/10 p-8 space-y-6">
                <Skeleton className="h-8 w-48" />
                <div className="space-y-8">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="space-y-3">
                            <Skeleton className="h-6 w-32" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-5/6" />
                                <Skeleton className="h-4 w-4/6" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
