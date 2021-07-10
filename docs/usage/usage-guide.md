---
id: usage-guide
title: Usage Guide
sidebar_label: Usage Guide
hide_title: true
---

&nbsp;

# Usage Guide

The Redux core library is deliberately unopinionated. It lets you decide how you want to handle everything, like store setup, what your state contains, and how you want to build your reducers.

This is good in some cases, because it gives you flexibility, but that flexibility isn't always needed. Sometimes we just want the simplest possible way to get started, with some good default behavior out of the box. Or, maybe you're writing a larger application and finding yourself writing some similar code, and you'd like to cut down on how much of that code you have to write by hand.

As described in the [Quick Start](../introduction/getting-started.md) page, the goal of Redux Toolkit is to help simplify common Redux use cases. It is not intended to be a complete solution for everything you might want to do with Redux, but it should make a lot of the Redux-related code you need to write a lot simpler (or in some cases, eliminate some of the hand-written code entirely).

Redux Toolkit exports several individual functions that you can use in your application, and adds dependencies of some other packages that are commonly used with Redux. This lets you decide how to use these in your own application, whether it be a brand new project or updating a large existing app.

Let's look at some of the ways that Redux Toolkit can help make your Redux-related code better.

## Store Setup

Every Redux app needs to configure and create a Redux store. This usually involves several steps:

