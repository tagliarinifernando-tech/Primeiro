import { atom, read, update } from 'claude-code'
import type { EngineInterface, McpToolResult, Register } from 'claude-code'

import type { DashboardEvent, DashboardFeed, DashboardMail, DashboardTab, DashboardTodo } from '../types'

const PANE = 'dashboard'
const TODOS_KEY = 'dashboard.todos'
const REFRESH_MS = 10 * 60 * 1000

// Connector names differ between hosts, so each is tried in turn.
const GMAIL_SERVERS = ['claude.ai Gmail', 'Gmail']
const CALENDAR_SERVERS = ['claude.ai Google Calendar', 'Google Calendar']
const CALENDAR_TOOLS = ['list_events', 'list_gcal_events', 'search_events']
const INBOX_QUERY =
  'in:inbox newer_than:1d -category:promotions -category:social -category:updates -category:forums'

const EMPTY_FEED = { rows: [], problem: null }

const todos = atom({ plugin: 'dashboard', key: 'todos' } as const, [] as DashboardTodo[], {
  shape: 'todos-1',
})
const inbox = atom({ plugin: 'dashboard', key: 'inbox' } as const, EMPTY_FEED as DashboardFeed<DashboardMail>, {
  shape: 'inbox-1',
})
const today = atom({ plugin: 'dashboard', key: 'today' } as const, EMPTY_FEED as DashboardFeed<DashboardEvent>, {
  shape: 'today-1',
})
const tab = atom({ plugin: 'dashboard', key: 'tab' } as const, 'todo' as DashboardTab)

type Json = Record<string, unknown>

function asRecord(value: unknown): Json | undefined {
  return typeof value === 'object' && value !== null ? (value as Json) : undefined
}

