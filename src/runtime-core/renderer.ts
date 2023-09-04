import { log } from "console";
import { effect } from "../reactivity/src/effect";
import { ShapeFlages } from "../shared/ShapeFlags";
import { isObject } from "../shared/index";
import { createComponentInstance, setupComponent } from "./component";
import { createAppAPI } from "./createApp";
import { Fragment, Text } from "./vnode";

export function createRenderer(options) {
  const {
    createElement: hostCreateElement,
    patchProp: hostPatchProp,
    insert: hostInsert,
  } = options;

  function render(vnode, rootContainer) {
    patch(null, vnode, rootContainer, null);
  }

  /**
   *
   * @param n1 更新前的 vnode
   * @param n2 本次更新的 vnode
   * @param rootContainer 父容器
   * @param parentComponent 父组件
   */
  function patch(n1, n2, rootContainer, parentComponent) {
    if (!isObject(n2)) {
      console.error(`vnode must be an object`);
    }

    const { type, shapeFlag } = n2;

    /**
     * 设置一个 Fragment type，专门用于处理 children
     */
    switch (type) {
      case Fragment:
        processFragment(n1, n2, rootContainer, parentComponent);
        break;
      case Text:
        processText(n1, n2, rootContainer);
        break;
      default:
        if (ShapeFlages.STATEFUL_COMPONENT & shapeFlag) {
          processComponent(n1, n2, rootContainer, parentComponent);
        } else if (ShapeFlages.ELEMENT & shapeFlag) {
          processElement(n1, n2, rootContainer, parentComponent);
        }
        break;
    }
  }

  function processText(n1, n2, rootContainer) {
    const { children } = n2;
    const textNode = (n2.el = document.createTextNode(children));
    rootContainer.append(textNode);
  }

  function processFragment(n1, n2, rootContainer, parentComponent) {
    mountChildren(n2.children, rootContainer, parentComponent);
  }

  function processComponent(n1, n2, rootContainer, parentComponent) {
    // updateComponent
    mountComponent(n2, rootContainer, parentComponent);
  }

  function mountComponent(vnode, rootContainer, parentComponent) {
    // 通过 vnode 创建的实例对象，用于处理 props、slots、setup
    const instance = createComponentInstance(vnode, parentComponent);

    // 去装载 props、slots、setup、render，这一过程可以认为是一种装箱
    setupComponent(instance);

    // 去挂载 render ，这一过程可以认为是一种开箱
    setupRenderEffect(instance, vnode, rootContainer);
  }

  function setupRenderEffect(instance, initialVnode, container) {
    /**
     * 使用 effect 将渲染函数作为依赖收集起来
     */
    effect(() => {
      if (!instance.isMounted) {
        console.log("初始化组件");

        const subTree = (instance.subTree = instance.render.call(
          instance.proxy
        ));
        patch(null, subTree, container, instance);

        // 在整个 element 渲染完毕后，再将 elementVnode 上的 el 赋值给当前组件的 el
        initialVnode.el = subTree.el;

        instance.isMounted = true;
      } else {
        console.log("更新组件");

        // 拿到本次更新的 render
        const subTree = instance.render.call(instance.proxy);
        // 拿到更新前的 render
        const prevSubTree = instance.subTree;
        // 将本次更新的 render 赋值给 instance 作为下次更新前的 render
        instance.subTree = subTree;

        patch(prevSubTree, subTree, container, instance);

        console.log("current", subTree);
        console.log("prevSubTree", prevSubTree);
      }
    });
  }

  function processElement(n1, n2, rootContainer, parentComponent) {
    if (!n1) {
      mountElement(n2, rootContainer, parentComponent);
    } else {
      patchElement(n1, n2, rootContainer);
    }
  }

  function patchElement(n1, n2, rootContainer) {
    console.log("patchElement");
  }

  function mountElement(vnode, rootContainer, parentComponent) {
    const { type, children, props, shapeFlag } = vnode;

    // 这里赋值给 vnode.el 是为了可以在 render 函数中调用 this.$el
    // 但需要注意这里的 vnode 指的是 element
    const el: Element = (vnode.el = hostCreateElement(type));

    // 处理 children
    if (ShapeFlages.TEXT_CHILDREN & shapeFlag) {
      el.textContent = children;
    } else if (ShapeFlages.ARRAY_CHILDREN & shapeFlag) {
      mountChildren(children, el, parentComponent);
    }

    // attribute
    for (const key in props) {
      const value = props[key];
      hostPatchProp(el, key, value);
    }

    // rootContainer.append(el);
    hostInsert(el, rootContainer);
  }

  function mountChildren(children, container, parentComponent) {
    children.forEach((vnode) => {
      patch(null, vnode, container, parentComponent);
    });
  }

  return {
    createApp: createAppAPI(render),
  };
}
