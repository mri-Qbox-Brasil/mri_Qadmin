import React from "react";
import { useNui } from "@/context/NuiContext";
import { MriActionButton } from "@mriqbox/ui-kit";

interface ActionButtonProps {
  id: string;
  data: any;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
}

export default function ActionButton({
  id,
  data,
  isFavorite,
  onToggleFavorite,
}: ActionButtonProps) {
  const { sendNui } = useNui();
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleClick = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
        await sendNui("clickButton", { data: id });
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <MriActionButton
      id={id}
      label={data.label}
      isFavorite={isFavorite}
      isProcessing={isProcessing}
      onClick={handleClick}
      onToggleFavorite={onToggleFavorite}
    />
  );
}
