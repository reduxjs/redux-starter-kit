import { Dispatch, AnyAction } from 'redux'
import {
  createAction,
  PayloadAction,
  ActionCreatorWithPreparedPayload
} from './createAction'
import { ThunkDispatch } from 'redux-thunk'
import { FallbackIfUnknown, IsAny } from './tsHelpers'
import { nanoid } from './nanoid'

// @ts-ignore we need the import of these types due to a bundling issue.
type _Keep = PayloadAction | ActionCreatorWithPreparedPayload<any, unknown>

export type BaseThunkAPI<
  S,
  E,
  D extends Dispatch = Dispatch,
  RejectedValue = undefined
> = {
  dispatch: D
  getState: () => S
  extra: E
  requestId: string
  signal: AbortSignal
  rejectWithValue(value: RejectedValue): RejectWithValue<RejectedValue>
}

/**
 * @public
 */
export interface SerializedError {
  name?: string
  message?: string
  stack?: string
  code?: string
}

const commonProperties: Array<keyof SerializedError> = [
  'name',
  'message',
  'stack',
  'code'
]

class RejectWithValue<RejectValue> {
  constructor(public readonly value: RejectValue) {}
}

// Reworked from https://github.com/sindresorhus/serialize-error
export const miniSerializeError = (value: any): SerializedError => {
  if (typeof value === 'object' && value !== null) {
    const simpleError: SerializedError = {}
    for (const property of commonProperties) {
      if (typeof value[property] === 'string') {
        simpleError[property] = value[property]
      }
    }

    return simpleError
  }

  return { message: String(value) }
}

export type AsyncThunkConfig = {
  state?: unknown
  dispatch?: Dispatch
  extra?: unknown
  rejectValue?: unknown
}

type GetState<ThunkApiConfig> = ThunkApiConfig extends {
  state: infer State
}
  ? State
  : unknown
type GetExtra<ThunkApiConfig> = ThunkApiConfig extends { extra: infer Extra }
  ? Extra
  : unknown
type GetDispatch<ThunkApiConfig> = ThunkApiConfig extends {
  dispatch: infer Dispatch
}
  ? FallbackIfUnknown<
      Dispatch,
      ThunkDispatch<
        GetState<ThunkApiConfig>,
        GetExtra<ThunkApiConfig>,
        AnyAction
      >
    >
  : ThunkDispatch<GetState<ThunkApiConfig>, GetExtra<ThunkApiConfig>, AnyAction>

type GetThunkAPI<ThunkApiConfig> = BaseThunkAPI<
  GetState<ThunkApiConfig>,
  GetExtra<ThunkApiConfig>,
  GetDispatch<ThunkApiConfig>,
  GetRejectValue<ThunkApiConfig>
>

type GetRejectValue<ThunkApiConfig> = ThunkApiConfig extends {
  rejectValue: infer RejectValue
}
  ? RejectValue
  : unknown
/**
 * A type describing the return value of the `payloadCreator` argument to `createAsyncThunk`.
 * Might be useful for wrapping `createAsyncThunk` in custom abstractions.
 *
 * @public
 */
export type AsyncThunkPayloadCreatorReturnValue<
  Returned,
  ThunkApiConfig extends AsyncThunkConfig
> =
  | Promise<Returned | RejectWithValue<GetRejectValue<ThunkApiConfig>>>
  | Returned
  | RejectWithValue<GetRejectValue<ThunkApiConfig>>
/**
 * A type describing the `payloadCreator` argument to `createAsyncThunk`.
 * Might be useful for wrapping `createAsyncThunk` in custom abstractions.
 *
 * @public
 */
export type AsyncThunkPayloadCreator<
  Returned,
  ThunkArg = void,
  ThunkApiConfig extends AsyncThunkConfig = {}
> = (
  arg: ThunkArg,
  thunkAPI: GetThunkAPI<ThunkApiConfig>
) => AsyncThunkPayloadCreatorReturnValue<Returned, ThunkApiConfig>

/**
 * A ThunkAction created by `createAsyncThunk`.
 * Dispatching it returns a Promise for either a
 * fulfilled or rejected action.
 * Also, the returned value contains a `abort()` method
 * that allows the asyncAction to be cancelled from the outside.
 *
 * @public
 */
export type AsyncThunkAction<
  Returned,
  ThunkArg,
  ThunkApiConfig extends AsyncThunkConfig
> = (
  dispatch: GetDispatch<ThunkApiConfig>,
  getState: () => GetState<ThunkApiConfig>,
  extra: GetExtra<ThunkApiConfig>
) => Promise<
  | PayloadAction<Returned, string, { arg: ThunkArg; requestId: string }>
  | PayloadAction<
      undefined | GetRejectValue<ThunkApiConfig>,
      string,
      {
        arg: ThunkArg
        requestId: string
        aborted: boolean
        condition: boolean
      },
      SerializedError
    >
