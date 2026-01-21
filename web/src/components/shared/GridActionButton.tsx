import { MriButton } from '@mriqbox/ui-kit'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GridActionButtonProps {
  icon: LucideIcon
  label: string
  onClick: () => void
  variant?: 'default' | 'destructive' | 'warning'
  disabled?: boolean
  className?: string
}

export default function GridActionButton({
  icon: Icon,
  label,
  onClick,
  variant = 'default',
  disabled = false,
  className
}: GridActionButtonProps) {
  return (
    <MriButton
      variant="secondary"
      className={cn(
        "h-12 flex items-center justify-start gap-3 px-4 bg-card hover:bg-muted border border-border text-foreground hover:text-foreground transition-all min-w-0 w-full",
        variant === 'destructive' && "text-red-400 hover:text-red-300 hover:bg-red-900/20 hover:border-red-900/50",
        variant === 'warning' && "text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/20 hover:border-yellow-900/50",
        disabled && "opacity-50 pointer-events-none grayscale cursor-not-allowed",
        className
      )}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="font-medium text-sm truncate w-full text-left" title={label}>{label}</span>
    </MriButton>
  )
}
