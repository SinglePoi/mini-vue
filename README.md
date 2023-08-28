## mini-vue-annotation

本项目中 Vue3 的学习方式是：

- 编写测试用例
- 通过测试用例
- 重构代码，使其更有可读性

### 其中

- 使用 jest 作为单元测试
  - 通过单元测试用例实现 Vue API 接口的功能
- 使用 TypeScript 作为类型系统
  - 标注结构类型，实现类似文档的作用，方便理解逻辑的流转

### 如此

#### reactivity 模块

- 实现 reactive
  - 逻辑
    - 通过 Proxy 实现
    - get 中通过 track 实现收集依赖（activeEffect）
    - set 中通过 trigger 实现触发依赖（activeEffect）
    - 依赖是否收集需要通过 activeEffect 和 shouldTrack 判断
    - readonly 对对象的 set 方法进行拦截，阻止对值的更改且输出提示
    - reactive 默认的深层次代理，是通过对上层代理的 Reflect.get 返回的值在进行一次 reactive；当然，需要判断是否是对象类型
    - readonly 默认的深层代理，如同 reactive 的思路
    - shallowReadonly 的实现在于：在 shallow 状态为 true 时，直接返回上层代理的返回值
  - API
    - isReactive: 目标值是否是通过 reactive 创建的
    - isReadonly: 目标值是否是通过 readonly 创建的
    - isProxy: 目标值能否满足 isReactive 和 isReadonly 其中之一
- 实现 effect
  - 逻辑
    - effect.fn 应该立即执行一次，并且将 effect.fn 赋值给 activeEffect
    - effect 需要返回一个 runner 函数，由开发者去控制执行的时机
    - stop 函数可以在依赖队列中删除依赖的 effect，~~?但是只能生效一次~~
    - onStop 函数是 stop 的钩子函数，在执行 stop 函数时触发
    - 为了避免 stop 状态下，对依赖的重新收集，设置新的状态变量 shouldTrack
- 实现 ref
  - 逻辑
    - ref 目标参数是原始类型，同时又需要收集 effect，因此采用 class 的存取器函数实现；这也是 ref 的值需要通过 .value 来获取的原因
    - 如果 ref 的实参是一个对象类型，则调用 reactive 代理参数
    - ref 的 setter 函数需要对新老值进行对比，同时要兼容对象类型，因此采用 Object.is()
    - 也因为要对比对象类型的值，需要在 reactive 代理之前存储这个对象
  - API
    - isRef: 判断是否是 ref 创建的值
    - unRef: 对于 ref 值返回 ref.value，否则返回本身
    - proxyRef: 接受一个对象，如果对象中存在 ref 属性，取值时不需要 .value, 赋值时存在两种情况
      - 新值非 ref，老值是 ref，需要对 .value 进行赋值
      - 新值是 ref，无论老值是什么，直接进行替换
- 实现 computed
  - 逻辑
    - computed 表现和 ref 差不多，都是通过 .value 求值，最大的不同点在于，computed 具备缓存能力
    - 如何缓存：第一次执行时，将结果存储至私有属性中；下次执行时，如果依赖的 reactive 对象没有发生变化时，直接返回该私有属性的值
    - 如何判断响应式对象没有发生变化？设置一个中间值，为 true 时认为发生了变化。每次执行 getter 时，更新为 false 。响应式对象发生变化时，借用 effect 的 scheduler 能力：每当 effect 触发时，执行 scheduler 使中间值的状态变更为 true

#### runtime-core 模块

主要负责组件的挂载，将组件转化为 vnode，一个成熟的组件需要具备 render 函数和 setup 函数。render 函数用于处理组件的内容，setup 用于处理注解的状态
render 函数由 h 函数创建的 vnode 构成，一般 vnode 具备 type props children 三个属性。type 具备两种类型：object 和 string；

- 挂载的控制流分析由 patch 函数完成。主要通过 type 类型进行判断，存在以下两个分支。
- 组件挂载流程 processComponent ：当 type 类型为 object 时，进入组件流程。目前会直接执行 mountComponent 函数，其中第一步完成对组件实例的创建、装箱；第二步完成组件实例的开箱，最后渲染 render 函数内的 vnode，进入 patch 函数
- 元素挂载流程 processElement：当 type 类型为 string 时，进入元素流程。其中分别处理 attribute 和 children ，最后挂载到容器上
- 为了在 render 函数中，能够使用 this 来获取特定的数据，例如 setup 中的返回值。创建一个 proxy 对象来代理 this 的 getter 方法，从 setupState 中获取值
- 以性能为主，使用位运算代替之前的分支判断
- setup(props, {emit})
  - 其一，将 props 作为 setup 的参数
  - 其二，emit 的本质是查找 props 中是否存在对应的 onEvent 函数，去调用该函数，其中使用了 bind 去改写了 emit 的 this 指向，使当前组件实例对象永远作为参数之一，不需要用户去额外传入

### 所得

- 新增功能时，尽量减少对已实现功能逻辑层的修改，最好在应用层做出区分
- 一个函数应该只负责一种功能的实现
- 函数的命名可以参照它的实现，如果出现长串的函数名，说明该函数仍具备重构的可能
- 在大部分情况下，优先使用公共工具函数
- 一个新的 API，尽量使用已有的 API 实现：利用两者的共同点，或者是相反点
- 小步骤的开发思想：先实现具体的功能，再进行通用化改造
