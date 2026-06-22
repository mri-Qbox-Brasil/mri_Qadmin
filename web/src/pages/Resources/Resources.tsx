import React, { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useAppState } from '@/context/AppState'
import { useNui } from '@/context/NuiContext'
import { MriButton, MriPageHeader, MriExpandableSearch } from '@mriqbox/ui-kit'
import { cn } from '@/lib/utils'
import { hasPermission } from '@/utils/permissions'
import { useI18n } from '@/hooks/useI18n'
import {
    AlertCircle,
    CheckCircle2,
    ChevronRight,
    Container,
    FileCode2,
    FileJson2,
    FilePlus2,
    FileText,
    Folder,
    FolderPlus,
    Play,
    RefreshCw,
    RotateCcw,
    RotateCw,
    Search,
    Save,
    Square,
    Trash2,
    WandSparkles
} from 'lucide-react'

type ResourceItem = {
    name: string
    author?: string
    version?: string
    description?: string
    resourceState?: string
}

type ResourceEntry = {
    name: string
    path: string
    isDirectory: boolean
    size: number
    modified?: string
    extension?: string
    editable?: boolean
}

type DirectoryPayload = {
    ok: boolean
    resource: string
    directory: string
    parent: string
    root: string
    writable?: boolean
    entries: ResourceEntry[]
    message?: string
}

type FilePayload = {
    ok: boolean
    resource: string
    path: string
    name: string
    extension?: string
    size: number
    editable: boolean
    tooLarge?: boolean
    binary?: boolean
    content?: string
    message?: string
}

type ResourceAction = 'start' | 'stop' | 'restart'

type FlashMessage = {
    type: 'success' | 'error' | 'info'
    text: string
} | null

function formatBytes(bytes: number) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'

    const units = ['B', 'KB', 'MB', 'GB']
    let value = bytes
    let unitIndex = 0

    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024
        unitIndex += 1
    }

    const decimals = value >= 10 || unitIndex === 0 ? 0 : 1
    return `${value.toFixed(decimals)} ${units[unitIndex]}`
}

type TFn = (key: string, vars?: Record<string, any> | any[]) => string

function formatDate(value: string | undefined, t: TFn) {
    if (!value) return t('resources.no_date')
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value

    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date)
}

function buildBreadcrumbs(directory: string, t: TFn) {
    const normalized = String(directory || '').trim()
    const rootLabel = t('resources.breadcrumb_root')
    if (!normalized) return [{ label: rootLabel, path: '' }]

    const segments = normalized.split('/').filter(Boolean)
    const breadcrumbs = [{ label: rootLabel, path: '' }]
    let current = ''

    for (const segment of segments) {
        current = current ? `${current}/${segment}` : segment
        breadcrumbs.push({ label: segment, path: current })
    }

    return breadcrumbs
}

function getEntryIcon(entry: ResourceEntry) {
    if (entry.isDirectory) return Folder
    if ((entry.extension || '').toLowerCase() === 'json') return FileJson2
    if (['lua', 'js', 'ts', 'tsx', 'jsx'].includes((entry.extension || '').toLowerCase())) return FileCode2
    return FileText
}

function getResourceTone(state?: string) {
    if (state === 'started') {
        return {
            dot: 'bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.65)]',
            badge: 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/20'
        }
    }

    if (state === 'starting' || state === 'stopping') {
        return {
            dot: 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]',
            badge: 'bg-amber-500/15 text-amber-200 border border-amber-500/20'
        }
    }

    return {
        dot: 'bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.35)]',
        badge: 'bg-rose-500/15 text-rose-200 border border-rose-500/20'
    }
}

function getResourceStateLabel(state: string | undefined, compact: boolean, t: TFn) {
    const suffix = compact ? '_compact' : ''
    if (state === 'started') return t('resources.state_running' + suffix)
    if (state === 'starting') return t('resources.state_starting' + suffix)
    if (state === 'stopping') return t('resources.state_stopping' + suffix)
    if (state === 'stopped') return t('resources.state_stopped' + suffix)
    if (state === 'missing') return t('resources.state_missing' + suffix)
    return state ? state : 'N/A'
}

function buildActionLabel(action: ResourceAction, t: TFn) {
    if (action === 'start') return t('resources.toast_started')
    if (action === 'stop') return t('resources.toast_stopped')
    return t('resources.toast_restarted')
}

