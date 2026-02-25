import { useState } from "react";
import { useNui } from "@/context/NuiContext";
import { MriButton, MriInput, MriPopover, MriPopoverContent, MriPopoverTrigger, MriCommand, MriCommandEmpty, MriCommandGroup, MriCommandInput, MriCommandItem } from '@mriqbox/ui-kit'
import { Check, ChevronsUpDown, Star, ChevronDown, ChevronRight, MousePointerClick } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppState } from "@/context/AppState";
import { useI18n } from "@/hooks/useI18n";

interface ActionDropdownProps {
  id: string;
  data: any;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  singleSelection?: boolean;
}

export default function ActionDropdown({
  id,
  data,
  isFavorite,
  onToggleFavorite,
  singleSelection = false,
}: ActionDropdownProps) {
  const { sendNui } = useNui();
  const { t } = useI18n();
  const { gameData, players } = useAppState();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedData, setSelectedData] = useState<Record<string, any>>({});
  const [popoverOpen, setPopoverOpen] = useState<Record<string, boolean>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSelectData = (
    subId: string,
    val: any,
    onlyOne: boolean = false
  ) => {
    if (onlyOne || singleSelection) {
      setSelectedData({ [subId]: val });
    } else {
      setSelectedData((prev) => ({ ...prev, [subId]: val }));
    }
  };

  const handleSubClick = async (item: any) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
        await sendNui("clickButton", {
            data: id,
            selectedData: selectedData,
        });
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <div
      className={cn(
        "bg-card border border-border rounded-xl transition-all overflow-hidden group",
        isOpen ? "border-primary/50 ring-1 ring-primary/20" : "hover:border-primary/50 hover:bg-muted"
      )}
    >
      <div
        className="w-full p-4 cursor-pointer flex flex-col gap-2 relative min-h-[100px]"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex justify-between items-start">
            <div className={cn("p-2 rounded-lg border border-border transition-colors", isOpen ? "bg-muted border-primary/50 text-foreground" : "bg-muted/50 text-muted-foreground group-hover:border-primary/30 group-hover:text-primary")}>
                <MousePointerClick className="w-5 h-5" />
            </div>

            <div className="flex items-center gap-2">
                 <div
                    role="button"
                    tabIndex={0}
                    className="p-1 text-muted-foreground hover:text-yellow-400 cursor-pointer transition-colors"
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(id);
                    }}
                    >
                    <Star
                        className={cn("h-4 w-4", isFavorite && "fill-yellow-400 text-yellow-400")}
                    />
                </div>
                 <div className="text-muted-foreground">
                    {isOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                 </div>
            </div>
        </div>

        <span className="font-bold text-card-foreground mt-auto">{data.label}</span>
        {isOpen && <div className="absolute inset-x-0 bottom-0 h-[1px] bg-border" />}
      </div>

      {isOpen && (
        <div className="p-4 space-y-4 bg-muted/30">
          {data.dropdown?.map((item: any, idx: number) => {
            const subKey = item.id ?? item.label ?? `__dropdown_${idx}`;
            if (item.option === "text") {
              return (
                <div key={idx} className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground ml-1">
                    {item.label}
                  </label>
                  <MriInput
                    placeholder={item.placeholder || item.label}
                    className="bg-background border-border focus:border-ring h-10"
                    onChange={(e) =>
                      handleSelectData(subKey, { id: subKey, value: e.target.value }, false)
                    }
                  />
                </div>
              );
            } else if (item.option === "dropdown") {
              let options: any[] = [];
              const dataKey = typeof item.data === "string" ? item.data : "";

              let valueField = item.valueField || "value";
              let labelField = item.labelField || "label";

              if (Array.isArray(item.data)) {
                options = item.data;
              } else if (dataKey === "players") {
                options = (players || []).filter((p: any) => p.online); // Filter only online players
                if (!item.valueField) valueField = "id"; // Default to id for players
                if (!item.labelField) labelField = "name"; // Default to name for players
              } else if (dataKey === "vehicles") {
                options = gameData.vehicles || [];
              } else if (dataKey === "items") {
                options = gameData.items || [];
              } else if (dataKey === "jobs") {
                options = gameData.jobs || [];
              } else if (dataKey === "gangs") {
                options = gameData.gangs || [];
              } else if (dataKey === "locations") {
                options = gameData.locations || [];
              } else if (dataKey === "pedlist") {
                options = gameData.peds || [];
              }

              return (
                <div key={idx} className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground ml-1">
                    {item.label}
                  </label>
                  <MriPopover
                    open={Boolean(popoverOpen[subKey])}
                    onOpenChange={(v: boolean) => setPopoverOpen((prev) => ({ ...prev, [subKey]: v }))}
                  >
                    <MriPopoverTrigger asChild>
                      <MriButton
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between bg-background border-border hover:bg-muted hover:text-foreground h-10"
                      >
                        <span className="truncate">
                            {selectedData[subKey]?.label || t("select_placeholder")}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </MriButton>
                    </MriPopoverTrigger>
                    <MriPopoverContent className="w-[300px] p-0 border-border bg-popover">
                      <MriCommand className="bg-transparent">
                        <MriCommandInput
                          placeholder={t("actions_search_placeholder")}
                          className="h-9"
                        />
                        <MriCommandEmpty>{t("none_found")}</MriCommandEmpty>
                        <MriCommandGroup className="max-h-64 overflow-auto p-1">
                          {options.map((opt: any) => {
                            const value = opt[valueField];
                            const label = opt[labelField];

                            return (
                            <MriCommandItem
                              key={String(value)}
                              onSelect={() => {
                                handleSelectData(
                                  subKey,
                                  {
                                    id: subKey,
                                    value: value,
                                    label: label,
                                  },
                                  false
                                );
                                setPopoverOpen((prev) => ({ ...prev, [subKey]: false }));
                              }}
                              className="aria-selected:bg-accent aria-selected:text-accent-foreground rounded-md"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4 text-green-500",
                                  value !== undefined && selectedData[subKey]?.value === value
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              <span className="truncate">{label}</span>
                            </MriCommandItem>
                          )})}
                        </MriCommandGroup>
                      </MriCommand>
                    </MriPopoverContent>
                  </MriPopover>
                </div>
              );
            } else if (item.option === "button") {
              return (
                <MriButton
                  key={idx}
                  variant="secondary"
                  className="w-full bg-secondary hover:bg-primary/20 hover:text-primary transition-colors border border-border"
                  onClick={() => handleSubClick(item)}
                >
                  {item.label}
                </MriButton>
              );
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
}
