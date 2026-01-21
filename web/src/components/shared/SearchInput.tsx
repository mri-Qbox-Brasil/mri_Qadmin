import { Search } from 'lucide-react'
import { MriInput } from '@mriqbox/ui-kit'
import { cn } from '@/lib/utils'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  width?: string
}

export default function SearchInput({
  value,
  onChange,
  placeholder,
  className,
  width = "w-80"
}: SearchInputProps) {
  return (
    <div className={cn("relative", width, className)}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <MriInput
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="pl-9 bg-card border-border focus:border-primary/50 h-10 w-full transition-colors"
        />
    </div>
  )
}
