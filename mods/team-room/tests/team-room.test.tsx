import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'team-room',
  component: 'Pane',
  requestId: 'team',
  props: { title: 'Team', isFocused: false, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 20 }, view: {} },
} as const

test('messages in and out are listed, newest first', async ($, on) => {
  let now = Date.UTC(2026, 9, 25, 12)
  on('clock.now', () => ({ value: (now += 60_000) }))
  on('session.send', () => ({ isDelivered: true }))
  on('session.receive', (_, e) => ({ text: e.text }))

  await $.session.send({ to: 'outreach', text: 'Leads are ready: 40 in leads.csv\nmore' })
  await $.session.receive({ origin: { kind: 'peer' }, text: '<message from="outreach">Wrote 40 drafts</message>' })

  for (const surface of ['terminal', 'desktop', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    const rows = await ui.findAll({ type: 'Text', text: /[←→] @outreach/ })
    expect(rows.map(row => row.text)).toEqual([
      expect.stringContaining('← @outreach Wrote 40 drafts'),
      expect.stringContaining('→ @outreach Leads are ready: 40 in leads.csv'),
    ])
    await ui.unmount()
  }
})
