import { useState } from 'react'
import { MriButton } from '@mriqbox/ui-kit'
import { Box } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/hooks/useI18n'
import CopyButton from '@/components/shared/CopyButton'

interface Item {
  item: string
  name: string
  description?: string
}

interface ItemGridCardProps {
  item: Item
  onSpawn: (item: Item) => void
}

export default function ItemGridCard({ item, onSpawn }: ItemGridCardProps) {
  const { t } = useI18n()
  const [imgError, setImgError] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)

  const getImageUrl = (itemId: string) => `https://cfx-nui-ox_inventory/web/images/${itemId}.png`

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex gap-4 hover:border-primary/50 hover:bg-muted/50 transition-all group relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
         <CopyButton text={item.item} className="h-8 w-8 text-muted-foreground hover:text-foreground" />
      </div>

      <div className="w-20 h-20 bg-muted/30 rounded-lg flex items-center justify-center border border-border shrink-0 p-2">
        {!imgError ? (
          <>
            {!imgLoaded && (
              <div className="animate-pulse w-full h-full bg-muted rounded" />
            )}
            <img
              src={getImageUrl(item.item)}
              alt={item.name}
              className={cn("object-contain w-full h-full transition-opacity duration-300", imgLoaded ? 'opacity-100' : 'opacity-0')}
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
            />
          </>
        ) : (
          <Box className="w-8 h-8 text-muted-foreground/50" />
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div>
          <h3 className="font-bold text-foreground truncate pr-8" title={item.name}>{item.name || t('no_name')}</h3>
          <p className="text-xs text-muted-foreground font-mono truncate">{item.item}</p>
        </div>

        <div className="flex items-center justify-between mt-2">
           <p className="text-xs text-muted-foreground truncate max-w-[120px]" title={item.description || ''}>{item.description}</p>
           <MriButton
              size="sm"
              variant="secondary"
              className="h-7 text-xs bg-secondary hover:bg-secondary/80 hover:text-primary border border-border hover:border-primary/50"
              onClick={() => onSpawn(item)}
           >
              {t('btn_spawn')}
           </MriButton>
        </div>
      </div>
    </div>
  )
}
