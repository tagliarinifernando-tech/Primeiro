import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'dashboard',
  component: 'Pane',
  requestId: 'dashboard',
  props: { title: 'Dashboard', isFocused: true, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 20 }, view: {} },
} as const

test('a task is added and ticked off, on every surface with a text field', async ($, on) => {
  let stored: unknown
  on('clock.now', () => ({ value: Date.UTC(2026, 9, 25, 12) }))
  on('store.get', () => ({ value: stored }))
  on('store.set', (_, e) => ((stored = e.value), { value: undefined }))

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ type: 'Text', text: /Nothing to do/ }))?.text).toBe('Nothing to do.')
    await ui.input({ key: 'new-todo', text: 'Ligar para o laboratório' })
    expect(stored).toEqual([{ id: String(Date.UTC(2026, 9, 25, 12)), text: 'Ligar para o laboratório' }])
    await ui.press({ key: `done-${Date.UTC(2026, 9, 25, 12)}` })
    expect(stored).toEqual([])
    await ui.unmount()
  }
})
