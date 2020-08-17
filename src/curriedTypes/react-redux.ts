export interface CurryableTypes {
  useDispatch: typeof import('react-redux').useDispatch
  useSelector: typeof import('react-redux').useSelector
  connect: typeof import('react-redux').connect
  connectAdvanced: typeof import('react-redux').connectAdvanced
}

export interface CurriedType<RootState, Dispatch> {
  useDispatch: UseDispatch<Dispatch>
  useSelector: UseSelector<RootState>
  connect: Connect<RootState, Dispatch>
  connectAdvanced: ConnectAdvanced<RootState>
}

/* eslint-disable import/first */
import {
  InferableComponentEnhancer,
  MapStateToPropsParam,
  InferableComponentEnhancerWithProps,
  MapDispatchToPropsNonObject,
  MapDispatchToPropsParam,
  ResolveThunks,
  MergeProps,
  Options,
  SelectorFactory,
  ConnectOptions,
  AdvancedComponentDecorator
} from 'react-redux'

type UseDispatch<Dispatch> = {
  (): Dispatch
}

type UseSelector<RootState> = {
  <TSelected = unknown>(
    selector: (state: RootState) => TSelected,
    equalityFn?: (left: TSelected, right: TSelected) => boolean
  ): TSelected
}

interface TypedDispatchProp<Dispatch> {
  dispatch: Dispatch
}

// copied straight from the RR types, uncommented `State` generic
interface Connect<State, Dispatch> {
  (): InferableComponentEnhancer<TypedDispatchProp<Dispatch>>

  <
    TStateProps = {},
    no_dispatch = {},
    TOwnProps = {}
    // State = DefaultRootState
  >(
    mapStateToProps: MapStateToPropsParam<TStateProps, TOwnProps, State>
  ): InferableComponentEnhancerWithProps<
    TStateProps & TypedDispatchProp<Dispatch>,
    TOwnProps
  >

  <no_state = {}, TDispatchProps = {}, TOwnProps = {}>(
    mapStateToProps: null | undefined,
    mapDispatchToProps: MapDispatchToPropsNonObject<TDispatchProps, TOwnProps>
  ): InferableComponentEnhancerWithProps<TDispatchProps, TOwnProps>

  <no_state = {}, TDispatchProps = {}, TOwnProps = {}>(
    mapStateToProps: null | undefined,
    mapDispatchToProps: MapDispatchToPropsParam<TDispatchProps, TOwnProps>
  ): InferableComponentEnhancerWithProps<
    ResolveThunks<TDispatchProps>,
    TOwnProps
  >

  <
    TStateProps = {},
    TDispatchProps = {},
    TOwnProps = {}
    //State = DefaultRootState
  >(
    mapStateToProps: MapStateToPropsParam<TStateProps, TOwnProps, State>,
    mapDispatchToProps: MapDispatchToPropsNonObject<TDispatchProps, TOwnProps>
  ): InferableComponentEnhancerWithProps<
    TStateProps & TDispatchProps,
    TOwnProps
  >

  <
    TStateProps = {},
    TDispatchProps = {},
    TOwnProps = {}
    //State = DefaultRootState
  >(
    mapStateToProps: MapStateToPropsParam<TStateProps, TOwnProps, State>,
    mapDispatchToProps: MapDispatchToPropsParam<TDispatchProps, TOwnProps>
  ): InferableComponentEnhancerWithProps<
    TStateProps & ResolveThunks<TDispatchProps>,
    TOwnProps
  >

  <no_state = {}, no_dispatch = {}, TOwnProps = {}, TMergedProps = {}>(
    mapStateToProps: null | undefined,
    mapDispatchToProps: null | undefined,
    mergeProps: MergeProps<undefined, undefined, TOwnProps, TMergedProps>
  ): InferableComponentEnhancerWithProps<TMergedProps, TOwnProps>

  <
    TStateProps = {},
    no_dispatch = {},
    TOwnProps = {},
    TMergedProps = {}
    //State = DefaultRootState
  >(
    mapStateToProps: MapStateToPropsParam<TStateProps, TOwnProps, State>,
    mapDispatchToProps: null | undefined,
    mergeProps: MergeProps<TStateProps, undefined, TOwnProps, TMergedProps>
  ): InferableComponentEnhancerWithProps<TMergedProps, TOwnProps>

