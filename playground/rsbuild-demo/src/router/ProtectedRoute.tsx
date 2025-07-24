import { Suspense, LazyExoticComponent, ComponentType } from 'react';

export default function withProtected(
  Component: LazyExoticComponent<ComponentType<any>>
) {
  return function ProtectedComponent(props: any) {
    return (
      <Suspense fallback={props.loadingComponent}>
        <Component {...props} />
      </Suspense>
    );
  };
}
