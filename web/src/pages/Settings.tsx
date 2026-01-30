import React from 'react'
import { MriButton, MriCard, MriPageHeader, MriSelectSearch } from '@mriqbox/ui-kit'
import { Sun, Moon, Monitor, Check, Palette, Settings as SettingsIcon, Accessibility, Languages, RotateCcw, Eye, Ghost, User, Plus, Trash2, Search } from 'lucide-react'
import { useNui } from '@/context/NuiContext'

import { cn } from '@/lib/utils'
import { useI18n } from '@/context/I18n'
import { useTheme } from '@/context/ThemeContext'
import { CustomColorPicker } from '@/components/CustomColorPicker'
import ConfirmAction from '@/components/players/ConfirmAction'

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

const WALL_DEFAULTS = {
    dead: '#FF0000',
    invisible: '#FFFF00',
    default: '#0000FF'
}

export default function Settings() {
    const { t, locale, preferredLocale, setPreferredLocale, supportedLanguages } = useI18n()
    const { theme, setTheme, accent, setAccent, scale, setScale } = useTheme()
    const { sendNui } = useNui()

    const [wallSettings, setWallSettings] = React.useState<any>(null)
    const [availableGroups, setAvailableGroups] = React.useState<string[]>([])
    const [newGroupColor, setNewGroupColor] = React.useState({ group: '', color: '#0000FF' })
    const [confirmDelete, setConfirmDelete] = React.useState<string | null>(null)
    const [groupSearch, setGroupSearch] = React.useState('')

    // Helper functions for color conversion
    const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0, 0, 255';
    }

    const rgbToHex = (rgb: string) => {
        if (!rgb) return '#0000FF';
        if (rgb.startsWith('#')) return rgb; // Already hex
        const parts = rgb.split(',').map(x => parseInt(x.trim()));
        if (parts.length < 3) return '#0000FF';
        const [r, g, b] = parts;
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    }

    const fetchWallSettings = React.useCallback(async () => {
        try {
            const data = await sendNui('mri_Qadmin:callback:GetWallSettings', {}, {
                colors: { 'group.admin': '0, 255, 0', 'group.mod': '255, 0, 255' },
                settings: { dead: '255, 0, 0', invisible: '255, 255, 0', default: '0, 0, 255' }
            })

            // Convert received RGB strings to HEX for the UI
            if (data.settings) {
                const settings = data.settings as Record<string, string>;
                Object.keys(settings).forEach(key => {
                    settings[key] = rgbToHex(settings[key])
                })
            }
            if (data.colors) {
                const colors = data.colors as Record<string, string>;
                Object.keys(colors).forEach(key => {
                    colors[key] = rgbToHex(colors[key])
                })
            }

            setWallSettings(data)

            // Fetch groups for the selector
            const aces = await sendNui("mri_Qadmin:callback:GetAces", {}, [])
            if (Array.isArray(aces)) {
                const uniqueGroups = Array.from(
                    new Set(aces.map((a: any) => a.principal)),
                ).filter((p: string) => p.startsWith("group.")) as string[]
                setAvailableGroups(uniqueGroups)
            }
        } catch (e) {
            console.error(e)
        }
    }, [sendNui])

    React.useEffect(() => {
        fetchWallSettings()
    }, [fetchWallSettings])

    const saveWallSetting = async (type: 'global' | 'principal', key: string, value: string) => {
        // Convert HEX to RGB string before saving
        const rgbValue = hexToRgb(value);
        await sendNui('mri_Qadmin:server:SaveWallSetting', { type, key, value: rgbValue })
        fetchWallSettings()
    }

    const deleteGroupColor = async (principal: string) => {
        await sendNui('mri_Qadmin:server:DeleteWallPrincipalColor', { principal })
        fetchWallSettings()
    }

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

                    {/* Wall / ESP Settings */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-lg font-medium text-foreground pb-2 border-b border-border">
                            <Eye className="w-5 h-5 text-primary" />
                            {t('settings_wall_esp')}
                        </div>

                        <MriCard className="p-6 space-y-8 bg-card border-border">
                            <p className="text-sm text-muted-foreground">{t('settings_wall_esp_desc')}</p>

                            {wallSettings && wallSettings.settings && (
                                <>
                                    {/* Global Wall Colors */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                                <Ghost className="w-3.5 h-3.5 text-red-500" /> {t('settings_wall_dead')}
                                            </label>
                                            <div className="flex items-center gap-3">
                                                <CustomColorPicker
                                                    color={wallSettings.settings.dead}
                                                    onChange={(val) => saveWallSetting('global', 'dead', val)}
                                                    active={true}
                                                    format="hex"
                                                />
                                                <span className="text-xs font-mono text-muted-foreground uppercase flex-1">{wallSettings.settings.dead}</span>
                                                <MriButton
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                    onClick={() => saveWallSetting('global', 'dead', WALL_DEFAULTS.dead)}
                                                    title={t('restore_default')}
                                                >
                                                    <RotateCcw className="w-3.5 h-3.5" />
                                                </MriButton>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                                <Sun className="w-3.5 h-3.5 text-yellow-500" /> {t('settings_wall_invisible')}
                                            </label>
                                            <div className="flex items-center gap-3">
                                                <CustomColorPicker
                                                    color={wallSettings.settings.invisible}
                                                    onChange={(val) => saveWallSetting('global', 'invisible', val)}
                                                    active={true}
                                                    format="hex"
                                                />
                                                <span className="text-xs font-mono text-muted-foreground uppercase flex-1">{wallSettings.settings.invisible}</span>
                                                <MriButton
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                    onClick={() => saveWallSetting('global', 'invisible', WALL_DEFAULTS.invisible)}
                                                    title={t('restore_default')}
                                                >
                                                    <RotateCcw className="w-3.5 h-3.5" />
                                                </MriButton>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                                <User className="w-3.5 h-3.5 text-blue-500" /> {t('settings_wall_default')}
                                            </label>
                                            <div className="flex items-center gap-3">
                                                <CustomColorPicker
                                                    color={wallSettings.settings.default}
                                                    onChange={(val) => saveWallSetting('global', 'default', val)}
                                                    active={true}
                                                    format="hex"
                                                />
                                                <span className="text-xs font-mono text-muted-foreground uppercase flex-1">{wallSettings.settings.default}</span>
                                                <MriButton
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                    onClick={() => saveWallSetting('global', 'default', WALL_DEFAULTS.default)}
                                                    title={t('restore_default')}
                                                >
                                                    <RotateCcw className="w-3.5 h-3.5" />
                                                </MriButton>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Group Colors */}
                                    <div className="space-y-4 pt-6 border-t border-border/50">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('settings_wall_groups')}</h3>

                                            <div className="relative w-full sm:w-64">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                                <input
                                                    type="text"
                                                    value={groupSearch}
                                                    onChange={(e) => setGroupSearch(e.target.value)}
                                                    placeholder={t('search_groups')}
                                                    className="w-full h-8 pl-9 pr-3 rounded-md bg-muted/30 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {wallSettings.colors && Object.entries(wallSettings.colors)
                                                    .filter(([principal]) => principal.toLowerCase().includes(groupSearch.toLowerCase()))
                                                    .map(([principal, color]: [any, any]) => (
                                                        <div key={principal} className="flex items-center justify-between bg-muted/20 p-3 rounded-lg border border-border/50 group/item hover:border-primary/50 transition-colors">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-4 h-4 rounded-full border border-border/50 shadow-sm" style={{ backgroundColor: color }} />
                                                                <span className="font-mono text-xs font-bold truncate max-w-[120px]" title={principal}>{principal}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <CustomColorPicker
                                                                    color={color}
                                                                    onChange={(val) => saveWallSetting('principal', principal, val)}
                                                                    active={true}
                                                                    format="hex"
                                                                />
                                                                <MriButton
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                                                    onClick={() => setConfirmDelete(principal)}
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </MriButton>
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>

                                            {wallSettings.colors && Object.entries(wallSettings.colors).filter(([principal]) => principal.toLowerCase().includes(groupSearch.toLowerCase())).length === 0 && (
                                                <div className="text-center py-8 border-2 border-dashed border-border rounded-xl">
                                                    <Search className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                                                    <p className="text-sm text-muted-foreground">{t('permissions_no_matches')?.replace('%s', groupSearch) || `No matches for "${groupSearch}"`}</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col sm:flex-row items-end gap-3 bg-secondary/30 rounded-xl p-4 border border-border/50 mt-4">
                                            <div className="flex-1 space-y-1.5 w-full">
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">
                                                    {t('settings_wall_select_group')}
                                                </label>
                                                <MriSelectSearch
                                                    options={availableGroups.map(g => ({ label: g, value: g }))}
                                                    value={newGroupColor.group}
                                                    onChange={(val) => setNewGroupColor(prev => ({ ...prev, group: val }))}
                                                    className="bg-background h-10"
                                                />
                                            </div>
                                            <div className="flex items-center gap-3 h-10">
                                                <CustomColorPicker
                                                    color={newGroupColor.color}
                                                    onChange={(val) => setNewGroupColor(prev => ({ ...prev, color: val }))}
                                                    active={true}
                                                    format="hex"
                                                />
                                                <MriButton
                                                    onClick={() => saveWallSetting('principal', newGroupColor.group, newGroupColor.color)}
                                                    disabled={!newGroupColor.group}
                                                    className="h-10 border border-border/50"
                                                >
                                                    <Plus className="w-4 h-4 mr-2" /> {t('settings_wall_add_group')}
                                                </MriButton>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </MriCard>
                    </div>
                </div>
            </div>

            {confirmDelete && (
                <ConfirmAction
                    text={t('settings_wall_confirm_delete_group').replace('%s', confirmDelete)}
                    onConfirm={() => {
                        deleteGroupColor(confirmDelete)
                        setConfirmDelete(null)
                    }}
                    onCancel={() => setConfirmDelete(null)}
                />
            )}
        </div>
    )
}
