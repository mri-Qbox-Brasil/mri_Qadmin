import { useState } from 'react'
import Spinner from '@/components/Spinner'
import { useI18n } from '@/hooks/useI18n'
import { Info } from 'lucide-react'
import { MriPageHeader } from '@mriqbox/ui-kit'

export default function Credits() {
    const [loading, setLoading] = useState(true)
    const { t } = useI18n()

    return (
        <div className="h-full w-full flex flex-col bg-background">
            <MriPageHeader title={t('nav_credits')} icon={Info} />

            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                    <Spinner />
                </div>
            )}
            <iframe
                src="https://docs.mriqbox.com.br/"
                className="w-full h-full border-none"
                onLoad={() => setLoading(false)}
                sandbox="allow-same-origin allow-scripts"
                title="MRIQbox Documentation"
            />
        </div>
    )
}
