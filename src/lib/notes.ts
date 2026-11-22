import { getCollection, type CollectionEntry } from 'astro:content'

export type CategoryTone = 'green' | 'blue' | 'orange' | 'purple'

export interface NoteSummary {
  id: string
  title: string
  description: string
  href: string
  categoryKey: string
  categoryLabel: string
  categoryTone: CategoryTone
  updatedAt: Date | null
  formattedDate: string
  wordCount: number
}

export interface CategoryStat {
  key: string
  label: string
  count: number
  tone: CategoryTone
}

export interface GrimoireOverview {
  totalNotes: number
  totalCategories: number
  totalWords: number
  formattedWords: string
  latestUpdatedAt: Date | null
  latestFormattedDate: string
  categories: CategoryStat[]
  recentNotes: NoteSummary[]
}

interface ChildProcessModule {
  spawnSync: (
    command: string,
    args: string[],
    options: { cwd?: string; encoding?: 'utf-8'; maxBuffer?: number }
  ) => { status: number | null; stdout: string; error?: Error }
}

interface FsModule {
  statSync: (path: string) => { mtime: Date }
}

interface PathModule {
  relative: (from: string, to: string) => string
  resolve: (...paths: string[]) => string
  sep: string
}

const CATEGORY_MAP: Record<string, { label: string; tone: CategoryTone }> = {
  proxy: { label: '网络代理', tone: 'green' },
  network: { label: '网络与路由', tone: 'green' },
  virtualization: { label: '虚拟化', tone: 'blue' },
  vm: { label: '虚拟化', tone: 'blue' },
  pve: { label: 'Proxmox VE', tone: 'blue' },
  docker: { label: '容器化', tone: 'blue' },
  linux: { label: 'Linux', tone: 'orange' },
  ops: { label: '系统运维', tone: 'orange' },
  homelab: { label: '家庭服务器', tone: 'purple' },
  server: { label: '家庭服务器', tone: 'purple' },
  nas: { label: 'NAS 与存储', tone: 'purple' },
  selfhost: { label: '自托管服务', tone: 'purple' },
  guides: { label: '实践指南', tone: 'green' },
  reference: { label: '技术参考', tone: 'blue' },
}

const FALLBACK_TONES: CategoryTone[] = ['green', 'blue', 'orange', 'purple']

async function importNodeModule<T>(specifier: string): Promise<T | null> {
  try {
    return (await import(/* @vite-ignore */ specifier)) as T
  } catch {
    return null
  }
}

function getWorkingDirectory(): string {
  const proc = (globalThis as { process?: { cwd?: () => string } }).process
  return typeof proc?.cwd === 'function' ? proc.cwd() : '.'
}

function normalizePath(filePath: string, sep: string): string {
  return sep === '\\' ? filePath.replace(/\\/g, '/') : filePath
}

function getGitLastUpdatedMap(
  rootDir: string,
  cp: ChildProcessModule | null,
  path: PathModule | null
): Map<string, Date> {
  const map = new Map<string, Date>()
  if (!cp || !path) return map

  const docsDir = path.resolve(rootDir, 'src/content/docs')

  try {
    const topLevel = cp.spawnSync('git', ['rev-parse', '--show-toplevel'], {
      cwd: rootDir,
      encoding: 'utf-8',
    })
    if (topLevel.error || topLevel.status !== 0) return map
    const repoRoot = topLevel.stdout.trim()
    if (!repoRoot) return map

    const gitLog = cp.spawnSync(
      'git',
      ['log', '--format=t:%ct', '--name-only', '-z', '--', docsDir],
      {
        cwd: repoRoot,
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
      }
    )
    if (gitLog.error || gitLog.status !== 0) return map

    let runningTimestamp = 0
    for (const rawEntry of gitLog.stdout.split('\0')) {
      const entry = rawEntry.replace(/^\r?\n/, '')
      if (!entry) continue
      if (/^t:\d+$/.test(entry)) {
        runningTimestamp = Number.parseInt(entry.slice(2), 10) * 1000
        continue
      }
      const fullPath = path.resolve(repoRoot, entry)
      const relPath = normalizePath(path.relative(rootDir, fullPath), path.sep)
      if (!map.has(relPath) && runningTimestamp > 0) {
        map.set(relPath, new Date(runningTimestamp))
      }
    }
  } catch {
    return map
  }

  return map
}

function getFallbackMtime(
  rootDir: string,
  fs: FsModule | null,
  path: PathModule | null,
  filePath?: string
): Date | null {
  if (!fs || !path || !filePath) return null
  try {
    const stat = fs.statSync(path.resolve(rootDir, filePath))
    return stat.mtime
  } catch {
    return null
  }
}

function estimateWordCount(body?: string): number {
  if (!body) return 0
  const cleaned = body
    .replace(/^import\s.+$/gm, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_~|[\]()-]/g, ' ')

  const cjkMatches = cleaned.match(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g)
  const latinMatches = cleaned
    .replace(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g, ' ')
    .match(/[A-Za-z0-9]+/g)

  return (cjkMatches?.length ?? 0) + (latinMatches?.length ?? 0)
}

