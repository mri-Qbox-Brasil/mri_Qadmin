import React, { useState } from 'react'
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { MriButton, MriPopover, MriPopoverContent, MriPopoverTrigger, MriCommand, MriCommandEmpty, MriCommandGroup, MriCommandInput, MriCommandItem } from '@mriqbox/ui-kit'
import { useI18n } from "@/context/I18n"

interface Option {
  label: string
  value: string
  // Optional extra data
  [key: string]: any
}

interface CreatableComboboxProps {
  options: Option[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  className?: string
  allowCreate?: boolean
}

export default function CreatableCombobox({
  options,
  value,
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  className,
  allowCreate = true
}: CreatableComboboxProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState("")

  const selectedOption = options.find((opt) => opt.value === value)

  return (
    <MriPopover open={open} onOpenChange={setOpen}>
      <MriPopoverTrigger asChild>
        <MriButton
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between bg-card hover:bg-muted font-normal", className)}
        >
          {value
            ? (selectedOption?.label || value)
            : <span className="text-muted-foreground">{placeholder}</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </MriButton>
      </MriPopoverTrigger>
      <MriPopoverContent className="w-[300px] p-0" align="start">
        <MriCommand>
          <MriCommandInput
            placeholder={searchPlaceholder}
            value={searchValue}
            onValueChange={setSearchValue}
          />
           <MriCommandEmpty className="py-2 px-4 text-sm text-muted-foreground text-center">
             {allowCreate && searchValue ? (
                <div
                    className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors"
                    onClick={() => {
                        console.log('Creating new value (empty state):', searchValue)
                        onChange(searchValue)
                        setOpen(false)
                        setSearchValue("")
                    }}
                >
                    <Plus className="w-4 h-4" />
                    <span>Create "{searchValue}"</span>
                </div>
             ) : (
                <span>No results found.</span>
             )}
           </MriCommandEmpty>
           <MriCommandGroup className="max-h-[200px] overflow-y-auto overflow-x-hidden p-1">
              {options.map((opt) => (
                  <MriCommandItem
                      key={opt.value}
                      value={`${opt.label} ${opt.value}`} // Combine for better searching
                      onSelect={() => {
                          console.log('Selected existing:', opt.value)
                          onChange(opt.value)
                          setOpen(false)
                          setSearchValue("")
                      }}
                  >
                      <Check
                      className={cn(
                          "mr-2 h-4 w-4",
                          value === opt.value ? "opacity-100" : "opacity-0"
                      )}
                      />
                      {opt.label}
                  </MriCommandItem>
              ))}
              {allowCreate && searchValue && !options.some(o => o.value === searchValue) && (
                   <MriCommandItem
                      value={searchValue}
                      onSelect={() => {
                          console.log('Creating new value (list):', searchValue)
                          onChange(searchValue)
                          setOpen(false)
                          setSearchValue("")
                      }}
                      className="text-primary font-medium"
                   >
                      <Plus className="mr-2 h-4 w-4" />
                      Create "{searchValue}"
                   </MriCommandItem>
              )}
           </MriCommandGroup>
        </MriCommand>
      </MriPopoverContent>
    </MriPopover>
  )
}
