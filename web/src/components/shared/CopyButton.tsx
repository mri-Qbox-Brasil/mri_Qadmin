import { MriButton } from '@mriqbox/ui-kit'
import { Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CopyButtonProps {
  text: string
  className?: string
  iconSize?: number
  variant?: 'ghost' | 'outline' | 'default' | 'secondary' | 'link'
}

export default function CopyButton({
  text,
  className,
  iconSize = 4,
  variant = 'ghost'
}: CopyButtonProps) {

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text)
  }

  // w-4 h-4 is 16px. iconSize prop is passed as number for tailwind class part (e.g. 4 -> w-4)
  // But constructing dynamic classes can be tricky. Let's stick to standard sizes or direct class passing if needed.
  // For safety/simplicity, I'll assume standard lucide size classes if not overridden.

  return (
    <MriButton
      size="sm"
      variant={variant}
      className={cn("p-0 text-muted-foreground hover:text-foreground", className)}
      onClick={handleCopy}
      title="Copy to clipboard"
    >
      <Copy className={cn(`w-${iconSize} h-${iconSize}`)} />
    </MriButton>
  )
}
