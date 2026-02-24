import React from 'react';
import { cn } from '@/lib/utils';

interface KeyboardVisualizerProps {
    pressedKeys: string[];
    className?: string;
}

export default function KeyboardVisualizer({ pressedKeys, className }: KeyboardVisualizerProps) {
    const isPressed = (label: string) => pressedKeys.includes(label.toUpperCase());

    const Key = ({ label, code, className: keyClass, style }: { label: string, code?: string, className?: string, style?: React.CSSProperties }) => {
        const active = isPressed(code || label);
        return (
            <div
                style={style}
                className={cn(
                    "h-8 flex items-center justify-center rounded-md border text-[10px] font-bold transition-all duration-100 select-none shrink-0 shadow-sm",
                    active
                        ? "bg-primary text-primary-foreground border-primary shadow-[0_0_15px_rgba(var(--primary),0.5)] scale-90 z-10"
                        : "bg-black/40 text-white/70 border-white/20 backdrop-blur-md",
                    keyClass
                )}
            >
                {label}
            </div>
        );
    };

    return (
        <div className={cn("p-4 bg-black/40 backdrop-blur-3xl rounded-3xl border border-white/10 flex gap-6 w-fit mx-auto shadow-2xl overflow-hidden", className)}>
            {/* 1. Main Keyboard (Alphanumeric) */}
            <div className="flex flex-col gap-1.5 w-[480px] shrink-0">
                {/* Row 1: Function Keys */}
                <div className="flex gap-1.5 mb-1">
                    <Key label="ESC" className="w-10 mr-4" />
                    <div className="flex gap-1">
                        <Key label="F1" className="w-9" />
                        <Key label="F2" className="w-9" />
                        <Key label="F3" className="w-9" />
                        <Key label="F4" className="w-9" />
                    </div>
                    <div className="w-2" />
                    <div className="flex gap-1">
                        <Key label="F5" className="w-9" />
                        <Key label="F6" className="w-9" />
                        <Key label="F7" className="w-9" />
                        <Key label="F8" className="w-9" />
                    </div>
                    <div className="w-2" />
                    <div className="flex gap-1">
                        <Key label="F9" className="w-9" />
                        <Key label="F10" className="w-9" />
                        <Key label="F11" className="w-9" />
                        <Key label="F12" className="w-9" />
                    </div>
                </div>

                {/* Row 2: Numbers */}
                <div className="flex gap-1">
                    <Key label="~" className="w-8" />
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "="].map(k => (
                        <Key key={k} label={k} className="flex-1" />
                    ))}
                    <Key label="BACK" className="w-16" />
                </div>

                {/* Row 3: TAB */}
                <div className="flex gap-1">
                    <Key label="TAB" className="w-14" />
                    {["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\"].map(k => (
                        <Key key={k} label={k} className="flex-1" />
                    ))}
                </div>

                {/* Row 4: CAPS */}
                <div className="flex gap-1">
                    <Key label="CAPS" className="w-16" />
                    {["A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'"].map(k => (
                        <Key key={k} label={k} className="flex-1" />
                    ))}
                    <Key label="ENTER" className="w-24" />
                </div>

                {/* Row 5: SHIFT */}
                <div className="flex gap-1">
                    <Key label="SHIFT" className="w-24" />
                    {["Z", "X", "C", "V", "B", "N", "M", ",", ".", "/"].map(k => (
                        <Key key={k} label={k} className="flex-1" />
                    ))}
                    <Key label="SHIFT" className="w-28" />
                </div>

                {/* Row 6: Bottom Row */}
                <div className="flex gap-1">
                    <Key label="CTRL" className="w-14" />
                    <Key label="WIN" className="w-14" />
                    <Key label="ALT" className="w-14" />
                    <Key label="SPACE" className="flex-[6] h-8" />
                    <Key label="ALT" className="w-14" />
                    <Key label="WIN" className="w-14" />
                    <Key label="CTRL" className="w-14" />
                </div>
            </div>

            {/* 2. Navigation & Arrows Section */}
            <div className="flex flex-col gap-6 shrink-0">
                <div className="h-9 mb-1 invisible" /> {/* Placeholder para alinhamento com linha de funções */}
                <div className="grid grid-cols-3 gap-1 w-[124px]">
                    {["INS", "HM", "PU"].map(k => (
                        <Key key={k} label={k} code={k === "HM" ? "HOME" : k === "PU" ? "PGUP" : k} className="h-8" />
                    ))}
                    {["DEL", "END", "PD"].map(k => (
                        <Key key={k} label={k} code={k === "PD" ? "PGDN" : k} className="h-8" />
                    ))}
                </div>

                <div className="grid grid-cols-3 gap-1 w-[124px] mt-auto">
                    <div />
                    <Key label="UP" code="W" className="h-8" />
                    <div />
                    <Key label="LFT" code="A" className="h-8" />
                    <Key label="DWN" code="S" className="h-8" />
                    <Key label="RGT" code="D" className="h-8" />
                </div>
            </div>

            {/* 3. Numpad Section */}
            <div className="flex flex-col gap-1 w-[130px] shrink-0">
                <div className="h-9 mb-1 invisible" /> {/* Align with function row */}
                <div className="flex gap-1">
                    <Key label="NM" code="NUM" className="w-8" />
                    <Key label="/" code="NUM /" className="w-8" />
                    <Key label="*" code="NUM *" className="w-8" />
                    <Key label="-" code="NUM -" className="w-8" />
                </div>
                <div className="flex gap-1">
                    <div className="flex flex-col gap-1">
                        <div className="flex gap-1">
                            <Key label="7" code="NUM 7" className="w-8" />
                            <Key label="8" code="NUM 8" className="w-8" />
                            <Key label="9" code="NUM 9" className="w-8" />
                        </div>
                        <div className="flex gap-1">
                            <Key label="4" code="NUM 4" className="w-8" />
                            <Key label="5" code="NUM 5" className="w-8" />
                            <Key label="6" code="NUM 6" className="w-8" />
                        </div>
                    </div>
                    <Key label="+" code="NUM +" className="w-8 h-[68px]" />
                </div>
                <div className="flex gap-1">
                    <div className="flex flex-col gap-1">
                        <div className="flex gap-1">
                            <Key label="1" code="NUM 1" className="w-8" />
                            <Key label="2" code="NUM 2" className="w-8" />
                            <Key label="3" code="NUM 3" className="w-8" />
                        </div>
                        <div className="flex gap-1">
                            <Key label="0" code="NUM 0" className="w-[40px]" />
                            <Key label="." code="NUM ." className="w-8" />
                        </div>
                    </div>
                    <Key label="EN" code="NUM ENTER" className="w-8 h-[68px]" />
                </div>
            </div>

            {/* 4. Mouse Section */}
            <div className="flex flex-col gap-2 w-24">
                <div className="h-32 border border-white/10 rounded-t-[2.5rem] flex relative overflow-hidden bg-black/20">
                    <div className={cn(
                        "flex-1 border-r border-white/10 transition-all duration-100",
                        isPressed('LMB') ? "bg-primary/80 shadow-[inset_0_0_20px_rgba(var(--primary),0.4)]" : "bg-transparent"
                    )} />
                    <div className={cn(
                        "flex-1 transition-all duration-100",
                        isPressed('RMB') ? "bg-primary/80 shadow-[inset_0_0_20px_rgba(var(--primary),0.4)]" : "bg-transparent"
                    )} />
                    {/* Scroll wheel */}
                    <div className="absolute top-8 left-1/2 -translate-x-1/2 w-4 h-12 rounded-full border border-white/10 bg-black/40 shadow-inner" />
                </div>
                <div className="h-20 border border-white/10 rounded-b-[2.5rem] bg-black/20" />
            </div>
        </div>
    );
}
