import { camelize, capitalize } from "../shared/index";

export function emit(instance, event: string, ...args) {
  const { props } = instance;

  const toHandlerKey = (str: string) => {
    return str ? "on" + capitalize(str) : "";
  };

  const handlerName = toHandlerKey(camelize(event));

  console.log(handlerName);

  const handler = props[handlerName];
  handler & handler(...args);
}
