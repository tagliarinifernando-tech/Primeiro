export type DashboardTodo = { id: string; text: string }

export type DashboardMail = { id: string; from: string; subject: string; ago: string | null }

export type DashboardEvent = { title: string; startsAt: number | null; isAllDay: boolean }

export type DashboardFeed<T> = {
  rows: T[]
  // why the rows are missing: no connector, or a failed call
  problem: string | null
}

export type DashboardTab = 'todo' | 'inbox' | 'today'

declare module 'claude-code' {
  interface PluginState {
    dashboard: {
      todos: Shaped<DashboardTodo[]>
      inbox: Shaped<DashboardFeed<DashboardMail>>
      today: Shaped<DashboardFeed<DashboardEvent>>
      tab: DashboardTab
    }
  }
}
