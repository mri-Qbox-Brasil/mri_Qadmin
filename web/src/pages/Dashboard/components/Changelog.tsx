import React, { useEffect, useState } from 'react'
import { useI18n } from '@/context/I18n'
import Spinner from '@/components/Spinner'
import { Github, ExternalLink, User, Calendar, History, GitCommit } from 'lucide-react'
import { cn } from '@/lib/utils'

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
    <div className="flex flex-col h-full gap-4 p-6 bg-muted/10">
        <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-xl font-bold text-foreground">{t('changelog') || 'Changelog'}</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
            <Spinner />
        </div>
    </div>
  )

  if (error) return (
    <div className="flex flex-col h-full gap-4 p-6 bg-muted/10">
        <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-xl font-bold text-foreground">{t('changelog') || 'Changelog'}</h2>
        </div>
        <div className="flex-1 flex items-center justify-center text-red-400">
            {t('changelog_error') || 'Error loading changelog.'}
        </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full gap-4 p-6 overflow-hidden bg-muted/10 border-t border-border">
      <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground tracking-tight">{t('changelog') || 'Changelog'}</h2>
      </div>

      <div className="flex-1 overflow-auto space-y-3 pr-2 pb-4 no-scrollbar">
        {changelogs.length === 0 ? (
          <div className="text-center text-muted-foreground mt-8">
            {t('none_found') || 'No changelog found.'}
          </div>
        ) : (
          changelogs.map((item, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-card border border-border hover:border-sidebar-foreground/20 hover:bg-muted/40 transition-all group">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2 font-bold text-foreground">
                  <div className="p-1 rounded bg-muted text-muted-foreground group-hover:text-primary transition-colors">
                     <Github className="h-3.5 w-3.5" />
                  </div>
                  {item.repo}
                </div>
                <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ExternalLink className="h-4 w-4" />
                </a>
              </div>

              <div className="flex items-start gap-2 mb-3">
                 <GitCommit className="w-4 h-4 text-muted-foreground mt-0.5" />
                 <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed" title={item.message}>{item.message}</p>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground font-mono">
                <div className="flex items-center gap-1.5">
                  <User className="h-3 w-3" />
                  {item.author}
                </div>
                <div className="flex items-center gap-1.5">
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
