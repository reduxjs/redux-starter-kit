import { Middleware, Dispatch, AnyAction, MiddlewareAPI, Action } from 'redux'
import { TypedActionCreator } from './mapBuilders'
import { createAction, BaseActionCreator } from './createAction'
import { WithMiddlewareType } from './tsHelpers'

export type When = 'before' | 'after' | undefined
type WhenFromOptions<
  O extends ActionListenerOptions
> = O extends ActionListenerOptions ? O['when'] : never

/**
 * @alpha
 */
export interface ActionListenerMiddlewareAPI<
  S,
  D extends Dispatch<AnyAction>,
  O extends ActionListenerOptions
> extends MiddlewareAPI<D, S> {
  stopPropagation: WhenFromOptions<O> extends 'before' ? () => void : undefined
  unsubscribe(): void
}

/**
 * @alpha
 */
export type ActionListener<
  A extends AnyAction,
  S,
  D extends Dispatch<AnyAction>,
  O extends ActionListenerOptions
> = (action: A, api: ActionListenerMiddlewareAPI<S, D, O>) => void

export interface ActionListenerOptions {
  /**
   * Determines if the listener runs 'before' or 'after' the reducers have been called.
   * If set to 'before', calling `api.stopPropagation()` from the listener becomes possible.
   * Defaults to 'before'.
   */
  when?: When
}

export interface AddListenerAction<
  A extends AnyAction,
  S,
  D extends Dispatch<AnyAction>,
  O extends ActionListenerOptions
> {
  type: 'actionListenerMiddleware/add'
  payload: {
    type: string
    listener: ActionListener<A, S, D, O>
    options?: O
  }
}

/**
 * @alpha
 */
export const addListenerAction = createAction(
  'actionListenerMiddleware/add',
  function prepare(
    typeOrActionCreator: string | TypedActionCreator<string>,
    listener: ActionListener<any, any, any, any>,
    options?: ActionListenerOptions
  ) {
    const type =
      typeof typeOrActionCreator === 'string'
        ? typeOrActionCreator
        : (typeOrActionCreator as TypedActionCreator<string>).type

    return {
      payload: {
        type,
        listener,
        options
      }
    }
  }
) as BaseActionCreator<
  {
    type: string
    listener: ActionListener<any, any, any, any>
    options: ActionListenerOptions
  },
  'actionListenerMiddleware/add'
> & {
  <
    C extends TypedActionCreator<any>,
    S,
    D extends Dispatch,
    O extends ActionListenerOptions
  >(
    actionCreator: C,
    listener: ActionListener<ReturnType<C>, S, D, O>,
    options?: O
  ): AddListenerAction<ReturnType<C>, S, D, O>

  <S, D extends Dispatch, O extends ActionListenerOptions>(
    type: string,
    listener: ActionListener<AnyAction, S, D, O>,
    options?: O
  ): AddListenerAction<AnyAction, S, D, O>
}

interface RemoveListenerAction<
  A extends AnyAction,
  S,
  D extends Dispatch<AnyAction>
> {
  type: 'actionListenerMiddleware/remove'
  payload: {
    type: string
    listener: ActionListener<A, S, D, any>
  }
}

/**
 * @alpha
 */
export const removeListenerAction = createAction(
  'actionListenerMiddleware/remove',
  function prepare(
    typeOrActionCreator: string | TypedActionCreator<string>,
    listener: ActionListener<any, any, any, any>
  ) {
    const type =
      typeof typeOrActionCreator === 'string'
        ? typeOrActionCreator
        : (typeOrActionCreator as TypedActionCreator<string>).type

    return {
      payload: {
        type,
        listener
      }
    }
  }
) as BaseActionCreator<
  { type: string; listener: ActionListener<any, any, any, any> },
  'actionListenerMiddleware/remove'
> & {
  <C extends TypedActionCreator<any>, S, D extends Dispatch>(
    actionCreator: C,
    listener: ActionListener<ReturnType<C>, S, D, any>
  ): RemoveListenerAction<ReturnType<C>, S, D>

  <S, D extends Dispatch>(
    type: string,
    listener: ActionListener<AnyAction, S, D, any>
  ): RemoveListenerAction<AnyAction, S, D>
}

/**
 * @alpha
 */
