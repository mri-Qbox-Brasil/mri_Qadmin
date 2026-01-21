import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  label: string | number
  variant?: 'default' | 'destructive' | 'warning' | 'success' | 'outline' | 'ghost'
  className?: string
  size?: 'xs' | 'sm' | 'md'
}

export default function StatusBadge({
  label,
  variant = 'default',
  className,
  size = 'xs'
}: StatusBadgeProps) {

  return (
    <span className={cn(
      "font-medium rounded border flex items-center justify-center font-mono whitespace-nowrap",
      size === 'xs' && "px-1.5 py-0.5 text-[10px]",
      size === 'sm' && "px-2 py-1 text-xs",
      size === 'md' && "px-2.5 py-1 text-sm",
      variant === 'default' && "bg-muted text-muted-foreground border-border",
      variant === 'outline' && "bg-transparent text-foreground border-border",
      variant === 'ghost' && "bg-black/40 text-zinc-300 border-white/5",
      variant === 'destructive' && "bg-red-500/10 text-red-500 border-red-500/20",
      variant === 'warning' && "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      variant === 'success' && "bg-green-500/10 text-green-500 border-green-500/20",
      className
    )}>
      {label}
    </span>
  )
}
