import { enableES5 } from 'immer'
export * from 'redux'
export { default as createNextState, Draft, current } from 'immer'
export {
  createSelector,
  Selector,
  OutputParametricSelector,
  OutputSelector,
  ParametricSelector
} from 'reselect'
export { ThunkAction, ThunkDispatch } from 'redux-thunk'

// We deliberately enable Immer's ES5 support, on the grounds that
// we assume RTK will be used with React Native and other Proxy-less
// environments.  In addition, that's how Immer 4 behaved, and since
// we want to ship this in an RTK minor, we should keep the same behavior.
enableES5()

export {
  // js
  configureStore,
  // types
  ConfigureEnhancersCallback,
  ConfigureStoreOptions,
  EnhancedStore
} from './configureStore'
export {
  // js
  createAction,
  getType,
  // types
  PayloadAction,
  PayloadActionCreator,
  ActionCreatorWithNonInferrablePayload,
  ActionCreatorWithOptionalPayload,
  ActionCreatorWithPayload,
  ActionCreatorWithoutPayload,
  ActionCreatorWithPreparedPayload,
  PrepareAction
} from './createAction'
export {
  // js
  createReducer,
  // types
  Actions,
  CaseReducer,
  CaseReducers
} from './createReducer'
export {
  // js
  createSlice,
  // types
  CreateSliceOptions,
  Slice,
  CaseReducerActions,
  SliceCaseReducers,
  ValidateSliceCaseReducers,
  CaseReducerWithPrepare,
  SliceActionCreator
} from './createSlice'
export {
  // js
  createImmutableStateInvariantMiddleware,
  isImmutableDefault,
  // types
  ImmutableStateInvariantMiddlewareOptions
} from './immutableStateInvariantMiddleware'
export {
  // js
  createSerializableStateInvariantMiddleware,
  findNonSerializableValue,
  isPlain,
  // types
  SerializableStateInvariantMiddlewareOptions
} from './serializableStateInvariantMiddleware'
export {
  // js
  getDefaultMiddleware
} from './getDefaultMiddleware'
export {
  // types
  ActionReducerMapBuilder
} from './mapBuilders'
export { MiddlewareArray } from './utils'

export { createEntityAdapter } from './entities/create_adapter'
export {
  Dictionary,
  EntityState,
  EntityAdapter,
  EntitySelectors,
  EntityStateAdapter,
  EntityId,
  Update,
  IdSelector,
  Comparer
} from './entities/models'

export {
  AsyncThunk,
  AsyncThunkAction,
  AsyncThunkPayloadCreatorReturnValue,
  AsyncThunkPayloadCreator,
  createAsyncThunk,
  unwrapResult,
  SerializedError
} from './createAsyncThunk'
export { createThunk } from './createThunk'
export { curryForStoreType } from './curriedTypes'

export { nanoid } from './nanoid'
