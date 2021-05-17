import {
  AsyncThunk,
  combineReducers,
  createAction,
  createSlice,
  isAnyOf,
  isFulfilled,
  isRejectedWithValue,
  PayloadAction,
  // Workaround for API-Extractor
  AnyAction,
  CombinedState,
  Reducer,
  ActionCreatorWithPayload,
  ActionCreatorWithoutPayload,
} from '@reduxjs/toolkit'
import {
  CombinedState as CombinedQueryState,
  QuerySubstateIdentifier,
  QuerySubState,
  MutationSubstateIdentifier,
  MutationSubState,
  QueryStatus,
  MutationState,
  QueryState,
  InvalidationState,
  Subscribers,
  QueryCacheKey,
  SubscriptionState,
  ConfigState,
} from './apiState'
import {
  calculateProvidedByThunk,
  MutationThunkArg,
  QueryThunkArg,
  ThunkResult,
} from './buildThunks'
import {
  AssertTagTypes,
  EndpointDefinitions,
  QueryDefinition,
} from '../endpointDefinitions'
import { applyPatches, Patch } from 'immer'
import { onFocus, onFocusLost, onOffline, onOnline } from './setupListeners'
import {
  isDocumentVisible,
  isOnline,
  copyWithStructuralSharing,
} from '../utils'
import { ApiContext } from '../apiTypes'

function updateQuerySubstateIfExists(
  state: QueryState<any>,
  queryCacheKey: QueryCacheKey,
  update: (substate: QuerySubState<any>) => void
) {
  const substate = state[queryCacheKey]
  if (substate) {
    update(substate)
  }
}

function updateMutationSubstateIfExists(
  state: MutationState<any>,
  { requestId }: MutationSubstateIdentifier,
  update: (substate: MutationSubState<any>) => void
) {
  const substate = state[requestId]
  if (substate) {
    update(substate)
  }
}

const initialState = {} as any

