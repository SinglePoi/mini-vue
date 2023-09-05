import { effect } from "../reactivity/src/effect";
import { ShapeFlages } from "../shared/ShapeFlags";
import { EMPTY_OBJ, isObject } from "../shared/index";
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
    // props
    const oldProps = n1.props || EMPTY_OBJ;
    const newProps = n2.props || EMPTY_OBJ;

    /**
     * vnode 的 el 属性是在 mountElement 方法中创建的
     * 而在更新流程中，也就是 n2 上是不会存在 el 属性的
     * 此时就需要将 n1 的 el 赋值给 n2 了
     */
    const el = (n2.el = n1.el);

    patchProps(el, oldProps, newProps);
  }

  function patchProps(el, oldProps, newProps) {
    // 在这里以新 props 为主，去查询新 props 对比旧 props 发生的变化
    if (oldProps !== newProps) {
      for (const key in newProps) {
        const prevProp = oldProps[key];
        const nextProp = newProps[key];
        // 场景一：新对比旧存在不同，应该去更新 prop
        // 场景二：新旧之间对应属性的值变成了 null 或 undefined；应该去删除这部分 prop；在 hostPatchProp 函数内部处理
        if (prevProp !== nextProp) {
          hostPatchProp(el, key, prevProp, nextProp);
        }
      }

      // 以旧 props 为主，查询旧 props 中不存在于新 props 的属性，也就是新 props 删除掉的属性
      if (oldProps !== EMPTY_OBJ) {
        // 场景三，新 props 中不存在对应的旧节点属性,删除对应属性
        for (const key in oldProps) {
          if (!(key in newProps)) {
            hostPatchProp(el, key, oldProps, null);
          }
        }
      }
    }
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
      hostPatchProp(el, key, null, value);
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
