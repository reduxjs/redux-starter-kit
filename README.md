# redux-starter-kit

**A simple set of tools to make using Redux easier**

[NPM:  @acemarke/redux-starter-kit](https://www.npmjs.com/package/@acemarke/redux-starter-kit)

### Purpose

The `redux-starter-kit` package is intended to help address three common complaints about Redux:

- "Configuring a Redux store is too complicated"
- "I have to add a lot of packages to get Redux to do anything useful"
- "Redux requires too much boilerplate code"

We can't solve every use case, but in the spirit of [`create-react-app`](https://github.com/facebook/create-react-app) and [`apollo-boost`](https://dev-blog.apollodata.com/zero-config-graphql-state-management-27b1f1b3c2c3), we can try to provide some tools that abstract over the setup process and handle the most common use cases, as well as include some useful utilities that will let the user simplify their application code.

This package is _not_ intended to solve every possible complaint about Redux, and is deliberately limited in scope.  It does _not_ address concepts like "reusable encapsulated Redux modules", data fetching, folder or file structures, managing entity relationships in the store, and so on.


### What's Included

`redux-starter-kit` includes:

- A `configureStore()` function with simplified configuration options.  It can automatically combine your slice reducers, adds whatever Redux middleware you supply, includes `redux-thunk` by default, and enables use of the Redux DevTools Extension.
- A `createReducer()` utility that lets you supply a lookup table of action types to case reducer functions, rather than writing switch statements.  In addition, it automatically uses the [`immer` library](https://github.com/mweststrate/immer) to let you write simpler immutable updates with normal mutative code, like `state.todos[3].completed = true`.
- An improved version of the widely used `createSelector` utility for creating memoized selector functions, which can accept string keypaths as "input selectors" (re-exported from the [`selectorator` library](https://github.com/planttheidea/selectorator)).


### API Reference


#### `configureStore`

A friendlier abstraction over the standard Redux `createStore` function.  Takes a single configuration object parameter, with the following options:

```js
function configureStore({
    // A single reducer function that will be used as the root reducer,
    // or an object of slice reducers that will be passed to combineReducers()
    reducer: Object<string, Function> | Function,
    // An array of Redux middlewares.  If not supplied, defaults to just redux-thunk.
    middleware: Array<MiddlewareFunction>,
    // Built-in support for devtools. Defaults to true.
    devTools: boolean,
    // Same as current createStore.
    preloadedState : State,
    // Same as current createStore.
    enhancer : ReduxStoreEnhancer,
})
```


Basic usage:

```js
import {configureStore} from "@acemarke/redux-starter-kit";

import rootReducer from "./reducers";

const store = configureStore(rootReducer);
// The store now has redux-thunk added and the Redux DevTools Extension is turned on
```

Full example:

```js
import {configureStore, createDefaultMiddleware} from "@acemarke/redux-starter-kit";

// We'll use redux-logger just as an example of adding another middleware
import logger from "redux-logger";

// And use redux-batch as an example of adding enhancers
import { reduxBatch }  from '@manaflair/redux-batch';

import todosReducer from "./todos/todosReducer";
import visibilityReducer from "./visibility/visibilityReducer";

const reducer = {
    todos : todosReducer,
    visibility : visibilityReducer
};

const middleware = createDefaultMiddleware(logger);

const preloadedState = {
    todos: [{
        text: 'Eat food',
        completed: true
    }, {
        text: 'Exercise',
        completed: false
    }],
    visibilityFilter : 'SHOW_COMPLETED'
};


const store = configureStore({
    reducer,
    middleware,
    devTools : NODE_ENV !== 'production',
    preloadedState,
    enhancers : [reduxBatch],
});

// The store has been created with these options:
// - The slice reducers were automatically passed to combineReducers()
// - redux-thunk and redux-logger were added as middleware
// - The Redux DevTools Extension is disabled for production
// - The middleware, batch, and devtools enhancers were automatically composed together
```


#### `createReducer`

A utility function to create reducers that handle specific action types, similar to the example function in the ["Reducing Boilerplate" Redux docs page](https://redux.js.org/recipes/reducing-boilerplate#generating-reducers).  Takes an initial state value and an object that maps action types to case reducer functions.  Internally, it uses the [`immer` library](), so you can write code in your case reducers that mutates the existing `state` value, and it will correctly generate immutably-updated state values instead.

```js
function createReducer(initialState : State, actionsMap : Object<String, Function>) {}
```

Example usage:
```js
import {createReducer} from "@acemarke/redux-starter-kit";

function addTodo(state, newTodo) {
    // Can safely call state.push() here
    state.push({...newTodo, completed : false});
}

function toggleTodo(state, payload) {
    const {index} = payload;

    const todo = state[index];
    // Can directly modify the todo object
    todo.completed = !todo.completed;
}

const todosReducer = createReducer([], {
    ADD_TODO : addTodo,
    TOGGLE_TODO : toggleTodo
});
```

`createReducer` supports [Flux Standand Actions (FSA)](https://github.com/redux-utilities/flux-standard-action):

```js
const notifications = (state, payload, { error, meta }) => {
  // As stated by FSA docs, by convention, if error is true, the payload SHOULD be an error object
  if (payload instanceof Error) {
    state.push({ intent: "danger", message: payload.message });
  }
  
  // If you don't want to follow this convention, you can use the error and meta properties
  if (error) {
    state.push({ intent: meta.intent, message: payload });
  }
};
```

If you don't use FSA in your project, that's not an issue:

```js
const addInvoice = (date, dueDate, amount) => ({
  type: ADD_INVOICE,
  date,
  dueDate,
  amount
});

const addInvoiceCaseReducer = (state, { date, dueDate, amount }) =>
  state.push({ date, dueDate, amount });
```

#### `createSelector`

The `createSelector` utility from the [`selectorator` library](https://github.com/planttheidea/selectorator), re-exported for ease of use.  It acts as a superset of the standard `createSelector` function from [Reselect](https://github.com/reactjs/reselect).  The primary improvements are the ability to define "input selectors" using string keypaths, or return an object result based on an object of keypaths.  It also accepts an object of customization options for more specific use cases.

For more specifics, see the [`selectorator` usage documentation](https://github.com/planttheidea/selectorator#usage).

```js
function createSelector(
    // Can either be:
    //    - An array containing selector functions and string keypaths
    //    - An object whose keys are selector functions and string keypaths
    paths : Array<Function | string> | Object<string, string | Function>
)
```

Example usage:

```js
// Define input selector using a string keypath
const getSubtotal = createSelector(['shop.items'], (items) => {
  // return value here
});

// Define input selectors as a mix of other selectors and string keypaths
const getTax = createSelector([getSubtotal, 'shop.taxPercent'], (subtotal, taxPercent) => {
  // return value here
});

const getContents = createSelector({foo : "foo", bar : "nested.bar" });
// Returns an object like:  {foo, bar}

```


#### `createNextState`

The default immutable update function from the [`immer` library](https://github.com/mweststrate/immer#api), re-exported here as `createNextState` (also commonly referred to as `produce`)
