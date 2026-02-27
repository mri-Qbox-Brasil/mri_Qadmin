import React, { useState, useCallback } from "react"
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder"
import { cn } from "@/lib/utils"
import { Mic, Square, Pause, Play, X, Send } from "lucide-react"

interface VoiceRecorderProps {
    onSend: (audioData: string, duration: number) => void
    maxDuration?: number
    disabled?: boolean
}

export function VoiceRecorder({
    onSend,
    maxDuration = 60,
    disabled = false,
}: VoiceRecorderProps) {
    const [isProcessing, setIsProcessing] = useState(false)

    const handleRecordingComplete = useCallback(async (audioBlob: Blob, duration: number) => {
        setIsProcessing(true)

        try {
            const reader = new FileReader()
            reader.onloadend = () => {
                const base64 = (reader.result as string).split(",")[1]
                onSend(base64, duration)
                setIsProcessing(false)
            }
            reader.onerror = () => {
                console.error("Failed to convert audio to base64")
                setIsProcessing(false)
            }
            reader.readAsDataURL(audioBlob)
        } catch (err) {
            console.error("Error processing recording:", err)
            setIsProcessing(false)
        }
    }, [onSend])

    const {
        isRecording,
        isPaused,
        duration,
        error,
        startRecording,
        stopRecording,
        pauseRecording,
        resumeRecording,
        cancelRecording
    } = useVoiceRecorder({
        maxDuration,
        onRecordingComplete: handleRecordingComplete
    })

    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${mins}:${secs.toString().padStart(2, "0")}`
    }

    if (isRecording || isPaused) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg border border-border flex-1">
                <div className={cn(
                    "w-3 h-3 rounded-full",
                    isPaused ? "bg-yellow-500" : "bg-red-500 animate-pulse"
                )} />

                <span className="text-sm font-mono text-foreground min-w-[4rem]">
                    {formatDuration(duration)}
                </span>

                <div className="flex-1 h-1.5 bg-background rounded-full overflow-hidden border border-border">
                    <div
                        className={cn(
                            "h-full transition-all",
                            isPaused ? "bg-yellow-500" : "bg-red-500"
                        )}
                        style={{ width: `${(duration / maxDuration) * 100}%` }}
                    />
                </div>

                <button
                    onClick={isPaused ? resumeRecording : pauseRecording}
                    title={isPaused ? "Resume" : "Pause"}
                    className="p-1.5 hover:bg-background rounded-md text-foreground transition-colors"
                >
                    {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                </button>

                <button
                    onClick={cancelRecording}
                    title={"Cancel"}
                    className="p-1.5 hover:bg-background rounded-md text-destructive transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>

                <button
                    onClick={stopRecording}
                    disabled={duration < 0.5}
                    title={"Send"}
                    className="p-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors disabled:opacity-50"
                >
                    <Send className="w-4 h-4" />
                </button>
            </div>
        )
    }

    return (
        <button
            onClick={startRecording}
            disabled={disabled || isProcessing}
            title={error || "Gravar áudio"}
            className={cn(
                "p-2 rounded-md transition-colors",
                disabled || isProcessing ? "opacity-50 cursor-not-allowed" : "hover:bg-muted text-foreground",
                error && "text-destructive"
            )}
        >
            {isProcessing ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            ) : (
                <Mic className="w-5 h-5" />
            )}
        </button>
    )
}
