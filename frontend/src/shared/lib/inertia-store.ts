import { RouterStore } from './inertia-types';

let routerStore: RouterStore | null = null;

export function setRouterStore(store: RouterStore | null) {
  routerStore = store;
}

export function getRouterStore() {
  return routerStore;
}
