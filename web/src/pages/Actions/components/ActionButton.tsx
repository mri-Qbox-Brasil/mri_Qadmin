import React from "react";
import { useNui } from "@/context/NuiContext";
import { Star, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

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
    <div
      className={cn(
        "group relative bg-card border border-border rounded-xl hover:border-primary/50 hover:bg-muted transition-all cursor-pointer overflow-hidden p-4 flex flex-col justify-between min-h-[100px]",
        isProcessing && "opacity-50 pointer-events-none"
      )}
      onClick={handleClick}
    >
       <div className="flex justify-between items-start mb-2">
           <div className="p-2 rounded-lg bg-muted border border-border text-muted-foreground group-hover:text-primary group-hover:border-primary/20 transition-colors">
                <Zap className="w-5 h-5" />
           </div>

           <div
            role="button"
            tabIndex={0}
            className="p-1 text-muted-foreground hover:text-yellow-400 cursor-pointer transition-colors z-10"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(id);
            }}
          >
            <Star
              className={cn("h-4 w-4", isFavorite && "fill-yellow-400 text-yellow-400")}
            />
          </div>
       </div>

       <span className="font-bold text-foreground/90 group-hover:text-foreground transition-colors">{data.label}</span>
       <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}
