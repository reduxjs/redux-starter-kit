import * as React from 'react'
import { Provider } from 'react-redux'
import { renderToString } from 'react-dom/server'

import type { ReactNode } from 'react'
import type { Middleware, Store } from 'redux'

import { createApi, fakeBaseQuery, getDataFromTree } from '../react'

import { configureStore } from '@internal/configureStore'

describe('getDataFromTree walks the tree and collects the data in the store', () => {
  const testApi = createApi({
    baseQuery: fakeBaseQuery(),
    endpoints: (build) => ({
      withQueryFn: build.query({
        queryFn(arg: string) {
          return { data: `resultFrom(${arg})` }
        },
      }),
    }),
    ssr: true,
  })

  const storeFn = (middleware: Middleware) =>
    configureStore({
      reducer: { [testApi.reducerPath]: testApi.reducer },
      middleware: (gDM) => gDM({}).concat([testApi.middleware, middleware]),
    })

  const QueryComponent = ({
    queryString,
    children,
  }: {
    queryString: string
    children?: ReactNode
  }) => {
    const { data } = testApi.useWithQueryFnQuery(queryString)

    if (!data) {
      return null
    }

    return (
      <div>
        {JSON.stringify(data)}
        <div>{children}</div>
      </div>
    )
  }

  const TestApp = ({ store }: { store: Store }) => {
    return (
      <Provider store={store}>
        <QueryComponent queryString="top">
          <QueryComponent queryString="nested" />
        </QueryComponent>
      </Provider>
    )
  }
  it('resolves all the data', async () => {
    const store = await getDataFromTree(storeFn, TestApp)

    const html = renderToString(<TestApp store={store} />)

    expect(html).toMatchInlineSnapshot(
      `"<div>&quot;resultFrom(top)&quot;<div><div>&quot;resultFrom(nested)&quot;<div></div></div></div></div>"`
    )
    expect(store.getState()).toStrictEqual({
      api: {
        config: {
          focused: true,
          keepUnusedDataFor: 60,
          middlewareRegistered: true,
          online: true,
          reducerPath: 'api',
          refetchOnFocus: false,
          refetchOnMountOrArgChange: false,
          refetchOnReconnect: false,
        },
        mutations: {},
        provided: {},
        queries: {
          'withQueryFn("nested")': {
            data: 'resultFrom(nested)',
            endpointName: 'withQueryFn',
            fulfilledTimeStamp: expect.any(Number),
            originalArgs: 'nested',
            requestId: expect.any(String),
            startedTimeStamp: expect.any(Number),
            status: 'fulfilled',
          },
          'withQueryFn("top")': {
            data: 'resultFrom(top)',
            endpointName: 'withQueryFn',
            fulfilledTimeStamp: expect.any(Number),
            originalArgs: 'top',
            requestId: expect.any(String),
            startedTimeStamp: expect.any(Number),
            status: 'fulfilled',
          },
        },
        subscriptions: expect.any(Object),
      },
    })
  })
})
