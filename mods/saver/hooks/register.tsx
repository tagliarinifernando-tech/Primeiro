import { atom, read, update } from 'claude-code'
import type { EngineInterface, ModelUsage, Register } from 'claude-code'

import type { SaverStats } from '../types'

const CHEAP = 'haiku'
// Haiku 5.5 doubles its price past 100K tokens, so routing stops there.
const CONTEXT_LIMIT = 100_000
const STORE_KEY = 'saver.stats'

// List prices per million tokens, input and output (October 2026).
const PRICES: { match: RegExp; input: number; output: number }[] = [
  { match: /haiku/i, input: 0.1, output: 0.5 },
  { match: /sonnet/i, input: 2, output: 10 },
  { match: /opus/i, input: 4, output: 20 },
  { match: /fable/i, input: 10, output: 50 },
]

const EASY = /\b(typo|rename|renomei|reformat|formata|summari[sz]e|resum|translate|traduz|what is|o que é|qual é|lookup|list)\b/i
const HARD = /\b(plan|planej|debug|bug|erro|error|implement|build|crie|create|refactor|design|architect|write (a|the) (doc|code)|escrev)\b/i

const EMPTY: SaverStats = { day: '', saved: 0, lastModel: null, isOn: true }

const stats = atom({ plugin: 'saver', key: 'stats' } as const, EMPTY, {
  shape: 'stats-1',
})

function priceOf(model: string) {
  return PRICES.find(one => one.match.test(model))
}

function costOf(usage: ModelUsage, price: { input: number; output: number }) {
  const input =
    usage.input_tokens +
    usage.cache_read_input_tokens * 0.1 +
    usage.cache_creation_input_tokens * 1.25

  return (input * price.input + usage.output_tokens * price.output) / 1_000_000
}

async function today($: EngineInterface) {
  return new Date(await $.clock.now()).toISOString().slice(0, 10)
}

async function isEasy($: EngineInterface, text: string) {
  if (text.trim() === '') return false
  if (HARD.test(text)) return false
  if (EASY.test(text) && text.length < 400) return true

  const label = await $.model
    .classify(
      `Is this request easy (typos, renames, formatting, short summaries, quick questions) or hard (planning, debugging, new code, many steps)?\n\n${text.slice(0, 2000)}`,
      ['easy', 'hard'],
      { model: CHEAP },
    )
    .catch(() => undefined)

  return label === 'easy'
}

export const register: Register = on => {
  // turnId -> the model the session would have used, for easy turns only
  const routed = new Map<string, string>()

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'saver',
      description: 'Send easy prompts to Claude Haiku 5.5: /saver on, /saver off',
      argumentHint: '[on|off]',
    })

    const kept = (await $.store.get(STORE_KEY)) as SaverStats | undefined
    const day = await today($)
    await update($, stats, current => ({
      ...(kept ?? current),
      day,
      saved: kept?.day === day ? kept.saved : 0,
    }))

    return next(e)
  })

  on('command.run', { command: 'saver' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()

    if (arg === 'on' || arg === 'off') {
      const changed = await update($, stats, current => ({ ...current, isOn: arg === 'on' }))
      await $.store.set(STORE_KEY, changed)

      return { text: arg === 'on' ? 'Saver is on.' : 'Saver is off: every prompt stays on your main model.' }
    }

    const current = await read($, stats)

    return {
      text: `Saver is ${current.isOn ? 'on' : 'off'}. Saved today: $${current.saved.toFixed(4)}. Use /saver on or /saver off.`,
    }
  })

  on('turn.start', async ($, e, next) => {
    if (e.agentId !== undefined) return next(e)

    const current = await read($, stats)
    if (!current.isOn) return next(e)

    const { context } = await $.session.usage()
    if ((context.tokens ?? 0) >= CONTEXT_LIMIT) return next(e)

    if (await isEasy($, e.text)) {
      routed.set(e.turnId, await $.session.model())
    }

    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    const main = routed.get(e.turnId)
    const isRouted = main !== undefined && e.agentId === undefined
    const result = yield* next(isRouted ? { ...e, model: CHEAP } : e)

    if (e.agentId === undefined && result.usage !== null) {
      const usage = result.usage
      const mainPrice = isRouted ? priceOf(main) : undefined
      const cheapPrice = priceOf(CHEAP)
      const saved =
        mainPrice && cheapPrice ? Math.max(0, costOf(usage, mainPrice) - costOf(usage, cheapPrice)) : 0
      const day = await today($)
      const changed = await update($, stats, current => ({
        ...current,
        lastModel: usage.model,
        day,
        saved: (current.day === day ? current.saved : 0) + saved,
      }))
      await $.store.set(STORE_KEY, changed)
    }

    return result
  })

  on('turn.complete', ($, e, next) => {
    routed.delete(e.turnId)

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const current = await read($, stats)
    if (e.props.hasSurvey || current.lastModel === null) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const model = current.lastModel.replace(/^claude-/, '')

    return (
      <Box>
        <Text dimColor>
          saver {current.isOn ? 'on' : 'off'} · last answer: {model} · saved today: $
          {current.saved.toFixed(4)}
        </Text>
      </Box>
    )
  })
}
