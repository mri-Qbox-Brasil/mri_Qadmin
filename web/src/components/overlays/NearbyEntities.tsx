import { useAppState } from '@/context/AppState'
import { MriCard, MriCardContent, MriCardHeader, MriCardTitle } from '@mriqbox/ui-kit'
import { Radar, Car, User, Box } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'

export default function NearbyEntities() {
    const { nearbyEntities } = useAppState()
    const { t } = useI18n()

    if (!nearbyEntities?.show || !nearbyEntities.entities.length) return null

    const getIcon = (type: string) => {
        switch (type) {
            case 'Vehicle': return <Car className="h-3 w-3" />
            case 'Ped': return <User className="h-3 w-3" />
            case 'Object': return <Box className="h-3 w-3" />
            default: return <Radar className="h-3 w-3" />
        }
    }

    return (
        <div className="fixed top-4 right-4 z-50 pointer-events-none">
            <MriCard className="w-64 pointer-events-auto bg-background/80 border-primary/20 shadow-xl overflow-hidden">
                <MriCardHeader className="p-3 pb-2 bg-primary/10 border-b border-primary/10">

                    <MriCardTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                        <Radar className="h-4 w-4 animate-pulse" />
                        {t('devmode.nearby_entities')}
                    </MriCardTitle>
                </MriCardHeader>

                <MriCardContent className="p-0 max-h-80 overflow-y-auto custom-scrollbar">
                    <div className="divide-y divide-primary/5">
                        {nearbyEntities.entities.map((ent, idx) => (
                            <div key={`${ent.type}-${ent.id}-${idx}`} className="p-2 px-3 flex items-center justify-between hover:bg-primary/5 transition-colors">
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="text-primary/60">
                                        {getIcon(ent.type)}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[10px] font-medium truncate uppercase text-foreground/80">
                                            {ent.name}
                                        </span>
                                        <span className="text-[9px] text-muted-foreground flex gap-1">
                                            ID: {ent.id} {ent.netId && `| CID: ${ent.netId}`}
                                        </span>
                                    </div>
                                </div>
                                <span className="text-[10px] font-mono text-primary font-bold whitespace-nowrap ml-2">
                                    {ent.distance}m
                                </span>
                            </div>
                        ))}
                    </div>
                </MriCardContent>
            </MriCard>
        </div>
    )
}