> & {
  abort(reason?: string): void
}

type AsyncThunkActionCreator<
  Returned,
  ThunkArg,
  ThunkApiConfig extends AsyncThunkConfig
> = IsAny<
  ThunkArg,
  // any handling
  (arg: ThunkArg) => AsyncThunkAction<Returned, ThunkArg, ThunkApiConfig>,
  // unknown handling
  unknown extends ThunkArg
    ? (arg: ThunkArg) => AsyncThunkAction<Returned, ThunkArg, ThunkApiConfig> // argument not specified or specified as void or undefined
    : [ThunkArg] extends [void] | [undefined]
    ? () => AsyncThunkAction<Returned, ThunkArg, ThunkApiConfig> // argument contains void
    : [void] extends [ThunkArg] // make optional
    ? (arg?: ThunkArg) => AsyncThunkAction<Returned, ThunkArg, ThunkApiConfig> // argument contains undefined
    : [undefined] extends [ThunkArg]
    ? WithStrictNullChecks<
        // with strict nullChecks: make optional
        (
          arg?: ThunkArg
        ) => AsyncThunkAction<Returned, ThunkArg, ThunkApiConfig>,
        // without strict null checks this will match everything, so don't make it optional
        (arg: ThunkArg) => AsyncThunkAction<Returned, ThunkArg, ThunkApiConfig>
      > // default case: normal argument
    : (arg: ThunkArg) => AsyncThunkAction<Returned, ThunkArg, ThunkApiConfig>
>

export interface AsyncThunkOptions<
  ThunkArg = void,
  ThunkApiConfig extends AsyncThunkConfig = {}
> {
  /**
   * A method to control whether the asyncThunk should be executed. Has access to the
   * `arg`, `api.getState()` and `api.extra` arguments.
   *
   * @returns `false` if it should be skipped
   */
  condition?(
    arg: ThunkArg,
    api: Pick<GetThunkAPI<ThunkApiConfig>, 'getState' | 'extra'>
  ): boolean | undefined
  /**
   * If `condition` returns `false`, the asyncThunk will be skipped.
   * This option allows you to control whether a `rejected` action with `meta.condition == false`
   * will be dispatched or not.
   *
   * @default `false`
   */
  dispatchConditionRejection?: boolean
}

type AsyncThunkPendingActionCreator<
  ThunkArg
> = ActionCreatorWithPreparedPayload<
  [string, ThunkArg],
  undefined,
  string,
  never,
  {
    arg: ThunkArg
    requestId: string
  }
>

type AsyncThunkRejectedActionCreator<
  ThunkArg,
  ThunkApiConfig
> = ActionCreatorWithPreparedPayload<
  [
    Error | null,
    string,
    ThunkArg,
    (GetRejectValue<ThunkApiConfig> | undefined)?
  ],
  GetRejectValue<ThunkApiConfig> | undefined,
  string,
  SerializedError,
  {
    arg: ThunkArg
    requestId: string
    aborted: boolean
    condition: boolean
  }
>

type AsyncThunkFulfilledActionCreator<
  Returned,
  ThunkArg
> = ActionCreatorWithPreparedPayload<
  [Returned, string, ThunkArg],
  Returned,
  string,
  never,
  {
    arg: ThunkArg
    requestId: string
  }
>

/**
 * A type describing the return value of `createAsyncThunk`.
 * Might be useful for wrapping `createAsyncThunk` in custom abstractions.
 *
 * @public
 */
export type AsyncThunk<
  Returned,
  ThunkArg,
  ThunkApiConfig extends AsyncThunkConfig
> = AsyncThunkActionCreator<Returned, ThunkArg, ThunkApiConfig> & {
  pending: AsyncThunkPendingActionCreator<ThunkArg>
  rejected: AsyncThunkRejectedActionCreator<ThunkArg, ThunkApiConfig>
  fulfilled: AsyncThunkFulfilledActionCreator<Returned, ThunkArg>
  typePrefix: string
}

/**
 *
 * @param typePrefix
 * @param payloadCreator
 * @param options
 *
 * @public
 */
export function createAsyncThunk<
  Returned,
  ThunkArg = void,
  ThunkApiConfig extends AsyncThunkConfig = {}
