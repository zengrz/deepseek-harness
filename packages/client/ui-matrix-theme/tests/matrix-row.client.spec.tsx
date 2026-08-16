// @vitest-environment jsdom
/** MatrixRow behavior: title + switch toggle; selection follows the store
 * mirror (never the click echo), and clicks drive setMatrix. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createSnapshotStore, type SessionListState, type WorkspaceListState } from '@deepseek-ai/dsh-client-runtime/client'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-web-react'
import { MatrixRow } from '../src/client/MatrixRow.tsx'
import type { MatrixRowComponentProps } from '../src/client/MatrixRow.tsx'
import { createMatrixThemeStore } from '../src/client/store.ts'

afterEach(cleanup)

const COPY: Record<string, string> = {
  'matrix.title': 'Matrix theme',
  'matrix.on': 'On',
  'matrix.off': 'Off',
}

/** Empty global standard-kit hooks (the row reads neither). */
function emptySessions() {
  const store = createSnapshotStore<SessionListState>(
    { ids: [], byId: {}, current: undefined, phase: 'ready', subagentsByParent: {}, jobsBySession: {}, currentAddress: undefined })
  return bindSnapshotSelector(store)
}
function emptyWorkspaces() {
  const store = createSnapshotStore<WorkspaceListState>({
    items: [], archivedSessionIds: [], state: 'idle', phase: 'ready', error: null,
    baselinesReady: true, recentWorkspaceId: undefined,
  })
  return bindSnapshotSelector(store)
}

function mount(active: boolean) {
  // Real store instance — the sanctioned zero-machinery path for tests.
  const store = createMatrixThemeStore().create()
  store.actions.sync(active, active, 0)
  const setMatrix = vi.fn()
  const props: MatrixRowComponentProps = {
    useSessions: emptySessions(),
    useWorkspaces: emptyWorkspaces(),
    useStore: bindSnapshotSelector(store),
    actions: store.actions,
    t: (key: string) => COPY[key] ?? key,
    setMatrix,
  }
  render(<MatrixRow {...props} />)
  return { store, setMatrix }
}

const checked = (): string | null => screen.getByRole('switch').getAttribute('aria-checked')

describe('MatrixRow', () => {
  it('renders the title and a switch matching the store mirror', () => {
    mount(true)
    expect(screen.getByText('Matrix theme')).toBeDefined()
    expect(checked()).toBe('true')
    expect(screen.getByText('On')).toBeDefined()
  })

  it('renders the off state label and false aria when matrix is not the preference', () => {
    mount(false)
    expect(checked()).toBe('false')
    expect(screen.getByText('Off')).toBeDefined()
  })

  it('click drives setMatrix with the negation; selection follows the store mirror, not the click echo', () => {
    const b = mount(false)
    fireEvent.click(screen.getByRole('switch'))
    expect(b.setMatrix).toHaveBeenCalledWith(true)
    // No store write yet: selection is unchanged.
    expect(checked()).toBe('false')
    act(() => { b.store.actions.sync(true, true, 1) })
    expect(checked()).toBe('true')
    expect(screen.getByText('On')).toBeDefined()
  })
})
