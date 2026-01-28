import { Skeleton } from "@/components/ui/Skeleton"
import { Shield } from "lucide-react"

export default function PermissionsSkeleton() {
  return (
    <div className="h-full w-full flex flex-col bg-background">
      {/* Header Placeholder handled by parent usually, but we mimic it for full page feel if needed */}
      <div className="flex-1 overflow-hidden p-6 flex flex-col">
          <div className="max-w-4xl mx-auto w-full h-full flex flex-col space-y-4">
              {/* Title area */}
              <div className="space-y-2">
                  <Skeleton className="h-7 w-48" />
                  <Skeleton className="h-4 w-96" />
              </div>

              {/* Add Input area */}
              <div className="bg-card p-4 rounded-lg border border-border grid grid-cols-12 gap-3 shrink-0">
                  <div className="col-span-6 space-y-1">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-9 w-full rounded-md" />
                  </div>
                  <div className="col-span-6 space-y-1">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-9 w-full rounded-md" />
                  </div>
                  <div className="col-span-8 space-y-1">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-9 w-full rounded-md" />
                  </div>
                  <div className="col-span-2 space-y-1">
                      <Skeleton className="h-3 w-10" />
                      <Skeleton className="h-9 w-full rounded-md" />
                  </div>
                  <div className="col-span-2">
                      <Skeleton className="h-9 w-full rounded-md mt-4" />
                  </div>
              </div>

              {/* List area */}
              <div className="bg-card border border-border rounded-lg p-2 flex-1 space-y-3 overflow-hidden">
                  {[...Array(5)].map((_, i) => (
                      <div key={i} className="border border-border rounded-md overflow-hidden">
                          <div className="p-3 bg-muted/30 flex items-center gap-3">
                              <Skeleton className="w-4 h-4 rounded-full" />
                              <Shield className="w-4 h-4 opacity-10" />
                              <Skeleton className="h-4 w-48" />
                              <div className="flex-1" />
                              <Skeleton className="h-4 w-16 rounded-full" />
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </div>
    </div>
  )
}
