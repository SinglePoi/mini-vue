function toDisplayString(value) {
    return String(value);
}

const extend = Object.assign;
function isObject(target) {
    return target != null && typeof target === "object";
}
function isString(target) {
    return typeof target === "string";
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
        component: null,
        key: props === null || props === void 0 ? void 0 : props.key,
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
    $props: (i) => i.props,
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
        next: null,
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
    if (Component && !Component.render) {
        if (Component.template) {
            Component.render = compiler(Component.template);
        }
    }
    instance.render = Component.render;
}
function getCurrentInstance() {
    return currentInstance;
}
function setCurrentInstance(instance) {
    currentInstance = instance;
}
let compiler;
function registerRuntimeCompiler(_compiler) {
    compiler = _compiler;
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

function shouldUpdateComponet(prevVnode, nextVNode) {
    const { props: prevProps } = prevVnode;
    const { props: nextProps } = nextVNode;
    for (const key in nextProps) {
        if (nextProps[key] !== prevProps[key]) {
            return true;
        }
        return false;
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

function getSequence(arr) {
    const p = arr.slice();
    const result = [0];
    let i, j, u, v, c;
    const len = arr.length;
    for (i = 0; i < len; i++) {
        const arrI = arr[i];
        if (arrI !== 0) {
            j = result[result.length - 1];
            if (arr[j] < arrI) {
                p[i] = j;
                result.push(i);
                continue;
            }
            u = 0;
            v = result.length - 1;
            while (u < v) {
                c = (u + v) >> 1;
                if (arr[result[c]] < arrI) {
                    u = c + 1;
                }
                else {
                    v = c;
                }
            }
            if (arrI < arr[result[u]]) {
                if (u > 0) {
                    p[i] = result[u - 1];
                }
                result[u] = i;
            }
        }
    }
    u = result.length;
    v = result[u - 1];
    while (u-- > 0) {
        result[u] = v;
        v = p[v];
    }
    return result;
}

const queue = [];
let isFlushPending = false;
const p = Promise.resolve();
function nextTick(fn) {
    return fn ? p.then(fn) : p;
}
function queueJobs(job) {
    if (!queue.includes(job)) {
        queue.push(job);
    }
    queueFlush();
}
function queueFlush() {
    // 任务队列中的 job 对应的微任务应该只有一个
    if (isFlushPending)
        return;
    isFlushPending = true;
    nextTick(flushJobs);
}
function flushJobs() {
    let job;
    isFlushPending = false;
    while ((job = queue.shift())) {
        console.log("执行 job");
        job && job();
    }
}

function createRenderer(options) {
    const { createElement: hostCreateElement, patchProp: hostPatchProp, insert: hostInsert, remove: hostRemove, setElementText: hostSetElementText, } = options;
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
                if (2 /* ShapeFlages.STATEFUL_COMPONENT */ & shapeFlag) {
                    processComponent(n1, n2, rootContainer, parentComponent, anchor);
                }
                else if (1 /* ShapeFlages.ELEMENT */ & shapeFlag) {
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
        }
        else {
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
        }
        else {
            n2.el = n1.el;
            instance.vnode = n2;
        }
    }
    function mountComponent(vnode, rootContainer, parentComponent, anchor) {
        // 通过 vnode 创建的实例对象，用于处理 props、slots、setup
        const instance = (vnode.component = createComponentInstance(vnode, parentComponent));
        // 去装载 props、slots、setup、render，这一过程可以认为是一种装箱
        setupComponent(instance);
        // 去挂载 render ，这一过程可以认为是一种开箱
        setupRenderEffect(instance, vnode, rootContainer, anchor);
    }
    function setupRenderEffect(instance, initialVnode, container, anchor) {
        /**
         * 使用 effect 将渲染函数作为依赖收集起来
         */
        instance.update = effect(() => {
            if (!instance.isMounted) {
                console.log("初始化组件");
                const subTree = (instance.subTree = instance.render.call(instance.proxy, instance.proxy));
                patch(null, subTree, container, instance, anchor);
                // 在整个 element 渲染完毕后，再将 elementVnode 上的 el 赋值给当前组件的 el
                initialVnode.el = subTree.el;
                instance.isMounted = true;
            }
            else {
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
        }, {
            scheduler() {
                console.log("----update");
                queueJobs(instance.update);
            },
        });
    }
    function processElement(n1, n2, rootContainer, parentComponent, anchor) {
        if (!n1) {
            mountElement(n2, rootContainer, parentComponent, anchor);
        }
        else {
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
        if (nextShapeFlag & 4 /* ShapeFlages.TEXT_CHILDREN */) {
            // 当老节点为数组时
            if (prevShapeFlag & 8 /* ShapeFlages.ARRAY_CHILDREN */) {
                // 删除老节点
                hostRemove(c1);
            }
            // 如果新老节点不同，且新节点为文本
            if (c1 !== c2) {
                hostSetElementText(container, c2);
            }
        }
        else {
            // 如果新节点是数组
            // 当老节点为文本时
            if (prevShapeFlag & 4 /* ShapeFlages.TEXT_CHILDREN */) {
                // 清空文本
                hostSetElementText(container, "");
                // 创建节点
                mountChildren(c2, container, parentComponent, anchor);
            }
            else {
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
            }
            else {
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
            }
            else {
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
        }
        else if (i > e2) {
            // 如果新节点的个数小于老节点，需要去删除多余的节点
            while (i <= e1) {
                hostRemove(c1[i].el);
                i++;
            }
        }
        else {
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
                }
                else {
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
                }
                else {
                    if (newIndex >= maxNewIndexSoFar) {
                        maxNewIndexSoFar = newIndex;
                    }
                    else {
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
                }
                else if (moved) {
                    const newIndex = newIndexSequence[j];
                    if (j < 0 || i !== newIndex) {
                        console.log("移动位置");
                        hostInsert(nextChild.el, container, anchor);
                    }
                    else {
                        j--;
                    }
                }
            }
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
        const el = (vnode.el = hostCreateElement(type));
        // 处理 children
        if (4 /* ShapeFlages.TEXT_CHILDREN */ & shapeFlag) {
            el.textContent = children;
        }
        else if (8 /* ShapeFlages.ARRAY_CHILDREN */ & shapeFlag) {
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
function insert(child, parent, anchor = null) {
    console.log("insert---------------", child, anchor);
    // parent.append(el);
    parent.insertBefore(child, anchor);
}
function remove(child) {
    const parent = child.parentNode;
    if (parent) {
        parent.removeChild(child);
    }
}
function setElementText(el, text) {
    el.textContent = text;
}
const renderer = createRenderer({
    createElement,
    patchProp,
    insert,
    remove,
    setElementText,
});
function createApp(...arg) {
    return renderer.createApp(...arg);
}

var runtimDom = /*#__PURE__*/Object.freeze({
    __proto__: null,
    createApp: createApp,
    createElementVNode: createVNode,
    createRenderer: createRenderer,
    createTextVNode: createTextVNode,
    getCurrentInstance: getCurrentInstance,
    h: h,
    inject: inject,
    nextTick: nextTick,
    provide: provide,
    registerRuntimeCompiler: registerRuntimeCompiler,
    renderSlots: renderSlots,
    toDisplayString: toDisplayString
});

const TO_DISPLAY_STRING = Symbol("toDisplayString");
const CREATE_ELEMENT_VNODE = Symbol("createElementVNode");
const helperMapName = {
    [TO_DISPLAY_STRING]: "toDisplayString",
    [CREATE_ELEMENT_VNODE]: "createElementVNode",
};

var NodeTypes;
(function (NodeTypes) {
    NodeTypes[NodeTypes["INTERPOLATION"] = 0] = "INTERPOLATION";
    NodeTypes[NodeTypes["SIMPLE_EXPRESSON"] = 1] = "SIMPLE_EXPRESSON";
    NodeTypes[NodeTypes["ELEMENT"] = 2] = "ELEMENT";
    NodeTypes[NodeTypes["TEXT"] = 3] = "TEXT";
    NodeTypes[NodeTypes["ROOT"] = 4] = "ROOT";
    NodeTypes[NodeTypes["COMPOUND_EXPRESSION"] = 5] = "COMPOUND_EXPRESSION";
})(NodeTypes || (NodeTypes = {}));
function createVNodeCall(context, vnodeTag, vnodeProps, vnodeChildren) {
    context.helper(CREATE_ELEMENT_VNODE);
    const vnodeElement = {
        type: NodeTypes.ELEMENT,
        tag: vnodeTag,
        props: vnodeProps,
        children: vnodeChildren,
    };
    return vnodeElement;
}

function generate(ast) {
    // 创建上下文对象
    const context = createCodegenContext();
    const { push } = context;
    // 生成导入文本
    genFuntionPreamble(ast, context);
    const functionName = "render";
    const args = ["_ctx", "_cache"];
    const signature = args.join(",");
    push("return");
    push(` function ${functionName}(${signature}) {`);
    push("return");
    genNode(ast.codegenNode, context);
    push("}");
    return {
        code: context.code,
    };
}
// 文件头部的导入
function genFuntionPreamble(ast, context) {
    const VueBinging = "Vue";
    const aliasHelper = (v) => `${helperMapName[v]}: _${helperMapName[v]}`;
    if (ast.helpers.length > 0) {
        context.push(` const { ${ast.helpers.map(aliasHelper).join(",")} } = ${VueBinging}\n`);
    }
}
function createCodegenContext() {
    const context = {
        code: "",
        push(source) {
            context.code += source;
        },
        helper(key) {
            return `_${helperMapName[key]}`;
        },
    };
    return context;
}
// 这里是 return 的内容
function genNode(node, context) {
    switch (node.type) {
        case NodeTypes.TEXT:
            genText(node, context);
            break;
        case NodeTypes.INTERPOLATION:
            genInterpolation(node, context);
            break;
        case NodeTypes.SIMPLE_EXPRESSON:
            genExpresson(node, context);
            break;
        case NodeTypes.ELEMENT:
            genElement(node, context);
            break;
        case NodeTypes.COMPOUND_EXPRESSION:
            genCompoundExpression(node, context);
            break;
    }
}
function genCompoundExpression(node, context) {
    const { push } = context;
    const children = node.chidlren;
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (isString(child)) {
            push(child);
        }
        else {
            genNode(child, context);
        }
    }
}
function genElement(node, context) {
    const { push, helper } = context;
    const { tag, children, props } = node;
    push(` ${helper(CREATE_ELEMENT_VNODE)}(`);
    genNodeList(genNullable([tag, props, children]), context);
    // genNode(children, context);
    // 对 children 循环拼接
    // for (let i = 0; i < children.length; i++) {
    //   const child = children[i];
    //   genNode(child, context);
    // }
    push(")");
}
function genNodeList(nodes, context) {
    const { push } = context;
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (isString(node) || node === null) {
            push(" " + node);
        }
        else {
            genNode(node, context);
        }
        if (i < nodes.length - 1) {
            push(",");
        }
    }
}
function genNullable(args) {
    return args.map((i) => i || null);
}
function genExpresson(node, context) {
    const { push } = context;
    push(node.content);
}
function genInterpolation(node, context) {
    const { push, helper } = context;
    push(` ${helper(TO_DISPLAY_STRING)}(`);
    genNode(node.content, context);
    push(`)`);
}
function genText(node, context) {
    const { push } = context;
    push(` '${node.content}'`);
}

function baseParse(content) {
    // 创建解析器上下文对象
    const context = createParserContext(content);
    return createRoot(parseChildren(context, []));
}
/**
 *
 * @param context 待解析的内容
 * @param ancestor 标签栈，用于判断标签是否闭合
 * @returns
 */
function parseChildren(context, ancestor) {
    const nodes = [];
    while (!isEnd(context, ancestor)) {
        let node;
        const { source: s } = context;
        if (s.startsWith("{{")) {
            // 如果字符以 {{ 开头，认为是插值
            node = parseInterpolation(context);
        }
        else if (s[0] === "<") {
            if (s[1] === "/") {
                //用于匹配 </p> {{ message }} </div>
                if (/[a-z]/i.test(s[2])) {
                    // 去除 </p>, 移动下标至下一个处理点
                    parseTag(context, 1 /* TagType.END */);
                    continue;
                }
            }
            else if (/[a-z]/i.test(s[1])) {
                // 用于匹配  <p>xxxx</p>
                node = parseElement(context, ancestor);
            }
        }
        // 处理文本
        if (!node) {
            node = parseText(context);
        }
        nodes.push(node);
    }
    return nodes;
}
/**
 * 满足解析完毕的条件
 * a、遇到结束标签(结束标签必须与开始标签一一对应)
 * b、解析目标的长度为 0
 * @param context 上下文对象
 * @returns a || b
 */
function isEnd(context, ancestor) {
    const source = context.source;
    if (source.startsWith("</")) {
        for (let i = ancestor.length - 1; i >= 0; i--) {
            const tag = ancestor[i].tag;
            if (startsWithEndTagOpen(context.source, tag)) {
                return true;
            }
        }
    }
    return !source;
}
function parseTextData(context, length) {
    const content = context.source.slice(0, length);
    advanceBy(context, length);
    return content;
}
function parseText(context) {
    const source = context.source;
    let endIndex = source.length;
    let endTokens = ["<", "{{"];
    // 寻找下一个处理点，以此判断本轮处理的结束位置 endIndex
    for (let i = 0; i < endTokens.length; i++) {
        const index = source.indexOf(endTokens[i]);
        if (index !== -1 && endIndex > index) {
            endIndex = index;
        }
    }
    // 文本内容
    const content = parseTextData(context, endIndex);
    return {
        type: NodeTypes.TEXT,
        content,
    };
}
function parseElement(context, ancestor) {
    const element = parseTag(context, 0 /* TagType.START */);
    ancestor.push(element);
    const children = parseChildren(context, ancestor);
    ancestor.pop();
    if (startsWithEndTagOpen(context.source, element.tag)) {
        parseTag(context, 1 /* TagType.END */);
    }
    else {
        throw new Error(`缺少闭合标签：${element.tag}`);
    }
    element.children = children;
    return element;
}
function startsWithEndTagOpen(source, tag) {
    /**
     * 如果是闭合标签，且和开始标签相同
     */
    return (source.startsWith("</") &&
        source.slice(2, 2 + tag.length).toLowerCase() === tag.toLowerCase());
}
function parseTag(context, type) {
    //  [ '<div', 'div', index: 0, input: '<div></div>', groups: undefined ]
    const match = /^<\/?([a-z]*)/i.exec(context.source);
    // if (!match) return;
    // div
    const tag = match[1];
    advanceBy(context, match[0].length + 1);
    if (type === 1 /* TagType.END */)
        return;
    return {
        type: NodeTypes.ELEMENT,
        tag,
    };
}
function parseInterpolation(context) {
    // {{msg}}
    const openDelimiter = "{{";
    const closeDelimiter = "}}";
    const startIndex = openDelimiter.length;
    const closeIndex = context.source.indexOf(closeDelimiter, startIndex);
    // 推进下一步处理
    advanceBy(context, startIndex); // msg}}
    const rawContentLength = closeIndex - startIndex;
    const content = parseTextData(context, rawContentLength).trim();
    // 推进下一步处理
    advanceBy(context, closeDelimiter.length);
    return {
        type: NodeTypes.INTERPOLATION,
        content: {
            type: NodeTypes.SIMPLE_EXPRESSON,
            content,
        },
    };
}
function advanceBy(context, length) {
    context.source = context.source.slice(length);
}
function createRoot(children) {
    return {
        children,
        type: NodeTypes.ROOT,
    };
}
function createParserContext(content) {
    return {
        source: content,
    };
}

function transform(root, options = {}) {
    // 创建上下文对象
    const context = createTransformContext(root, options);
    // 遍历树 - 深度优先搜索
    traverseNode(root, context);
    // 生成需要代码生成的内容
    createCodegenNode(root);
    // 不同节点对应的处理方法，一般在 Vue 包中
    root.helpers = [...context.helpers.keys()];
}
function createCodegenNode(root) {
    const child = root.children[0];
    if (child.type === NodeTypes.ELEMENT) {
        root.codegenNode = child.codegenNode;
    }
    else {
        root.codegenNode = root.children[0];
    }
}
/**
 *
 * @param node 并不是根节点，因为在处理 children 时也会调用，此时的 node 是 children 节点
 * @param context 上下文对象
 */
function traverseNode(node, context) {
    // 获取自定义插件
    const transformNode = context.nodeTransforms;
    const exitFns = [];
    // 执行插件规则
    for (let i = 0; i < transformNode.length; i++) {
        const transform = transformNode[i];
        const onExit = transform(node, context);
        if (onExit)
            exitFns.push(onExit);
    }
    // 添加不同的节点类型的处理函数
    // 这些函数会在 codegen 阶段应用
    switch (node.type) {
        case NodeTypes.INTERPOLATION:
            context.helper(TO_DISPLAY_STRING);
            break;
        case NodeTypes.ROOT:
        case NodeTypes.ELEMENT:
            // 处理 children 内容
            traverseChildren(node.children, context);
            break;
    }
    let i = exitFns.length;
    while (i--) {
        exitFns[i]();
    }
}
function traverseChildren(children, context) {
    for (let i = 0; i < children.length; i++) {
        const node = children[i];
        traverseNode(node, context);
    }
}
function createTransformContext(root, options) {
    const context = {
        root,
        nodeTransforms: options.nodeTransforms || [],
        helpers: new Map(),
        helper(key) {
            context.helpers.set(key, 1);
        },
    };
    return context;
}

function transformElement(node, context) {
    if (node.type === NodeTypes.ELEMENT) {
        return () => {
            const vnodeTag = `'${node.tag}'`;
            let vnodeProps;
            const chidlren = node.children;
            let vnodeChildren = chidlren[0];
            ({
                type: NodeTypes.ELEMENT,
                tag: vnodeTag,
                props: vnodeProps,
                children: vnodeChildren,
            });
            node.codegenNode = createVNodeCall(context, vnodeTag, vnodeProps, vnodeChildren);
        };
    }
}

// 插值处理插件
function transformExpression(node) {
    if (node.type === NodeTypes.INTERPOLATION) {
        node.content = processExpression(node.content);
    }
}
function processExpression(node) {
    node.content = "_ctx." + node.content;
    return node;
}

function isText(node) {
    return node.type === NodeTypes.TEXT || node.type === NodeTypes.INTERPOLATION;
}

function transformText(node, context) {
    const { type, children } = node;
    let currentContainer;
    // 如果是标签
    if (type === NodeTypes.ELEMENT) {
        return () => {
            // 需要将标签包含的内容使用 + 号拼接起来
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                // 判断是否是文本或插值，
                if (isText(child)) {
                    // 搜索下一个节点，同时去判断该节点是否是文本或插值
                    for (let j = i + 1; j < children.length; j++) {
                        const next = children[j];
                        if (isText(next)) {
                            // 收集内容
                            if (!currentContainer) {
                                currentContainer = children[i] = {
                                    type: NodeTypes.COMPOUND_EXPRESSION,
                                    chidlren: [child],
                                };
                            }
                            currentContainer.chidlren.push("+");
                            currentContainer.chidlren.push(next);
                            children.splice(j, 1);
                            j--;
                        }
                        else {
                            currentContainer = undefined;
                            break;
                        }
                    }
                }
            }
        };
    }
}

function baseCompile(template) {
    const ast = baseParse(template);
    transform(ast, {
        nodeTransforms: [transformExpression, transformElement, transformText],
    });
    return generate(ast);
}

function compileToFunction(template) {
    const { code } = baseCompile(template);
    //     const code = `const { toDisplayString: _toDisplayString, openBlock: _openBlock, createElementBlock: _createElementBlock } = Vue
    //     return function render(_ctx, _cache, $props, $setup, $data, $options) {
    //       return (_openBlock(), _createElementBlock("div", null, "hi," + _toDisplayString(_ctx.message), 1 /* TEXT */))
    //     }`;
    //   `return const { toDisplayString: _toDisplayString,createElementBlock: _createElementBlock } = "vue"\n
    //   return function render(_ctx,_cache) {return _createElementBlock( 'div', null, 'hi,'+ _toDisplayString(_ctx.message))}`
    const render = new Function("Vue", code)(runtimDom);
    return render;
}
registerRuntimeCompiler(compileToFunction);

export { computed, createApp, createVNode as createElementVNode, createRenderer, createTextVNode, getCurrentInstance, h, inject, isProxy, isReactive, isReadonly, isRef, nextTick, provide, proxyRef, reactive, readonly, ref, registerRuntimeCompiler, renderSlots, shallowReadonly, toDisplayString, unRef };
