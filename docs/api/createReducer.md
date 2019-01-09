---
id: createReducer
title: createReducer
sidebar_label: createReducer
hide_title: true
---

# `createReducer()`

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
const counterReducer = createReducr(0, {
  increment: (state, action) => state + action.payload,
  decrement: (state, action) => state - action.payload
})
```

If you created action creators using `createAction()`, you can use those directly as keys for the case reducers.

```js
const increment = createAction('increment')
const decrement = createAction('decrement')

const counterReducer = createReducr(0, {
  [increment]: (state, action) => state + action.payload,
  [decrement]: (state, action) => state - action.payload
})
```

## Direct State Mutation

Redux requires reducer functions to be pure and treat state values as immutable.  While this is essential for making state updates predictable and observable, it can sometimes make the implementation of such updates awkward. Consider the following example:

```js
const addTodo = createAction('todos/add')
const toggleTodo = createAction('todos/toggle')

const todosReducer = createReducr([], {
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

The  `addTodo` reducer is pretty easy to follow if you know the [ES6 spread syntax](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax).  However, the code for  `toggleTodo` is much less straightforward, especially considering that it only sets a single flag.

To make things easier, `createReducer` uses [immer](https://github.com/mweststrate/immer) to let you write reducers as if they were mutating the state directly. In reality, the reducer receives a proxy state that translates all mutations into equivalent copy operations.

```js
const addTodo = createAction('todos/add')
const toggleTodo = createAction('todos/toggle')

const todosReducer = createReducr([], {
  [addTodo]: (state, action) => {
    // This push() operation gets translated into the same
    // extended-array creation as in the previous example.
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

If you choose to write reducers in this style, make sure to learn about  the [pitfalls mentioned in the immer docs](https://github.com/mweststrate/immer#pitfalls) . Most importantly, you need to ensure that you either mutate the `state` argument or return a new state, _but not both_. For example, the following reducer would throw an exception if a `toggleTodo` action is passed:

```js
const todosReducer = createReducr([], {
  [toggleTodo]: (state, action) => {
    const index = action.payload
    const todo = state[index]

    // This case reducer both mutates the passed-in state...
    todo.completed = !todo.completed

    // ... and returns a new value. This will throw an
    // exception. In this example, the easiest fix is
    // to remove the `return` statement.
    return [
      ...state.slice(0, index),
      todo,
      ...state.slice(index + 1)
    ]
  }
})
```
