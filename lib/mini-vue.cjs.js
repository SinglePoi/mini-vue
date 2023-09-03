'use strict';

const extend = Object.assign;
function isObject(target) {
    return target != null && typeof target === "object";
}
const hasOwn = (target, key) => Object.prototype.hasOwnProperty.call(target, key);
const isOn = (key) => /^on[A-Z]/.test(key);
const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};
const camelize = (str) => {
    return str.replace(/-(\w)/g, (_, c) => {
        return c ? c.toUpperCase() : "";
    });
};

const Fragment = Symbol("Fragment");
const Text = Symbol("Text");
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
    // 如果 type 是组件 且 children 是对象类型，说明需要将 children 处理为 slots
    if (vnode.shapeFlag & 2 /* ShapeFlages.STATEFUL_COMPONENT */) {
        if (isObject(children)) {
            vnode.shapeFlag |= 16 /* ShapeFlages.SLOT_CHILDREN */;
        }
    }
    return vnode;
}
function createTextVNode(text) {
    return createVNode(Text, {}, text);
}
function getShapeFlag(type) {
    return typeof type === "string"
        ? 1 /* ShapeFlages.ELEMENT */
        : 2 /* ShapeFlages.STATEFUL_COMPONENT */;
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

function renderSlots(slots, name, props) {
    const slot = slots[name];
    if (slot) {
        if (typeof slot === "function") {
            return createVNode(Fragment, {}, slot(props));
        }
    }
}

const targetMap = new WeakMap();
function trigger(target, key) {
    const depsMap = targetMap.get(target);
    // 如果 depsMap 为 underfined ，说明没有进行过依赖收集，这时不应该执行依赖
    if (!depsMap)
        return;
    const deps = depsMap.get(key);
    triggerEffects(deps);
}
// 为了方便 ref 的调用，对其逻辑进行抽离
function triggerEffects(deps) {
    for (const effect of deps) {
        if (effect._scheduler) {
            effect._scheduler();
        }
        else {
            effect.run();
        }
    }
}

// 对 set/get 进行缓存，只在初始化的时候执行一次，避免多余的内存消耗
const reactiveGet = createGetter();
const reactiveSet = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
function createGetter(isReadonly = false, shallow = false) {
    return function get(target, key) {
        if (key === "__v_isReadonly" /* ReactiveFlags.IS_READONLY */) {
            return isReadonly;
        }
        else if (key === "__v_isReactive" /* ReactiveFlags.IS_RESCTIVE */) {
            return !isReadonly;
        }
        const result = Reflect.get(target, key);
        // 如果是浅层，应该直接返回
        if (shallow) {
            return result;
        }
        // result 作为 Proxy 返回的值，如果该值的类型仍然是 object
        // 为了实现深层代理的目的，应该对 result 进行代理
        if (isObject(result)) {
            return isReadonly ? readonly(result) : reactive(result);
        }
        return result;
    };
}
function createSetter(isReadonly = false) {
    return function set(target, key, value) {
        const result = Reflect.set(target, key, value);
        //  触发依赖
        if (!isReadonly) {
            trigger(target, key);
        }
        return result;
    };
}
const reactiveHandlers = {
    get: reactiveGet,
    set: reactiveSet,
};
const readonlyHandlers = {
    get: readonlyGet,
    set() {
        console.warn("target is readonly");
        return true;
    },
};
const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
    get: shallowReadonlyGet,
});

function reactive(target) {
    return createReactiveObject(target, reactiveHandlers);
}
function readonly(target) {
    return createReactiveObject(target, readonlyHandlers);
}
function shallowReadonly(target) {
    return createReactiveObject(target, shallowReadonlyHandlers);
}
function createReactiveObject(target, baseHandlers) {
    if (!isObject(target)) {
        console.warn(`target ${target} is non-object `);
        return target;
    }
    return new Proxy(target, baseHandlers);
}

function emit(instance, event, ...args) {
    const { props } = instance;
    const toHandlerKey = (str) => {
        return str ? "on" + capitalize(str) : "";
    };
    const handlerName = toHandlerKey(camelize(event));
    console.log(handlerName);
    const handler = props[handlerName];
    handler & handler(...args);
}

function initProps(instance, rawProps = {}) {
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
    $slots: (i) => i.slots,
};
const PublicInstanceProxyHandlers = {
    get({ _: instance }, key) {
        const { setupState, props } = instance;
        const publicGetter = publicPropertiesMap[key];
        if (hasOwn(setupState, key)) {
            return setupState[key];
        }
        else if (hasOwn(props, key)) {
            return props[key];
        }
        if (publicGetter) {
            return publicGetter(instance);
        }
    },
    set(target, key, newValue) {
        return true;
    },
};