  <no_state = {}, TDispatchProps = {}, TOwnProps = {}, TMergedProps = {}>(
    mapStateToProps: null | undefined,
    mapDispatchToProps: MapDispatchToPropsParam<TDispatchProps, TOwnProps>,
    mergeProps: MergeProps<undefined, TDispatchProps, TOwnProps, TMergedProps>
  ): InferableComponentEnhancerWithProps<TMergedProps, TOwnProps>

  <
    TStateProps = {},
    no_dispatch = {},
    TOwnProps = {}
    //State = DefaultRootState
  >(
    mapStateToProps: MapStateToPropsParam<TStateProps, TOwnProps, State>,
    mapDispatchToProps: null | undefined,
    mergeProps: null | undefined,
    options: Options<State, TStateProps, TOwnProps>
  ): InferableComponentEnhancerWithProps<
    TypedDispatchProp<Dispatch> & TStateProps,
    TOwnProps
  >

  <TStateProps = {}, TDispatchProps = {}, TOwnProps = {}>(
    mapStateToProps: null | undefined,
    mapDispatchToProps: MapDispatchToPropsNonObject<TDispatchProps, TOwnProps>,
    mergeProps: null | undefined,
    options: Options<{}, TStateProps, TOwnProps>
  ): InferableComponentEnhancerWithProps<TDispatchProps, TOwnProps>

  <TStateProps = {}, TDispatchProps = {}, TOwnProps = {}>(
    mapStateToProps: null | undefined,
    mapDispatchToProps: MapDispatchToPropsParam<TDispatchProps, TOwnProps>,
    mergeProps: null | undefined,
    options: Options<{}, TStateProps, TOwnProps>
  ): InferableComponentEnhancerWithProps<
    ResolveThunks<TDispatchProps>,
    TOwnProps
  >

  <
    TStateProps = {},
    TDispatchProps = {},
    TOwnProps = {}
    //State = DefaultRootState
  >(
    mapStateToProps: MapStateToPropsParam<TStateProps, TOwnProps, State>,
    mapDispatchToProps: MapDispatchToPropsNonObject<TDispatchProps, TOwnProps>,
    mergeProps: null | undefined,
    options: Options<State, TStateProps, TOwnProps>
  ): InferableComponentEnhancerWithProps<
    TStateProps & TDispatchProps,
    TOwnProps
  >

  <
    TStateProps = {},
    TDispatchProps = {},
    TOwnProps = {}
    //State = DefaultRootState
  >(
    mapStateToProps: MapStateToPropsParam<TStateProps, TOwnProps, State>,
    mapDispatchToProps: MapDispatchToPropsParam<TDispatchProps, TOwnProps>,
    mergeProps: null | undefined,
    options: Options<State, TStateProps, TOwnProps>
  ): InferableComponentEnhancerWithProps<
    TStateProps & ResolveThunks<TDispatchProps>,
    TOwnProps
  >

  <
    TStateProps = {},
    TDispatchProps = {},
    TOwnProps = {},
    TMergedProps = {}
    //State = DefaultRootState
  >(
    mapStateToProps: MapStateToPropsParam<TStateProps, TOwnProps, State>,
    mapDispatchToProps: MapDispatchToPropsParam<TDispatchProps, TOwnProps>,
    mergeProps: MergeProps<
      TStateProps,
      TDispatchProps,
      TOwnProps,
      TMergedProps
    >,
    options?: Options<State, TStateProps, TOwnProps, TMergedProps>
  ): InferableComponentEnhancerWithProps<TMergedProps, TOwnProps>
}

type ConnectAdvanced<State> = {
  <TProps, TOwnProps, TFactoryOptions = {}>(
    selectorFactory: SelectorFactory<State, TProps, TOwnProps, TFactoryOptions>,
    connectOptions?: ConnectOptions & TFactoryOptions
  ): AdvancedComponentDecorator<TProps, TOwnProps>
}