export default function Resources() {
    const { gameData, setGameData, myPermissions } = useAppState()
    const { sendNui, on, off } = useNui()
    const { t } = useI18n()

    const canViewResources = hasPermission(myPermissions, 'qadmin.page.resources')
    const canChangeResource = hasPermission(myPermissions, 'qadmin.action.change_resource')
    const canDeleteResourceEntry = hasPermission(myPermissions, 'qadmin.action.resource_delete')

    const [resourceSearch, setResourceSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'started' | 'stopped'>('all')
    const [entrySearch, setEntrySearch] = useState('')
    const [selectedResource, setSelectedResource] = useState('')
    const [directoryData, setDirectoryData] = useState<DirectoryPayload | null>(null)
    const [selectedFile, setSelectedFile] = useState('')
    const [fileData, setFileData] = useState<FilePayload | null>(null)
    const [editorValue, setEditorValue] = useState('')
    const [drafts, setDrafts] = useState<Record<string, string>>({})
    const [loadingDirectory, setLoadingDirectory] = useState(false)
    const [loadingFile, setLoadingFile] = useState(false)
    const [savingFile, setSavingFile] = useState(false)
    const [refreshingResources, setRefreshingResources] = useState(false)
    const [resourceAction, setResourceAction] = useState<ResourceAction | null>(null)
    const [actingResource, setActingResource] = useState('')
    const [message, setMessage] = useState<FlashMessage>(null)
    const [createKind, setCreateKind] = useState<'file' | 'folder'>('file')
    const [createName, setCreateName] = useState('')
    const [creatingEntry, setCreatingEntry] = useState(false)
    const [deletingEntryPath, setDeletingEntryPath] = useState('')
    const [pendingDeletePath, setPendingDeletePath] = useState('')

    const selectedResourceRef = useRef('')
    const directoryRequestRef = useRef(0)
    const fileRequestRef = useRef(0)

    const deferredResourceSearch = useDeferredValue(resourceSearch)
    const deferredEntrySearch = useDeferredValue(entrySearch)

    const resources = useMemo(() => {
        return ((gameData.resources || []) as ResourceItem[])
            .map((resource) => ({
                ...resource,
                name: (resource.name || '').trim(),
                resourceState: resource.resourceState || 'missing'
            }))
            .sort((left, right) => left.name.localeCompare(right.name))
    }, [gameData.resources])

    const filteredResources = useMemo(() => {
        const query = deferredResourceSearch.trim().toLowerCase()

        return resources.filter((resource) => {
            if (statusFilter === 'started' && resource.resourceState !== 'started') return false
            if (statusFilter === 'stopped' && resource.resourceState === 'started') return false

            if (!query) return true
            return resource.name.toLowerCase().includes(query)
                || (resource.author || '').toLowerCase().includes(query)
                || (resource.description || '').toLowerCase().includes(query)
        })
    }, [deferredResourceSearch, resources, statusFilter])

    const visibleEntries = useMemo(() => {
        const entries = directoryData?.entries || []
        const query = deferredEntrySearch.trim().toLowerCase()
        if (!query) return entries

        return entries.filter((entry) =>
            entry.name.toLowerCase().includes(query)
            || entry.path.toLowerCase().includes(query)
        )
    }, [deferredEntrySearch, directoryData?.entries])

    const currentResource = useMemo(() => {
        return resources.find((resource) => resource.name === selectedResource) || null
    }, [resources, selectedResource])

    const resourceReadOnly = !!directoryData && directoryData.writable === false
    const currentDraftKey = selectedResource && selectedFile ? `${selectedResource}:${selectedFile}` : ''
    const originalContent = fileData?.content || ''
    const currentDraftValue = currentDraftKey ? drafts[currentDraftKey] : undefined
    const isDirty = currentDraftKey !== '' && (currentDraftValue ?? originalContent) !== originalContent
    const totalEntryBytes = useMemo(() => {
        return (directoryData?.entries || []).reduce((total, entry) => total + (entry.isDirectory ? 0 : entry.size || 0), 0)
    }, [directoryData?.entries])
    const lineCount = Math.max(1, editorValue.split('\n').length)

    useEffect(() => {
        selectedResourceRef.current = selectedResource
    }, [selectedResource])

    useEffect(() => {
        if (!message) return undefined

        const timeout = window.setTimeout(() => setMessage(null), 5000)
        return () => window.clearTimeout(timeout)
    }, [message])

    useEffect(() => {
        if (!pendingDeletePath) return undefined

        const timeout = window.setTimeout(() => setPendingDeletePath(''), 7000)
        return () => window.clearTimeout(timeout)
    }, [pendingDeletePath])

    useEffect(() => {
        if (!selectedResource && resources.length > 0) {
            startTransition(() => setSelectedResource(resources[0].name))
            return
        }

        if (selectedResource && !resources.some((resource) => resource.name === selectedResource) && resources.length > 0) {
            startTransition(() => setSelectedResource(resources[0].name))
        }
    }, [resources, selectedResource])

    useEffect(() => {
        if (!currentDraftKey) {
            setEditorValue('')
            return
        }

        setEditorValue(drafts[currentDraftKey] ?? originalContent)
    }, [currentDraftKey, drafts, originalContent])

    useEffect(() => {
        const handleUpdate = (data: ResourceItem) => {
            if (!data?.name) return

            setGameData((previous: any) => {
                const existing = previous.resources || []
                const index = existing.findIndex((resource: ResourceItem) => resource.name === data.name)
                if (index === -1) {
                    return { ...previous, resources: [...existing, data] }
                }

                const next = [...existing]
                next[index] = { ...next[index], ...data }
                return { ...previous, resources: next }
            })
        }

        on('updateResourceState', handleUpdate)
        return () => off('updateResourceState', handleUpdate)
    }, [off, on, setGameData])

    const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
        setMessage({ type, text })
    }

    const withDiscardGuard = async (action: () => Promise<void> | void) => {
        if (isDirty) {
            showMessage('error', t('resources.msg_save_before_switch'))
            return
        }

        await action()
    }

    const loadDirectory = async (directory: string, resourceName = selectedResource) => {
        if (!resourceName) return

        const requestId = ++directoryRequestRef.current
        setLoadingDirectory(true)

        try {
            const response = await sendNui<DirectoryPayload>('browseResourceFiles', {
                resource: resourceName,
                directory
            })

            if (!response?.ok) {
                throw new Error(response?.message || 'Nao foi possivel listar os arquivos.')
            }

            if (directoryRequestRef.current !== requestId || selectedResourceRef.current !== resourceName) return
            if (response.resource !== resourceName) return

            setDirectoryData(response)
        } catch (error: any) {
            if (directoryRequestRef.current !== requestId) return
            showMessage('error', error?.message || t('resources.msg_list_fail'))
        } finally {
            if (directoryRequestRef.current === requestId) {
                setLoadingDirectory(false)
            }
        }
    }

    const loadFile = async (path: string, resourceName = selectedResource) => {
        if (!resourceName) return

        const requestId = ++fileRequestRef.current
        setSelectedFile(path)
        setLoadingFile(true)

        try {
            const response = await sendNui<FilePayload>('getResourceFile', {
                resource: resourceName,
                path
            })

            if (!response?.ok) {
                throw new Error(response?.message || 'Nao foi possivel abrir o arquivo.')
            }

            // Superada por uma requisicao mais nova (ou troca de resource): a
            // dona mais recente cuida do estado.
            if (fileRequestRef.current !== requestId || selectedResourceRef.current !== resourceName) return

            // Ainda e a requisicao atual, mas a resposta nao corresponde ao que
            // foi pedido: limpa em vez de deixar selectedFile sem conteudo.
            if (response.resource !== resourceName || response.path !== path) {
                setFileData(null)
                setSelectedFile('')
                return
            }

            setFileData(response)
        } catch (error: any) {
            if (fileRequestRef.current !== requestId) return
            setFileData(null)
            setSelectedFile('')
            showMessage('error', error?.message || t('resources.msg_open_fail'))
        } finally {
            if (fileRequestRef.current === requestId) {
                setLoadingFile(false)
            }
        }
    }

    useEffect(() => {
        if (!selectedResource || !canChangeResource) {
            setDirectoryData(null)
            setSelectedFile('')
            setFileData(null)
            setEditorValue('')
            return
        }

        const requestResource = selectedResource
        setDirectoryData(null)
        setSelectedFile('')
        setFileData(null)
        setEditorValue('')
        void loadDirectory('', requestResource)
    }, [selectedResource, canChangeResource])

    const handleEditorChange = (value: string) => {
        setEditorValue(value)
        if (!currentDraftKey) return

        setDrafts((previous) => {
            const next = { ...previous }
            if (value === originalContent) {
                delete next[currentDraftKey]
            } else {
                next[currentDraftKey] = value
            }
            return next
        })
    }

    const handleCancelEdit = () => {
        if (!currentDraftKey) return

        setEditorValue(originalContent)
        setDrafts((previous) => {
            const next = { ...previous }
            delete next[currentDraftKey]
            return next
        })
    }

    const handleResourceSelect = async (resourceName: string) => {
        if (resourceName === selectedResource) return

        await withDiscardGuard(async () => {
            startTransition(() => setSelectedResource(resourceName))
        })
    }

    const handleOpenEntry = async (entry: ResourceEntry) => {
        await withDiscardGuard(async () => {
            if (entry.isDirectory) {
                setSelectedFile('')
                setFileData(null)
                setEditorValue('')
                await loadDirectory(entry.path)
                return
            }

            await loadFile(entry.path)
        })
    }

    const handleOpenManifest = async () => {
        if (!directoryData) return

        const manifest = directoryData.entries.find((entry) => !entry.isDirectory && entry.name.toLowerCase() === 'fxmanifest.lua')
            || directoryData.entries.find((entry) => !entry.isDirectory && entry.name.toLowerCase() === '__resource.lua')

        if (!manifest) {
            showMessage('info', t('resources.msg_no_manifest'))
            return
        }

        await handleOpenEntry(manifest)
    }

    const handleRefresh = async () => {
        setRefreshingResources(true)

        try {
            const data = await sendNui('getData')
            if (data) {
                setGameData((previous: any) => ({ ...previous, ...data }))
            }

            if (selectedResource && canChangeResource) {
                await loadDirectory(directoryData?.directory || '')
            }

            if (selectedResource && selectedFile) {
                await loadFile(selectedFile)
            }
        } catch (error: any) {
            showMessage('error', error?.message || t('resources.msg_refresh_fail'))
        } finally {
            setRefreshingResources(false)
        }
    }

    const handleResourceAction = async (action: ResourceAction, resourceName: string = selectedResource) => {
        if (!resourceName || !canChangeResource || actingResource) return

        setActingResource(resourceName)
        if (resourceName === selectedResource) setResourceAction(action)

        try {
            const response = await sendNui<ResourceItem[]>('setResourceState', { name: resourceName, state: action })
            if (response) {
                setGameData((previous: any) => ({ ...previous, resources: response }))
            }

            showMessage('success', buildActionLabel(action, t))
        } catch (error: any) {
            showMessage('error', error?.message || t('resources.msg_action_fail'))
        } finally {
            setActingResource('')
            setResourceAction(null)
        }
    }

    const handleSave = async (restartResource = false) => {
        if (!selectedResource || !selectedFile || !canChangeResource) return

        setSavingFile(true)

        try {
            const response = await sendNui<any>('saveResourceFile', {
                resource: selectedResource,
                path: selectedFile,
                content: editorValue,
                restartResource
            })

            if (!response?.ok) {
                throw new Error(response?.message || 'Nao foi possivel salvar o arquivo.')
            }

            if (response.resources) {
                setGameData((previous: any) => ({ ...previous, resources: response.resources }))
            }

            if (response.file?.ok) {
                setFileData(response.file)
                setEditorValue(response.file.content || '')
            }

            if (currentDraftKey) {
                setDrafts((previous) => {
                    const next = { ...previous }
                    delete next[currentDraftKey]
                    return next
                })
            }

            if (directoryData) {
                await loadDirectory(directoryData.directory)
            }

            showMessage('success', response?.message || t('resources.msg_save_ok'))
        } catch (error: any) {
            showMessage('error', error?.message || t('resources.msg_save_fail'))
        } finally {
            setSavingFile(false)
        }
    }

    const handleCreateEntry = async () => {
        if (!selectedResource || !canChangeResource || !createName.trim()) return

        setCreatingEntry(true)

        try {
            const response = await sendNui<any>('createResourceEntry', {
                resource: selectedResource,
                directory: directoryData?.directory || '',
                kind: createKind,
                name: createName.trim()
            })

            if (!response?.ok) {
                throw new Error(response?.message || 'Nao foi possivel criar a entrada.')
            }

            if (response.browse?.ok) {
                setDirectoryData(response.browse)
            } else {
                await loadDirectory(directoryData?.directory || '')
            }

            if (response.file?.ok) {
                setSelectedFile(response.file.path)
                setFileData(response.file)
                setEditorValue(response.file.content || '')
            }

            setCreateName('')
            showMessage('success', response?.message || 'Entrada criada com sucesso.')
        } catch (error: any) {
            showMessage('error', error?.message || t('resources.msg_create_fail'))
        } finally {
            setCreatingEntry(false)
        }
    }

    const handleDeleteEntry = async (entry: ResourceEntry, event: React.MouseEvent) => {
        event.stopPropagation()
        if (!selectedResource || !canDeleteResourceEntry) return

        if (pendingDeletePath !== entry.path) {
            setPendingDeletePath(entry.path)
            showMessage('info', `Clique novamente na lixeira para confirmar a exclusao de "${entry.name}".`)
            return
        }

        const deletedSelectedFile = selectedFile === entry.path || selectedFile.startsWith(`${entry.path}/`)
        if (isDirty && deletedSelectedFile) {
            showMessage('error', t('resources.msg_save_discard_before_delete'))
            return
        }

        setPendingDeletePath('')
        setDeletingEntryPath(entry.path)

        try {
            const response = await sendNui<any>('deleteResourceEntry', {
                resource: selectedResource,
                path: entry.path,
                isDirectory: entry.isDirectory
            })

            if (!response?.ok) {
                throw new Error(response?.message || 'Nao foi possivel excluir a entrada.')
            }

            if (response.browse?.ok) {
                setDirectoryData(response.browse)
            } else {
                await loadDirectory(directoryData?.directory || '')
            }

            if (deletedSelectedFile) {
                setSelectedFile('')
                setFileData(null)
                setEditorValue('')
            }

            setDrafts((previous) => {
                const next = { ...previous }
                const draftPrefix = `${selectedResource}:${entry.path}`
                for (const key of Object.keys(next)) {
                    if (key === draftPrefix || key.startsWith(`${draftPrefix}/`)) {
                        delete next[key]
                    }
                }
                return next
            })

            showMessage('success', response?.message || 'Entrada excluida com sucesso.')
        } catch (error: any) {
            showMessage('error', error?.message || t('resources.msg_delete_fail'))
        } finally {
            setDeletingEntryPath('')
        }
    }

    const currentStateTone = getResourceTone(currentResource?.resourceState)
    const startedResources = resources.filter((resource) => resource.resourceState === 'started').length
    const stoppedResources = resources.length - startedResources

            return (
        <div className="flex h-full w-full flex-col overflow-hidden bg-background">
            <MriPageHeader title={t('resources.page_title')} icon={Container} countLabel={t('resources.count_label')} count={filteredResources.length}>
                <MriButton
                    size="icon"
                    variant="outline"
                    className="h-10 w-10 border-input bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={handleRefresh}
                    disabled={refreshingResources}
                >
                    <RefreshCw className={cn('h-4 w-4', refreshingResources && 'animate-spin')} />
                </MriButton>
            </MriPageHeader>

            {message && (
                <div className={cn(
                    'mx-4 mt-3 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm',
                    message.type === 'success' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
                    message.type === 'error' && 'border-rose-500/30 bg-rose-500/10 text-rose-200',
                    message.type === 'info' && 'border-blue-500/30 bg-blue-500/10 text-blue-200'
                )}>
                    {message.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                    <span>{message.text}</span>
                    <button className="ml-auto text-xs opacity-70 transition-opacity hover:opacity-100" onClick={() => setMessage(null)}>
                        fechar
                    </button>
                </div>
            )}

            <div className="min-h-0 flex-1 px-4 pb-4 pt-4">
                <div className="grid h-full min-h-0 grid-cols-[320px_380px_minmax(0,1fr)] gap-4">
                    <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card">
                        <div className="border-b border-border px-4 py-4">
                            <div className="flex items-start justify-between gap-5">
                                <div className="min-w-0 pr-2">
                                    <p className="text-sm font-semibold text-foreground">{t('resources.list_title')}</p>
                                    <p className="text-xs text-muted-foreground">{t('resources.list_subtitle')}</p>
                                </div>
                                <div className="grid shrink-0 grid-cols-2 gap-2.5 text-center text-[11px]">
                                    <button
                                        type="button"
                                        aria-pressed={statusFilter === 'started'}
                                        title={statusFilter === 'started' ? t('resources.remove_filter') : t('resources.filter_running_tip')}
                                        onClick={() => setStatusFilter((current) => current === 'started' ? 'all' : 'started')}
                                        className={cn(
                                            'flex min-h-[48px] w-[56px] flex-col items-center justify-center rounded-xl border px-2 text-emerald-200 transition-all',
                                            statusFilter === 'started'
                                                ? 'border-emerald-400/60 bg-emerald-500/20 ring-1 ring-emerald-400/50'
                                                : 'border-emerald-500/15 bg-emerald-500/10 hover:bg-emerald-500/20'
                                        )}
                                    >
                                        <div className="text-sm font-semibold">{startedResources}</div>
                                        <div className="opacity-70">{t('resources.filter_running')}</div>
                                    </button>
                                    <button
                                        type="button"
                                        aria-pressed={statusFilter === 'stopped'}
                                        title={statusFilter === 'stopped' ? t('resources.remove_filter') : t('resources.filter_stopped_tip')}
                                        onClick={() => setStatusFilter((current) => current === 'stopped' ? 'all' : 'stopped')}
                                        className={cn(
                                            'flex min-h-[48px] w-[56px] flex-col items-center justify-center rounded-xl border px-2 text-rose-200 transition-all',
                                            statusFilter === 'stopped'
                                                ? 'border-rose-400/60 bg-rose-500/20 ring-1 ring-rose-400/50'
                                                : 'border-rose-500/15 bg-rose-500/10 hover:bg-rose-500/20'
                                        )}
                                    >
                                        <div className="text-sm font-semibold">{stoppedResources}</div>
                                        <div className="opacity-70">{t('resources.filter_stopped')}</div>
                                    </button>
                                </div>
                            </div>

                            <div className="mt-3 flex h-10 items-center gap-2 rounded-xl border border-border bg-background/40 px-3">
                                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <input
                                    value={resourceSearch}
                                    onChange={(event) => setResourceSearch(event.target.value)}
                                    placeholder={t('resources.search_placeholder')}
                                    className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
                                />
                                {resourceSearch && (
                                    <button
                                        type="button"
                                        className="rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                        onClick={() => setResourceSearch('')}
                                    >
                                        limpar
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 pr-2 custom-scrollbar">
                            {!canViewResources ? (
                                <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">{t('resources.no_perms_page')}</div>
                            ) : (
                                <div className="space-y-2 pb-10">
                                    {filteredResources.map((resource) => {
                                        const active = selectedResource === resource.name
                                        const tone = getResourceTone(resource.resourceState)
                                        const acting = actingResource === resource.name
                                        const isStarted = resource.resourceState === 'started'

                                        return (
                                            <div
                                                key={resource.name}
                                                role="button"
                                                tabIndex={0}
                                                className={cn(
                                                    'w-full cursor-pointer rounded-2xl border p-3 text-left transition-all',
                                                    active
                                                        ? 'border-primary/50 bg-primary/10 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.15)]'
                                                        : 'border-border bg-muted/20 hover:border-border/80 hover:bg-muted/40'
                                                )}
                                                onClick={() => void handleResourceSelect(resource.name)}
                                                onKeyDown={(event) => {
                                                    if (event.key === 'Enter' || event.key === ' ') {
                                                        event.preventDefault()
                                                        void handleResourceSelect(resource.name)
                                                    }
                                                }}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', tone.dot)} />
                                                            <p className="truncate text-sm font-semibold text-foreground">{resource.name}</p>
                                                        </div>
                                                        <p className="mt-1 truncate text-[11px] text-muted-foreground">
                                                            {resource.version ? `v${resource.version}` : t('resources.no_version')}
                                                            {resource.author ? ` | ${resource.author}` : ''}
                                                        </p>
                                                    </div>
                                                    <span className={cn('rounded-full px-2 py-1 text-[10px] uppercase tracking-wide', tone.badge)}>
                                                        {getResourceStateLabel(resource.resourceState, true, t)}
                                                    </span>
                                                </div>

                                                <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                                                    {resource.description || t('resources.no_description')}
                                                </p>

                                                {canChangeResource && (
                                                    <div
                                                        className="mt-2.5 flex items-center gap-1.5 border-t border-border/60 pt-2.5"
                                                        onClick={(event) => event.stopPropagation()}
                                                    >
                                                        {isStarted ? (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    title={t('resources.action_restart')}
                                                                    disabled={acting}
                                                                    onClick={() => void handleResourceAction('restart', resource.name)}
                                                                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/30 px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                                                                >
                                                                    <RotateCw className={cn('h-3.5 w-3.5', acting && 'animate-spin')} />{t('resources.action_restart')}</button>
                                                                <button
                                                                    type="button"
                                                                    title={t('resources.action_stop')}
                                                                    disabled={acting}
                                                                    onClick={() => void handleResourceAction('stop', resource.name)}
                                                                    className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[11px] font-medium text-rose-300 transition-colors hover:bg-rose-500/20 disabled:opacity-50"
                                                                >
                                                                    <Square className="h-3.5 w-3.5" />{t('resources.action_stop')}</button>
                                                            </>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                title={t('resources.action_start')}
                                                                disabled={acting}
                                                                onClick={() => void handleResourceAction('start', resource.name)}
                                                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
                                                            >
                                                                <Play className={cn('h-3.5 w-3.5', acting && 'animate-spin')} />{t('resources.action_start')}</button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}

                                    {filteredResources.length === 0 && (
                                        <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">{t('resources.none_found_filter')}</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card">
                        <div className="border-b border-border px-4 py-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-foreground">{selectedResource || t('resources.no_resource_selected')}</p>
                                    <p className="truncate text-xs text-muted-foreground">
                                        {directoryData?.root || t('resources.select_resource_files')}
                                    </p>
                                </div>
                                <MriButton
                                    variant="outline"
                                    size="icon"
                                    className="h-10 w-10"
                                    disabled={!selectedResource || !canChangeResource || loadingDirectory}
                                    onClick={() => void loadDirectory(directoryData?.directory || '')}
                                >
                                    <RefreshCw className={cn('h-4 w-4', loadingDirectory && 'animate-spin')} />
                                </MriButton>
                            </div>

                            <div className="mt-3">
                                <MriExpandableSearch
                                    placeholder={t('resources.filter_files_placeholder')}
                                    value={entrySearch}
                                    onChange={setEntrySearch}
                                />
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                {buildBreadcrumbs(directoryData?.directory || '', t).map((crumb, index) => (
                                    <React.Fragment key={`${crumb.path}-${index}`}>
                                        {index > 0 && <ChevronRight className="h-3 w-3 opacity-40" />}
                                        <button
                                            className={cn(
                                                'rounded-md px-2 py-1 transition-colors',
                                                crumb.path === (directoryData?.directory || '') ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                                            )}
                                            onClick={() => void withDiscardGuard(async () => {
                                                setSelectedFile('')
                                                setFileData(null)
                                                setEditorValue('')
                                                await loadDirectory(crumb.path)
                                            })}
                                            disabled={!canChangeResource}
                                        >
                                            {crumb.label}
                                        </button>
                                    </React.Fragment>
                                ))}
                            </div>

                            {canChangeResource && resourceReadOnly && (
                                <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-200">
                                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                    <div className="min-w-0">
                                        <p className="font-medium">{t('resources.read_only_sandbox')}</p>
                                        <p className="mt-1 break-all font-mono text-[11px] text-amber-200/80">{t('resources.read_only_hint', [selectedResource])}</p>
                                    </div>
                                </div>
                            )}

                            {canChangeResource && (
                                <div className="mt-3 rounded-xl border border-border bg-muted/20 p-2.5">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className="inline-flex rounded-lg border border-border bg-background p-1">
                                            <button
                                                className={cn(
                                                    'rounded-md px-2 py-1 text-xs transition-colors',
                                                    createKind === 'file' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                                                )}
                                                onClick={() => setCreateKind('file')}
                                            >
                                                <span className="inline-flex items-center gap-1">
                                                    <FilePlus2 className="h-3.5 w-3.5" />{t('resources.kind_file')}</span>
                                            </button>
                                            <button
                                                className={cn(
                                                    'rounded-md px-2 py-1 text-xs transition-colors',
                                                    createKind === 'folder' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                                                )}
                                                onClick={() => setCreateKind('folder')}
                                            >
                                                <span className="inline-flex items-center gap-1">
                                                    <FolderPlus className="h-3.5 w-3.5" />{t('resources.kind_folder')}</span>
                                            </button>
                                        </div>

                                        <input
                                            value={createName}
                                            onChange={(event) => setCreateName(event.target.value)}
                                            placeholder={createKind === 'file' ? t('resources.new_file_placeholder') : t('resources.new_folder_placeholder')}
                                            disabled={resourceReadOnly}
                                            className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-xs text-foreground outline-none placeholder:text-muted-foreground/60 disabled:opacity-50"
                                        />

                                        <MriButton
                                            size="sm"
                                            className="h-9"
                                            onClick={handleCreateEntry}
                                            disabled={creatingEntry || !selectedResource || !createName.trim() || resourceReadOnly}
                                        >
                                            {creatingEntry ? t('resources.creating') : t('resources.create')}
                                        </MriButton>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="border-b border-border px-4 py-2 text-[11px] text-muted-foreground">
                            <div className="flex items-center justify-between gap-3">
                                <span>{visibleEntries.length} {t('resources.entries')}</span>
                                <span>{formatBytes(totalEntryBytes)} {t('resources.in_visible_files')}</span>
                            </div>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-scroll px-3 py-3 pr-2 custom-scrollbar">
                            {!canChangeResource ? (
                                <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">{t('resources.no_perms_explore')}</div>
                            ) : loadingDirectory && !directoryData ? (
                                <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
                                    <RefreshCw className="h-4 w-4 animate-spin" />{t('resources.loading_files')}</div>
                            ) : (
                                <div className="space-y-2 pb-10">
                                    {visibleEntries.length === 0 && (
                                        <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">{t('resources.none_found_folder')}</div>
                                    )}

                                    {visibleEntries.map((entry) => {
                                        const Icon = getEntryIcon(entry)
                                        const active = selectedFile === entry.path
                                        const deleting = deletingEntryPath === entry.path
                                        const pendingDelete = pendingDeletePath === entry.path

                                        return (
                                            <div
                                                key={entry.path}
                                                role="button"
                                                tabIndex={0}
                                                className={cn(
                                                    'w-full rounded-xl border px-3 py-2.5 text-left transition-all',
                                                    active
                                                        ? 'border-primary/50 bg-primary/10'
                                                        : 'border-border bg-muted/10 hover:border-border/80 hover:bg-muted/30'
                                                )}
                                                onClick={() => void handleOpenEntry(entry)}
                                                onKeyDown={(event) => {
                                                    if (event.key === 'Enter' || event.key === ' ') {
                                                        event.preventDefault()
                                                        void handleOpenEntry(entry)
                                                    }
                                                }}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex min-w-0 items-center gap-2.5">
                                                        <Icon className={cn('h-4 w-4 shrink-0', entry.isDirectory ? 'text-blue-300' : 'text-muted-foreground')} />
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-medium text-foreground">{entry.name}</p>
                                                            <p className="truncate text-[11px] text-muted-foreground">
                                                                {entry.isDirectory ? t('resources.directory') : `${entry.extension || t('resources.file_unit')} | ${formatBytes(entry.size)}`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex shrink-0 items-center gap-2">
                                                        <span className="text-[10px] text-muted-foreground">{formatDate(entry.modified, t)}</span>
                                                        {canDeleteResourceEntry && (
                                                            <button
                                                                type="button"
                                                                className={cn(
                                                                    'rounded-lg border p-2 text-rose-200 transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                                                                    pendingDelete
                                                                        ? 'border-rose-400/50 bg-rose-500/25'
                                                                        : 'border-rose-500/25 bg-rose-500/10 hover:bg-rose-500/20'
                                                                )}
                                                                title={pendingDelete ? t('resources.confirm_delete_tip') : (entry.isDirectory ? t('resources.delete_folder_tip') : t('resources.delete_file_tip'))}
                                                                disabled={deleting || resourceReadOnly}
                                                                onClick={(event) => void handleDeleteEntry(entry, event)}
                                                            >
                                                                {deleting ? (
                                                                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                                                ) : pendingDelete ? (
                                                                    <span className="text-[10px] font-semibold uppercase tracking-wide">{t('resources.confirm')}</span>
                                                                ) : (
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="min-h-0 overflow-hidden rounded-2xl border border-border bg-card">
                        <div className="border-b border-border px-4 py-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-foreground">{selectedFile || t('resources.area_title')}</p>
                                    <p className="truncate text-xs text-muted-foreground">
                                        {selectedFile
                                            ? (fileData ? `${formatBytes(fileData.size)} | ${fileData.extension || t('resources.text_unit')}` : t('resources.loading_file'))
                                            : t('resources.panel_hint')}
                                    </p>
                                </div>

                                {selectedFile && fileData?.editable && canChangeResource && (
                                    <div className="flex items-center gap-2">
                                        <MriButton
                                            size="sm"
                                            variant="ghost"
                                            className="h-9"
                                            onClick={handleCancelEdit}
                                            disabled={!isDirty || savingFile}
                                        >
                                            <RotateCcw className="mr-2 h-4 w-4" />{t('resources.cancel')}</MriButton>
                                        <MriButton
                                            size="sm"
                                            variant="outline"
                                            className="h-9"
                                            onClick={() => void handleSave(false)}
                                            disabled={!isDirty || savingFile || resourceReadOnly}
                                        >
                                            <Save className="mr-2 h-4 w-4" />
                                            {savingFile ? t('resources.saving') : t('resources.save')}
                                        </MriButton>
                                        <MriButton
                                            size="sm"
                                            className="h-9"
                                            onClick={() => void handleSave(true)}
                                            disabled={!isDirty || savingFile || resourceReadOnly}
                                        >
                                            <WandSparkles className="mr-2 h-4 w-4" />{t('resources.save_restart')}</MriButton>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="h-full overflow-hidden">
                            {!selectedFile ? (
                                <div className="grid h-full min-h-0 grid-rows-[auto_auto_1fr]">
                                    <div className="grid gap-3 border-b border-border p-4 md:grid-cols-3">
                                        <div className="rounded-2xl border border-border bg-muted/20 p-4">
                                            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t('resources.label_state')}</p>
                                            <div className="mt-2 flex items-center gap-2">
                                                <span className={cn('h-2.5 w-2.5 rounded-full', currentStateTone.dot)} />
                                                <p className="text-lg font-semibold text-foreground">{getResourceStateLabel(currentResource?.resourceState, false, t)}</p>
                                            </div>
                                        </div>
                                        <div className="rounded-2xl border border-border bg-muted/20 p-4">
                                            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t('resources.label_version')}</p>
                                            <p className="mt-2 text-lg font-semibold text-foreground">{currentResource?.version || t('resources.no_version')}</p>
                                        </div>
                                        <div className="rounded-2xl border border-border bg-muted/20 p-4">
                                            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t('resources.label_author')}</p>
                                            <p className="mt-2 text-lg font-semibold text-foreground">{currentResource?.author || t('resources.unknown_author')}</p>
                                        </div>
                                    </div>

                                    <div className="border-b border-border p-4">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <MriButton
                                                size="sm"
                                                className="h-9"
                                                onClick={() => void handleResourceAction('start')}
                                                disabled={!selectedResource || !canChangeResource || resourceAction !== null || currentResource?.resourceState === 'started'}
                                            >
                                                <Play className="mr-2 h-4 w-4" />
                                                {resourceAction === 'start' ? t('resources.starting') : t('resources.action_start')}
                                            </MriButton>
                                            <MriButton
                                                size="sm"
                                                variant="outline"
                                                className="h-9"
                                                onClick={() => void handleResourceAction('restart')}
                                                disabled={!selectedResource || !canChangeResource || resourceAction !== null}
                                            >
                                                <RotateCw className={cn('mr-2 h-4 w-4', resourceAction === 'restart' && 'animate-spin')} />{t('resources.action_restart')}</MriButton>
                                            <MriButton
                                                size="sm"
                                                variant="outline"
                                                className="h-9 border-rose-500/30 text-rose-200 hover:bg-rose-500/10"
                                                onClick={() => void handleResourceAction('stop')}
                                                disabled={!selectedResource || !canChangeResource || resourceAction !== null || currentResource?.resourceState !== 'started'}
                                            >
                                                <Square className="mr-2 h-4 w-4" />
                                                {resourceAction === 'stop' ? t('resources.stopping') : t('resources.action_stop')}
                                            </MriButton>
                                            <MriButton
                                                size="sm"
                                                variant="outline"
                                                className="h-9"
                                                onClick={() => void handleOpenManifest()}
                                                disabled={!selectedResource || !canChangeResource || loadingDirectory}
                                            >
                                                <FileCode2 className="mr-2 h-4 w-4" />{t('resources.open_manifest')}</MriButton>
                                        </div>
                                    </div>

                                    <div className="overflow-y-auto p-4">
                                        <div className="rounded-2xl border border-border bg-muted/10 p-4">
                                            <p className="text-sm font-semibold text-foreground">{t('resources.overview')}</p>
                                            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                                                {currentResource?.description || t('resources.no_manifest_desc')}
                                            </p>

                                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                                                <div className="rounded-xl border border-dashed border-border/70 bg-background/40 p-4">
                                                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t('resources.label_path')}</p>
                                                    <p className="mt-2 break-all font-mono text-xs text-foreground/80">{directoryData?.root || t('resources.select_resource')}</p>
                                                </div>
                                                <div className="rounded-xl border border-dashed border-border/70 bg-background/40 p-4">
                                                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t('resources.label_status')}</p>
                                                    <p className="mt-2 text-sm text-foreground/80">
                                                        {currentResource?.resourceState === 'started'
                                                            ? t('resources.status_running')
                                                            : t('resources.status_stopped')}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : loadingFile && !fileData ? (
                                <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
                                    <RefreshCw className="h-4 w-4 animate-spin" />{t('resources.loading_file')}</div>
                            ) : fileData?.binary ? (
                                <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
                                    <AlertCircle className="h-8 w-8 text-amber-300" />
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">{t('resources.binary_title')}</p>
                                        <p className="mt-1 text-sm text-muted-foreground">{t('resources.binary_desc')}</p>
                                    </div>
                                </div>
                            ) : fileData?.tooLarge ? (
                                <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
                                    <AlertCircle className="h-8 w-8 text-amber-300" />
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">{t('resources.too_large_title')}</p>
                                        <p className="mt-1 text-sm text-muted-foreground">{t('resources.too_large_desc')}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid h-full min-h-0 grid-rows-[auto_1fr_auto]">
                                    <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-2 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-3">
                                            <span className={cn(
                                                'rounded-full px-2 py-1',
                                                fileData?.editable ? 'bg-emerald-500/10 text-emerald-300' : 'bg-muted text-muted-foreground'
                                            )}>
                                                {fileData?.editable ? t('resources.editable') : t('resources.read_only')}
                                            </span>
                                            {isDirty && <span className="rounded-full bg-amber-500/10 px-2 py-1 text-amber-300">{t('resources.unsaved')}</span>}
                                        </div>
                                        <div className="font-mono">{lineCount} {t('resources.lines')} | {editorValue.length} chars</div>
                                    </div>

                                    <div className="min-h-0 overflow-hidden bg-[#0b1220]">
                                        <textarea
                                            spellCheck={false}
                                            value={editorValue}
                                            onChange={(event) => handleEditorChange(event.target.value)}
                                            readOnly={!fileData?.editable || !canChangeResource}
                                            className="h-full w-full resize-none border-0 bg-transparent px-4 py-4 font-mono text-[13px] leading-6 text-slate-100 outline-none placeholder:text-slate-500"
                                            placeholder={t('resources.editor_placeholder')}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
                                        <span className="truncate">{selectedResource}</span>
                                        <span className="truncate font-mono">{selectedFile}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    )
}
