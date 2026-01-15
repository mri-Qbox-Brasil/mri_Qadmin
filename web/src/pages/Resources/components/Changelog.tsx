import { useEffect, useState } from 'react'
import { useI18n } from '@/context/I18n'
import Spinner from '@/components/Spinner'
import { Github, ExternalLink, User, Calendar, History } from 'lucide-react'

interface ChangelogItem {
  repo: string
  author: string
  date: string
  message: string
  url: string
}

export default function Changelog() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [changelogs, setChangelogs] = useState<ChangelogItem[]>([])
  const { t } = useI18n()

  useEffect(() => {
    async function fetchChangelogs() {
      try {
        const response = await fetch('https://api.github.com/orgs/mri-Qbox-Brasil/repos?per_page=10&sort=updated')
        if (!response.ok) throw new Error('Failed to fetch changelogs')

        const repos = await response.json()
        const fetchedLogs: ChangelogItem[] = []

        for (const repo of repos) {
          if (repo.name === '.github') continue;
          try {
            const commitsResponse = await fetch(`https://api.github.com/repos/mri-Qbox-Brasil/${repo.name}/commits?per_page=1`)
            if (commitsResponse.ok) {
              const [latestCommit] = await commitsResponse.json()
              fetchedLogs.push({
                repo: repo.name,
                author: latestCommit.commit.author.name,
                date: new Date(latestCommit.commit.author.date).toLocaleString(),
                message: latestCommit.commit.message,
                url: latestCommit.html_url,
              })
            }
          } catch (e) {
            console.error(`Failed to fetch commit for ${repo.name}`, e)
          }
        }
        setChangelogs(fetchedLogs)
      } catch (error) {
        console.error(error)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchChangelogs()
  }, [])

  if (loading) return (
    <div className="flex flex-col h-full gap-4 p-6">
        <div className="flex items-center gap-3 mb-2">
            <History className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold tracking-tight text-foreground">{t('server_changelog')}</h2>
        </div>
        <div className="flex-1 flex items-center justify-center bg-muted/50 rounded-xl border border-border border-dashed">
            <Spinner />
        </div>
    </div>
  )

  if (error) return (
    <div className="flex flex-col h-full gap-4 p-6">
        <div className="flex items-center gap-3 mb-2">
            <History className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold tracking-tight text-foreground">{t('server_changelog')}</h2>
        </div>
        <div className="flex-1 flex items-center justify-center bg-muted/50 rounded-xl border border-border border-dashed text-red-500">
            {t('server_changelog_error')}
        </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full p-6 overflow-hidden">
      <div className="flex items-center gap-3 mb-6">
            <History className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold tracking-tight text-foreground">{t('server_changelog')}</h2>
      </div>

      <div className="flex-1 overflow-auto space-y-3 pr-2 no-scrollbar">
        {changelogs.length === 0 ? (
          <div className="text-center text-muted-foreground mt-8 italic">
            {t('none_found')}
          </div>
        ) : (
          changelogs.map((item, idx) => (
            <div key={idx} className="p-4 bg-card border border-border rounded-xl hover:border-primary/50 transition-all group">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2 font-bold text-foreground group-hover:text-primary transition-colors text-sm">
                  <Github className="h-4 w-4" />
                  {item.repo}
                </div>
                <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <p className="text-xs text-muted-foreground mb-3 line-clamp-2 leading-relaxed" title={item.message}>{item.message}</p>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
                <div className="flex items-center gap-1.5 bg-muted px-1.5 py-0.5 rounded">
                  <User className="h-3 w-3" />
                  {item.author}
                </div>
                <div className="flex items-center gap-1.5 bg-muted px-1.5 py-0.5 rounded">
                   <Calendar className="h-3 w-3" />
                   {item.date}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
