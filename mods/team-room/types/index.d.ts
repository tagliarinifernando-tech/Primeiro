export type TeamMessage = {
  id: string
  at: number
  // 'in' from another session, 'out' from this one
  direction: 'in' | 'out'
  // the other session's name
  who: string
  // the message's first line
  line: string
}

declare module 'claude-code' {
  interface PluginState {
    'team-room': { messages: Shaped<TeamMessage[]> }
  }
}
