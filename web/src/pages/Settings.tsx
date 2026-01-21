import React from 'react'
import { MriCard, MriPageHeader } from '@mriqbox/ui-kit'
import { Sun, Moon, Monitor, Check, Palette, Settings as SettingsIcon, Accessibility } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useI18n } from '@/context/I18n'
import { useTheme } from '@/context/ThemeContext'
import { CustomColorPicker } from '@/components/CustomColorPicker'

const THEMES = [
    { id: 'light', icon: Sun, label: 'settings_theme_light' },
    { id: 'dark', icon: Moon, label: 'settings_theme_dark' },
    { id: 'system', icon: Monitor, label: 'settings_theme_system' },
]

const COLORS = [
    { id: 'green', value: '160 100% 45%', class: 'bg-green-500' },
    { id: 'blue', value: '221 83% 53%', class: 'bg-blue-500' },
    { id: 'purple', value: '262 83% 58%', class: 'bg-purple-500' },
    { id: 'red', value: '346 84% 61%', class: 'bg-red-500' },
    { id: 'orange', value: '25 95% 53%', class: 'bg-orange-500' },
    { id: 'pink', value: '316 73% 52%', class: 'bg-pink-500' },
    { id: 'yellow', value: '47 95% 57%', class: 'bg-yellow-500' },
]

export default function Settings() {
    const { t } = useI18n()
    const { theme, setTheme, accent, setAccent, scale, setScale } = useTheme()

    const handleScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = Number(e.target.value)
        setScale(val)
    }

    return (
        <div className="h-full w-full flex flex-col bg-background">
            <MriPageHeader title={t('settings_title')} icon={SettingsIcon} />

            <div className="flex-1 overflow-auto p-8 animate-in fade-in duration-300">
                <div className="space-y-6 max-w-4xl">

                    {/* Appearance Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-lg font-medium text-foreground pb-2 border-b border-border">
                            <Palette className="w-5 h-5 text-primary" />
                            {t('settings_appearance')}
                        </div>

                        <MriCard className="p-6 space-y-8 bg-card border-border">

                            {/* Theme Mode */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('settings_theme_mode')}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {THEMES.map((item) => {
                                        const Icon = item.icon
                                        const isActive = theme === item.id
                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => setTheme(item.id)}
                                                className={cn(
                                                    "relative flex items-center gap-3 p-4 rounded-xl border transition-all duration-200 text-left",
                                                    isActive
                                                        ? "bg-secondary border-primary shadow-[0_0_0_1px_var(--primary)]"
                                                        : "bg-secondary/50 border-border hover:bg-muted"
                                                )}
                                            >
                                                <div className={cn(
                                                    "p-2 rounded-full transition-colors",
                                                    isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                                )}>
                                                    <Icon className="w-5 h-5" />
                                                </div>
                                                <span className={cn(
                                                    "font-medium",
                                                    isActive ? "text-foreground" : "text-muted-foreground"
                                                )}>{t(item.label)}</span>

                                                {isActive && (
                                                    <div className="absolute top-2 right-2 flex items-center gap-1">
                                                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider hidden sm:block">
                                                            {t('settings_theme_active')}
                                                        </span>
                                                        <span className="flex h-2 w-2 relative">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                                        </span>
                                                    </div>
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Accent Color */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('settings_accent_color')}</h3>
                                <div className="flex flex-wrap gap-3">
                                    {COLORS.map((color) => (
                                        <button
                                            key={color.id}
                                            onClick={() => setAccent(color.id)}
                                            className={cn(
                                                "w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-ring",
                                                color.class
                                            )}
                                        >
                                            {accent === color.id && <Check className="w-5 h-5 text-white stroke-[3px]" />}
                                        </button>
                                    ))}
                                    <CustomColorPicker
                                        color={accent}
                                        onChange={setAccent}
                                        active={!COLORS.some(c => c.id === accent)}
                                    />
                                </div>
                            </div>
                        </MriCard>

                        <div className="flex items-center gap-2 text-lg font-medium text-foreground pb-2 border-b border-border">
                            <Accessibility className="w-5 h-5 text-primary" />
                            {t('settings_accessibility')}
                        </div>

                        {/* Scale */}
                        <MriCard className="p-6 bg-card border-border flex flex-col gap-4">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <h3 className="text-sm font-medium text-foreground">{t('settings_scale_title')}</h3>
                                    <p className="text-xs text-muted-foreground">{t('settings_scale_description')}</p>
                                </div>
                                <span className="text-xs font-mono bg-muted px-2 py-1 rounded text-foreground min-w-[3rem] text-center">{scale}%</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-xs font-medium text-muted-foreground">A-</span>
                                <div className="relative w-full h-6 flex items-center">
                                    {/* Custom Slider Styling */}
                                    <input
                                        type="range"
                                        min="75"
                                        max="125"
                                        step="5"
                                        value={scale}
                                        onChange={handleScaleChange}
                                        className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary z-10"
                                    />
                                    <div
                                        className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-primary rounded-l-lg pointer-events-none"
                                        style={{ width: `${((scale - 75) / (125 - 75)) * 100}%` }}
                                    />
                                </div>
                                <span className="text-xs font-medium text-muted-foreground">A+</span>
                            </div>
                        </MriCard>
                    </div>
                </div>
            </div>
        </div>
    )
}
