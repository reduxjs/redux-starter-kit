import {
  CurriedType as RRCurriedType,
  CurryableTypes as RRCurryableType
} from './react-redux'
import {
  CurriedType as RTKCurriedType,
  CurryableTypes as RTKCurryableType
} from './RTK'

import { UnionToIntersection } from '../tsHelpers'

export declare const storeDescriptionKey: unique symbol
/**
 * @beta
 */
export function curryForStoreType<
  Store extends { [storeDescriptionKey]: StoreDescription }
>(): CurryType<Store[typeof storeDescriptionKey]> {
  return (curry: any) => curry
}

export interface StoreDescription {
  Dispatch: any
  RootState: any
  ThunkExtraArgument: any
}

type CurrySingleType<Args extends StoreDescription> = UnionToIntersection<
  {
    [K in keyof CurryableTypes]: (
      curry: CurryableTypes[K]
    ) => CurriedType<Args>[K]
  }[keyof CurryableTypes]
>

type CurryMultipleTypes<Args extends StoreDescription> = {
  <Obj extends Partial<CurryableTypes>>(obj: Obj): Pick<
    CurriedType<Args>,
    keyof Obj & keyof CurriedType<any>
  >
}

export type CurryType<Args extends StoreDescription> = CurrySingleType<Args> &
  CurryMultipleTypes<Args>

export interface CurryableTypes extends RRCurryableType, RTKCurryableType {}

export interface CurriedType<Args extends StoreDescription>
  extends RRCurriedType<Args['RootState'], Args['Dispatch']>,
    RTKCurriedType<Args> {}
