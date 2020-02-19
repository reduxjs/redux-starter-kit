import { PayloadAction } from '../createAction'

/**
 * @alpha
 */
export type EntityId = number | string

/**
 * @alpha
 */
export type Comparer<T> = (a: T, b: T) => number

/**
 * @alpha
 */
export type IdSelector<T> = (model: T) => EntityId

/**
 * @alpha
 */
export interface DictionaryNum<T> {
  [id: number]: T | undefined
}

/**
 * @alpha
 */
export abstract class Dictionary<T> implements DictionaryNum<T> {
  [id: string]: T | undefined
}

/**
 * @alpha
 */
export type Update<T> = { id: EntityId; changes: Partial<T> }

/**
 * @alpha
 */
export type EntityMap<T> = (entity: T) => T

/**
 * @alpha
 */
export type TypeOrPayloadAction<T> = T | PayloadAction<T>

/**
 * @alpha
 */
export interface EntityState<T> {
  ids: EntityId[]
  entities: Dictionary<T>
}

export interface EntityDefinition<T> {
  selectId: IdSelector<T>
  sortComparer: false | Comparer<T>
}

export interface EntityStateAdapter<T> {
  addOne<S extends EntityState<T>>(state: S, entity: TypeOrPayloadAction<T>): S
  addOne<S extends EntityState<T>>(state: S, action: PayloadAction<T>): S

  addMany<S extends EntityState<T>>(
    state: S,
    entities: TypeOrPayloadAction<T[]>
  ): S
  addMany<S extends EntityState<T>>(state: S, entities: PayloadAction<T[]>): S

  setAll<S extends EntityState<T>>(
    state: S,
    entities: TypeOrPayloadAction<T[]>
  ): S
  setAll<S extends EntityState<T>>(state: S, entities: PayloadAction<T[]>): S

  removeOne<S extends EntityState<T>>(
    state: S,
    key: TypeOrPayloadAction<EntityId>
  ): S
  removeOne<S extends EntityState<T>>(state: S, key: PayloadAction<EntityId>): S

  removeMany<S extends EntityState<T>>(
    state: S,
    keys: TypeOrPayloadAction<EntityId[]>
  ): S

  removeAll<S extends EntityState<T>>(state: S): S

  updateOne<S extends EntityState<T>>(
    state: S,
    update: TypeOrPayloadAction<Update<T>>
  ): S
  updateOne<S extends EntityState<T>>(
    state: S,
    update: PayloadAction<Update<T>>
  ): S

  updateMany<S extends EntityState<T>>(
    state: S,
    updates: TypeOrPayloadAction<Update<T>[]>
  ): S
  updateMany<S extends EntityState<T>>(
    state: S,
    updates: PayloadAction<Update<T>[]>
  ): S

  upsertOne<S extends EntityState<T>>(
    state: S,
    entity: TypeOrPayloadAction<T>
  ): S
  upsertOne<S extends EntityState<T>>(state: S, entity: PayloadAction<T>): S

  upsertMany<S extends EntityState<T>>(
    state: S,
    entities: TypeOrPayloadAction<T[]>
  ): S
  upsertMany<S extends EntityState<T>>(
    state: S,
    entities: PayloadAction<T[]>
  ): S

  map<S extends EntityState<T>>(
    state: S,
    map: TypeOrPayloadAction<EntityMap<T>>
  ): S
  map<S extends EntityState<T>>(state: S, map: PayloadAction<EntityMap<T>>): S
}

export interface EntitySelectors<T, V> {
  selectIds: (state: V) => EntityId[]
  selectEntities: (state: V) => Dictionary<T>
  selectAll: (state: V) => T[]
  selectTotal: (state: V) => number
}

/**
 * @alpha
 */
export interface EntityAdapter<T> extends EntityStateAdapter<T> {
  selectId: IdSelector<T>
  sortComparer: false | Comparer<T>
  getInitialState(): EntityState<T>
  getInitialState<S extends object>(state: S): EntityState<T> & S
  getSelectors(): EntitySelectors<T, EntityState<T>>
  getSelectors<V>(
    selectState: (state: V) => EntityState<T>
  ): EntitySelectors<T, V>
}