function payloadOf(result: McpToolResult): unknown {
  if (result.structuredContent !== undefined) return result.structuredContent
  const text = result.content.map(block => block.text ?? '').join('')
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

async function callFirst(
  $: EngineInterface,
  servers: readonly string[],
  tools: readonly string[],
  args: Record<string, unknown>,
) {
  for (const server of servers) {
    for (const tool of tools) {
      const result = await $.mcp.call(server, tool, args).catch(() => undefined)
      if (result !== undefined && !result.isError) return payloadOf(result)
    }
  }

  return undefined
}

function agoText(now: number, date: unknown) {
  const at = typeof date === 'string' || typeof date === 'number' ? new Date(date).getTime() : NaN
  if (Number.isNaN(at)) return null
  const minutes = Math.max(0, Math.round((now - at) / 60_000))
  if (minutes < 60) return `${minutes}m`

  return `${Math.round(minutes / 60)}h`
}

async function loadInbox($: EngineInterface): Promise<DashboardFeed<DashboardMail>> {
  const payload = asRecord(
    await callFirst($, GMAIL_SERVERS, ['search_threads'], { query: INBOX_QUERY, pageSize: 25 }),
  )
  if (payload === undefined) return { rows: [], problem: 'Gmail connector not connected.' }

  const now = await $.clock.now()
  const threads = Array.isArray(payload.threads) ? payload.threads : []
  const rows: DashboardMail[] = []
  for (const thread of threads) {
    const record = asRecord(thread)
    const messages = Array.isArray(record?.messages) ? record.messages.map(asRecord) : []
    const last = messages[messages.length - 1]
    const first = messages[0]
    const labels = Array.isArray(last?.labelIds) ? last.labelIds : []
    // The last message is ours: already answered.
    if (labels.includes('SENT')) continue
    rows.push({
      id: String(record?.id ?? rows.length),
      from: String(last?.sender ?? 'unknown').replace(/<.*>/, '').trim(),
      subject: String(first?.subject ?? '(no subject)'),
      ago: agoText(now, last?.date),
    })
  }

  return { rows, problem: null }
}

function findEvents(value: unknown, found: DashboardEvent[]) {
  if (Array.isArray(value)) {
    for (const item of value) findEvents(item, found)
    return
  }
  const record = asRecord(value)
  if (record === undefined) return
  const start = record.start
  if (typeof record.summary === 'string' && start !== undefined) {
    const startRecord = asRecord(start)
    const dateTime = startRecord?.dateTime ?? (typeof start === 'string' ? start : undefined)
    const at = typeof dateTime === 'string' ? new Date(dateTime).getTime() : NaN
    found.push({
      title: record.summary,
      startsAt: Number.isNaN(at) ? null : at,
      isAllDay: startRecord?.date !== undefined && dateTime === undefined,
    })
    return
  }
  for (const child of Object.values(record)) findEvents(child, found)
}

async function loadToday($: EngineInterface): Promise<DashboardFeed<DashboardEvent>> {
  const now = new Date(await $.clock.now())
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  const payload = await callFirst($, CALENDAR_SERVERS, CALENDAR_TOOLS, {
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
  })
  if (payload === undefined) return { rows: [], problem: 'Google Calendar connector not connected.' }

  const rows: DashboardEvent[] = []
  findEvents(payload, rows)
  rows.sort((a, b) => (a.startsAt ?? 0) - (b.startsAt ?? 0))

  return { rows, problem: null }
}

async function refresh($: EngineInterface) {
  const [mail, events] = await Promise.all([loadInbox($), loadToday($)])
  await update($, inbox, () => mail)
  await update($, today, () => events)
}

function timeOf(at: number) {
  const date = new Date(at)

  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
}

async function saveTodos($: EngineInterface, list: DashboardTodo[]) {
  await update($, todos, () => list)
  await $.store.set(TODOS_KEY, list)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    // /dashboard is a name Claude Code ships, so the command is /painel.
    await $.command.register({
      name: 'painel',
      description: 'Open the dashboard: to-dos, emails waiting on you, today’s calendar',
    })

    const kept = await $.store.get(TODOS_KEY)
    if (Array.isArray(kept)) await update($, todos, () => kept as DashboardTodo[])

    void refresh($)
    $.clock.every(REFRESH_MS, () => void refresh($))

    return next(e)
  })

  on('command.run', { command: 'painel' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Dashboard' })
    void refresh($)

    return { text: 'Dashboard opened.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const elements = $.ui.resolve(e)
    const { Box, Text, Button } = elements
    // Mobile draws no text fields.
    const Input = 'Input' in elements ? elements.Input : undefined
    const current = await read($, tab)

    const tabs = (
      <Box>
        {(['todo', 'inbox', 'today'] as const).map(name => (
          <Button
            key={`tab-${name}`}
            label={name === 'todo' ? 'To-do' : name === 'inbox' ? 'Inbox' : 'Today'}
            variant={name === current ? 'primary' : 'secondary'}
            onPress={() => update($, tab, () => name)}
          />
        ))}
      </Box>
    )

    if (current === 'todo') {
      const list = await read($, todos)

      return (
        <Box flexDirection="column">
          {tabs}
          {Input ? (
            <Input
              key="new-todo"
              placeholder="Add a task and press Enter"
              onSubmit={async (text: string) => {
                const task = text.trim()
                if (task === '') return
                const id = `${await $.clock.now()}`
                await saveTodos($, [...(await read($, todos)), { id, text: task }])
              }}
            />
          ) : null}
          {list.length === 0 && <Text dimColor>Nothing to do.</Text>}
          {list.map(todo => (
            <Button
              key={`done-${todo.id}`}
              plain
              onPress={async () => saveTodos($, (await read($, todos)).filter(one => one.id !== todo.id))}
            >
              ☐ {todo.text}
            </Button>
          ))}
        </Box>
      )
    }

    if (current === 'inbox') {
      const feed = await read($, inbox)

      return (
        <Box flexDirection="column">
          {tabs}
          {feed.problem !== null && <Text dimColor>{feed.problem}</Text>}
          {feed.problem === null && feed.rows.length === 0 && <Text dimColor>No emails waiting on you.</Text>}
          {feed.rows.map(mail => (
            <Text>
              {mail.from} · {mail.subject}
              {mail.ago !== null && <Text dimColor> · {mail.ago} ago</Text>}
            </Text>
          ))}
        </Box>
      )
    }

    const feed = await read($, today)

    return (
      <Box flexDirection="column">
        {tabs}
        {feed.problem !== null && <Text dimColor>{feed.problem}</Text>}
        {feed.problem === null && feed.rows.length === 0 && <Text dimColor>Nothing on the calendar today.</Text>}
        {feed.rows.map(event => (
          <Text>
            <Text dimColor>{event.isAllDay || event.startsAt === null ? 'all day' : timeOf(event.startsAt)}</Text>{' '}
            {event.title}
          </Text>
        ))}
      </Box>
    )
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)

    const list = await read($, todos)
    const mail = await read($, inbox)
    const events = await read($, today)
    const now = await $.clock.now()
    const upcoming = events.rows.find(event => event.startsAt !== null && event.startsAt > now)

    const parts = [`${list.length} to-do${list.length === 1 ? '' : 's'}`]
    if (mail.problem === null) parts.push(`${mail.rows.length} to answer`)
    if (upcoming !== undefined && upcoming.startsAt !== null) {
      parts.push(`next: ${timeOf(upcoming.startsAt)} ${upcoming.title}`)
    }

    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box>
        <Text dimColor>{parts.join(' · ')}</Text>
      </Box>
    )
  })
}
