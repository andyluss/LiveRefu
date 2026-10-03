/**
 * 站内全文检索（D9：Nuxt Content 内置 SQL 全文检索）。
 *
 * 实现要点：
 * - `useSearchCollection` 在**客户端**加载文章集合并建立 FTS 索引，
 *   因此不需要任何外部搜索服务（与 D5「零外部服务」取向一致）。
 * - 首次真正检索时才 `init()`，避免每个页面都下载索引。
 * - 返回的 `SearchResult.id` 形如 `/wiki/main/16-apocalypse#some-heading`，
 *   可直接作为链接目标。
 */

export interface SearchHit {
  id: string
  title: string
  titles: string[]
  level: number
  content: string
  rank: number
  snippets?: { title?: string; content?: string }
}

export function useSiteSearch() {
  const { search, status, init } = useSearchCollection('wiki', {
    immediate: false,
    minHeading: 'h2',
    maxHeading: 'h3',
  })

  const results = ref<SearchHit[]>([])
  const query = ref('')
  const pending = ref(false)
  const error = ref<string | null>(null)
  const searched = ref(false)
  let timer: ReturnType<typeof setTimeout> | null = null

  async function run(q: string) {
    const term = q.trim()
    query.value = q
    if (!term) {
      results.value = []
      searched.value = false
      return
    }
    pending.value = true
    error.value = null
    try {
      await init()
      results.value = (await search(term, {
        limit: 30,
        snippet: { columns: ['content'], around: 24 },
      })) as SearchHit[]
      searched.value = true
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      results.value = []
    } finally {
      pending.value = false
    }
  }

  /** 输入去抖（250ms），避免逐字建索引 */
  function searchDebounced(q: string) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => void run(q), 250)
  }

  return { query, results, pending, error, searched, status, run, searchDebounced }
}
