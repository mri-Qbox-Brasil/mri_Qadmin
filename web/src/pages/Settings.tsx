import React from 'react'
import { MriCard, MriPageHeader, MriSelectSearch } from '@mriqbox/ui-kit'
import { Sun, Moon, Monitor, Check, Palette, Settings as SettingsIcon, Accessibility, Languages, RotateCcw } from 'lucide-react'

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
    const { t, locale, preferredLocale, setPreferredLocale, supportedLanguages } = useI18n()
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

                            {/* Language Selection */}
                            <div className="space-y-3 pt-4 border-t border-border/50">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                        <Languages className="w-3.5 h-3.5" /> Language / Idioma
                                    </h3>
                                    {preferredLocale && (
                                        <button
                                            onClick={() => setPreferredLocale(null)}
                                            className="text-[10px] flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors uppercase font-bold tracking-tighter"
                                        >
                                            <RotateCcw className="w-3 h-3" /> Reset to Default
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-end gap-4 bg-secondary/30 rounded-xl p-4 border border-border">
                                        <div className="flex-1 space-y-1.5">
                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">
                                                {t('label_select_language') || "Select Language"}
                                            </label>
                                            <MriSelectSearch
                                                options={supportedLanguages.map(lang => ({
                                                    label: lang.label,
                                                    value: lang.id
                                                }))}
                                                value={preferredLocale || locale}
                                                onChange={(val) => setPreferredLocale(val)}
                                                className="bg-background"
                                            />
                                        </div>
                                    </div>
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
