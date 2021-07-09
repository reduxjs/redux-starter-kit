import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import type { Dispatch } from 'react'
import type { AnyAction, Middleware, Store } from 'redux'

export async function getDataFromTree(
  storeFn: (middleWare: Middleware) => Store,
  App: ({ store }: { store: Store }) => JSX.Element,
  renderFn = renderToStaticMarkup
) {
  const middlewareControls = createQueryMiddleWare()
  const store = storeFn(middlewareControls.middleware)
  try {
    await _getDataFromTree(middlewareControls, () =>
      renderFn(<App store={store} />)
    )
  } catch (e) {
    console.log(e)
  }

  return store
}

function createQueryMiddleWare() {
  let resolve: ((v?: unknown) => void) | null = null
  let reject: ((v?: unknown) => void) | null = null
  let onQueryStarted: (querySet: Set<String>) => void = () => undefined

  const state = {
    pendingQueries: new Set<String>(),
    renderComplete: false,
    queryStarted: false,
    promise: new Promise((res, rej) => {
      resolve = res
      reject = rej
    }),
  }

  const timeout = setTimeout(() => {
    reject?.()
  }, 5000)

  return {
    renderStart: () => {
      state.queryStarted = false
      state.renderComplete = false
    },
    renderDone: () => {
      state.renderComplete = true
      state.promise = new Promise((res, rej) => {
        resolve = res
        reject = rej
      })

      if (state.pendingQueries.size === 0) {
        resolve?.()
      }
    },
    onQueryStarted: (callback: (querySet?: Set<String>) => void) => {
      onQueryStarted = callback
    },
    middleware: () => (next: Dispatch<AnyAction>) => (action: AnyAction) => {
      const result = next(action)

      if (typeof action.type === 'string') {
        if (action.type.endsWith('executeQuery/pending')) {
          state.pendingQueries.add(action.meta.requestId)
          onQueryStarted(state.pendingQueries)
        } else if (
          action.type.endsWith('executeQuery/fulfilled') ||
          action.type.endsWith('executeQuery/rejected')
        ) {
          state.pendingQueries.delete(action.meta.requestId)
          if (state.renderComplete && state.pendingQueries.size === 0) {
            clearTimeout(timeout)
            resolve?.()
          }
        }
      }
      return result
    },
    state,
  }
}

async function _getDataFromTree(
  middlewareControls: ReturnType<typeof createQueryMiddleWare>,
  renderFn: () => void
): Promise<any> {
  let queryStarted = false
  middlewareControls.onQueryStarted(() => (queryStarted = true))
  middlewareControls.renderStart()
  renderFn()
  middlewareControls.renderDone()
  await middlewareControls.state.promise

  if (queryStarted) {
    return _getDataFromTree(middlewareControls, renderFn)
  }
}
