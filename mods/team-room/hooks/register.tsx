import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { TeamMessage } from '../types'

const PANE = 'team'
const TEAM_KEY = 'team-room.members'
const DEFAULT_TEAM = ['prospector', 'outreach']
const KEEP = 200
const STANDUP_ASK =
  'Standup from the manager: reply to me with ONE line, "done: <what you finished> · next: <what is next>".'

const messages = atom({ plugin: 'team-room', key: 'messages' } as const, [] as TeamMessage[], {
  shape: 'messages-1',
})

function firstLine(text: string) {
  const line = text.split('\n').find(one => one.trim() !== '') ?? ''

  return line.trim().slice(0, 200)
}

// A peer's delivery names its sender in the envelope the engine wraps it in.
function senderOf(text: string) {
  const match = /\bfrom[=:]\s*"?@?([\w.-]+)"?/i.exec(text)

  return match?.[1] ?? 'another session'
}

async function record($: EngineInterface, message: Omit<TeamMessage, 'id' | 'at'>) {
  const at = await $.clock.now()
  await update($, messages, list => [{ ...message, at, id: `${at}-${list.length}` }, ...list].slice(0, KEEP))
}

function clock(at: number) {
  const date = new Date(at)

  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'team',
      description: 'Open the Team pane: every message between this session and the others',
    })
    await $.command.register({
      name: 'standup',
      description: 'Ask each session for a one-line update (default: prospector, outreach)',
      argumentHint: '[name, name, ...]',
    })

    return next(e)
  })

  on('command.run', { command: 'team' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Team' })

    return { text: 'Team pane opened.' }
  })

  on('command.run', { command: 'standup' }, async ($, e) => {
    const named = e.args
      .split(/[\s,]+/)
      .map(name => name.replace(/^@/, ''))
      .filter(name => name !== '')
    const kept = await $.store.get(TEAM_KEY)
    const team = named.length > 0 ? named : Array.isArray(kept) ? (kept as string[]) : DEFAULT_TEAM
    await $.store.set(TEAM_KEY, team)
    void $.ui.open({ id: PANE, title: 'Team' })

    const results = await Promise.all(
      team.map(async to => ({ to, sent: await $.session.send({ to, text: STANDUP_ASK }) })),
    )
    const missed = results.filter(one => !one.sent.isDelivered).map(one => one.to)
    const asked = team.filter(name => !missed.includes(name))

    return {
      text:
        `Standup asked of ${asked.length > 0 ? asked.map(name => `@${name}`).join(', ') : 'nobody'}.` +
        (missed.length > 0 ? ` Not delivered to ${missed.map(name => `@${name}`).join(', ')}.` : '') +
        ' Replies show in the Team pane as they arrive.',
    }
  })

  on('session.send', async ($, e, next) => {
    const sent = await next(e)
    if (sent.isDelivered && e.agentId === undefined) {
      await record($, { direction: 'out', who: e.to, line: firstLine(e.text) })
    }

    return sent
  })

  on('session.receive', async ($, e, next) => {
    const origin = e.origin
    const isPeer =
      origin.kind === 'peer' || origin.kind === 'peer-send-message' || origin.kind === 'coordinator'
    if (isPeer && e.agentId === undefined) {
      const who = 'teammate' in origin ? origin.teammate : senderOf(e.text)
      await record($, { direction: 'in', who, line: firstLine(e.text.replace(/<[^>]+>/g, '')) })
    }

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const list = await read($, messages)
    const room = Math.max(1, e.props.scroll.bodyRows - 1)

    return (
      <Box flexDirection="column">
        {list.length === 0 && <Text dimColor>No messages between sessions yet. Try /standup.</Text>}
        {list.slice(0, room).map(message => (
          <Text>
            <Text dimColor>{clock(message.at)}</Text> {message.direction === 'in' ? '←' : '→'}{' '}
            <Text bold>@{message.who}</Text> {message.line}
          </Text>
        ))}
      </Box>
    )
  })
}
