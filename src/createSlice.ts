import { Reducer } from 'redux'
import {
  createAction,
  PayloadAction,
  PayloadActionCreator,
  PrepareAction,
  ActionCreatorWithoutPayload,
  _ActionCreatorWithPreparedPayload
} from './createAction'
import { createReducer, CaseReducers, CaseReducer } from './createReducer'
import {
  ActionReducerMapBuilder,
  executeReducerBuilderCallback
} from './mapBuilders'

/**
 * An action creator atttached to a slice.
 *
 * @deprecated please use PayloadActionCreator directly
 *
 * @public
 */
export type SliceActionCreator<P> = PayloadActionCreator<P>

/**
 * The return value of `createSlice`
 *
 * @public
 */
export interface Slice<
  State = any,
  CaseReducers extends SliceCaseReducerDefinitions<State, any> = {
    [key: string]: any
  }
> {
  /**
   * The slice name.
   */
  name: string

  /**
   * The slice's reducer.
   */
  reducer: Reducer<State>

  /**
   * Action creators for the types of actions that are handled by the slice
   * reducer.
   */
  actions: CaseReducerActions<CaseReducers>

  /**
   * The reducers defined by `reducers` for easy access if they were defined inline when calling createSlice.
   */
  caseReducers: SliceDefinedCaseReducers<CaseReducers>
}

/**
 * Options for `createSlice()`.
 *
 * @public
 */
export interface CreateSliceOptions<
  State = any,
  CR extends SliceCaseReducerDefinitions<
    State,
    any
  > = SliceCaseReducerDefinitions<State, any>
> {
  /**
   * The slice's name. Used to namespace the generated action types.
   */
  name: string

  /**
   * The initial state to be returned by the slice reducer.
   */
  initialState: State

  /**
   * A mapping from action types to action-type-specific *case reducer*
   * functions. For every action type, a matching action creator will be
   * generated using `createAction()`.
   */
  reducers: CR

  /**
   * A mapping from action types to action-type-specific *case reducer*
   * functions. These reducers should have existing action types used
   * as the keys, and action creators will _not_ be generated.
   * Alternatively, a callback that receives a *builder* object to define
   * case reducers via calls to `builder.addCase(actionCreatorOrType, reducer)`.
   */
  extraReducers?:
    | CaseReducers<NoInfer<State>, any>
    | ((builder: ActionReducerMapBuilder<NoInfer<State>>) => void)
}

/**
 * A CaseReducer with a `prepare` method.
 *
 * @public
 */
export type CaseReducerWithPrepare<State, Action extends PayloadAction> = {
  reducer: CaseReducer<State, Action>
  prepare: PrepareAction<Action['payload']>
}

/**
 * The type describing a slice's `reducers` option.
 * Also checks itself, so it has to be passed "itself" as it's second option.
 * See the method signature of `createSlice`.
 *
 * @public
 */
export type SliceCaseReducerDefinitions<State, CR> = {
  [K: string]:
    | CaseReducer<State, PayloadAction<any>>
    | CaseReducerWithPrepare<State, PayloadAction<any>>
} & SliceCaseReducersCheck<State, CR>

/**
 * Derives the slice's `actions` property from the `reducers` options
 *
 * @public
 */
export type CaseReducerActions<
  CaseReducers extends SliceCaseReducerDefinitions<any, any>
> = {
  [Type in keyof CaseReducers]: CaseReducers[Type] extends { prepare: any }
    ? ActionCreatorForCaseReducerWithPrepare<CaseReducers[Type]>
    : ActionCreatorForCaseReducer<CaseReducers[Type]>
}

/**
 * Get a `PayloadActionCreator` type for a passed `CaseReducerWithPrepare`
 *
 * @internal
 */
type ActionCreatorForCaseReducerWithPrepare<
  CR extends { prepare: any }
> = _ActionCreatorWithPreparedPayload<CR['prepare'], string>

/**
 * Get a `PayloadActionCreator` type for a passed `CaseReducer`
 *
 * @internal
 */
type ActionCreatorForCaseReducer<CR> = CR extends (
  state: any,
  action: infer Action
) => any
  ? Action extends { payload: infer P }
    ? PayloadActionCreator<P>
    : ActionCreatorWithoutPayload
  : ActionCreatorWithoutPayload

/**
 * Extracts the CaseReducers out of a `reducers` object, even if they are
 * tested into a `CaseReducerWithPrepare`.
 *
 * @internal
 */
type SliceDefinedCaseReducers<
  CaseReducers extends SliceCaseReducerDefinitions<any, any>
> = {
  [Type in keyof CaseReducers]: CaseReducers[Type] extends {
    reducer: infer Reducer
  }
    ? Reducer
    : CaseReducers[Type]
}

/**
 * Helper type. Passes T out again, but boxes it in a way that it cannot
 * "widen" the type by accident if it is a generic that should be inferred
 * from elsewhere.
 *
 * @internal
 */
type NoInfer<T> = [T][T extends any ? 0 : never]

/**
 * Used on a `reducers` object.
 * Ensures that if a CaseReducer is a `CaseReducerWithPrepare`, that
 * the `reducer` and the `prepare` function use the same type of `payload`.
 *
 * @internal
 */
type SliceCaseReducersCheck<S, ACR> = {
  [P in keyof ACR]: ACR[P] extends {
    reducer(s: S, action?: { payload: infer O }): any
  }
    ? {
        prepare(...a: never[]): { payload: O }
      }
    : {}
}

function getType(slice: string, actionKey: string): string {
  return `${slice}/${actionKey}`
}

/**
 * A function that accepts an initial state, an object full of reducer
 * functions, and a "slice name", and automatically generates
 * action creators and action types that correspond to the
 * reducers and state.
 *
 * The `reducer` argument is passed to `createReducer()`.
 *
 * @public
 */
export function createSlice<
  State,
  CaseReducers extends SliceCaseReducerDefinitions<State, CaseReducers>
>(
  options: CreateSliceOptions<State, CaseReducers>
): Slice<State, CaseReducers> {
  const { name, initialState } = options
  if (!name) {
    throw new Error('`name` is a required option for createSlice')
  }
  const reducers = options.reducers || {}
  const extraReducers =
    typeof options.extraReducers === 'undefined'
      ? {}
      : typeof options.extraReducers === 'function'
      ? executeReducerBuilderCallback(options.extraReducers)
      : options.extraReducers

  const reducerNames = Object.keys(reducers)

  const sliceCaseReducersByName: Record<string, CaseReducer> = {}
  const sliceCaseReducersByType: Record<string, CaseReducer> = {}
  const actionCreators: Record<string, Function> = {}

  reducerNames.forEach(reducerName => {
    const maybeReducerWithPrepare = reducers[reducerName]
    const type = getType(name, reducerName)

    let caseReducer: CaseReducer<State, any>
    let prepareCallback: PrepareAction<any> | undefined

    if ('reducer' in maybeReducerWithPrepare) {
      caseReducer = maybeReducerWithPrepare.reducer
      prepareCallback = maybeReducerWithPrepare.prepare
    } else {
      caseReducer = maybeReducerWithPrepare
    }

    sliceCaseReducersByName[reducerName] = caseReducer
    sliceCaseReducersByType[type] = caseReducer
    actionCreators[reducerName] = prepareCallback
      ? createAction(type, prepareCallback)
      : createAction(type)
  })

  const finalCaseReducers = { ...extraReducers, ...sliceCaseReducersByType }
  const reducer = createReducer(initialState, finalCaseReducers as any)

  return {
    name,
    reducer,
    actions: actionCreators as any,
    caseReducers: sliceCaseReducersByName as any
  }
}
