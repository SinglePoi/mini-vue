'use strict';

function isObject(target) {
    return target != null && typeof target === "object";
}

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
    // slots
    // setup
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    const Component = instance.type;
    const { setup } = Component;
    // 设置一个代理，用于在 render 函数中可以使用 this 调用
    instance.proxy = new Proxy({}, {
        get(target, key) {
            const { setupState } = instance;
            debugger;
            if (key in setupState) {
                return setupState[key];
            }
            if (key === "$el") {
                return instance.vnode.el;
            }
        },
        set(target, key, newValue) {
            return true;
        },
    });
    if (setup) {
        const setupResult = setup();
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
function setupRenderEffect(instance, vnode, container) {
    const subTree = instance.render.call(instance.proxy);
    patch(subTree, container);
    vnode.el = subTree.el;
}

function render(vnode, rootContainer) {
    patch(vnode, rootContainer);
}
function patch(vnode, rootContainer) {
    /**
     * vnode.type: object | string
     */
    const { type } = vnode;
    if (isObject(type)) {
        processComponent(vnode, rootContainer);
    }
    else if (typeof type === "string") {
        processElement(vnode, rootContainer);
    }
}
function processComponent(vnode, rootContainer) {
    // updateComponent
    mountComponent(vnode, rootContainer);
}
function mountComponent(vnode, rootContainer) {
    // 通过 vnode 创建的实例对象，用于处理 props、slots、setup
    const instance = createComponentInstance(vnode);
    // 去装载 props、slots、setup、render，这一过程可以认为是一种装箱
    setupComponent(instance);
    // 去挂载 render ，这一过程可以认为是一种开箱
    setupRenderEffect(instance, vnode, rootContainer);
}
function processElement(vnode, rootContainer) {
    mountElement(vnode, rootContainer);
}
function mountElement(vnode, rootContainer) {
    const { type, children, props } = vnode;
    const el = (vnode.el = document.createElement(type));
    // 处理 children
    if (typeof children === "string") {
        el.textContent = children;
    }
    else if (Array.isArray(children)) {
        mountChildren(children, el);
    }
    // attribute
    for (const key in props) {
        const value = props[key];
        el.setAttribute(key, value);
    }
    rootContainer.append(el);
}
function mountChildren(children, container) {
    children.forEach((vnode) => {
        patch(vnode, container);
    });
}

function createVNode(type, props, children) {
    return {
        type,
        props,
        children,
    };
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

exports.createApp = createApp;
exports.h = h;
