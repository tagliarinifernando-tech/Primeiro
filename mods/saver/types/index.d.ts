export type SaverStats = {
  // YYYY-MM-DD the savings count from
  day: string
  // US dollars saved today
  saved: number
  // the model that answered last, as the API names it
  lastModel: string | null
  isOn: boolean
}

declare module 'claude-code' {
  interface PluginState {
    saver: { stats: Shaped<SaverStats> }
  }
}
