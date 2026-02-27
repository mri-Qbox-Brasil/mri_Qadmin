import { useState } from "react";
import { useNui } from "@/context/NuiContext";
import { useAppState } from "@/context/AppState";
import { useI18n } from "@/hooks/useI18n";
import { MriActionDropdown, MriActionDropdownItem } from "@mriqbox/ui-kit";

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
  const [selectedData, setSelectedData] = useState<Record<string, any>>({});
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

  const parsedDropdownItems: MriActionDropdownItem[] = data.dropdown?.map((item: any, idx: number) => {
    const subKey = item.id ?? item.label ?? `__dropdown_${idx}`;
    let baseItem: Partial<MriActionDropdownItem> = {
      id: subKey,
      label: item.label,
      option: item.option as any,
    };

    if (item.option === "text") {
      baseItem.placeholder = item.placeholder || item.label;
      baseItem.onTextChange = (fieldId, val) => handleSelectData(fieldId, { id: fieldId, value: val }, false);
    } else if (item.option === "dropdown") {
      let options: any[] = [];
      const dataKey = typeof item.data === "string" ? item.data : "";

      let valueField = item.valueField || "value";
      let labelField = item.labelField || "label";

      if (Array.isArray(item.data)) {
        options = item.data;
      } else if (dataKey === "players") {
        options = (players || []).filter((p: any) => p.online);
        if (!item.valueField) valueField = "id";
        if (!item.labelField) labelField = "name";
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

      baseItem.options = options.map((opt: any) => ({
         value: opt[valueField],
         label: opt[labelField]
      }));
      baseItem.selectedValue = selectedData[subKey]?.value;
      baseItem.selectedLabel = selectedData[subKey]?.label;
      baseItem.searchPlaceholder = t("actions_search_placeholder");
      baseItem.noneFoundText = t("none_found");
      baseItem.selectPlaceholder = t("select_placeholder");
      baseItem.onDropdownSelect = (fieldId, val) => {
        handleSelectData(fieldId, { id: fieldId, value: val.value, label: val.label }, false);
      }
    } else if (item.option === "button") {
      baseItem.onButtonClick = () => handleSubClick(item);
    }

    return baseItem as MriActionDropdownItem;
  }) || [];

  return (
    <MriActionDropdown
      id={id}
      label={data.label}
      isFavorite={isFavorite}
      onToggleFavorite={onToggleFavorite}
      dropdownItems={parsedDropdownItems}
    />
  );
}
