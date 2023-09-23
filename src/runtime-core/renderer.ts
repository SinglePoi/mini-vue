import { scheduler } from "timers/promises";
import { effect } from "../reactivity/src/effect";
import { ShapeFlages } from "../shared/ShapeFlags";
import { EMPTY_OBJ, isObject } from "../shared/index";
import { createComponentInstance, setupComponent } from "./component";
import { shouldUpdateComponet } from "./componentUpdateUtils";
import { createAppAPI } from "./createApp";
import { getSequence } from "./helpers/getSequence";
import { Fragment, Text } from "./vnode";
import { queueJobs } from "./queueJobs";

export function createRenderer(options) {
  const {
    createElement: hostCreateElement,
    patchProp: hostPatchProp,
    insert: hostInsert,
    remove: hostRemove,
    setElementText: hostSetElementText,
  } = options;

  function render(vnode, rootContainer) {
    patch(null, vnode, rootContainer, null, null);
  }

  /**
   *
   * @param n1 更新前的 vnode
   * @param n2 本次更新的 vnode
   * @param rootContainer 父容器
   * @param parentComponent 父组件
   */
  function patch(n1, n2, rootContainer, parentComponent, anchor) {
    if (!isObject(n2)) {
      console.error(`vnode must be an object`);
    }

    const { type, shapeFlag } = n2;

    /**
     * 设置一个 Fragment type，专门用于处理 children
     */
    switch (type) {
      case Fragment:
        processFragment(n1, n2, rootContainer, parentComponent, anchor);
        break;
      case Text:
        processText(n1, n2, rootContainer);
        break;
      default:
        if (ShapeFlages.STATEFUL_COMPONENT & shapeFlag) {
          processComponent(n1, n2, rootContainer, parentComponent, anchor);
        } else if (ShapeFlages.ELEMENT & shapeFlag) {
          processElement(n1, n2, rootContainer, parentComponent, anchor);
        }
        break;
    }
  }

  function processText(n1, n2, rootContainer) {
    const { children } = n2;
    const textNode = (n2.el = document.createTextNode(children));
    rootContainer.append(textNode);
  }

  function processFragment(n1, n2, rootContainer, parentComponent, anchor) {
    mountChildren(n2.children, rootContainer, parentComponent, anchor);
  }

  function processComponent(n1, n2, rootContainer, parentComponent, anchor) {
    if (!n1) {
      mountComponent(n2, rootContainer, parentComponent, anchor);
    } else {
      updateComponent(n1, n2);
    }
  }

  function updateComponent(n1, n2) {
    const instance = (n2.component = n1.component);
    // 父组件的状态发生变更后，子组件会进入更新流程
    // 但是如果更新前后的 props 没有发生变化，此时不应该去更新
    if (shouldUpdateComponet(n1, n2)) {
      instance.next = n2;
      instance.update();
    } else {
      n2.el = n1.el;
      instance.vnode = n2;
    }
  }

  function mountComponent(vnode, rootContainer, parentComponent, anchor) {
    // 通过 vnode 创建的实例对象，用于处理 props、slots、setup
    const instance = (vnode.component = createComponentInstance(
      vnode,
      parentComponent
    ));

    // 去装载 props、slots、setup、render，这一过程可以认为是一种装箱
    setupComponent(instance);

    // 去挂载 render ，这一过程可以认为是一种开箱
    setupRenderEffect(instance, vnode, rootContainer, anchor);
  }

  function setupRenderEffect(instance, initialVnode, container, anchor) {
    /**
     * 使用 effect 将渲染函数作为依赖收集起来
     */
    instance.update = effect(
      () => {
        if (!instance.isMounted) {
          console.log("初始化组件");

          const subTree = (instance.subTree = instance.render.call(
            instance.proxy,
            instance.proxy
          ));
          patch(null, subTree, container, instance, anchor);

          // 在整个 element 渲染完毕后，再将 elementVnode 上的 el 赋值给当前组件的 el
          initialVnode.el = subTree.el;

          instance.isMounted = true;
        } else {
          console.log("更新组件");
          const { proxy, next, vnode } = instance;
          if (next) {
            next.el = vnode.el;
            updateComponentPreRender(instance, next);
          }

          // 拿到本次更新的 render
          const subTree = instance.render.call(proxy, proxy);
          // 拿到更新前的 render
          const prevSubTree = instance.subTree;
          // 将本次更新的 render 赋值给 instance 作为下次更新前的 render
          instance.subTree = subTree;

          patch(prevSubTree, subTree, container, instance, anchor);

          console.log("current", subTree);
          console.log("prevSubTree", prevSubTree);
        }
      },
      {
        scheduler() {
          console.log("----update");
          queueJobs(instance.update);
        },
      }
    );
  }

  function processElement(n1, n2, rootContainer, parentComponent, anchor) {
    if (!n1) {
      mountElement(n2, rootContainer, parentComponent, anchor);
    } else {
      patchElement(n1, n2, rootContainer, parentComponent, anchor);
    }
  }

  function patchElement(n1, n2, rootContainer, parentComponent, anchor) {
    // props
    const oldProps = n1.props || EMPTY_OBJ;
    const newProps = n2.props || EMPTY_OBJ;

    /**
     * vnode 的 el 属性是在 mountElement 方法中创建的
     * 而在更新流程中，也就是 n2 上是不会存在 el 属性的
     * 此时就需要将 n1 的 el 赋值给 n2 了
     */
    const el = (n2.el = n1.el);

    patchChildren(n1, n2, el, parentComponent, anchor);

    patchProps(el, oldProps, newProps);
  }

  function patchChildren(n1, n2, container, parentComponent, anchor) {
    /**
     * 场景1：老节点为数组，新节点为文本，除旧迎新
     * 场景2：新老节点都是文本，新文本覆盖旧文本
     */

    const prevShapeFlag = n1.shapeFlag;
    const nextShapeFlag = n2.shapeFlag;
    const c1 = n1.children;
    const c2 = n2.children;

    // 以新节点为主
    // 当新节点为文本时
    if (nextShapeFlag & ShapeFlages.TEXT_CHILDREN) {
      // 当老节点为数组时
      if (prevShapeFlag & ShapeFlages.ARRAY_CHILDREN) {
        // 删除老节点
        hostRemove(c1);
      }
      // 如果新老节点不同，且新节点为文本
      if (c1 !== c2) {
        hostSetElementText(container, c2);
      }
    } else {
      // 如果新节点是数组
      // 当老节点为文本时
      if (prevShapeFlag & ShapeFlages.TEXT_CHILDREN) {
        // 清空文本
        hostSetElementText(container, "");
        // 创建节点
        mountChildren(c2, container, parentComponent, anchor);
      } else {
        // 当新老节点都是数组时
        patchKeyedChildren(c1, c2, container, parentComponent, anchor);
      }
    }
  }

  /**
   *
   * @param c1 老节点
   * @param c2 新节点
   */
  function patchKeyedChildren(c1, c2, container, parentComponent, anchor) {
    let i = 0;
    const l2 = c2.length;
    let e1 = c1.length - 1;
    let e2 = l2 - 1;

    function isSameVNodeType(n1, n2) {
      return n1.type === n2.type && n1.key === n2.key;
    }

    while (i <= e1 && i <= e2) {
      const n1 = c1[i];
      const n2 = c2[i];

      if (isSameVNodeType(n1, n2)) {
        patch(n1, n2, container, parentComponent, anchor);
      } else {
        break;
      }

      i++;
    }
    console.log(`通过左侧运算得到最终的 i 值为：${i}`);

    while (i <= e1 && i <= e2) {
      const n1 = c1[e1];
      const n2 = c2[e2];
      if (isSameVNodeType(n1, n2)) {
        patch(n1, n2, container, parentComponent, anchor);
      } else {
        break;
      }

      e1--;
      e2--;
    }

    console.log(`通过右侧运算得到最终的 e1 为 ${e1}, e2 为 ${e2}`);

    // 如果新节点的个数大于老节点，需要去新增多余的节点
    if (i > e1) {
      if (i <= e2) {
        // 需要判断新增节点的位置
        const nextPos = e2 + 1;
        const anchor = nextPos < l2 ? c2[nextPos].el : null;
        while (i <= e2) {
          patch(null, c2[i], container, parentComponent, anchor);
          i++;
        }
      }
    } else if (i > e2) {
      // 如果新节点的个数小于老节点，需要去删除多余的节点
      while (i <= e1) {
        hostRemove(c1[i].el);
        i++;
      }
    } else {
      // 中间对比
      let s1 = i;
      let s2 = i;

      // 新节点中间位置的个数
      const toBePatched = e2 - s2 + 1;
      // 新节点中间位置处理完成的节点个数
      let patched = 0;
      // 新节点索引
      const keyIndexMap = new Map();
      // 新节点中间数组下标索引
      // 数据结构：新节点的下表 -> 对应的老节点下标
      const newIndexToOldIndexMap = new Array(toBePatched);
      newIndexToOldIndexMap.fill(0);

      // 新节点是否需要移动
      let moved = false;
      // 记录最后一位新节点下标，如果记录的下标大于当前节点的下标，说明新节点时需要移动的
      let maxNewIndexSoFar = 0;

      /**
       * 获取新节点的中间数组
       * 数据结构： key -> index
       * index: 节点所在数组的下标
       */
      for (let i = s2; i <= e2; i++) {
        const n2 = c2[i];
        keyIndexMap.set(n2.key, i);
      }

      // 查找老节点是否存在于新节点数组中
      for (let i = s1; i <= e1; i++) {
        // 新节点数组中【与老节点相同节点】的下标
        let newIndex;
        const n1 = c1[i];

        // 当新节点中间部分都处理完毕之后，老节点剩下的部分就可以直接删除了
        if (patched >= toBePatched) {
          hostRemove(n1.el);
          continue;
        }

        // 如果定义了 key
        if (n1.key != null) {
          newIndex = keyIndexMap.get(n1.key);
        } else {
          // 没有定义 key，需要遍历新节点数组查找是否存在
          for (let j = s2; j <= e2; j++) {
            const n2 = c2[j];
            if (isSameVNodeType(n1, n2)) {
              newIndex = j;

              break;
            }
          }
        }

        // 如果没有找到老节点在新数组中的位置，应该删除老节点
        if (newIndex === undefined) {
          hostRemove(n1.el);
        } else {
          if (newIndex >= maxNewIndexSoFar) {
            maxNewIndexSoFar = newIndex;
          } else {
            moved = true;
          }

          newIndexToOldIndexMap[newIndex - s2] = i + 1;
          // 如果存在，递归判断他的子节点
          patch(n1, c2[newIndex], container, parentComponent, null);
          patched++;
        }
      }

      // 最长自增子序列
      const newIndexSequence = moved ? getSequence(newIndexToOldIndexMap) : [];

      let j = newIndexSequence.length - 1;
      for (let i = toBePatched - 1; i >= 0; i--) {
        // 新节点数组中部数组的最后一位下标
        const nextIndex = i + s2;
        // 新节点数组中部数组的最后一个节点
        const nextChild = c2[nextIndex];
        // 锚点，最后一个节点的下一个节点
        const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : null;

        if (newIndexToOldIndexMap[i] === 0) {
          patch(null, nextChild, container, parentComponent, anchor);
        } else if (moved) {
          const newIndex = newIndexSequence[j];
          if (j < 0 || i !== newIndex) {
            console.log("移动位置");
            hostInsert(nextChild.el, container, anchor);
          } else {
            j--;
          }
        }
      }
    }
  }

  function unmountChildren(children) {
    for (let i = 0; i < children.length; i++) {
      // 获取到节点
      const el = children[i].el;
      hostRemove(el);
    }
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

  function mountElement(vnode, rootContainer, parentComponent, anchor) {
    const { type, children, props, shapeFlag } = vnode;

    // 这里赋值给 vnode.el 是为了可以在 render 函数中调用 this.$el
    // 但需要注意这里的 vnode 指的是 element
    const el: Element = (vnode.el = hostCreateElement(type));

    // 处理 children
    if (ShapeFlages.TEXT_CHILDREN & shapeFlag) {
      el.textContent = children;
    } else if (ShapeFlages.ARRAY_CHILDREN & shapeFlag) {
      mountChildren(children, el, parentComponent, anchor);
    }

    // attribute
    for (const key in props) {
      const value = props[key];
      hostPatchProp(el, key, null, value);
    }

    // rootContainer.append(el);
    hostInsert(el, rootContainer, anchor);
  }

  function mountChildren(children, container, parentComponent, anchor) {
    children.forEach((vnode) => {
      patch(null, vnode, container, parentComponent, anchor);
    });
  }

  return {
    createApp: createAppAPI(render),
  };
}

function updateComponentPreRender(instance, nextVNode) {
  instance.vnode = nextVNode;
  instance.next = null;
  instance.props = nextVNode.props;
}