export function createActionListenerMiddleware<
  S,
  D extends Dispatch<AnyAction> = Dispatch
>() {
  type ListenerEntry = ActionListenerOptions & {
    listener: ActionListener<any, S, D, any>
  }

  const listenerMap: Record<string, Set<ListenerEntry> | undefined> = {}
  const middleware: Middleware<
    {
      (action: Action<'actionListenerMiddleware/add'>): Unsubscribe
    },
    S,
    D
  > = api => next => action => {
    if (addListenerAction.match(action)) {
      const unsubscribe = addListener(
        action.payload.type,
        action.payload.listener,
        action.payload.options
      )

      return unsubscribe
    }
    if (removeListenerAction.match(action)) {
      removeListener(action.payload.type, action.payload.listener)

      return
    }

    const listeners = listenerMap[action.type]
    if (listeners) {
      const defaultWhen = 'after'
      let result: unknown
      for (const phase of ['before', 'after'] as const) {
        for (const entry of listeners) {
          if (phase !== (entry.when || defaultWhen)) {
            continue
          }
          let stoppedPropagation = false
          let currentPhase = phase
          let synchronousListenerFinished = false
          entry.listener(action, {
            ...api,
            stopPropagation() {
              if (currentPhase === 'before') {
                if (!synchronousListenerFinished) {
                  stoppedPropagation = true
                } else {
                  throw new Error(
                    'stopPropagation can only be called synchronously'
                  )
                }
              } else {
                throw new Error(
                  'stopPropagation can only be called by action listeners with the `when` option set to "before"'
                )
              }
            },
            unsubscribe() {
              listeners.delete(entry)
            }
          })
          synchronousListenerFinished = true
          if (stoppedPropagation) {
            return action
          }
        }
        if (phase === 'before') {
          result = next(action)
        } else {
          return result
        }
      }
    }
    return next(action)
  }

  type Unsubscribe = () => void

  function addListener<
    C extends TypedActionCreator<any>,
    O extends ActionListenerOptions
  >(
    actionCreator: C,
    listener: ActionListener<ReturnType<C>, S, D, O>,
    options?: O
  ): Unsubscribe
  function addListener<T extends string, O extends ActionListenerOptions>(
    type: T,
    listener: ActionListener<Action<T>, S, D, O>,
    options?: O
  ): Unsubscribe
  function addListener(
    typeOrActionCreator: string | TypedActionCreator<any>,
    listener: ActionListener<AnyAction, S, D, any>,
    options?: ActionListenerOptions
  ): Unsubscribe {
    const type =
      typeof typeOrActionCreator === 'string'
        ? typeOrActionCreator
        : typeOrActionCreator.type

    const listeners = getListenerMap(type)

    let entry = findListenerEntry(listeners, listener)

    if (!entry) {
      entry = {
        ...options,
        listener
      }

      listeners.add(entry)
    }

    return () => listeners.delete(entry!)
  }

  function getListenerMap(type: string) {
    if (!listenerMap[type]) {
      listenerMap[type] = new Set()
    }
    return listenerMap[type]!
  }

  function removeListener<C extends TypedActionCreator<any>>(
    actionCreator: C,
    listener: ActionListener<ReturnType<C>, S, D, any>
  ): boolean
  function removeListener(
    type: string,
    listener: ActionListener<AnyAction, S, D, any>
  ): boolean
  function removeListener(
    typeOrActionCreator: string | TypedActionCreator<any>,
    listener: ActionListener<AnyAction, S, D, any>
  ): boolean {
    const type =
      typeof typeOrActionCreator === 'string'
        ? typeOrActionCreator
        : typeOrActionCreator.type

    const listeners = listenerMap[type]

    if (!listeners) {
      return false
    }

    let entry = findListenerEntry(listeners, listener)

    if (!entry) {
      return false
    }

    listeners.delete(entry)
    return true
  }

  function findListenerEntry(
    entries: Set<ListenerEntry>,
    listener: Function
  ): ListenerEntry | undefined {
    for (const entry of entries) {
      if (entry.listener === listener) {
        return entry
      }
    }
  }

  return Object.assign(
    middleware,
    { addListener, removeListener },
    {} as WithMiddlewareType<typeof middleware>
  )
}