function initSlots(instance, children) {
    const { slots, vnode } = instance;
    // 如果需要 slots 才进行处理
    if (vnode.shapeFlag & 16 /* ShapeFlages.SLOT_CHILDREN */) {
        normalizeSlotObject(slots, children);
    }
}
function normalizeSlotObject(slots, children) {
    /**
     * createVnode 的第三个参数是 children
     * 进来的时候 slots 是空的
     * 此时的 children 是一个对象类型，遍历 children 的属性，将值处理之后赋值给 slots 对应的属性
     * 之后，slots 就拥有了值
     */
    for (const key in children) {
        const value = children[key];
        slots[key] = (props) => normalizeSlotValue(value(props));
    }
}
function normalizeSlotValue(value) {
    return Array.isArray(value) ? value : [value];
}

let currentInstance = null;
function createComponentInstance(vnode, parent) {
    const instance = {
        vnode,
        type: vnode.type,
        props: {},
        slots: {},
        setupState: {},
        provides: parent ? parent.provides : {},
        parent,
        emit: () => { },
    };
    instance.emit = emit.bind(null, instance);
    return instance;
}
function setupComponent(instance) {
    // props
    initProps(instance, instance.vnode.props);
    // slots
    initSlots(instance, instance.vnode.children);
    // setup
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    const { type: Component, props, emit } = instance;
    const { setup } = Component;
    // 设置一个代理，用于在 render 函数中可以使用 this 调用
    instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers);
    if (setup) {
        /**
         * 为什么要在这里赋值
         * 目的是在 setup 函数中可以使用 getCurrentInstance
         * 如果没有 setup 函数当然就不需要 currentInstance 了
         */
        setCurrentInstance(instance);
        const setupResult = setup(shallowReadonly(props), {
            emit,
        });
        setCurrentInstance(null);
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
function getCurrentInstance() {
    return currentInstance;
}
function setCurrentInstance(instance) {
    currentInstance = instance;
}

function provide(key, value) {
    // 获取当前实例
    const currentInstance = getCurrentInstance();
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
function inject(key, defaultValue) {
    // 获取当前实例，此时是子组件
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        // 从 parent 中获取父组件的信息
        const parentProvides = currentInstance.parent.provides;
        if (key in parentProvides) {
            return parentProvides[key];
        }
        else {
            if (typeof defaultValue === "function") {
                return defaultValue();
            }
            return defaultValue;
        }
    }
}

function createAppAPI(render) {
    return function createApp(rootComponent) {
        return {
            mount(rootContainer) {
                // 创建虚拟节点 vnode
                const vnode = createVNode(rootComponent);
                // 通过 vnode 去渲染真实节点
                render(vnode, rootContainer);
            },
        };
    };
}

function createRenderer(options) {
    const { createElement: hostCreateElement, patchProp: hostPatchProp, insert: hostInsert, } = options;
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
                if (2 /* ShapeFlages.STATEFUL_COMPONENT */ & shapeFlag) {
                    processComponent(vnode, rootContainer, parentComponent);
                }
                else if (1 /* ShapeFlages.ELEMENT */ & shapeFlag) {
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
        const el = (vnode.el = hostCreateElement(type));
        // 处理 children
        if (4 /* ShapeFlages.TEXT_CHILDREN */ & shapeFlag) {
            el.textContent = children;
        }
        else if (8 /* ShapeFlages.ARRAY_CHILDREN */ & shapeFlag) {
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

/**
 * 实现 DOM 的渲染接口
 */
function createElement(type) {
    console.log("createElement---------------", type);
    return document.createElement(type);
}
function patchProp(el, key, value) {
    console.log("patchProp---------------", el);
    if (isOn(key)) {
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, value);
    }
    else {
        el.setAttribute(key, value);
    }
}
function insert(el, parent) {
    console.log("insert---------------", el);
    parent.append(el);
}
const renderer = createRenderer({
    createElement,
    patchProp,
    insert,
});
function createApp(...arg) {
    return renderer.createApp(...arg);
}

exports.createApp = createApp;
exports.createRenderer = createRenderer;
exports.createTextVNode = createTextVNode;
exports.getCurrentInstance = getCurrentInstance;
exports.h = h;
exports.inject = inject;
exports.provide = provide;
exports.renderSlots = renderSlots;
