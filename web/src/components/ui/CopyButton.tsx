import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { useClipboard } from '@/hooks/useClipboard'
import { cn } from '@/lib/utils'

interface CopyButtonProps {
    text: string
    className?: string
    iconSize?: number
}

export function CopyButton({ text, className, iconSize = 4 }: CopyButtonProps) {
    const { copy } = useClipboard()
    const [copied, setCopied] = useState(false)

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation()
        await copy(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
    }

    return (
        <button
            onClick={handleCopy}
            className={cn('inline-flex items-center justify-center rounded transition-colors', className)}
            title="Copiar"
        >
            {copied
                ? <Check className={`w-${iconSize} h-${iconSize}`} />
                : <Copy className={`w-${iconSize} h-${iconSize}`} />
            }
        </button>
    )
}
