import { reactiveHandlers, readonlyHandlers } from "./baseHandlers";

export function reactive(target) {
  return createReactiveObject(target, reactiveHandlers);
}

export function readonly(target: any) {
  return createReactiveObject(target, readonlyHandlers);
}

function createReactiveObject(target, baseHandlers) {
  return new Proxy(target, baseHandlers);
}
