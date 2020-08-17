import { ThunkDispatch } from 'redux-thunk'
import { AnyAction } from 'redux'

export type ThunkActionCreator<
  Args extends any[],
  R,
  State,
  Extra,
  Dispatch
> = (
  ...args: Args
) => (dispatch: Dispatch, getState: () => State, extra: Extra) => R

/**
 * @beta
 */
export const createThunk = <
  Args extends any[],
  R,
  State = unknown,
  Extra = unknown,
  Dispatch = ThunkDispatch<State, Extra, AnyAction>
>(
  thunkActionCreator: ThunkActionCreator<Args, R, State, Extra, Dispatch>
) => thunkActionCreator
