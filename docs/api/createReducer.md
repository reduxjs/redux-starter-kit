---
id: createReducer
title: createReducer
sidebar_label: createReducer
hide_title: true
---

# `createReducer()`

A utility that simplifies creating Redux reducer functions, by defining them as lookup tables of functions to handle each action type. It also allows you to drastically simplify immutable update logic, by writing "mutative" code inside your reducers.

Redux [reducers](https://redux.js.org/basics/reducers) are often implemented using a `switch` statement, with one `case` for every handled action type.

```js
function counterReducer(state = 0, action) {
  switch (action.type) {
    case 'increment':
      return state + action.payload
    case 'decrement':
      return state - action.payload
    default:
      return state
  }
}
```

This approach works well, but is a bit boilerplate-y and error-prone. For instance, it is easy to forget the `default` case or setting the initial state.

The `createReducer` helper streamlines the implementation of such reducers. It takes two arguments. The first one is the initial state. The second is an object mapping from action types to _case reducers_, each of which handles one specific action type.

```js
const counterReducer = createReducer(0, {
  increment: (state, action) => state + action.payload,
  decrement: (state, action) => state - action.payload
})
```

Action creators that were generated using [`createAction`](./createAction.md) may be used directly as the keys here, using
computed property syntax.

> **Note**: If you are using TypeScript, we recommend using the `builder callback` API that is shown below. If you do not use the `builder callback` and are using TypeScript, you will need to use `actionCreator.type` or `actionCreator.toString()`
> to force the TS compiler to accept the computed property. Please see [Usage With TypeScript](./../usage/usage-with-typescript.md#type-safety-with-extraReducers) for further details.

```js
const increment = createAction('increment')
const decrement = createAction('decrement')

const counterReducer = createReducer(0, {
  [increment]: (state, action) => state + action.payload,
  [decrement.type]: (state, action) => state - action.payload
})
```

### The "builder callback" API

Instead of using a simple object as an argument to `createReducer`, you can also provide a callback that receives an `ActionReducerMapBuilder` instance:

```typescript
createReducer(0, builder =>
  builder.addCase(increment, (state, action) => {
    // action is inferred correctly here
  })
)
```

This is intended for use with TypeScript, as passing a plain object full of reducer functions cannot infer the type of actions correctly in this case. It has no real benefit when used with plain JS.

We recommend using this API if stricter type safety is necessary when defining reducer argument objects.

## Direct State Mutation

Redux requires reducer functions to be pure and treat state values as immutable. While this is essential for making state updates predictable and observable, it can sometimes make the implementation of such updates awkward. Consider the following example:

```js
const addTodo = createAction('todos/add')
const toggleTodo = createAction('todos/toggle')

const todosReducer = createReducer([], {
  [addTodo]: (state, action) => {
    const todo = action.payload
    return [...state, todo]
  },
  [toggleTodo]: (state, action) => {
    const index = action.payload
    const todo = state[index]
    return [
      ...state.slice(0, index),
      { ...todo, completed: !todo.completed }
      ...state.slice(index + 1)
    ]
  }
})
```

The `addTodo` reducer is pretty easy to follow if you know the [ES6 spread syntax](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax). However, the code for `toggleTodo` is much less straightforward, especially considering that it only sets a single flag.

To make things easier, `createReducer` uses [immer](https://github.com/mweststrate/immer) to let you write reducers as if they were mutating the state directly. In reality, the reducer receives a proxy state that translates all mutations into equivalent copy operations.

```js
const addTodo = createAction('todos/add')
const toggleTodo = createAction('todos/toggle')

const todosReducer = createReducer([], {
  [addTodo]: (state, action) => {
    // This push() operation gets translated into the same
    // extended-array creation as in the previous example.
    const todo = action.payload
    state.push(todo)
  },
  [toggleTodo]: (state, action) => {
    // The "mutating" version of this case reducer is much
    //  more direct than the explicitly pure one.
    const index = action.payload
    const todo = state[index]
    todo.completed = !todo.completed
  }
})
```

If you choose to write reducers in this style, make sure to learn about the [pitfalls mentioned in the immer docs](https://immerjs.github.io/immer/docs/pitfalls) . Most importantly, you need to ensure that you either mutate the `state` argument or return a new state, _but not both_. For example, the following reducer would throw an exception if a `toggleTodo` action is passed:

```js
const todosReducer = createReducer([], {
  [toggleTodo]: (state, action) => {
    const index = action.payload
    const todo = state[index]

    // This case reducer both mutates the passed-in state...
    todo.completed = !todo.completed

    // ... and returns a new value. This will throw an
    // exception. In this example, the easiest fix is
    // to remove the `return` statement.
    return [...state.slice(0, index), todo, ...state.slice(index + 1)]
  }
})
```

## Debugging your state

It's very common for a developer to call `console.log(state)` during the development process. However, browsers display Proxies in a format that is hard to read, which can make console logging of Immer-based state difficult.

When using either `createSlice` or `createReducer`, you may use the [`current`](./otherExports#current.md) utility that we re-export from the [`immer` library](https://immerjs.github.io/immer). This utility creates a separate plain copy of the current Immer `Draft` state value, which can then be logged for viewing as normal.

```ts
// todosSlice.js
import { createSlice, current } from '@reduxjs/toolkit'

const slice = createSlice({
  name: 'todos',
  initialState: [{ id: 1, title: 'Example todo' }],
  reducers: {
    addTodo: (state, action) => {
      console.log('before', current(state))
      state.push(action.payload)
      console.log('after', current(state))
    }
  }
})
```
