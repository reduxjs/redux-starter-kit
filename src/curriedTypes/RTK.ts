export interface CurryableTypes {
  createAsyncThunk: typeof createAsyncThunk
  createThunk: typeof createThunk
}

export interface CurriedType<Args extends StoreDescription> {
  createAsyncThunk: CurriedCreateAsyncThunk<
    Args['RootState'],
    Args['Dispatch'],
    Args['ThunkExtraArgument']
  >
  createThunk: CurriedCreateThunk<
    Args['RootState'],
    Args['Dispatch'],
    Args['ThunkExtraArgument']
  >
}

/* eslint-disable import/first */
import { StoreDescription } from './'
import {
  createAsyncThunk,
  AsyncThunk,
  AsyncThunkPayloadCreator,
  AsyncThunkConfig,
  AsyncThunkOptions
} from '../createAsyncThunk'
import { createThunk, ThunkActionCreator } from '../createThunk'

type CurriedCreateAsyncThunk<RootState, Dispatch, Extra> = <
  Returned,
  ThunkArg = void,
  ThunkApiConfig extends Omit<
    AsyncThunkConfig,
    'dispatch' | 'state' | 'extra'
  > = {}
>(
  typePrefix: string,
  payloadCreator: AsyncThunkPayloadCreator<
    Returned,
    ThunkArg,
    ThunkApiConfig & {
      dispatch: Dispatch
      state: RootState
      extra: Extra
    }
  >,
  options?: AsyncThunkOptions<ThunkArg, ThunkApiConfig>
) => AsyncThunk<Returned, ThunkArg, ThunkApiConfig>

type CurriedCreateThunk<RootState, Dispatch, Extra> = <Args extends any[], R>(
  thunkActionCreator: ThunkActionCreator<Args, R, RootState, Extra, Dispatch>
) => ThunkActionCreator<Args, R, RootState, Extra, Dispatch>
