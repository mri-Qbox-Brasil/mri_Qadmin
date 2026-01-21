import React, { useEffect, useState } from "react";
import { HexColorPicker } from "react-colorful";
import { colord, extend } from "colord";
import namesPlugin from "colord/plugins/names";
import { cn } from "@/lib/utils";
import * as Popover from "@radix-ui/react-popover";
import { Check, Plus, SlidersHorizontal } from "lucide-react";
import { useI18n } from "@/context/I18n";

extend([namesPlugin]);

interface CustomColorPickerProps {
    color: string;
    onChange: (color: string) => void;
    active: boolean;
}

export const CustomColorPicker = ({ color, onChange, active }: CustomColorPickerProps) => {
    const { t } = useI18n();

    const parseCustomFormat = (c: string) => {
        if (/^\d+(\.\d+)?\s+\d+(\.\d+)?%\s+\d+(\.\d+)?%$/.test(c)) {
            return colord(`hsl(${c})`).toHex();
        }
        return colord(c).toHex();
    };

    const [hex, setHex] = useState(parseCustomFormat(color));
    const [mode, setMode] = useState<'hex' | 'rgb' | 'hsl'>('hex');

    // Internal input state to allow typing freedom without jarring format corrections
    const c = colord(hex);
    const [inputState, setInputState] = useState({
        hex: hex,
        rgb: c.toRgb(),
        hsl: c.toHsl()
    });

    // Sync input state when active color prop changes
    useEffect(() => {
        const newHex = parseCustomFormat(color);
        // Only update if significantly different to avoid cursor jumping if we were editing
        if (colord(newHex).toHex() !== colord(hex).toHex()) {
             setHex(newHex);
             const newC = colord(newHex);
             setInputState({
                 hex: newHex,
                 rgb: newC.toRgb(),
                 hsl: newC.toHsl()
             });
        }
    }, [color]);

    // Handle updates from Color Picker (Visual)
    const handleChange = (newHex: string) => {
        setHex(newHex);
        const newC = colord(newHex);
        setInputState({
            hex: newHex,
            rgb: newC.toRgb(),
            hsl: newC.toHsl()
        });
    };

    const commitChange = () => {
         const hsl = colord(hex).toHsl();
         const hslString = `${Math.round(hsl.h)} ${Math.round(hsl.s)}% ${Math.round(hsl.l)}%`;
         onChange(hslString);
    };

    const updateFromInput = (type: string, val: string | number, part?: string) => {
        // 1. Update local input state immediately
        const newData = { ...inputState };
        if (type === 'hex') {
            newData.hex = val as string;
        } else if (type === 'rgb' && part) {
            // @ts-ignore
            newData.rgb = { ...newData.rgb, [part]: val };
        } else if (type === 'hsl' && part) {
            // @ts-ignore
            newData.hsl = { ...newData.hsl, [part]: val };
        }
        setInputState(newData);

        // 2. Validate and update actual color if valid
        let newColor;
        if (type === 'hex') {
             if (colord(val as string).isValid()) newColor = colord(val as string);
        } else if (type === 'rgb' && part) {
             const { r, g, b } = newData.rgb;
             if (!isNaN(Number(r)) && !isNaN(Number(g)) && !isNaN(Number(b))) {
                 newColor = colord({ r: Number(r), g: Number(g), b: Number(b) });
             }
        } else if (type === 'hsl' && part) {
             const { h, s, l } = newData.hsl;
             if (!isNaN(Number(h)) && !isNaN(Number(s)) && !isNaN(Number(l))) {
                 newColor = colord({ h: Number(h), s: Number(s), l: Number(l) });
             }
        }

        if (newColor && newColor.isValid()) {
            setHex(newColor.toHex());
            // We do NOT update the other inputs here while typing to preserve cursor and state
        }
    };

    return (
        <Popover.Root onOpenChange={(open) => !open && commitChange()}>
            <Popover.Trigger asChild>
                <button
                    className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-ring relative overflow-hidden",
                        active ? "ring-2 ring-offset-2 ring-offset-background ring-ring" : "border border-dashed border-muted-foreground/50 hover:border-solid hover:border-primary"
                    )}
                    style={{ backgroundColor: active ? hex : 'transparent' }}
                >
                    {active ? (
                        <Check className="w-5 h-5 text-white stroke-[3px]" />
                    ) : (
                        <Plus className="w-5 h-5 text-muted-foreground" />
                    )}
                </button>
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content sideOffset={5} className="z-50 w-64 rounded-xl border bg-popover p-3 text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2">
                    <div className="space-y-3">
                        <HexColorPicker color={hex} onChange={handleChange} className="!w-full !h-[120px] !rounded-lg" />

                        <div className="space-y-3">
                            {/* Segmented Control Mode Switcher */}
                            <div className="flex bg-muted/50 p-1 rounded-lg">
                                {(['hex', 'rgb', 'hsl'] as const).map((m) => (
                                    <button
                                        key={m}
                                        onClick={() => setMode(m)}
                                        className={cn(
                                            "flex-1 text-[10px] font-bold uppercase py-1 rounded-md transition-all",
                                            mode === m
                                                ? "bg-background text-foreground shadow-sm"
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>

                            {mode === 'hex' && (
                                 <input
                                    className="w-full text-xs bg-muted/50 px-2 py-1.5 rounded-md border border-transparent focus:border-primary focus:bg-muted focus:outline-none font-mono text-center transition-all"
                                    value={inputState.hex}
                                    onChange={(e) => updateFromInput('hex', e.target.value)}
                                    placeholder="#000000"
                                />
                            )}

                            {mode === 'rgb' && (
                                <div className="grid grid-cols-3 gap-2">
                                    {(['r', 'g', 'b'] as const).map(k => (
                                        <div key={k} className="relative">
                                            <input
                                                className="w-full text-xs bg-muted/50 pl-1 pr-1 py-1.5 rounded-md border border-transparent focus:border-primary focus:bg-muted focus:outline-none font-mono text-center transition-all"
                                                value={inputState.rgb[k]}
                                                onChange={(e) => updateFromInput('rgb', e.target.value, k)}
                                            />
                                            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-muted-foreground uppercase pointer-events-none opacity-50">{k}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {mode === 'hsl' && (
                                <div className="grid grid-cols-3 gap-2">
                                    {(['h', 's', 'l'] as const).map(k => (
                                        <div key={k} className="relative">
                                            <input
                                                className="w-full text-xs bg-muted/50 pl-1 pr-1 py-1.5 rounded-md border border-transparent focus:border-primary focus:bg-muted focus:outline-none font-mono text-center transition-all"
                                                value={Math.round(Number(inputState.hsl[k]))}
                                                onChange={(e) => updateFromInput('hsl', e.target.value, k)}
                                            />
                                             <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-muted-foreground uppercase pointer-events-none opacity-50">{k}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
};
