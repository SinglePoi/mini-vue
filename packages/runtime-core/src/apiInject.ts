import { getCurrentInstance } from "./component";

export function provide(key, value) {
  // 获取当前实例
  const currentInstance: any = getCurrentInstance();

  if (currentInstance) {
    // 存储到 provides 中
    let { provides } = currentInstance;
    const parentProvides = currentInstance.parent.provides;

    /**
     * 如果父节点存在 provides，子组件的 provides 默认是父节点的 provides
     * 此时存在 provides === parentProvides
     */
    if (provides === parentProvides) {
      provides = currentInstance.provides = Object.create(parentProvides);
    }

    provides[key] = value;
  }
}

export function inject(key, defaultValue) {
  // 获取当前实例，此时是子组件
  const currentInstance: any = getCurrentInstance();

  if (currentInstance) {
    // 从 parent 中获取父组件的信息
    const parentProvides = currentInstance.parent.provides;

    if (key in parentProvides) {
      return parentProvides[key];
    } else {
      if (typeof defaultValue === "function") {
        return defaultValue();
      }
      return defaultValue;
    }
  }
}
