import React from 'react'
import { MriButton, MriCard, MriPageHeader, MriSelect, MriInput, MriSearchInput, MriScrollArea } from '@mriqbox/ui-kit'
import { Sun, Check, Palette, Settings as SettingsIcon, Accessibility, RotateCcw, Eye, Ghost, User, Plus, Trash2, Search, Code, Server } from 'lucide-react'
import { useNui } from '@/context/NuiContext'
import { useAppState } from '@/context/AppState'

import { cn } from '@/lib/utils'
import { useI18n } from '@/hooks/useI18n'
import { useTheme } from '@/context/ThemeContext'
import { MriColorPicker } from '@mriqbox/ui-kit'
import { MriTabs, MriTabItem } from '@/components/ui/MriTabs'
import ConfirmAction from '@/components/players/ConfirmAction'
import { hasPermission } from '@/utils/permissions'

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

const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0, 0, 255';
}

const rgbToHex = (rgb: string) => {
    if (!rgb) return '#0000FF';
    if (rgb.startsWith('#')) return rgb;
    const parts = rgb.split(',').map(x => parseInt(x.trim()));
    if (parts.length < 3) return '#0000FF';
    const [r, g, b] = parts;
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

export default function Settings() {
    const { t, locale, preferredLocale, setPreferredLocale, supportedLanguages } = useI18n()
    const { accent, setAccent, scale, setScale } = useTheme()
    const { sendNui } = useNui()
    const { settings, setSettings, gameData, useMocks, setUseMocks, myPermissions } = useAppState()
    const canDo = (perm: string) => hasPermission(myPermissions, perm)

    const [wallSettings, setWallSettings] = React.useState<any>({ colors: {}, settings: {}, localSettings: {} })
    const [localWallSettings, setLocalWallSettings] = React.useState<any>({ colors: {}, settings: {}, localSettings: {} })
    const [availableGroups, setAvailableGroups] = React.useState<string[]>([])
    const [newGroupColor, setNewGroupColor] = React.useState({ group: '', color: '#0000FF' })
    const [confirmDelete, setConfirmDelete] = React.useState<string | null>(null)
    const [groupSearch, setGroupSearch] = React.useState('')
    const [activeTab, setActiveTab] = React.useState<'general' | 'server' | 'wall'>('general')
    const [saving, setSaving] = React.useState(false)

    const timeoutRef = React.useRef<Record<string, any>>({})

    const handleLocalWallChange = (type: 'global' | 'principal', key: string, value: string) => {
        setLocalWallSettings((prev: any) => {
            const next = { ...prev }
            if (type === 'global') next.settings = { ...next.settings, [key]: value }
            else next.colors = { ...next.colors, [key]: value }
            return next
        })

        if (timeoutRef.current[key]) clearTimeout(timeoutRef.current[key])
        timeoutRef.current[key] = setTimeout(() => {
            saveWallSetting(type, key, value)
            delete timeoutRef.current[key]
        }, 200)
    }

    const fetchWallSettings = React.useCallback(async () => {
        try {
            const data = await sendNui('mri_Qadmin:callback:GetWallSettings', {}, {
                colors: { 'group.admin': '0, 255, 0', 'group.mod': '255, 0, 255' },
                settings: { dead: '255, 0, 0', invisible: '255, 255, 0', default: '0, 0, 255' },
                localSettings: { style: 'classic', tracer: 'bottom', skeleton: true }
            })

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
            setLocalWallSettings(JSON.parse(JSON.stringify(data)))

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
        setSaving(true)
        try {
            const rgbValue = hexToRgb(value);
            await sendNui('mri_Qadmin:server:SaveWallSetting', { type, key, value: rgbValue })
            await fetchWallSettings() // Sync back from server
        } finally {
            setSaving(false)
        }
    }

    const saveLocalWallSetting = async (key: string, value: any) => {
        setLocalWallSettings((prev: any) => ({
            ...prev,
            localSettings: { ...prev.localSettings, [key]: value }
        }))
        await sendNui('mri_Qadmin:client:SaveLocalWallSetting', { key, value })
    }

    const deleteGroupColor = async (principal: string) => {
        await sendNui('mri_Qadmin:server:DeleteWallPrincipalColor', { principal })
        fetchWallSettings()
    }

    const handleScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = Number(e.target.value)
        setScale(val)
    }

    const handleSettingChange = (key: string, value: any) => {
        setSettings(prev => ({ ...prev, [key]: value }))
        sendNui('updateSetting', { key, value }).catch(console.error)
    }

    const renderPrimitiveSettings = () => {
        return Object.entries(settings).map(([key, val]) => {
            const valType = typeof val
            const description = gameData.descriptions?.[key]
            const options = gameData.settingOptions?.[key]

            if (valType === 'boolean') {
                return (
                    <div key={key} className="flex flex-col p-4 bg-muted/10 border border-border/40 rounded-xl gap-2 hover:bg-muted/20 transition-colors">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold font-mono text-muted-foreground">{key}</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={val as boolean}
                                    onChange={(e) => handleSettingChange(key, e.target.checked)}
                                />
                                <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary border border-border"></div>
                            </label>
                        </div>
                        {description && (
                            <p className="text-[10px] text-muted-foreground/70 leading-relaxed italic">{description}</p>
                        )}
                    </div>
                )
            } else if (valType === 'string' || valType === 'number') {
                return (
                    <div key={key} className="flex flex-col space-y-2 p-4 bg-muted/10 border border-border/40 rounded-xl hover:bg-muted/20 transition-colors">
                        <label className="text-xs font-bold font-mono text-muted-foreground pl-1">{key}</label>
                        {options ? (
                            <MriSelect
                                value={val as string | number}
                                onChange={(newVal) => handleSettingChange(key, newVal)}
                                options={options.map(opt => ({ label: opt.label, value: opt.value }))}
                                className="bg-background"
                            />
                        ) : (
                            <MriInput
                                type={valType === 'number' ? 'number' : 'text'}
                                value={val as string | number}
                                onChange={(e) => {
                                    const newVal = valType === 'number' ? Number(e.target.value) : e.target.value
                                    handleSettingChange(key, newVal)
                                }}
                                className="bg-background border-border h-10"
                            />
                        )}
                        {description && (
                            <p className="text-[10px] text-muted-foreground/70 leading-relaxed italic pl-1">{description}</p>
                        )}
                    </div>
                )
            }
            return null
        })
    }

    const settingsTabs: MriTabItem[] = [
        { id: 'general', label: t('settings.general') || "Geral", icon: SettingsIcon },
        { id: 'server', label: t('settings.server') || "Servidor", icon: Server },
        { id: 'wall', label: t('settings.wall.title'), icon: Eye },
    ].filter(tab => {
        if (tab.id === 'server') return canDo('qadmin.action.manage_settings')
        return true
    })

    return (
        <div className="h-full w-full flex flex-col bg-background">
            <MriPageHeader title={t('settings.title')} icon={SettingsIcon}>
                <MriTabs
                    items={settingsTabs}
                    value={activeTab}
                    onChange={setActiveTab}
                    variant="premium"
                />
            </MriPageHeader>

            <div className="flex-1 overflow-auto p-8 animate-in fade-in duration-300">
                <div className="max-w-6xl mx-auto">

                    {activeTab === 'general' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4 duration-500">
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-lg font-medium text-foreground pb-2 border-b border-border">
                                    <Palette className="w-5 h-5 text-primary" />
                                    {t('settings.appearance')}
                                </div>

                                <MriCard className="p-6 space-y-8 bg-card border-border">
                                    <div className="space-y-3">
                                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('settings.accent_color')}</h3>
                                        <div className="flex flex-wrap gap-3">
                                            {COLORS.map((color) => (
                                                <button
                                                    key={color.id}
                                                    onClick={() => setAccent(color.id)}
                                                    className={cn(
                                                        "w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-ring shadow-lg",
                                                        color.class
                                                    )}
                                                >
                                                    {accent === color.id && <Check className="w-5 h-5 text-white stroke-[3px]" />}
                                                </button>
                                            ))}
                                            <MriColorPicker
                                                color={COLORS.some(c => c.id === accent) ? '#00E396' : accent}
                                                onChange={setAccent}
                                                active={true}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-6 border-t border-border/50">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                                {t('settings.language.title') || "Language / Idioma"}
                                            </h3>
                                            {preferredLocale && (
                                                <MriButton
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={async () => {
                                                        setSaving(true)
                                                        try {
                                                            await setPreferredLocale(null)
                                                        } finally {
                                                            setSaving(false)
                                                        }
                                                    }}
                                                    isLoading={saving}
                                                    className="text-[10px] flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors uppercase font-bold tracking-tighter h-auto py-0"
                                                >
                                                    {!saving && <RotateCcw className="w-3 h-3" />} {t('settings.language.reset') || "Reset to Default"}
                                                </MriButton>
                                            )}
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex flex-col sm:flex-row sm:items-end gap-4 bg-secondary/30 rounded-2xl p-4 border border-border shadow-sm">
                                                <div className="flex-1 space-y-1.5">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">
                                                        {t('labels.select_language') || "Select Language"}
                                                    </label>
                                                    <MriSelect
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
                            </div>

                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-lg font-medium text-foreground pb-2 border-b border-border">
                                        <Accessibility className="w-5 h-5 text-primary" />
                                        {t('settings.accessibility')}
                                    </div>

                                    <MriCard className="p-6 bg-card border-border flex flex-col gap-6">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                <h3 className="text-sm font-medium text-foreground">{t('settings.scale.title')}</h3>
                                                <p className="text-xs text-muted-foreground">{t('settings.scale.description')}</p>
                                            </div>
                                            <span className="text-xs font-mono bg-primary/10 px-3 py-1 rounded-full text-primary font-bold min-w-[3.5rem] text-center">{scale}%</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-xs font-bold text-muted-foreground">75%</span>
                                            <div className="relative w-full h-8 flex items-center group">
                                                <input
                                                    type="range"
                                                    min="75"
                                                    max="125"
                                                    step="5"
                                                    value={scale}
                                                    onChange={handleScaleChange}
                                                    className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-primary z-10 hover:h-2.5 transition-all"
                                                />
                                                <div
                                                    className="absolute left-0 top-1/2 -translate-y-1/2 h-2 bg-primary rounded-l-full pointer-events-none group-hover:h-2.5 transition-all"
                                                    style={{ width: `${((scale - 75) / (125 - 75)) * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-bold text-muted-foreground">125%</span>
                                        </div>
                                    </MriCard>
                                </div>

                                 {canDo('qadmin.action.toggle_mock_mode') && (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-lg font-medium text-foreground pb-2 border-b border-border">
                                            <Code className="w-5 h-5 text-primary" />
                                            {t('settings.developer.title') || "Developer Settings"}
                                        </div>
                                        <MriCard className="p-6 bg-card border-border">
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <h3 className="text-sm font-medium text-foreground">{t('settings.developer.mock_mode') || "Mock Mode"}</h3>
                                                    <p className="text-xs text-muted-foreground italic">{t('settings.developer.mock_mode_desc') || "Enable mock data for testing even in FiveM environment."}</p>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only peer"
                                                        checked={useMocks}
                                                        onChange={(e) => setUseMocks(e.target.checked)}
                                                    />
                                                    <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary border border-border"></div>
                                                </label>
                                            </div>
                                        </MriCard>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'server' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-500">
                            <div className="flex items-center gap-2 text-lg font-medium text-foreground pb-2 border-b border-border">
                                <Server className="w-5 h-5 text-primary" />
                                {t('settings.server_configs.title')}
                            </div>
                            <MriCard className="p-8 bg-card border-border shadow-lg">
                                <p className="text-sm text-muted-foreground mb-8">
                                    {t('settings.server_configs.description')}
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {renderPrimitiveSettings()}
                                </div>
                                {Object.keys(settings).length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border rounded-3xl">
                                        <SettingsIcon className="w-16 h-16 text-muted-foreground/10 mb-4 animate-pulse" />
                                        <p className="text-lg font-bold text-muted-foreground">Nenhuma configuração global encontrada.</p>
                                        <p className="text-sm text-muted-foreground/60 max-w-xs mx-auto">Verifique os arquivos de configuração do servidor ou permissões do Banco de Dados.</p>
                                    </div>
                                )}
                            </MriCard>
                        </div>
                    )}

                    {activeTab === 'wall' && (
                        <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">

                             {canDo('qadmin.action.manage_wall') && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-lg font-medium text-foreground pb-2 border-b border-border">
                                        <Server className="w-5 h-5 text-primary" />
                                        Configurações Globais do Servidor (Wall)
                                    </div>

                                    <MriCard className="p-6 space-y-8 bg-card border-border">
                                        <p className="text-sm text-muted-foreground">{t('settings.wall.description')}</p>

                                        {localWallSettings && localWallSettings.settings && (
                                            <>
                                                <div className="grid grid-cols-3 gap-6">
                                                    <div className="space-y-2 p-4 bg-muted/10 border border-border/40 rounded-xl">
                                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                                                            <Ghost className="w-3.5 h-3.5 text-red-500" /> {t('settings.wall.colors.dead')}
                                                        </label>
                                                        <div className="flex items-center gap-3">
                                                            <MriColorPicker
                                                                color={localWallSettings.settings.dead}
                                                                onChange={(val) => handleLocalWallChange('global', 'dead', val)}
                                                                active={true}
                                                                format="hex"
                                                            />
                                                            <span className="text-xs font-mono text-muted-foreground uppercase flex-1">{wallSettings?.settings?.dead}</span>
                                                            <MriButton
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                                onClick={() => saveWallSetting('global', 'dead', WALL_DEFAULTS.dead)}
                                                                isLoading={saving}
                                                                title={t('common.restore_default')}
                                                            >
                                                                {!saving && <RotateCcw className="w-3.5 h-3.5" />}
                                                            </MriButton>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2 p-4 bg-muted/10 border border-border/40 rounded-xl">
                                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                                                            <Sun className="w-3.5 h-3.5 text-yellow-500" /> {t('settings.wall.colors.invisible')}
                                                        </label>
                                                        <div className="flex items-center gap-3">
                                                            <MriColorPicker
                                                                color={localWallSettings.settings.invisible}
                                                                onChange={(val) => handleLocalWallChange('global', 'invisible', val)}
                                                                active={true}
                                                                format="hex"
                                                            />
                                                            <span className="text-xs font-mono text-muted-foreground uppercase flex-1">{wallSettings?.settings?.invisible}</span>
                                                            <MriButton
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                                onClick={() => saveWallSetting('global', 'invisible', WALL_DEFAULTS.invisible)}
                                                                title={t('common.restore_default')}
                                                            >
                                                                <RotateCcw className="w-3.5 h-3.5" />
                                                            </MriButton>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2 p-4 bg-muted/10 border border-border/40 rounded-xl">
                                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                                                            <User className="w-3.5 h-3.5 text-blue-500" /> {t('settings.wall.colors.default')}
                                                        </label>
                                                        <div className="flex items-center gap-3">
                                                            <MriColorPicker
                                                                color={localWallSettings.settings.default}
                                                                onChange={(val) => handleLocalWallChange('global', 'default', val)}
                                                                active={true}
                                                                format="hex"
                                                            />
                                                            <span className="text-xs font-mono text-muted-foreground uppercase flex-1">{wallSettings?.settings?.default}</span>
                                                            <MriButton
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                                onClick={() => saveWallSetting('global', 'default', WALL_DEFAULTS.default)}
                                                                title={t('common.restore_default')}
                                                            >
                                                                <RotateCcw className="w-3.5 h-3.5" />
                                                            </MriButton>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-4 pt-6 border-t border-border/50">
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('settings.wall.groups.title')}</h3>

                                                        <MriSearchInput
                                                            value={groupSearch}
                                                            onChange={setGroupSearch}
                                                            placeholder={t('common.search_groups')}
                                                            size="sm"
                                                            width="w-full sm:w-64"
                                                        />
                                                    </div>

                                                    <div className="flex flex-1 xl:flex-row items-end gap-3 bg-primary/5 rounded-2xl p-5 border border-primary/10 mt-4 shadow-inner">
                                                        <div className="flex-1 space-y-2 w-full">
                                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
                                                                {t('settings.wall.groups.select')}
                                                            </label>
                                                            <MriSelect
                                                                options={availableGroups.map(g => ({ label: g, value: g }))}
                                                                value={newGroupColor.group}
                                                                onChange={(val) => setNewGroupColor(prev => ({ ...prev, group: val }))}
                                                                className="bg-background h-11"
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-4 h-11">
                                                            <MriColorPicker
                                                                color={newGroupColor.color}
                                                                onChange={(val) => setNewGroupColor(prev => ({ ...prev, color: val }))}
                                                                active={true}
                                                                format="hex"
                                                                className="scale-110"
                                                            />
                                                            <MriButton
                                                                onClick={() => saveWallSetting('principal', newGroupColor.group, newGroupColor.color)}
                                                                disabled={!newGroupColor.group || saving}
                                                                isLoading={saving}
                                                                className="h-11 px-6 rounded-xl border border-primary/20 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-bold whitespace-nowrap shadow-sm"
                                                            >
                                                                {!saving && <Plus className="w-4 h-4 mr-2" />} {t('settings.wall.groups.add')}
                                                            </MriButton>
                                                        </div>
                                                    </div>

                                                    <MriScrollArea className="max-h-[300px]">
                                                    <div className="space-y-3 pr-2">
                                                        <div className="grid grid-cols-4 gap-3">
                                                            {localWallSettings?.colors && Object.entries(localWallSettings.colors)
                                                                .filter(([principal]) => principal.toLowerCase().includes(groupSearch.toLowerCase()))
                                                                .map(([principal, color]: [any, any]) => (
                                                                    <div key={principal} className="flex items-center justify-between bg-muted/10 p-4 rounded-xl border border-border/40 group/item hover:border-primary/50 transition-all hover:shadow-md">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="w-5 h-5 rounded-full border border-border/50 shadow-sm" style={{ backgroundColor: color }} />
                                                                            <span className="font-mono text-xs font-bold truncate max-w-[150px]" title={principal}>{principal}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            <MriColorPicker
                                                                                color={color}
                                                                                onChange={(val) => handleLocalWallChange('principal', principal, val)}
                                                                                active={true}
                                                                                format="hex"
                                                                            />
                                                                            <MriButton
                                                                                size="icon"
                                                                                variant="ghost"
                                                                                className="h-9 w-9 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg"
                                                                                onClick={() => setConfirmDelete(principal)}
                                                                            >
                                                                                <Trash2 className="w-4 h-4" />
                                                                            </MriButton>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                        </div>

                                                        {localWallSettings?.colors && Object.entries(localWallSettings.colors).filter(([principal]) => principal.toLowerCase().includes(groupSearch.toLowerCase())).length === 0 && (
                                                            <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl bg-muted/5">
                                                                <Search className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                                                                <p className="text-sm font-medium text-muted-foreground">{t('permissions.empty.matches')?.replace('%s', groupSearch) || `Nenhum grupo encontrado para "${groupSearch}"`}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                    </MriScrollArea>
                                                </div>
                                            </>
                                        )}
                                    </MriCard>
                                </div>
                            )}

                            {localWallSettings && localWallSettings.localSettings && (
                                <div className="space-y-4 animate-in slide-in-from-bottom-6 duration-700">
                                    <div className="flex items-center gap-2 text-lg font-medium text-foreground pb-2 border-b border-border">
                                        <User className="w-5 h-5 text-primary" />
                                        {t('settings.wall.local.title') || "Minhas Preferências Visuais"}
                                    </div>

                                    <MriCard className="p-6 bg-card border-border">
                                        <p className="text-xs text-muted-foreground italic mb-6">{t('settings.wall.local.description') || "Estas opções são salvas apenas localmente (KVP) e são personalizadas exclusivamente para você."}</p>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="flex flex-col gap-2.5">
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">{t('settings.wall.style.label')}</label>
                                                <MriSelect
                                                    options={[
                                                        { label: t('settings.wall.style.classic'), value: "classic" },
                                                        { label: t('settings.wall.style.modern'), value: "modern" }
                                                    ]}
                                                    value={localWallSettings.localSettings?.style || "classic"}
                                                    onChange={(val) => saveLocalWallSetting('style', val)}
                                                    className="bg-background h-11"
                                                />
                                            </div>

                                            <div className="flex flex-col gap-2.5">
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">{t('settings.wall.tracer.label')}</label>
                                                <MriSelect
                                                    options={[
                                                        { label: t('settings.wall.tracer.bottom'), value: "bottom" },
                                                        { label: t('settings.wall.tracer.center'), value: "center" },
                                                        { label: t('settings.wall.tracer.top'), value: "top" }
                                                    ]}
                                                    value={localWallSettings.localSettings?.tracer || "bottom"}
                                                    onChange={(val) => saveLocalWallSetting('tracer', val)}
                                                    className="bg-background h-11"
                                                />
                                            </div>

                                            <div className="flex flex-col gap-2.5">
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">{t('settings.wall.font') || "Fonte do ESP"}</label>
                                                <MriSelect
                                                    options={[
                                                        { label: "Standard (0)", value: 0 },
                                                        { label: "Script (1)", value: 1 },
                                                        { label: "Monospace (2)", value: 2 },
                                                        { label: "Chalet Compton (4)", value: 4 },
                                                        { label: "Pricedown (7)", value: 7 }
                                                    ]}
                                                    value={localWallSettings.localSettings?.font ?? 4}
                                                    onChange={(val) => saveLocalWallSetting('font', val)}
                                                    className="bg-background h-11"
                                                />
                                            </div>

                                            <div className="flex items-center justify-between p-5 bg-muted/20 border border-border rounded-xl hover:bg-muted/30 transition-all group cursor-default">
                                                <div className="space-y-1.5">
                                                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                                                        {t('settings.wall.skeleton.label')}
                                                    </h4>
                                                    <p className="text-xs text-muted-foreground italic">{t('settings.wall.skeleton.description')}</p>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer scale-110">
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only peer"
                                                        checked={localWallSettings.localSettings?.skeleton || false}
                                                        onChange={(e) => saveLocalWallSetting('skeleton', e.target.checked)}
                                                    />
                                                    <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary border border-border"></div>
                                                </label>
                                            </div>

                                            <div className="flex items-center justify-between p-5 bg-muted/20 border border-border rounded-xl hover:bg-muted/30 transition-all group cursor-default">
                                                <div className="space-y-1.5">
                                                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                                                        {t('settings.wall.show_background')}
                                                    </h4>
                                                    <p className="text-xs text-muted-foreground italic">{t('settings.wall.show_background_desc')}</p>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer scale-110">
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only peer"
                                                        checked={localWallSettings.localSettings?.showBackground ?? true}
                                                        onChange={(e) => saveLocalWallSetting('showBackground', e.target.checked)}
                                                    />
                                                    <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary border border-border"></div>
                                                </label>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:col-span-2 gap-4">
                                                <div className="flex items-center justify-between p-4 bg-muted/10 border border-border/40 rounded-xl hover:bg-muted/20 transition-all">
                                                    <span className="text-xs font-bold text-foreground">{t('settings.wall.show.job') || "Mostrar Emprego"}</span>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            className="sr-only peer"
                                                            checked={localWallSettings.localSettings?.showJob ?? true}
                                                            onChange={(e) => saveLocalWallSetting('showJob', e.target.checked)}
                                                        />
                                                        <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary border border-border"></div>
                                                    </label>
                                                </div>

                                                <div className="flex items-center justify-between p-4 bg-muted/10 border border-border/40 rounded-xl hover:bg-muted/20 transition-all">
                                                    <span className="text-xs font-bold text-foreground">{t('settings.wall.show.gang') || "Mostrar Gangue"}</span>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            className="sr-only peer"
                                                            checked={localWallSettings.localSettings?.showGang ?? true}
                                                            onChange={(e) => saveLocalWallSetting('showGang', e.target.checked)}
                                                        />
                                                        <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary border border-border"></div>
                                                    </label>
                                                </div>

                                                <div className="flex items-center justify-between p-4 bg-muted/10 border border-border/40 rounded-xl hover:bg-muted/20 transition-all">
                                                    <span className="text-xs font-bold text-foreground">{t('settings.wall.show.vehicle') || "Mostrar Veículo"}</span>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            className="sr-only peer"
                                                            checked={localWallSettings.localSettings?.showVehicle ?? true}
                                                            onChange={(e) => saveLocalWallSetting('showVehicle', e.target.checked)}
                                                        />
                                                        <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary border border-border"></div>
                                                    </label>
                                                </div>

                                                <div className="flex items-center justify-between p-4 bg-muted/10 border border-border/40 rounded-xl hover:bg-muted/20 transition-all">
                                                    <span className="text-xs font-bold text-foreground">{t('settings.wall.show.weapon') || "Mostrar Arma"}</span>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            className="sr-only peer"
                                                            checked={localWallSettings.localSettings?.showWeapon ?? true}
                                                            onChange={(e) => saveLocalWallSetting('showWeapon', e.target.checked)}
                                                        />
                                                        <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary border border-border"></div>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </MriCard>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {confirmDelete && (
                <ConfirmAction
                    text={t('settings.wall.groups.confirm_delete').replace('%s', confirmDelete)}
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
