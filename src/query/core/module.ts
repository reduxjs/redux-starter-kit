/**
 * Note: this file should import all other files for type discovery and declaration merging
 */
import type { PatchQueryDataThunk, UpdateQueryDataThunk } from './buildThunks'
import { buildThunks } from './buildThunks'
import type {
  ActionCreatorWithPayload,
  AnyAction,
  Middleware,
  Reducer,
  ThunkAction,
  ThunkDispatch,
} from '@reduxjs/toolkit'
import type {
  EndpointDefinitions,
  QueryArgFrom,
  QueryDefinition,
  MutationDefinition,
  AssertTagTypes,
  FullTagDescription,
} from '../endpointDefinitions'
import { isQueryDefinition, isMutationDefinition } from '../endpointDefinitions'
import type { CombinedState, QueryKeys, RootState } from './apiState'
import type { Api, Module } from '../apiTypes'
import { onFocus, onFocusLost, onOnline, onOffline } from './setupListeners'
import { buildSlice } from './buildSlice'
import { buildMiddleware } from './buildMiddleware'
import { buildSelectors } from './buildSelectors'
import { buildInitiate } from './buildInitiate'
import { assertCast, safeAssign } from '../tsHelpers'
import type { InternalSerializeQueryArgs } from '../defaultSerializeQueryArgs'
import type { SliceActions } from './buildSlice'
import type { BaseQueryFn } from '../baseQueryTypes'

import type { ReferenceCacheLifecycle } from './buildMiddleware/cacheLifecycle'
import type { ReferenceQueryLifecycle } from './buildMiddleware/queryLifecycle'
import type { ReferenceCacheCollection } from './buildMiddleware/cacheCollection'
import { enablePatches } from 'immer'

/**
 * `ifOlderThan` - (default: `false` | `number`) - _number is value in seconds_
 * - If specified, it will only run the query if the difference between `new Date()` and the last `fulfilledTimeStamp` is greater than the given value
 *
 * @overloadSummary
 * `force`
 * - If `force: true`, it will ignore the `ifOlderThan` value if it is set and the query will be run even if it exists in the cache.
 */
export type PrefetchOptions =
  | {
      ifOlderThan?: false | number
    }
  | { force?: boolean }

export const coreModuleName = /* @__PURE__ */ Symbol()
export type CoreModule =
  | typeof coreModuleName
  | ReferenceCacheLifecycle
  | ReferenceQueryLifecycle
  | ReferenceCacheCollection

declare module '../apiTypes' {
  export interface ApiModules<
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    BaseQuery extends BaseQueryFn,
    Definitions extends EndpointDefinitions,
    ReducerPath extends string,
    TagTypes extends string
  > {
    [coreModuleName]: {
      /**
       * This api's reducer should be mounted at `store[api.reducerPath]`.
       *
       * @example
       * ```ts
       * configureStore({
       *   reducer: {
       *     [api.reducerPath]: api.reducer,
       *   },
       *   middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
       * })
       * ```
       */
      reducerPath: ReducerPath
      /**
       * Internal actions not part of the public API. Note: These are subject to change at any given time.
       */
      internalActions: InternalActions
      /**
       *  A standard redux reducer that enables core functionality. Make sure it's included in your store.
       *
       * @example
       * ```ts
       * configureStore({
       *   reducer: {
       *     [api.reducerPath]: api.reducer,
       *   },
       *   middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
       * })
       * ```
       */
      reducer: Reducer<
        CombinedState<Definitions, TagTypes, ReducerPath>,
        AnyAction
      >
      /**
       * This is a standard redux middleware and is responsible for things like polling, garbage collection and a handful of other things. Make sure it's included in your store.
       *
       * @example
       * ```ts
       * configureStore({
       *   reducer: {
       *     [api.reducerPath]: api.reducer,
       *   },
       *   middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
       * })
       * ```
       */
      middleware: Middleware<
        {},
        RootState<Definitions, string, ReducerPath>,
        ThunkDispatch<any, any, AnyAction>
      >
      /**
       * TODO
       */
      util: {
        /**
         * TODO
         */
        prefetch<EndpointName extends QueryKeys<Definitions>>(
          endpointName: EndpointName,
          arg: QueryArgFrom<Definitions[EndpointName]>,
          options: PrefetchOptions
        ): ThunkAction<void, any, any, AnyAction>
        /**
         * TODO
         */
        updateQueryData: UpdateQueryDataThunk<
          Definitions,
          RootState<Definitions, string, ReducerPath>
        >
        /** @deprecated renamed to `updateQueryData` */
        updateQueryResult: UpdateQueryDataThunk<
          Definitions,
          RootState<Definitions, string, ReducerPath>
        >
        /**
         * TODO
         */
        patchQueryData: PatchQueryDataThunk<
          Definitions,
          RootState<Definitions, string, ReducerPath>
        >
        /** @deprecated renamed to `patchQueryData` */
        patchQueryResult: PatchQueryDataThunk<
          Definitions,
          RootState<Definitions, string, ReducerPath>
        >
        /**
         * TODO
         */
        resetApiState: SliceActions['resetApiState']
        /**
         * TODO
         */
        invalidateTags: ActionCreatorWithPayload<
          Array<TagTypes | FullTagDescription<TagTypes>>,
          string
        >
      }
      /**
       * Endpoints based on the input endpoints provided to `createApi`, containing `select` and `action matchers`.
       */
      endpoints: {
        [K in keyof Definitions]: Definitions[K] extends QueryDefinition<
          any,
          any,
          any,
          any,
          any
        >
          ? ApiEndpointQuery<Definitions[K], Definitions>
          : Definitions[K] extends MutationDefinition<any, any, any, any, any>
          ? ApiEndpointMutation<Definitions[K], Definitions>
          : never
      }
    }
  }
}