function extractExcerpt(entry: CollectionEntry<'docs'>): string {
  if (entry.data.description?.trim()) {
    return entry.data.description.trim()
  }
  const body = entry.body ?? ''
  const lines = body
    .replace(/```[\s\S]*?```/g, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length > 0 &&
        !line.startsWith('#') &&
        !line.startsWith('import ') &&
        !line.startsWith('<') &&
        !line.startsWith(':::')
    )

  const firstLine = (lines[0] ?? '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .trim()

  if (!firstLine) return '点击查看详细技术笔记内容。'
  return firstLine.length > 90 ? `${firstLine.slice(0, 90)}…` : firstLine
}

function resolveCategory(id: string): {
  key: string
  label: string
  tone: CategoryTone
} {
  const parts = id.split('/')
  if (parts.length <= 1) {
    return { key: 'general', label: '未分类', tone: 'green' }
  }

  const key = parts[0].toLowerCase()
  const mapped = CATEGORY_MAP[key]
  if (mapped) {
    return { key, ...mapped }
  }

  const hash = [...key].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  const label = parts[0]
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase())
  return {
    key,
    label,
    tone: FALLBACK_TONES[hash % FALLBACK_TONES.length],
  }
}

function formatDate(date: Date | null): string {
  if (!date || Number.isNaN(date.getTime())) return '—'
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatWordCount(count: number): string {
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}w`
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`
  }
  return String(count)
}

function buildHref(id: string): string {
  const cleaned = id.replace(/\/index$/, '').replace(/^\/+|\/+$/g, '')
  return cleaned ? `/${cleaned}/` : '/'
}

export async function getGrimoireOverview(
  recentLimit = 6
): Promise<GrimoireOverview> {
  const rootDir = getWorkingDirectory()
  const [allDocs, cp, fs, path] = await Promise.all([
    getCollection('docs'),
    importNodeModule<ChildProcessModule>('node:child_process'),
    importNodeModule<FsModule>('node:fs'),
    importNodeModule<PathModule>('node:path'),
  ])

  const gitDates = getGitLastUpdatedMap(rootDir, cp, path)
  const pathSep = path?.sep ?? '/'

  const notes: NoteSummary[] = allDocs
    .filter((entry) => {
      if (entry.data.draft) return false
      if (entry.data.template === 'splash') return false
      const normalizedId = entry.id.replace(/\/index$/, '')
      if (
        normalizedId === '' ||
        normalizedId === 'index' ||
        normalizedId === '404'
      ) {
        return false
      }
      return true
    })
    .map((entry) => {
      const normalizedFilePath = entry.filePath
        ? normalizePath(entry.filePath, pathSep)
        : undefined
      const frontmatterDate =
        entry.data.lastUpdated instanceof Date ? entry.data.lastUpdated : null
      const gitDate = normalizedFilePath
        ? (gitDates.get(normalizedFilePath) ?? null)
        : null
      const mtimeDate = getFallbackMtime(rootDir, fs, path, normalizedFilePath)

      const updatedAt = frontmatterDate ?? gitDate ?? mtimeDate
      const category = resolveCategory(entry.id)

      return {
        id: entry.id,
        title: entry.data.title,
        description: extractExcerpt(entry),
        href: buildHref(entry.id),
        categoryKey: category.key,
        categoryLabel: category.label,
        categoryTone: category.tone,
        updatedAt,
        formattedDate: formatDate(updatedAt),
        wordCount: estimateWordCount(entry.body),
      }
    })
    .sort((a, b) => {
      const timeA = a.updatedAt?.getTime() ?? 0
      const timeB = b.updatedAt?.getTime() ?? 0
      if (timeB !== timeA) return timeB - timeA
      return a.title.localeCompare(b.title, 'zh-CN')
    })

  const categoryCounts = new Map<string, CategoryStat>()
  let totalWords = 0

  for (const note of notes) {
    totalWords += note.wordCount
    const existing = categoryCounts.get(note.categoryKey)
    if (existing) {
      existing.count += 1
    } else {
      categoryCounts.set(note.categoryKey, {
        key: note.categoryKey,
        label: note.categoryLabel,
        count: 1,
        tone: note.categoryTone,
      })
    }
  }

  const categories = Array.from(categoryCounts.values()).sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label, 'zh-CN')
  )

  const latestUpdatedAt = notes[0]?.updatedAt ?? null

  return {
    totalNotes: notes.length,
    totalCategories: categories.length,
    totalWords,
    formattedWords: formatWordCount(totalWords),
    latestUpdatedAt,
    latestFormattedDate: formatDate(latestUpdatedAt),
    categories,
    recentNotes: notes.slice(0, recentLimit),
  }
}