export function buildSlice({
  reducerPath,
  queryThunk,
  mutationThunk,
  context: { endpointDefinitions: definitions },
  assertTagType,
  config,
}: {
  reducerPath: string
  queryThunk: AsyncThunk<ThunkResult, QueryThunkArg, {}>
  mutationThunk: AsyncThunk<ThunkResult, MutationThunkArg, {}>
  context: ApiContext<EndpointDefinitions>
  assertTagType: AssertTagTypes
  config: Omit<ConfigState<string>, 'online' | 'focused'>
}) {
  const resetApiState = createAction(`${reducerPath}/resetApiState`)
  const querySlice = createSlice({
    name: `${reducerPath}/queries`,
    initialState: initialState as QueryState<any>,
    reducers: {
      removeQueryResult(
        draft,
        { payload: { queryCacheKey } }: PayloadAction<QuerySubstateIdentifier>
      ) {
        delete draft[queryCacheKey]
      },
      queryResultPatched(
        draft,
        {
          payload: { queryCacheKey, patches },
        }: PayloadAction<QuerySubstateIdentifier & { patches: Patch[] }>
      ) {
        updateQuerySubstateIfExists(draft, queryCacheKey, (substate) => {
          substate.data = applyPatches(substate.data as any, patches)
        })
      },
    },
    extraReducers(builder) {
      builder
        .addCase(queryThunk.pending, (draft, { meta: { arg, requestId } }) => {
          if (arg.subscribe) {
            // only initialize substate if we want to subscribe to it
            draft[arg.queryCacheKey] ??= {
              status: QueryStatus.uninitialized,
              endpointName: arg.endpointName,
            }
          }

          updateQuerySubstateIfExists(draft, arg.queryCacheKey, (substate) => {
            substate.status = QueryStatus.pending
            substate.requestId = requestId
            substate.originalArgs = arg.originalArgs
            substate.startedTimeStamp = arg.startedTimeStamp
          })
        })
        .addCase(queryThunk.fulfilled, (draft, { meta, payload }) => {
          updateQuerySubstateIfExists(
            draft,
            meta.arg.queryCacheKey,
            (substate) => {
              if (substate.requestId !== meta.requestId) return
              const { merge = (x: any) => x } = definitions[
                meta.arg.endpointName
              ] as QueryDefinition<any, any, any, any>

              substate.status = QueryStatus.fulfilled
              substate.data = copyWithStructuralSharing(
                substate.data,
                merge(payload.result, substate.data)
              )
              delete substate.error
              substate.fulfilledTimeStamp = payload.fulfilledTimeStamp
            }
          )
        })
        .addCase(
          queryThunk.rejected,
          (draft, { meta: { condition, arg, requestId }, error, payload }) => {
            updateQuerySubstateIfExists(
              draft,
              arg.queryCacheKey,
              (substate) => {
                if (condition) {
                  // request was aborted due to condition (another query already running)
                } else {
                  // request failed
                  if (substate.requestId !== requestId) return
                  substate.status = QueryStatus.rejected
                  substate.error = (payload ?? error) as any
                }
              }
            )
          }
        )
    },
  })
  const mutationSlice = createSlice({
    name: `${reducerPath}/mutations`,
    initialState: initialState as MutationState<any>,
    reducers: {
      unsubscribeResult(
        draft,
        action: PayloadAction<MutationSubstateIdentifier>
      ) {
        if (action.payload.requestId in draft) {
          delete draft[action.payload.requestId]
        }
      },
    },
    extraReducers(builder) {
      builder
        .addCase(
          mutationThunk.pending,
          (draft, { meta: { arg, requestId } }) => {
            if (!arg.track) return

            draft[requestId] = {
              status: QueryStatus.pending,
              originalArgs: arg.originalArgs,
              endpointName: arg.endpointName,
              startedTimeStamp: arg.startedTimeStamp,
            }
          }
        )
        .addCase(
          mutationThunk.fulfilled,
          (draft, { payload, meta: { requestId, arg } }) => {
            if (!arg.track) return

            updateMutationSubstateIfExists(draft, { requestId }, (substate) => {
              substate.status = QueryStatus.fulfilled
              substate.data = payload.result
              substate.fulfilledTimeStamp = payload.fulfilledTimeStamp
            })
          }
        )
        .addCase(
          mutationThunk.rejected,
          (draft, { payload, error, meta: { requestId, arg } }) => {
            if (!arg.track) return

            updateMutationSubstateIfExists(draft, { requestId }, (substate) => {
              substate.status = QueryStatus.rejected
              substate.error = (payload ?? error) as any
            })
          }
        )
    },
  })

  const invalidationSlice = createSlice({
    name: `${reducerPath}/invalidation`,
    initialState: initialState as InvalidationState<string>,
    reducers: {},
    extraReducers(builder) {
      builder
        .addCase(
          querySlice.actions.removeQueryResult,
          (draft, { payload: { queryCacheKey } }) => {
            for (const tagTypeSubscriptions of Object.values(draft)) {
              for (const idSubscriptions of Object.values(
                tagTypeSubscriptions
              )) {
                const foundAt = idSubscriptions.indexOf(queryCacheKey)
                if (foundAt !== -1) {
                  idSubscriptions.splice(foundAt, 1)
                }
              }
            }
          }
        )
        .addMatcher(
          isAnyOf(isFulfilled(queryThunk), isRejectedWithValue(queryThunk)),
          (draft, action) => {
            const providedTags = calculateProvidedByThunk(
              action,
              'providesTags',
              definitions,
              assertTagType
            )
            const { queryCacheKey } = action.meta.arg

            for (const { type, id } of providedTags) {
              const subscribedQueries = ((draft[type] ??= {})[
                id || '__internal_without_id'
              ] ??= [])
              const alreadySubscribed = subscribedQueries.includes(
                queryCacheKey
              )
              if (!alreadySubscribed) {
                subscribedQueries.push(queryCacheKey)
              }
            }
          }
        )
    },
  })

  const subscriptionSlice = createSlice({
    name: `${reducerPath}/subscriptions`,
    initialState: initialState as SubscriptionState,
    reducers: {
      updateSubscriptionOptions(
        draft,
        {
          payload: { queryCacheKey, requestId, options },
        }: PayloadAction<
          {
            endpointName: string
            requestId: string
            options: Subscribers[number]
          } & QuerySubstateIdentifier
        >
      ) {
        if (draft?.[queryCacheKey]?.[requestId]) {
          draft[queryCacheKey]![requestId] = options
        }
      },
      unsubscribeResult(
        draft,
        {
          payload: { queryCacheKey, requestId },
        }: PayloadAction<{ requestId: string } & QuerySubstateIdentifier>
      ) {
        if (draft[queryCacheKey]) {
          delete draft[queryCacheKey]![requestId]
        }
      },
    },
    extraReducers: (builder) => {
      builder
        .addCase(
          querySlice.actions.removeQueryResult,
          (draft, { payload: { queryCacheKey } }) => {
            delete draft[queryCacheKey]
          }
        )
        .addCase(queryThunk.pending, (draft, { meta: { arg, requestId } }) => {
          if (arg.subscribe) {
            const substate = (draft[arg.queryCacheKey] ??= {})
            substate[requestId] =
              arg.subscriptionOptions ?? substate[requestId] ?? {}
          }
        })
        .addCase(
          queryThunk.rejected,
          (draft, { meta: { condition, arg, requestId }, error, payload }) => {
            const substate = draft[arg.queryCacheKey]
            // request was aborted due to condition (another query already running)
            if (condition && arg.subscribe && substate) {
              substate[requestId] =
                arg.subscriptionOptions ?? substate[requestId] ?? {}
            }
          }
        )
    },
  })

  const configSlice = createSlice({
    name: `${reducerPath}/config`,
    initialState: {
      online: isOnline(),
      focused: isDocumentVisible(),
      ...config,
    } as ConfigState<string>,
    reducers: {},
    extraReducers: (builder) => {
      builder
        .addCase(onOnline, (state) => {
          state.online = true
        })
        .addCase(onOffline, (state) => {
          state.online = false
        })
        .addCase(onFocus, (state) => {
          state.focused = true
        })
        .addCase(onFocusLost, (state) => {
          state.focused = false
        })
    },
  })

  const combinedReducer = combineReducers<
    CombinedQueryState<any, string, string>
  >({
    queries: querySlice.reducer,
    mutations: mutationSlice.reducer,
    provided: invalidationSlice.reducer,
    subscriptions: subscriptionSlice.reducer,
    config: configSlice.reducer,
  })

  const reducer: typeof combinedReducer = (state, action) =>
    combinedReducer(resetApiState.match(action) ? undefined : state, action)

  const actions = {
    updateSubscriptionOptions:
      subscriptionSlice.actions.updateSubscriptionOptions,
    queryResultPatched: querySlice.actions.queryResultPatched,
    removeQueryResult: querySlice.actions.removeQueryResult,
    unsubscribeQueryResult: subscriptionSlice.actions.unsubscribeResult,
    unsubscribeMutationResult: mutationSlice.actions.unsubscribeResult,
    resetApiState,
  }

  return { reducer, actions }
}
export type SliceActions = ReturnType<typeof buildSlice>['actions']
