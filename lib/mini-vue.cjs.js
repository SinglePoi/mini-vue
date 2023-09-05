'use strict';

const extend = Object.assign;
function isObject(target) {
    return target != null && typeof target === "object";
}
const hasChanged = (newValue, oldValue) => {
    return !Object.is(newValue, oldValue);
};
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
const EMPTY_OBJ = {};

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

let activeEffect;
let shouldTrack = false;
function effect(fn, obj) {
    const _effect = new ReactiveEffect(fn, obj === null || obj === void 0 ? void 0 : obj.scheduler);
    _effect.run();
    const runenr = _effect.run.bind(_effect);
    runenr.effect = _effect;
    extend(_effect, obj);
    return runenr;
}
class ReactiveEffect {
    constructor(fn, scheduler) {
        this.deps = [];
        this.active = true;
        this._fn = fn;
        this._scheduler = scheduler;
    }
    run() {
        // stop 情况下，继承 shouldTrack 的值，此时为 false
        if (!this.active) {
            return this._fn();
        }
        // 非 stop 情况下
        shouldTrack = true;
        activeEffect = this;
        const result = this._fn();
        // 最后设置为 false
        shouldTrack = false;
        return result;
    }
    stop() {
        // 防止重复调用 stop，导致多次执行 cleanup
        if (this.active) {
            cleanupEffect(this);
            if (this.onStop) {
                this.onStop();
            }
            this.active = false;
        }
    }
}
function cleanupEffect(effect) {
    effect.deps.forEach((dep) => {
        dep.delete(effect);
    });
    effect.deps.length = 0;
}
const targetMap = new WeakMap();
function track(target, key) {
    if (!isTracking())
        return;
    let depsMap = targetMap.get(target);
    if (!depsMap) {
        depsMap = new Map();
        targetMap.set(target, depsMap);
    }
    let deps = depsMap.get(key);
    if (!deps) {
        deps = new Set();
        depsMap.set(key, deps);
    }
    // 完成 effect 的收集
    trackEffects(deps);
}
function trigger(target, key) {
    const depsMap = targetMap.get(target);
    // 如果 depsMap 为 underfined ，说明没有进行过依赖收集，这时不应该执行依赖
    if (!depsMap)
        return;
    const deps = depsMap.get(key);
    triggerEffects(deps);
}
// 在 tracking 状态中
function isTracking() {
    // 如果没有 activeEffect 不进行依赖收集
    //   if (!activeEffect) return;
    // stop 情况下，不收集依赖
    //   if (!shouldTrack) return;
    return shouldTrack && activeEffect !== undefined;
}
// 为了方便 ref 的调用，对其逻辑进行抽离
function trackEffects(deps) {
    // 如果 deps 已经收集了该依赖，没必要再搜集一次
    if (deps.has(activeEffect))
        return;
    deps.add(activeEffect);
    activeEffect.deps.push(deps);
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

class ComputedRefImpl {
    constructor(getter) {
        this._dirty = true;
        /**
         * 为了满足响应式对象发生变化后，下次调用时，computed 会重新执行 getter
         * 在 effect 上做文章，借用 ReactiveEffect
         * 这样依赖的响应式对象在 get 的时候就会收集到这个依赖
         * 响应式对象发生改变时，会执行我们定义的 scheduler 函数，使 _dirty 重置为 true
         */
        this._effect = new ReactiveEffect(getter, () => {
            if (!this._dirty) {
                this._dirty = true;
            }
        });
    }
    get value() {
        /**
         * 使用 _dirty 可以让 getter 不再重复执行
         * 但以下方式，只是让 getter 只能执行一次
         */
        if (this._dirty) {
            this._dirty = false;
            this._value = this._effect.run();
        }
        return this._value;
    }
}
function computed(getter) {
    return new ComputedRefImpl(getter);
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
        //  依赖收集
        if (!isReadonly) {
            track(target, key);
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
function isReadonly(target) {
    return !!target["__v_isReadonly" /* ReactiveFlags.IS_READONLY */];
}
function isReactive(target) {
    return !!target["__v_isReactive" /* ReactiveFlags.IS_RESCTIVE */];
}
function isProxy(target) {
    return isReadonly(target) || isReactive(target);
}

class RefImpl {
    constructor(value) {
        this.isRef = true;
        this._rawValue = value;
        this._value = convert(value);
        this.dep = new Set();
    }
    get value() {
        trackRefValue(this);
        return this._value;
    }
    set value(newValue) {
        if (hasChanged(newValue, this._rawValue)) {
            this._rawValue = newValue;
            this._value = convert(newValue);
            triggerEffects(this.dep);
        }
    }
}
function trackRefValue(ref) {
    if (isTracking()) {
        trackEffects(ref.dep);
    }
}
function convert(value) {
    return isObject(value) ? reactive(value) : value;
}
function ref(value) {
    return new RefImpl(value);
}
function isRef(ref) {
    return !!ref.isRef;
}
function unRef(ref) {
    return isRef(ref) ? ref.value : ref;
}
function proxyRef(proxyWithRef) {
    return new Proxy(proxyWithRef, proxyRefHandlers);
}
const proxyRefHandlers = {
    get(target, key) {
        const result = Reflect.get(target, key);
        // return isRef(result) ? result.value : result;
        return unRef(result);
    },
    set(target, key, value) {
        /**
         * 有两种情况
         * 1、老值是 ref，新值不是 ref，需要对 .value 进行赋值
         * 2、新值是 ref，进行替换
         */
        const original = target[key];
        if (isRef(original) && !isRef(value)) {
            return (original.value = value);
        }
        else {
            return Reflect.set(target, key, value);
        }
    },
};

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
        subTree: {},
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
        handlerSetupResult(instance, proxyRef(setupResult));
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
                if (2 /* ShapeFlages.STATEFUL_COMPONENT */ & shapeFlag) {
                    processComponent(n1, n2, rootContainer, parentComponent);
                }
                else if (1 /* ShapeFlages.ELEMENT */ & shapeFlag) {
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
                const subTree = (instance.subTree = instance.render.call(instance.proxy));
                patch(null, subTree, container, instance);
                // 在整个 element 渲染完毕后，再将 elementVnode 上的 el 赋值给当前组件的 el
                initialVnode.el = subTree.el;
                instance.isMounted = true;
            }
            else {
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
        }
        else {
            patchElement(n1, n2);
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

/**
 * 实现 DOM 的渲染接口
 */
function createElement(type) {
    console.log("createElement---------------", type);
    return document.createElement(type);
}
function patchProp(el, key, prevProp, nextProp) {
    console.log("patchProp---------------", el);
    if (isOn(key)) {
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, nextProp);
    }
    else {
        // 场景二：当新节点对比旧节点的属性值为 null 或 undefined 时，应该去删除这部分 props
        if (nextProp === undefined || nextProp === null) {
            el.removeAttribute(key);
        }
        else {
            el.setAttribute(key, nextProp);
        }
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

exports.computed = computed;
exports.createApp = createApp;
exports.createRenderer = createRenderer;
exports.createTextVNode = createTextVNode;
exports.getCurrentInstance = getCurrentInstance;
exports.h = h;
exports.inject = inject;
exports.isProxy = isProxy;
exports.isReactive = isReactive;
exports.isReadonly = isReadonly;
exports.isRef = isRef;
exports.provide = provide;
exports.proxyRef = proxyRef;
exports.reactive = reactive;
exports.readonly = readonly;
exports.ref = ref;
exports.renderSlots = renderSlots;
exports.shallowReadonly = shallowReadonly;
exports.unRef = unRef;
