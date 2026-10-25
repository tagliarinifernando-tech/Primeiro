import { expect, test } from 'claude-code/testing'

const USAGE = { input_tokens: 10_000, output_tokens: 1_000, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }

test('easy prompts go to haiku, hard ones stay on the main model', async ($, on) => {
  const models: string[] = []
  let label = 'hard'
  on('session.usage', () => ({ value: { startedAt: 0, context: { tokens: 5_000, window: 200_000 }, rateLimits: [] } }))
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  on('model.classify', () => ({ value: label }))
  on('clock.now', () => ({ value: Date.UTC(2026, 9, 25) }))
  on('store.get', () => ({ value: undefined }))
  on('store.set', () => ({ value: undefined }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.step', async function* (_, e) {
    models.push(e.model)
    return {
      turnId: e.turnId,
      index: e.index,
      answer: 'ok',
      toolUses: [],
      stopReason: 'end_turn',
      usage: { ...USAGE, model: e.model === 'haiku' ? 'claude-haiku-5-5' : 'claude-opus-5-5' },
    }
  })

  async function turn(text: string) {
    await $.turn.start({ text, turnId: text })
    for await (const _ of $.turn.step({ turnId: text, index: 0, model: 'claude-opus-5-5', messageCount: 1 })) void _
  }

  await turn('fix the typo in README')
  await turn('plan the launch of the new clinic site')
  await turn('what does this error mean?')
  label = 'easy'
  await turn('make the table columns line up')

  expect(models).toEqual(['haiku', 'claude-opus-5-5', 'claude-opus-5-5', 'haiku'])
})