export interface ApiEndpointQuery<
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Definition extends QueryDefinition<any, any, any, any, any>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Definitions extends EndpointDefinitions
> {}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface ApiEndpointMutation<
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Definition extends MutationDefinition<any, any, any, any, any>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Definitions extends EndpointDefinitions
> {}

export type ListenerActions = {
  /**
   * Will cause the RTK Query middleware to trigger any refetchOnReconnect-related behavior
   * @link https://rtk-query-docs.netlify.app/api/setupListeners
   */
  onOnline: typeof onOnline
  onOffline: typeof onOffline
  /**
   * Will cause the RTK Query middleware to trigger any refetchOnFocus-related behavior
   * @link https://rtk-query-docs.netlify.app/api/setupListeners
   */
  onFocus: typeof onFocus
  onFocusLost: typeof onFocusLost
}

export type InternalActions = SliceActions & ListenerActions

/**
 * Creates a module containing the basic redux logic for use with `buildCreateApi`.
 *
 * @example
 * ```ts
 * const createBaseApi = buildCreateApi(coreModule());
 * ```
 */
export const coreModule = (): Module<CoreModule> => ({
  name: coreModuleName,
  init(
    api,
    {
      baseQuery,
      tagTypes,
      reducerPath,
      serializeQueryArgs,
      keepUnusedDataFor,
      refetchOnMountOrArgChange,
      refetchOnFocus,
      refetchOnReconnect,
    },
    context
  ) {
    enablePatches()

    assertCast<InternalSerializeQueryArgs>(serializeQueryArgs)

    const assertTagType: AssertTagTypes = (tag) => {
      if (
        typeof process !== 'undefined' &&
        process.env.NODE_ENV === 'development'
      ) {
        if (!tagTypes.includes(tag.type as any)) {
          console.error(
            `Tag type '${tag.type}' was used, but not specified in \`tagTypes\`!`
          )
        }
      }
      return tag
    }

    Object.assign(api, {
      reducerPath,
      endpoints: {},
      internalActions: {
        onOnline,
        onOffline,
        onFocus,
        onFocusLost,
      },
      util: {},
    })

    const {
      queryThunk,
      mutationThunk,
      patchQueryData,
      updateQueryData,
      prefetch,
      buildMatchThunkActions,
    } = buildThunks({
      baseQuery,
      reducerPath,
      context,
      api,
      serializeQueryArgs,
    })

    const { reducer, actions: sliceActions } = buildSlice({
      context,
      queryThunk,
      mutationThunk,
      reducerPath,
      assertTagType,
      config: {
        refetchOnFocus,
        refetchOnReconnect,
        refetchOnMountOrArgChange,
        keepUnusedDataFor,
        reducerPath,
      },
    })

    safeAssign(api.util, {
      patchQueryData,
      updateQueryData,
      prefetch,
      resetApiState: sliceActions.resetApiState,
    })
    safeAssign(api.internalActions, sliceActions)

    // remove in final release
    Object.defineProperty(api.util, 'updateQueryResult', {
      get() {
        if (
          typeof process !== 'undefined' &&
          process.env.NODE_ENV === 'development'
        ) {
          console.warn(
            '`api.util.updateQueryResult` has been renamed to `api.util.updateQueryData`, please change your code accordingly'
          )
        }
        return api.util.updateQueryData
      },
    })
    // remove in final release
    Object.defineProperty(api.util, 'patchQueryResult', {
      get() {
        if (
          typeof process !== 'undefined' &&
          process.env.NODE_ENV === 'development'
        ) {
          console.warn(
            '`api.util.patchQueryResult` has been renamed to `api.util.patchQueryData`, please change your code accordingly'
          )
        }
        return api.util.patchQueryData
      },
    })

    const { middleware, actions: middlewareActions } = buildMiddleware({
      reducerPath,
      context,
      queryThunk,
      mutationThunk,
      api,
      assertTagType,
    })
    safeAssign(api.util, middlewareActions)

    safeAssign(api, { reducer: reducer as any, middleware })

    const { buildQuerySelector, buildMutationSelector } = buildSelectors({
      serializeQueryArgs: serializeQueryArgs as any,
      reducerPath,
    })

    const { buildInitiateQuery, buildInitiateMutation } = buildInitiate({
      queryThunk,
      mutationThunk,
      api,
      serializeQueryArgs: serializeQueryArgs as any,
    })

    return {
      name: coreModuleName,
      injectEndpoint(endpointName, definition) {
        const anyApi = (api as any) as Api<
          any,
          Record<string, any>,
          string,
          string,
          CoreModule
        >
        anyApi.endpoints[endpointName] ??= {} as any
        if (isQueryDefinition(definition)) {
          safeAssign(
            anyApi.endpoints[endpointName],
            {
              select: buildQuerySelector(endpointName, definition),
              initiate: buildInitiateQuery(endpointName, definition),
            },
            buildMatchThunkActions(queryThunk, endpointName)
          )
        } else if (isMutationDefinition(definition)) {
          safeAssign(
            anyApi.endpoints[endpointName],
            {
              select: buildMutationSelector(),
              initiate: buildInitiateMutation(endpointName, definition),
            },
            buildMatchThunkActions(mutationThunk, endpointName)
          )
        }
      },
    }
  },
})