>(
  typePrefix: string,
  payloadCreator: AsyncThunkPayloadCreator<Returned, ThunkArg, ThunkApiConfig>,
  options?: AsyncThunkOptions<ThunkArg, ThunkApiConfig>
): AsyncThunk<Returned, ThunkArg, ThunkApiConfig> {
  type RejectedValue = GetRejectValue<ThunkApiConfig>

  const fulfilled = createAction(
    typePrefix + '/fulfilled',
    (result: Returned, requestId: string, arg: ThunkArg) => {
      return {
        payload: result,
        meta: { arg, requestId }
      }
    }
  )

  const pending = createAction(
    typePrefix + '/pending',
    (requestId: string, arg: ThunkArg) => {
      return {
        payload: undefined,
        meta: { arg, requestId }
      }
    }
  )

  const rejected = createAction(
    typePrefix + '/rejected',
    (
      error: Error | null,
      requestId: string,
      arg: ThunkArg,
      payload?: RejectedValue
    ) => {
      const aborted = !!error && error.name === 'AbortError'
      const condition = !!error && error.name === 'ConditionError'
      return {
        payload,
        error: miniSerializeError(error || 'Rejected'),
        meta: {
          arg,
          requestId,
          aborted,
          condition
        }
      }
    }
  )

  let displayedWarning = false

  const AC =
    typeof AbortController !== 'undefined'
      ? AbortController
      : class implements AbortController {
          signal: AbortSignal = {
            aborted: false,
            addEventListener() {},
            dispatchEvent() {
              return false
            },
            onabort() {},
            removeEventListener() {}
          }
          abort() {
            if (process.env.NODE_ENV !== 'production') {
              if (!displayedWarning) {
                displayedWarning = true
                console.info(
                  `This platform does not implement AbortController. 
If you want to use the AbortController to react to \`abort\` events, please consider importing a polyfill like 'abortcontroller-polyfill/dist/abortcontroller-polyfill-only'.`
                )
              }
            }
          }
        }

  function actionCreator(
    arg: ThunkArg
  ): AsyncThunkAction<Returned, ThunkArg, ThunkApiConfig> {
    return (dispatch, getState, extra) => {
      const requestId = nanoid()

      const abortController = new AC()
      let abortReason: string | undefined

      const abortedPromise = new Promise<never>((_, reject) =>
        abortController.signal.addEventListener('abort', () =>
          reject({ name: 'AbortError', message: abortReason || 'Aborted' })
        )
      )

      let started = false
      function abort(reason?: string) {
        if (started) {
          abortReason = reason
          abortController.abort()
        }
      }

      const promise = (async function() {
        let finalAction: ReturnType<typeof fulfilled | typeof rejected>
        try {
          if (
            options &&
            options.condition &&
            options.condition(arg, { getState, extra }) === false
          ) {
            // eslint-disable-next-line no-throw-literal
            throw {
              name: 'ConditionError',
              message: 'Aborted due to condition callback returning false.'
            }
          }
          started = true
          dispatch(pending(requestId, arg))
          finalAction = await Promise.race([
            abortedPromise,
            Promise.resolve(
              payloadCreator(arg, {
                dispatch,
                getState,
                extra,
                requestId,
                signal: abortController.signal,
                rejectWithValue(value: RejectedValue) {
                  return new RejectWithValue(value)
                }
              })
            ).then(result => {
              if (result instanceof RejectWithValue) {
                return rejected(null, requestId, arg, result.value)
              }
              return fulfilled(result, requestId, arg)
            })
          ])
        } catch (err) {
          finalAction = rejected(err, requestId, arg)
        }
        // We dispatch the result action _after_ the catch, to avoid having any errors
        // here get swallowed by the try/catch block,
        // per https://twitter.com/dan_abramov/status/770914221638942720
        // and https://redux-toolkit.js.org/tutorials/advanced-tutorial#async-error-handling-logic-in-thunks

        const skipDispatch =
          options &&
          !options.dispatchConditionRejection &&
          rejected.match(finalAction) &&
          finalAction.meta.condition

        if (!skipDispatch) {
          dispatch(finalAction)
        }
        return finalAction
      })()
      return Object.assign(promise, { abort })
    }
  }

  return Object.assign(
    actionCreator as AsyncThunkActionCreator<
      Returned,
      ThunkArg,
      ThunkApiConfig
    >,
    {
      pending,
      rejected,
      fulfilled,
      typePrefix
    }
  )
}

type ActionTypesWithOptionalErrorAction =
  | { error: any }
  | { error?: never; payload: any }
type PayloadForActionTypesExcludingErrorActions<T> = T extends { error: any }
  ? never
  : T extends { payload: infer P }
  ? P
  : never

/**
 * @public
 */
export function unwrapResult<R extends ActionTypesWithOptionalErrorAction>(
  returned: R
): PayloadForActionTypesExcludingErrorActions<R> {
  if ('error' in returned) {
    throw returned.error
  }
  return (returned as any).payload
}

type WithStrictNullChecks<True, False> = undefined extends boolean
  ? False
  : True
