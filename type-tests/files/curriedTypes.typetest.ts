import { useDispatch, useSelector } from 'react-redux'
import {
  configureStore,
  createAsyncThunk,
  createThunk,
  Middleware,
  curryForStoreType
} from 'src'

type DispatchType = typeof store.dispatch
type StateType = ReturnType<typeof store.getState>

const otherMiddleware: Middleware<
  { (arg: number): number },
  any,
  any
> = _ => next => action => next(action)

const store = configureStore({
  reducer(state?: { foo: 'bar' }) {
    return state!
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      thunk: { extraArgument: 'thunkExtra' as const }
    }).concat(otherMiddleware)
})

const curryTypes = curryForStoreType<typeof store>()

function expectType<T>(t: T) {
  return t
}
// currying `useDispatch`
{
  expectType<() => DispatchType>(curryTypes(useDispatch))
}

// currying `useSelector`
{
  expectType<
    <X>(
      selector: (state: StateType) => X,
      equalityFn?: (x1: X, x2: X) => boolean
    ) => any
  >(curryTypes(useSelector))
}

/**
 * currying a lot of stuff
 */
{
  const {
    useDispatch: useAppDispatch,
    useSelector: useAppSelector
  } = curryTypes({
    useDispatch,
    useSelector
  })

  expectType<() => DispatchType>(useAppDispatch)

  // typings:expect-error does not accept wrong types for a key
  curryTypes({ useDispatch: () => {} })

  // typings:expect-error will not have stuff in the output that is not in the input
  const { useDispatch: notThere } = curryTypes({})
}

/**
 * currying all supported exports of react-redux at once
 */
{
  const { useDispatch, useSelector, connect, connectAdvanced } = curryTypes(
    require('react-redux')
  )
}
/**
 * currying `createAsyncThunk`
 */
{
  const curriedCAT = curryTypes(createAsyncThunk)
  curriedCAT('foo', (arg: any, { getState, dispatch, extra }) => {
    expectType<DispatchType>(dispatch)
    expectType<StateType>(getState())
    expectType<'thunkExtra'>(extra)
  })
}
/**
 * currying `createThunk`
 */
{
  const curriedCT = curryTypes(createThunk)

  const thunk = curriedCT(
    (arg1: string, arg2: number) => (dispatch, getState, extra) => {
      expectType<DispatchType>(dispatch)
      expectType<StateType>(getState())
      expectType<'thunkExtra'>(extra)
      return null
    }
  )
}