- Importing or creating the root reducer function
- Setting up middleware, likely including at least one middleware to handle asynchronous logic
- Configuring the [Redux DevTools Extension](https://github.com/zalmoxisus/redux-devtools-extension)
- Possibly altering some of the logic based on whether the application is being built for development or production

### Manual Store Setup

The following example from the [Configuring Your Store](https://redux.js.org/recipes/configuring-your-store) page in the Redux docs shows a typical store setup process:

```js
import { applyMiddleware, createStore } from 'redux'
import { composeWithDevTools } from 'redux-devtools-extension'
import thunkMiddleware from 'redux-thunk'

import monitorReducersEnhancer from './enhancers/monitorReducers'
import loggerMiddleware from './middleware/logger'
import rootReducer from './reducers'

export default function configureStore(preloadedState) {
  const middlewares = [loggerMiddleware, thunkMiddleware]
  const middlewareEnhancer = applyMiddleware(...middlewares)

  const enhancers = [middlewareEnhancer, monitorReducersEnhancer]
  const composedEnhancers = composeWithDevTools(...enhancers)

  const store = createStore(rootReducer, preloadedState, composedEnhancers)

  if (process.env.NODE_ENV !== 'production' && module.hot) {
    module.hot.accept('./reducers', () => store.replaceReducer(rootReducer))
  }

  return store
}
```

This example is readable, but the process isn't always straightforward:

- The basic Redux `createStore` function takes positional arguments: `(rootReducer, preloadedState, enhancer)`. Sometimes it's easy to forget which parameter is which.
- The process of setting up middleware and enhancers can be confusing, especially if you're trying to add several pieces of configuration.
- The Redux DevTools Extension docs initially suggest using [some hand-written code that checks the global namespace to see if the extension is available](https://github.com/zalmoxisus/redux-devtools-extension#11-basic-store). Many users copy and paste those snippets, which make the setup code harder to read.

### Simplifying Store Setup with `configureStore`

`configureStore` helps with those issues by:

- Having an options object with "named" parameters, which can be easier to read
- Letting you provide arrays of middleware and enhancers you want to add to the store, and calling `applyMiddleware` and `compose` for you automatically
- Enabling the Redux DevTools Extension automatically

In addition, `configureStore` adds some middleware by default, each with a specific goal:

- [`redux-thunk`](https://github.com/reduxjs/redux-thunk) is the most commonly used middleware for working with both synchronous and async logic outside of components
- In development, middleware that check for common mistakes like mutating the state or using non-serializable values.

This means the store setup code itself is a bit shorter and easier to read, and also that you get good default behavior out of the box.

The simplest way to use it is to just pass the root reducer function as a parameter named `reducer`:

```js
import { configureStore } from '@reduxjs/toolkit'
import rootReducer from './reducers'

const store = configureStore({
  reducer: rootReducer,
})

export default store
```

You can also pass an object full of ["slice reducers"](https://redux.js.org/recipes/structuring-reducers/splitting-reducer-logic), and `configureStore` will call [`combineReducers`](https://redux.js.org/api/combinereducers) for you:

```js
import { configureStore } from '@reduxjs/toolkit'
// highlight-start
import usersReducer from './usersReducer'
import postsReducer from './postsReducer'

const store = configureStore({
  reducer: {
    users: usersReducer,
    posts: postsReducer,
  },
})
// highlight-end

export default store
```

Note that this only works for one level of reducers. If you want to nest reducers, you'll need to call `combineReducers` yourself to handle the nesting.

If you need to customize the store setup, you can pass additional options. Here's what the hot reloading example might look like using Redux Toolkit:

```js
import { configureStore } from '@reduxjs/toolkit'

import monitorReducersEnhancer from './enhancers/monitorReducers'
import loggerMiddleware from './middleware/logger'
import rootReducer from './reducers'

export default function configureAppStore(preloadedState) {
  const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(loggerMiddleware),
    preloadedState,
    enhancers: [monitorReducersEnhancer],
  })

  if (process.env.NODE_ENV !== 'production' && module.hot) {
    module.hot.accept('./reducers', () => store.replaceReducer(rootReducer))
  }

  return store
}
```

If you provide the `middleware` argument, `configureStore` will only use whatever middleware you've listed.
If you want to have some custom middleware _and_ the defaults all together, you can use the callback notation,
call [`getDefaultMiddleware`](../api/getDefaultMiddleware.mdx) and include the results in the `middleware` array you return.

## Writing Reducers

[Reducers](https://redux.js.org/basics/reducers) are the most important Redux concept. A typical reducer function needs to:

- Look at the `type` field of the action object to see how it should respond
- Update its state immutably, by making copies of the parts of the state that need to change and only modifying those copies

While you can [use any conditional logic you want](https://blog.isquaredsoftware.com/2017/05/idiomatic-redux-tao-of-redux-part-2/#switch-statements) in a reducer, the most common approach is a `switch` statement, because it's a straightforward way to handle multiple possible values for a single field. However, many people don't like switch statements. The Redux docs show an example of [writing a function that acts as a lookup table based on action types](https://redux.js.org/recipes/reducing-boilerplate#generating-reducers), but leave it up to users to customize that function themselves.

The other common pain points around writing reducers have to do with updating state immutably. JavaScript is a mutable language, [updating nested immutable data by hand is hard](https://redux.js.org/recipes/structuring-reducers/immutable-update-patterns), and it's easy to make mistakes.

### Simplifying Reducers with `createReducer`

Since the "lookup table" approach is popular, Redux Toolkit includes a `createReducer` function similar to the one shown in the Redux docs. However, our `createReducer` utility has some special "magic" that makes it even better. It uses the [Immer](https://github.com/mweststrate/immer) library internally, which lets you write code that "mutates" some data, but actually applies the updates immutably. This makes it effectively impossible to accidentally mutate state in a reducer.

In general, any Redux reducer that uses a `switch` statement can be converted to use `createReducer` directly. Each `case` in the switch becomes a key in the object passed to `createReducer`. Immutable update logic, like spreading objects or copying arrays, can probably be converted to direct "mutation". It's also fine to keep the immutable updates as-is and return the updated copies, too.

Here's some examples of how you can use `createReducer`. We'll start with a typical "todo list" reducer that uses switch statements and immutable updates:

```js
function todosReducer(state = [], action) {
  switch (action.type) {
    case 'ADD_TODO': {
      return state.concat(action.payload)
    }
    case 'TOGGLE_TODO': {
      const { index } = action.payload
      return state.map((todo, i) => {
        if (i !== index) return todo

        return {
          ...todo,
          completed: !todo.completed,
        }
      })
    }
    case 'REMOVE_TODO': {
      return state.filter((todo, i) => i !== action.payload.index)
    }
    default:
      return state
  }
}
```

Notice that we specifically call `state.concat()` to return a copied array with the new todo entry, `state.map()` to return a copied array for the toggle case, and use the object spread operator to make a copy of the todo that needs to be updated.

With `createReducer`, we can shorten that example considerably:

```js
const todosReducer = createReducer([], (builder) => {
  builder
    .addCase('ADD_TODO', (state, action) => {
      // "mutate" the array by calling push()
      state.push(action.payload)
    })
    .addCase('TOGGLE_TODO', (state, action) => {
      const todo = state[action.payload.index]
      // "mutate" the object by overwriting a field
      todo.completed = !todo.completed
    })
    .addCase('REMOVE_TODO', (state, action) => {
      // Can still return an immutably-updated value if we want to
      return state.filter((todo, i) => i !== action.payload.index)
    })
})
```

The ability to "mutate" the state is especially helpful when trying to update deeply nested state. This complex and painful code:

```js
case "UPDATE_VALUE":
  return {
    ...state,
    first: {
      ...state.first,
      second: {
        ...state.first.second,
        [action.someId]: {
          ...state.first.second[action.someId],
          fourth: action.someValue
        }
      }
    }
  }
```

Can be simplified down to just:

```js
updateValue(state, action) {
    const {someId, someValue} = action.payload;
    state.first.second[someId].fourth = someValue;
}
```

Much better!

### Considerations for Using `createReducer`

While the Redux Toolkit `createReducer` function can be really helpful, keep in mind that:

- The "mutative" code only works correctly inside of our `createReducer` function
- Immer won't let you mix "mutating" the draft state and also returning a new state value

See the [`createReducer` API reference](../api/createReducer.mdx) for more details.

## Writing Action Creators

Redux encourages you to [write "action creator" functions](https://blog.isquaredsoftware.com/2016/10/idiomatic-redux-why-use-action-creators/) that encapsulate the process of creating an action object. While this is not strictly required, it's a standard part of Redux usage.

Most action creators are very simple. They take some parameters, and return an action object with a specific `type` field and the parameters inside the action. These parameters are typically put in a field called `payload`, which is part of the [Flux Standard Action](https://github.com/redux-utilities/flux-standard-action) convention for organizing the contents of action objects. A typical action creator might look like:

```js
function addTodo(text) {
  return {
    type: 'ADD_TODO',
    payload: { text },
  }
}
```

### Defining Action Creators with `createAction`

Writing action creators by hand can get tedious. Redux Toolkit provides a function called `createAction`, which simply generates an action creator that uses the given action type, and turns its argument into the `payload` field:

```js
const addTodo = createAction('ADD_TODO')
addTodo({ text: 'Buy milk' })
// {type : "ADD_TODO", payload : {text : "Buy milk"}})
```

`createAction` also accepts a "prepare callback" argument, which allows you to customize the resulting `payload` field and optionally add a `meta` field. See the [`createAction` API reference](../api/createAction.mdx#using-prepare-callbacks-to-customize-action-contents) for details on defining action creators with a prepare callback.

### Using Action Creators as Action Types

Redux reducers need to look for specific action types to determine how they should update their state. Normally, this is done by defining action type strings and action creator functions separately. Redux Toolkit `createAction` function uses a couple tricks to make this easier.

First, `createAction` overrides the `toString()` method on the action creators it generates. **This means that the action creator itself can be used as the "action type" reference in some places**, such as the keys provided to `builder.addCase` or the `createReducer` object notation.

Second, the action type is also defined as a `type` field on the action creator.

```js
const actionCreator = createAction('SOME_ACTION_TYPE')

console.log(actionCreator.toString())
// "SOME_ACTION_TYPE"

console.log(actionCreator.type)
// "SOME_ACTION_TYPE"

const reducer = createReducer({}, (builder) => {
  // actionCreator.toString() will automatically be called here
  // also, if you use TypeScript, the action type will be correctly inferred
  builder.addCase(actionCreator, (state, action) => {})

  // Or, you can reference the .type field:
  // if using TypeScript, the action type cannot be inferred that way
  builder.addCase(actionCreator.type, (state, action) => {})
})
```

This means you don't have to write or use a separate action type variable, or repeat the name and value of an action type like `const SOME_ACTION_TYPE = "SOME_ACTION_TYPE"`.

Unfortunately, the implicit conversion to a string doesn't happen for switch statements. If you want to use one of these action creators in a switch statement, you need to call `actionCreator.toString()` yourself:

```js
const actionCreator = createAction('SOME_ACTION_TYPE')

const reducer = (state = {}, action) => {
  switch (action.type) {
    // ERROR: this won't work correctly!
    case actionCreator: {
      break
    }
    // CORRECT: this will work as expected
    case actionCreator.toString(): {
      break
    }
    // CORRECT: this will also work right
    case actionCreator.type: {
      break
    }
  }
}
```

If you are using Redux Toolkit with TypeScript, note that the TypeScript compiler may not accept the implicit `toString()` conversion when the action creator is used as an object key. In that case, you may need to either manually cast it to a string (`actionCreator as string`), or use the `.type` field as the key.

## Creating Slices of State

Redux state is typically organized into "slices", defined by the reducers that are passed to `combineReducers`:

```js
import { combineReducers } from 'redux'
import usersReducer from './usersReducer'
import postsReducer from './postsReducer'

const rootReducer = combineReducers({
  users: usersReducer,
  posts: postsReducer,
})
```

In this example, both `users` and `posts` would be considered "slices". Both of the reducers:

- "Own" a piece of state, including what the initial value is
- Define how that state is updated
- Define which specific actions result in state updates

The common approach is to define a slice's reducer function in its own file, and the action creators in a second file. Because both functions need to refer to the same action types, those are usually defined in a third file and imported in both places:

```js
// postsConstants.js
const CREATE_POST = 'CREATE_POST'
const UPDATE_POST = 'UPDATE_POST'
const DELETE_POST = 'DELETE_POST'

// postsActions.js
import { CREATE_POST, UPDATE_POST, DELETE_POST } from './postConstants'

export function addPost(id, title) {
  return {
    type: CREATE_POST,
    payload: { id, title },
  }
}

// postsReducer.js
import { CREATE_POST, UPDATE_POST, DELETE_POST } from './postConstants'

const initialState = []

export default function postsReducer(state = initialState, action) {
  switch (action.type) {
    case CREATE_POST: {
      // omit implementation
    }
    default:
      return state
  }
}
```

The only truly necessary part here is the reducer itself. Consider the other parts:

- We could have written the action types as inline strings in both places
- The action creators are good, but they're not _required_ to use Redux - a component could skip supplying a `mapDispatch` argument to `connect`, and just call `this.props.dispatch({type : "CREATE_POST", payload : {id : 123, title : "Hello World"}})` itself
- The only reason we're even writing multiple files is because it's common to separate code by what it does

The ["ducks" file structure](https://github.com/erikras/ducks-modular-redux) proposes putting all of your Redux-related logic for a given slice into a single file, like this:

```js
// postsDuck.js
const CREATE_POST = 'CREATE_POST'
const UPDATE_POST = 'UPDATE_POST'
const DELETE_POST = 'DELETE_POST'

export function addPost(id, title) {
  return {
    type: CREATE_POST,
    payload: { id, title },
  }
}

const initialState = []

export default function postsReducer(state = initialState, action) {
  switch (action.type) {
    case CREATE_POST: {
      // Omit actual code
      break
    }
    default:
      return state
  }
}
```

That simplifies things because we don't need to have multiple files, and we can remove the redundant imports of the action type constants. But, we still have to write the action types and the action creators by hand.

### Defining Functions in Objects

In modern JavaScript, there are several legal ways to define both keys and functions in an object (and this isn't specific to Redux), and you can mix and match different key definitions and function definitions. For example, these are all legal ways to define a function inside an object:

```js
const keyName = "ADD_TODO4";

const reducerObject = {
	// Explicit quotes for the key name, arrow function for the reducer
	"ADD_TODO1" : (state, action) => { }

	// Bare key with no quotes, function keyword
	ADD_TODO2 : function(state, action){  }

	// Object literal function shorthand
	ADD_TODO3(state, action) { }

	// Computed property
	[keyName] : (state, action) => { }
}
```

Using the ["object literal function shorthand"](https://www.sitepoint.com/es6-enhanced-object-literals/) is probably the shortest code, but feel free to use whichever of those approaches you want.

### Simplifying Slices with `createSlice`

To simplify this process, Redux Toolkit includes a `createSlice` function that will auto-generate the action types and action creators for you, based on the names of the reducer functions you provide.

Here's how that posts example would look with `createSlice`:

```js
const postsSlice = createSlice({
  name: 'posts',
  initialState: [],
  reducers: {
    createPost(state, action) {},
    updatePost(state, action) {},
    deletePost(state, action) {},
  },
})

console.log(postsSlice)
/*
{
    name: 'posts',
    actions : {
        createPost,
        updatePost,
        deletePost,
    },
    reducer
}
*/

const { createPost } = postsSlice.actions

console.log(createPost({ id: 123, title: 'Hello World' }))
// {type : "posts/createPost", payload : {id : 123, title : "Hello World"}}
```

`createSlice` looked at all of the functions that were defined in the `reducers` field, and for every "case reducer" function provided, generates an action creator that uses the name of the reducer as the action type itself. So, the `createPost` reducer became an action type of `"posts/createPost"`, and the `createPost()` action creator will return an action with that type.

### Exporting and Using Slices

Most of the time, you'll want to define a slice, and export its action creators and reducers. The recommended way to do this is using ES6 destructuring and export syntax:

```js
const postsSlice = createSlice({
  name: 'posts',
  initialState: [],
  reducers: {
    createPost(state, action) {},
    updatePost(state, action) {},
    deletePost(state, action) {},
  },
})

// Extract the action creators object and the reducer
const { actions, reducer } = postsSlice
// Extract and export each action creator by name
export const { createPost, updatePost, deletePost } = actions
// Export the reducer, either as a default or named export
export default reducer
```

You could also just export the slice object itself directly if you prefer.

Slices defined this way are very similar in concept to the ["Redux Ducks" pattern](https://github.com/erikras/ducks-modular-redux) for defining and exporting action creators and reducers. However, there are a couple potential downsides to be aware of when importing and exporting slices.

First, **Redux action types are not meant to be exclusive to a single slice**. Conceptually, each slice reducer "owns" its own piece of the Redux state, but it should be able to listen to any action type and update its state appropriately. For example, many different slices might want to respond to a "user logged out" action by clearing data or resetting back to initial state values. Keep that in mind as you design your state shape and create your slices.

Second, **JS modules can have "circular reference" problems if two modules try to import each other**. This can result in imports being undefined, which will likely break the code that needs that import. Specifically in the case of "ducks" or slices, this can occur if slices defined in two different files both want to respond to actions defined in the other file.

This CodeSandbox example demonstrates the problem:

<iframe src="https://codesandbox.io/embed/rw7ppj4z0m/?runonclick=1" style={{ width: '100%', height: '500px', border: 0, borderRadius: '4px', overflow: 'hidden' }} sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"></iframe>

If you encounter this, you may need to restructure your code in a way that avoids the circular references. This will usually require extracting shared code to a separate common file that both modules can import and use. In this case, you might define some common action types in a separate file using `createAction`, import those action creators into each slice file, and handle them using the `extraReducers` argument.

The article [How to fix circular dependency issues in JS](https://medium.com/visual-development/how-to-fix-nasty-circular-dependency-issues-once-and-for-all-in-javascript-typescript-a04c987cf0de) has additional info and examples that can help with this issue.

## Asynchronous Logic and Data Fetching

### Using Middleware to Enable Async Logic

By itself, a Redux store doesn't know anything about async logic. It only knows how to synchronously dispatch actions, update the state by calling the root reducer function, and notify the UI that something has changed. Any asynchronicity has to happen outside the store.

But, what if you want to have async logic interact with the store by dispatching or checking the current store state? That's where [Redux middleware](https://redux.js.org/advanced/middleware) come in. They extend the store, and allow you to:

- Execute extra logic when any action is dispatched (such as logging the action and state)
- Pause, modify, delay, replace, or halt dispatched actions
- Write extra code that has access to `dispatch` and `getState`
- Teach `dispatch` how to accept other values besides plain action objects, such as functions and promises, by intercepting them and dispatching real action objects instead

[The most common reason to use middleware is to allow different kinds of async logic to interact with the store](https://redux.js.org/faq/actions#how-can-i-represent-side-effects-such-as-ajax-calls-why-do-we-need-things-like-action-creators-thunks-and-middleware-to-do-async-behavior). This allows you to write code that can dispatch actions and check the store state, while keeping that logic separate from your UI.

There are many kinds of async middleware for Redux, and each lets you write your logic using different syntax. The most common async middleware are:

- [`redux-thunk`](https://github.com/reduxjs/redux-thunk), which lets you write plain functions that may contain async logic directly
- [`redux-saga`](https://github.com/redux-saga/redux-saga), which uses generator functions that return descriptions of behavior so they can be executed by the middleware
- [`redux-observable`](https://github.com/redux-observable/redux-observable/), which uses the RxJS observable library to create chains of functions that process actions

[Each of these libraries has different use cases and tradeoffs](https://redux.js.org/faq/actions#what-async-middleware-should-i-use-how-do-you-decide-between-thunks-sagas-observables-or-something-else).

:::tip

Redux Toolkit's [**RTK Query data fetching API**](../rtk-query/overview.md) is a purpose built data fetching and caching solution for Redux apps, and can **eliminate the need to write _any_ thunks or reducers to manage data fetching**. We encourage you to try it out and see if it can help simplify the data fetching code in your own apps!

:::

If you do need to write data fetching logic yourself, we recommend [using the Redux Thunk middleware as the standard approach](https://github.com/reduxjs/redux-thunk), as it is sufficient for most typical use cases (such as basic AJAX data fetching). In addition, use of the `async/await` syntax in thunks makes them easier to read.

**The Redux Toolkit `configureStore` function [automatically sets up the thunk middleware by default](../api/getDefaultMiddleware.mdx)**, so you can immediately start writing thunks as part of your application code.

### Defining Async Logic in Slices

Redux Toolkit does not currently provide any special APIs or syntax for writing thunk functions. In particular, **they cannot be defined as part of a `createSlice()` call**. You have to write them separate from the reducer logic, exactly the same as with plain Redux code.

Thunks typically dispatch plain actions, such as `dispatch(dataLoaded(response.data))`.

Many Redux apps have structured their code using a "folder-by-type" approach. In that structure, thunk action creators are usually defined in an "actions" file, alongside the plain action creators.

Because we don't have separate "actions" files, **it makes sense to write these thunks directly in our "slice" files**. That way, they have access to the plain action creators from the slice, and it's easy to find where the thunk function lives.

A typical slice file that includes thunks would look like this:

```js
// First, define the reducer and action creators via `createSlice`
const usersSlice = createSlice({
  name: 'users',
  initialState: {
    loading: 'idle',
    users: [],
  },
  reducers: {
    usersLoading(state, action) {
      // Use a "state machine" approach for loading state instead of booleans
      if (state.loading === 'idle') {
        state.loading = 'pending'
      }
    },
    usersReceived(state, action) {
      if (state.loading === 'pending') {
        state.loading = 'idle'
        state.users = action.payload
      }
    },
  },
})

// Destructure and export the plain action creators
export const { usersLoading, usersReceived } = usersSlice.actions

// Define a thunk that dispatches those action creators
const fetchUsers = () => async (dispatch) => {
  dispatch(usersLoading())
  const response = await usersAPI.fetchAll()
  dispatch(usersReceived(response.data))
}
```

### Redux Data Fetching Patterns

Data fetching logic for Redux typically follows a predictable pattern:

- A "start" action is dispatched before the request to indicate that the request is in progress. This may be used to track loading state, to allow skipping duplicate requests, or show loading indicators in the UI.
- The async request is made
- Depending on the request result, the async logic dispatches either a "success" action containing the result data, or a "failure" action containing error details. The reducer logic clears the loading state in both cases, and either processes the result data from the success case, or stores the error value for potential display.

These steps are not required, but are [recommended in the Redux tutorials as a suggested pattern](https://redux.js.org/advanced/async-actions).

A typical implementation might look like:

```js
const getRepoDetailsStarted = () => ({
  type: "repoDetails/fetchStarted"
})
const getRepoDetailsSuccess = (repoDetails) => {
  type: "repoDetails/fetchSucceeded",
  payload: repoDetails
}
const getRepoDetailsFailed = (error) => {
  type: "repoDetails/fetchFailed",
  error
}
const fetchIssuesCount = (org, repo) => async dispatch => {
  dispatch(getRepoDetailsStarted())
  try {
    const repoDetails = await getRepoDetails(org, repo)
    dispatch(getRepoDetailsSuccess(repoDetails))
  } catch (err) {
    dispatch(getRepoDetailsFailed(err.toString()))
  }
}
```

However, writing code using this approach is tedious. Each separate type of request needs repeated similar implementation:

- Unique action types need to be defined for the three different cases
- Each of those action types usually has a corresponding action creator function
- A thunk has to be written that dispatches the correct actions in the right sequence

`createAsyncThunk` abstracts this pattern by generating the action types and action creators and generating a thunk that dispatches those actions.

### Async Requests with `createAsyncThunk`

As a developer, you are probably most concerned with the actual logic needed to make an API request, what action type names show up in the Redux action history log, and how your reducers should process the fetched data. The repetitive details of defining the multiple action types and dispatching the actions in the right sequence aren't what matters.

`createAsyncThunk` simplifies this process - you only need to provide a string for the action type prefix and a payload creator callback that does the actual async logic and returns a promise with the result. In return, `createAsyncThunk` will give you a thunk that will take care of dispatching the right actions based on the promise you return, and action types that you can handle in your reducers:

```js {5-11,22-25,30}
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { userAPI } from './userAPI'

// First, create the thunk
const fetchUserById = createAsyncThunk(
  'users/fetchByIdStatus',
  async (userId, thunkAPI) => {
    const response = await userAPI.fetchById(userId)
    return response.data
  }
)

// Then, handle actions in your reducers:
const usersSlice = createSlice({
  name: 'users',
  initialState: { entities: [], loading: 'idle' },
  reducers: {
    // standard reducer logic, with auto-generated action types per reducer
  },
  extraReducers: (builder) => {
    // Add reducers for additional action types here, and handle loading state as needed
    builder.addCase(fetchUserById.fulfilled, (state, action) => {
      // Add user to the state array
      state.entities.push(action.payload)
    })
  },
})

// Later, dispatch the thunk as needed in the app
dispatch(fetchUserById(123))
```

The thunk action creator accepts a single argument, which will be passed as the first argument to your payload creator callback.

The payload creator will also receive a `thunkAPI` object containing the parameters that are normally passed to a standard Redux thunk function, as well as an auto-generated unique random request ID string and an [`AbortController.signal` object](https://developer.mozilla.org/en-US/docs/Web/API/AbortController/signal):

```ts
interface ThunkAPI {
  dispatch: Function
  getState: Function
  extra?: any
  requestId: string
  signal: AbortSignal
}
```

You can use any of these as needed inside the payload callback to determine what the final result should be.

## Managing Normalized Data

Most applications typically deal with data that is deeply nested or relational. The goal of normalizing data is to efficiently organize the data in your state. This is typically done by storing collections as objects with the key of an `id`, while storing a sorted array of those `ids`. For a more in-depth explanation and further examples, there is a great reference in the [Redux docs page on "Normalizing State Shape"](https://redux.js.org/recipes/structuring-reducers/normalizing-state-shape).

### Normalizing by hand

Normalizing data doesn't require any special libraries. Here's a basic example of how you might normalize the response from a `fetchAll` API request that returns data in the shape of `{ users: [{id: 1, first_name: 'normalized', last_name: 'person'}] }`, using some hand-written logic:

```js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import userAPI from './userAPI'

export const fetchUsers = createAsyncThunk('users/fetchAll', async () => {
  const response = await userAPI.fetchAll()
  return response.data
})

export const slice = createSlice({
  name: 'users',
  initialState: {
    ids: [],
    entities: {},
  },
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchUsers.fulfilled, (state, action) => {
      // reduce the collection by the id property into a shape of { 1: { ...user }}
      const byId = action.payload.users.reduce((byId, user) => {
        byId[user.id] = user
        return byId
      }, {})
      state.entities = byId
      state.ids = Object.keys(byId)
    })
  },
})
```

Although we're capable of writing this code, it does become repetitive, especially if you're handling multiple types of data. In addition, this example only handles loading entries into the state, not updating them.

### Normalizing with `normalizr`

[`normalizr`](https://github.com/paularmstrong/normalizr) is a popular existing library for normalizing data. You can use it on its own without Redux, but it is very commonly used with Redux. The typical usage is to format collections from an API response and then process them in your reducers.

```js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { normalize, schema } from 'normalizr'

import userAPI from './userAPI'

const userEntity = new schema.Entity('users')

export const fetchUsers = createAsyncThunk('users/fetchAll', async () => {
  const response = await userAPI.fetchAll()
  // Normalize the data before passing it to our reducer
  const normalized = normalize(response.data, [userEntity])
  return normalized.entities
})

export const slice = createSlice({
  name: 'users',
  initialState: {
    ids: [],
    entities: {},
  },
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchUsers.fulfilled, (state, action) => {
      state.entities = action.payload.users
      state.ids = Object.keys(action.payload.users)
    })
  },
})
```

As with the hand-written version, this doesn't handle adding additional entries into the state, or updating them later - it's just loading in everything that was received.

### Normalizing with `createEntityAdapter`

Redux Toolkit's `createEntityAdapter` API provides a standardized way to store your data in a slice by taking a collection and putting it into the shape of `{ ids: [], entities: {} }`. Along with this predefined state shape, it generates a set of reducer functions and selectors that know how to work with the data.

```js
import {
  createSlice,
  createAsyncThunk,
  createEntityAdapter,
} from '@reduxjs/toolkit'
import userAPI from './userAPI'

export const fetchUsers = createAsyncThunk('users/fetchAll', async () => {
  const response = await userAPI.fetchAll()
  // In this case, `response.data` would be:
  // [{id: 1, first_name: 'Example', last_name: 'User'}]
  return response.data
})

export const updateUser = createAsyncThunk('users/updateOne', async (arg) => {
  const response = await userAPI.updateUser(arg)
  // In this case, `response.data` would be:
  // { id: 1, first_name: 'Example', last_name: 'UpdatedLastName'}
  return response.data
})

export const usersAdapter = createEntityAdapter()

// By default, `createEntityAdapter` gives you `{ ids: [], entities: {} }`.
// If you want to track 'loading' or other keys, you would initialize them here:
// `getInitialState({ loading: false, activeRequestId: null })`
const initialState = usersAdapter.getInitialState()

export const slice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    removeUser: usersAdapter.removeOne,
  },
  extraReducers: (builder) => {
    builder.addCase(fetchUsers.fulfilled, usersAdapter.upsertMany)
    builder.addCase(updateUser.fulfilled, (state, { payload }) => {
      const { id, ...changes } = payload
      usersAdapter.updateOne(state, { id, changes })
    })
  },
})

const reducer = slice.reducer
export default reducer

export const { removeUser } = slice.actions
```

You can [view the full code of this example usage on CodeSandbox](https://codesandbox.io/s/rtk-entities-basic-example-1xubt)

### Using `createEntityAdapter` with Normalization Libraries

If you're already using `normalizr` or another normalization library, you could consider using it along with `createEntityAdapter`. To expand on the examples above, here is a demonstration of how we could use `normalizr` to format a payload, then leverage the utilities `createEntityAdapter` provides.

By default, the `setAll`, `addMany`, and `upsertMany` CRUD methods expect an array of entities. However, they also allow you to pass in an object that is in the shape of `{ 1: { id: 1, ... }}` as an alternative, which makes it easier to insert pre-normalized data.

```js
// features/articles/articlesSlice.js
import {
  createSlice,
  createEntityAdapter,
  createAsyncThunk,
  createSelector,
} from '@reduxjs/toolkit'
import fakeAPI from '../../services/fakeAPI'
import { normalize, schema } from 'normalizr'

// Define normalizr entity schemas
export const userEntity = new schema.Entity('users')
export const commentEntity = new schema.Entity('comments', {
  commenter: userEntity,
})
export const articleEntity = new schema.Entity('articles', {
  author: userEntity,
  comments: [commentEntity],
})

const articlesAdapter = createEntityAdapter()

export const fetchArticle = createAsyncThunk(
  'articles/fetchArticle',
  async (id) => {
    const data = await fakeAPI.articles.show(id)
    // Normalize the data so reducers can load a predictable payload, like:
    // `action.payload = { users: {}, articles: {}, comments: {} }`
    const normalized = normalize(data, articleEntity)
    return normalized.entities
  }
)

export const slice = createSlice({
  name: 'articles',
  initialState: articlesAdapter.getInitialState(),
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchArticle.fulfilled, (state, action) => {
      // Handle the fetch result by inserting the articles here
      articlesAdapter.upsertMany(state, action.payload.articles)
    })
  },
})

const reducer = slice.reducer
export default reducer

// features/users/usersSlice.js

import { createSlice, createEntityAdapter } from '@reduxjs/toolkit'
import { fetchArticle } from '../articles/articlesSlice'

const usersAdapter = createEntityAdapter()

export const slice = createSlice({
  name: 'users',
  initialState: usersAdapter.getInitialState(),
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchArticle.fulfilled, (state, action) => {
      // And handle the same fetch result by inserting the users here
      usersAdapter.upsertMany(state, action.payload.users)
    })
  },
})

const reducer = slice.reducer
export default reducer

// features/comments/commentsSlice.js

import { createSlice, createEntityAdapter } from '@reduxjs/toolkit'
import { fetchArticle } from '../articles/articlesSlice'

const commentsAdapter = createEntityAdapter()

export const slice = createSlice({
  name: 'comments',
  initialState: commentsAdapter.getInitialState(),
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchArticle.fulfilled, (state, action) => {
      // Same for the comments
      commentsAdapter.upsertMany(state, action.payload.comments)
    })
  },
})

const reducer = slice.reducer
export default reducer
```

You can [view the full code of this example `normalizr` usage on CodeSandbox](https://codesandbox.io/s/rtk-entities-basic-example-with-normalizr-bm3ie)

### Using selectors with `createEntityAdapter`

The entity adapter provides a selector factory that generates the most common selectors for you. Taking the examples above, we can add selectors to our `usersSlice` like this:

```js
// Rename the exports for readability in component usage
export const {
  selectById: selectUserById,
  selectIds: selectUserIds,
  selectEntities: selectUserEntities,
  selectAll: selectAllUsers,
  selectTotal: selectTotalUsers,
} = usersAdapter.getSelectors((state) => state.users)
```

You could then use these selectors in a component like this:

```js
import React from 'react'
import { useSelector } from 'react-redux'
import { selectTotalUsers, selectAllUsers } from './usersSlice'

import styles from './UsersList.module.css'

export function UsersList() {
  const count = useSelector(selectTotalUsers)
  const users = useSelector(selectAllUsers)

  return (
    <div>
      <div className={styles.row}>
        There are <span className={styles.value}>{count}</span> users.{' '}
        {count === 0 && `Why don't you fetch some more?`}
      </div>
      {users.map((user) => (
        <div key={user.id}>
          <div>{`${user.first_name} ${user.last_name}`}</div>
        </div>
      ))}
    </div>
  )
}
```

### Specifying Alternate ID Fields

By default, `createEntityAdapter` assumes that your data has unique IDs in an `entity.id` field. If your data set stores its ID in a different field, you can pass in a `selectId` argument that returns the appropriate field.

```js
// In this instance, our user data always has a primary key of `idx`
const userData = {
  users: [
    { idx: 1, first_name: 'Test' },
    { idx: 2, first_name: 'Two' },
  ],
}

// Since our primary key is `idx` and not `id`,
// pass in an ID selector to return that field instead
export const usersAdapter = createEntityAdapter({
  selectId: (user) => user.idx,
})
```

### Sorting Entities

`createEntityAdapter` provides a `sortComparer` argument that you can leverage to sort the collection of `ids` in state. This can be very useful for when you want to guarantee a sort order and your data doesn't come presorted.

```js
// In this instance, our user data always has a primary key of `id`, so we do not need to provide `selectId`.
const userData = {
  users: [
    { id: 1, first_name: 'Test' },
    { id: 2, first_name: 'Banana' },
  ],
}

// Sort by `first_name`. `state.ids` would be ordered as
// `ids: [ 2, 1 ]`, since 'B' comes before 'T'.
// When using the provided `selectAll` selector, the result would be sorted:
// [{ id: 2, first_name: 'Banana' }, { id: 1, first_name: 'Test' }]
export const usersAdapter = createEntityAdapter({
  sortComparer: (a, b) => a.first_name.localeCompare(b.first_name),
})
```

## Working with Non-Serializable Data

One of the core usage principles for Redux is that [you should not put non-serializable values in state or actions](https://redux.js.org/style-guide/style-guide#do-not-put-non-serializable-values-in-state-or-actions).

However, like most rules, there are exceptions. There may be occasions when you have to deal with actions that need to accept non-serializable data. This should be done very rarely and only if necessary, and these non-serializable payloads shouldn't ever make it into your application state through a reducer.

The [serializability dev check middleware](../api/serializabilityMiddleware.mdx) will automatically warn anytime it detects non-serializable values in your actions or state. We encourage you to leave this middleware active to help avoid accidentally making mistakes. However, if you _do_ need to turnoff those warnings, you can customize the middleware by configuring it to ignore specific action types, or fields in actions and state:

```js
configureStore({
  //...
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['your/action/type'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['meta.arg', 'payload.timestamp'],
        // Ignore these paths in the state
        ignoredPaths: ['items.dates'],
      },
    }),
})
```

### Use with Redux-Persist

If using Redux-Persist, you should specifically ignore all the action types it dispatches:

```jsx
import { configureStore } from '@reduxjs/toolkit'
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist'
import storage from 'redux-persist/lib/storage'
import { PersistGate } from 'redux-persist/integration/react'

import App from './App'
import rootReducer from './reducers'

const persistConfig = {
  key: 'root',
  version: 1,
  storage,
}

const persistedReducer = persistReducer(persistConfig, rootReducer)

const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
})

let persistor = persistStore(store)

ReactDOM.render(
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <App />
    </PersistGate>
  </Provider>,
  document.getElementById('root')
)
```

Additionally, you can purge any persisted state by adding an extra reducer to the specific slice that you would like to clear when calling persistor.purge(). This is especially helpful when you are looking to clear persisted state on a dispatched logout action.

```ts
import { PURGE } from "redux-persist";

...
extraReducers: (builder) => {
    builder.addCase(PURGE, (state) => {
        customEntityAdapter.removeAll(state);
    });
}
```

It is also strongly recommended to blacklist any api(s) that you have configured with RTK Query. If the api slice reducer is not blacklisted, the api cache will be automatically persisted and restored which could leave you with phantom subscriptions from components that do not exist any more. Configuring this should look something like this:

```ts
const persistConfig = {
  key: "root",
  version: 1,
  storage,
  blacklist: [pokemonApi.reducerPath],
};
```

See [Redux Toolkit #121: How to use this with Redux-Persist?](https://github.com/reduxjs/redux-toolkit/issues/121) and [Redux-Persist #988: non-serializable value error](https://github.com/rt2zz/redux-persist/issues/988#issuecomment-552242978) for further discussion.

### Use with React-Redux-Firebase

RRF includes timestamp values in most actions and state as of 3.x, but there are PRs that may improve that behavior as of 4.x.

A possible configuration to work with that behavior could look like:

```ts
import { configureStore } from '@reduxjs/toolkit'
import {
  getFirebase,
  actionTypes as rrfActionTypes,
} from 'react-redux-firebase'
import { constants as rfConstants } from 'redux-firestore'
import rootReducer from './rootReducer'

const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          // just ignore every redux-firebase and react-redux-firebase action type
          ...Object.keys(rfConstants.actionTypes).map(
            (type) => `${rfConstants.actionsPrefix}/${type}`
          ),
          ...Object.keys(rrfActionTypes).map(
            (type) => `@@reactReduxFirebase/${type}`
          ),
        ],
        ignoredPaths: ['firebase', 'firestore'],
      },
      thunk: {
        extraArgument: {
          getFirebase,
        },
      },
    }),
})

export default store
```
