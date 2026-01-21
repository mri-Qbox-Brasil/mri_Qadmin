import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SectionHeaderProps {
  icon: LucideIcon
  title: string
  className?: string
}

export default function SectionHeader({ icon: Icon, title, className }: SectionHeaderProps) {
  return (
    <h3 className={cn("text-muted-foreground text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2", className)}>
      <Icon className="w-3.5 h-3.5" /> {title}
    </h3>
  )
}
