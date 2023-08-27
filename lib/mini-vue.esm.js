function isObject(target) {
    return target != null && typeof target === "object";
}

function initProps(instance, rawProps) {
    instance.props = rawProps;
}

const publicPropertiesMap = {
    /**
     * 这里使用了 instance.vnode ，指向当前组件实例
     * 但我们在 mountElement 函数中 el 是赋值给 element 的 vnode 的，这里并不同一个vnode
     * 所以才需要在 setupRenderEffect 函数的最后一步，将 element vnode 的 el 再赋值给 instance.vnode 的 el
     * @param i -> instance
     * @returns
     */
    $el: (i) => i.vnode.el,
};
const PublicInstanceProxyHandlers = {
    get({ _: instance }, key) {
        const { setupState, props } = instance;
        if (key in setupState) {
            return setupState[key];
        }
        const publicGetter = publicPropertiesMap[key];
        if (publicGetter) {
            return publicGetter(instance);
        }
        if (key in props) {
            return props[key];
        }
    },
    set(target, key, newValue) {
        return true;
    },
};

function createComponentInstance(vnode) {
    const instance = {
        vnode,
        type: vnode.type,
        props: {},
        slots: [],
        setupState: {},
    };
    return instance;
}
function setupComponent(instance) {
    // props
    initProps(instance, instance.vnode.props);
    // slots
    // setup
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    const { type: Component, props } = instance;
    const { setup } = Component;
    // 设置一个代理，用于在 render 函数中可以使用 this 调用
    instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers);
    if (setup) {
        const setupResult = setup(props);
        handlerSetupResult(instance, setupResult);
    }
}
function handlerSetupResult(instance, setupResult) {
    /**
     * setupResult: function | object
     */
    if (isObject(setupResult)) {
        instance.setupState = setupResult;
    }
    // 确保组件的 render 是有值的
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    const Component = instance.type;
    if (Component.render) {
        instance.render = Component.render;
    }
}
function setupRenderEffect(instance, initialVnode, container) {
    const subTree = instance.render.call(instance.proxy);
    patch(subTree, container);
    // 在整个 element 渲染完毕后，再将 elementVnode 上的 el 赋值给当前组件的 el
    initialVnode.el = subTree.el;
}

function render(vnode, rootContainer) {
    patch(vnode, rootContainer);
}
function patch(vnode, rootContainer) {
    /**
     * vnode.type: object | string
     */
    const { type, shapeFlag } = vnode;
    if (2 /* ShapeFlages.STATEFUL_COMPONENT */ & shapeFlag) {
        processComponent(vnode, rootContainer);
    }
    else if (1 /* ShapeFlages.ELEMENT */ & shapeFlag) {
        processElement(vnode, rootContainer);
    }
}
function processComponent(initialVnode, rootContainer) {
    // updateComponent
    mountComponent(initialVnode, rootContainer);
}
function mountComponent(initialVnode, rootContainer) {
    // 通过 vnode 创建的实例对象，用于处理 props、slots、setup
    const instance = createComponentInstance(initialVnode);
    // 去装载 props、slots、setup、render，这一过程可以认为是一种装箱
    setupComponent(instance);
    // 去挂载 render ，这一过程可以认为是一种开箱
    setupRenderEffect(instance, initialVnode, rootContainer);
}
function processElement(vnode, rootContainer) {
    mountElement(vnode, rootContainer);
}
function mountElement(vnode, rootContainer) {
    const { type, children, props, shapeFlag } = vnode;
    // 这里赋值给 vnode.el 是为了可以在 render 函数中调用 this.$el
    // 但需要注意这里的 vnode 指的是 element
    const el = (vnode.el = document.createElement(type));
    // 处理 children
    if (4 /* ShapeFlages.TEXT_CHILDREN */ & shapeFlag) {
        el.textContent = children;
    }
    else if (8 /* ShapeFlages.ARRAY_CHILDREN */ & shapeFlag) {
        mountChildren(children, el);
    }
    // attribute
    for (const key in props) {
        const value = props[key];
        const isOn = (key) => /^on[A-Z]/.test(key);
        if (isOn(key)) {
            const event = key.slice(2).toLowerCase();
            el.addEventListener(event, value);
        }
        else {
            el.setAttribute(key, value);
        }
    }
    rootContainer.append(el);
}
function mountChildren(children, container) {
    children.forEach((vnode) => {
        patch(vnode, container);
    });
}

function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
        el: null,
        shapeFlag: getShapeFlag(type),
    };
    // children
    if (typeof children === "string") {
        vnode.shapeFlag |= 4 /* ShapeFlages.TEXT_CHILDREN */;
    }
    else if (Array.isArray(children)) {
        vnode.shapeFlag |= 8 /* ShapeFlages.ARRAY_CHILDREN */;
    }
    return vnode;
}
function getShapeFlag(type) {
    return typeof type === "string"
        ? 1 /* ShapeFlages.ELEMENT */
        : 2 /* ShapeFlages.STATEFUL_COMPONENT */;
}

function createApp(rootComponent) {
    return {
        mount(rootContainer) {
            // 创建虚拟节点 vnode
            const vnode = createVNode(rootComponent);
            // 通过 vnode 去渲染真实节点
            render(vnode, rootContainer);
        },
    };
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

export { createApp, h };
