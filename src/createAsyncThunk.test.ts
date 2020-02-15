import {
  createAsyncThunk,
  miniSerializeError,
  unwrapResult
} from './createAsyncThunk'
import { configureStore } from './configureStore'
import { AnyAction } from 'redux'

describe('createAsyncThunk', () => {
  it('creates the action types', () => {
    const thunkActionCreator = createAsyncThunk('testType', async () => 42)

    expect(thunkActionCreator.fulfilled.type).toBe('testType/fulfilled')
    expect(thunkActionCreator.pending.type).toBe('testType/pending')
    expect(thunkActionCreator.rejected.type).toBe('testType/rejected')
  })

  it('works without passing arguments to the payload creator', async () => {
    const thunkActionCreator = createAsyncThunk('testType', async () => 42)

    let timesReducerCalled = 0

    const reducer = () => {
      timesReducerCalled++
    }

    const store = configureStore({
      reducer
    })

    // reset from however many times the store called it
    timesReducerCalled = 0

    await store.dispatch(thunkActionCreator())

    expect(timesReducerCalled).toBe(2)
  })

  it('accepts arguments and dispatches the actions on resolve', async () => {
    const dispatch = jest.fn()

    let passedArgs: any

    const result = 42
    const args = 123
    let generatedRequestId = ''

    const thunkActionCreator = createAsyncThunk(
      'testType',
      async (args: number, { requestId }) => {
        passedArgs = args
        generatedRequestId = requestId
        return result
      }
    )

    const thunkFunction = thunkActionCreator(args)

    await thunkFunction(dispatch, undefined, undefined)

    expect(passedArgs).toBe(args)

    expect(dispatch).toHaveBeenNthCalledWith(
      1,
      thunkActionCreator.pending(generatedRequestId, args)
    )

    expect(dispatch).toHaveBeenNthCalledWith(
      2,
      thunkActionCreator.fulfilled(result, generatedRequestId, args)
    )
  })

  it('accepts arguments and dispatches the actions on reject', async () => {
    const dispatch = jest.fn()

    const args = 123
    let generatedRequestId = ''

    const error = new Error('Panic!')

    const thunkActionCreator = createAsyncThunk(
      'testType',
      async (args: number, { requestId }) => {
        generatedRequestId = requestId
        throw error
      }
    )

    const thunkFunction = thunkActionCreator(args)

    try {
      await thunkFunction(dispatch, undefined, undefined)
    } catch (e) {}

    expect(dispatch).toHaveBeenNthCalledWith(
      1,
      thunkActionCreator.pending(generatedRequestId, args)
    )

    expect(dispatch).toHaveBeenCalledTimes(2)

    console.log(dispatch.mock.calls)

    // Have to check the bits of the action separately since the error was processed
    const errorAction = dispatch.mock.calls[1][0]
    expect(errorAction.error).toEqual(miniSerializeError(error))
    expect(errorAction.meta.requestId).toBe(generatedRequestId)
    expect(errorAction.meta.args).toBe(args)
  })
})

describe('createAsyncThunk with abortController', () => {
  const asyncThunk = createAsyncThunk('test', function abortablePayloadCreator(
    _: any,
    { signal }
  ) {
    return new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(
          new DOMException(
            'This should never be reached as it should already be handled.',
            'AbortError'
          )
        )
      }
      signal.addEventListener('abort', () => {
        reject(new DOMException('Was aborted while running', 'AbortError'))
      })
      setTimeout(resolve, 100)
    })
  })

  let store = configureStore({
    reducer(store: AnyAction[] = []) {
      return store
    }
  })

  beforeEach(() => {
    store = configureStore({
      reducer(store: AnyAction[] = [], action) {
        return [...store, action]
      }
    })
  })

  test('normal usage', async () => {
    await store.dispatch(asyncThunk({}))
    expect(store.getState()).toEqual([
      expect.any(Object),
      expect.objectContaining({ type: 'test/pending' }),
      expect.objectContaining({ type: 'test/fulfilled' })
    ])
  })

  test('abort after dispatch', async () => {
    const thunkAction = asyncThunk({})
    const promise = store.dispatch(thunkAction)
    thunkAction.abort('AbortReason')
    const result = await promise
    const expectedAbortedAction = {
      type: 'test/aborted',
      error: {
        message: 'AbortReason',
        name: 'AbortError'
      },
      meta: { reason: 'AbortReason' }
    }
    // abortedAction with reason is dispatched after test/pending is dispatched
    expect(store.getState()).toMatchObject([
      {},
      { type: 'test/pending' },
      expectedAbortedAction
    ])

    // same abortedAction is returned, but with the AbortError from the abortablePayloadCreator
    expect(result).toMatchObject({
      ...expectedAbortedAction,
      error: {
        message: 'Was aborted while running',
        name: 'AbortError'
      }
    })

    // calling unwrapResult on the returned object re-throws the error from the abortablePayloadCreator
    expect(() => unwrapResult(result)).toThrowError(
      expect.objectContaining({
        message: 'Was aborted while running',
        name: 'AbortError'
      })
    )
  })

  test('abort before dispatch', async () => {
    const thunkAction = asyncThunk({})
    thunkAction.abort('AbortReason')
    const result = await store.dispatch(thunkAction)

    const expectedAbortedAction = {
      type: 'test/aborted',
      error: {
        message: 'AbortReason',
        name: 'AbortError'
      },
      meta: { reason: 'AbortReason' }
    }
    // abortedAction with reason is dispatched without test/pending being dispatched
    expect(store.getState()).toMatchObject([{}, expectedAbortedAction])

    // same abortedAction is returned
    expect(result).toMatchObject(expectedAbortedAction)

    // unwrapResult throws AbortedError from returned action
    expect(() => unwrapResult(result)).toThrowError(
      expect.objectContaining(expectedAbortedAction.error)
    )
  })
})
