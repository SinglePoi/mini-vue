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
    patch(vnode, rootContainer, null);
  }

  function patch(vnode, rootContainer, parentComponent) {
    if (!isObject(vnode)) {
      console.error(`vnode must be an object`);
    }

    const { type, shapeFlag } = vnode;

    /**
     * 设置一个 Fragment type，专门用于处理 children
     */
    switch (type) {
      case Fragment:
        processFragment(vnode, rootContainer, parentComponent);
        break;
      case Text:
        processText(vnode, rootContainer);
        break;
      default:
        if (ShapeFlages.STATEFUL_COMPONENT & shapeFlag) {
          processComponent(vnode, rootContainer, parentComponent);
        } else if (ShapeFlages.ELEMENT & shapeFlag) {
          processElement(vnode, rootContainer, parentComponent);
        }
        break;
    }
  }

  function processText(vnode, rootContainer) {
    const { children } = vnode;
    const textNode = (vnode.el = document.createTextNode(children));
    rootContainer.append(textNode);
  }

  function processFragment(vnode, rootContainer, parentComponent) {
    mountChildren(vnode.children, rootContainer, parentComponent);
  }

  function processComponent(initialVnode, rootContainer, parentComponent) {
    // updateComponent
    mountComponent(initialVnode, rootContainer, parentComponent);
  }

  function mountComponent(initialVnode, rootContainer, parentComponent) {
    // 通过 vnode 创建的实例对象，用于处理 props、slots、setup
    const instance = createComponentInstance(initialVnode, parentComponent);

    // 去装载 props、slots、setup、render，这一过程可以认为是一种装箱
    setupComponent(instance);

    // 去挂载 render ，这一过程可以认为是一种开箱
    setupRenderEffect(instance, initialVnode, rootContainer);
  }

  function setupRenderEffect(instance, initialVnode, container) {
    const subTree = instance.render.call(instance.proxy);
    patch(subTree, container, instance);

    // 在整个 element 渲染完毕后，再将 elementVnode 上的 el 赋值给当前组件的 el
    initialVnode.el = subTree.el;
  }

  function processElement(vnode, rootContainer, parentComponent) {
    mountElement(vnode, rootContainer, parentComponent);
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
      // if (isOn(key)) {
      //   const event = key.slice(2).toLowerCase();
      //   el.addEventListener(event, value);
      // } else {
      //   el.setAttribute(key, value);
      // }
      hostPatchProp(el, key, value);
    }

    // rootContainer.append(el);
    hostInsert(el, rootContainer);
  }

  function mountChildren(children, container, parentComponent) {
    children.forEach((vnode) => {
      patch(vnode, container, parentComponent);
    });
  }

  return {
    createApp: createAppAPI(render),
  };
}
