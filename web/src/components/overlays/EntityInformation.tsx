import { useAppState } from '@/context/AppState'
import { Card, CardContent, CardHeader, CardTitle } from '@mriqbox/ui-kit'
import { Info } from 'lucide-react'

export default function EntityInformation() {
  const { entityInfo } = useAppState()

  if (!entityInfo?.show) return null

  return (
    <div className="fixed inset-y-0 left-0 flex items-center z-50 pointer-events-none">
      <Card className="w-64 ml-4 pointer-events-auto bg-primary text-primary-foreground border-none shadow-lg">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Info className="h-4 w-4" />
            Entity Information
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2 text-xs space-y-1">
          <p><span className="font-semibold">Model:</span> {entityInfo.name}</p>
          <p><span className="font-semibold">Hash:</span> {entityInfo.hash}</p>
          <div className="mt-4 pt-2 border-t border-primary-foreground/20">
            <p>C - Copy Information</p>
            <p>E - Delete Entity</p>
            <p>ESC - Close</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
