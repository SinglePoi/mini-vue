## mini-vue-annotation

本项目中 Vue3 的学习方式是：

- 编写测试用例
- 通过测试用例
- 重构代码，使其更有可读性

### 结构目录

空

### 其中

- 使用 jest 作为单元测试
  - 通过单元测试用例实现 Vue API 的功能
- 使用 TypeScript 作为类型系统
  - 标注结构类型，实现类似文档的作用，方便理解逻辑的流转
- 使用 rollup 打包，测试渲染相关功能

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
- 关于插槽，其实就是当 vnode 的 type 为组件时，这个时候走的是组件处理分支，此时 vnode 的 children 就是 slots
  - 具名插槽就是当 slots 为对象类型时，通过对象 key ，借用 renderSlots 工具函数根据 key 来进行对应的处理
  - 作用域插槽和具名插槽的处理方式类似，只不过是将 children 的属性值设置为了函数，这是为了方便子组件数据的传递，大致的思路是和 emit 差不多的。都是从目标对象中获取到对应属性名的属性值，然后调用的时候将准备好的变量通过函数参数进行传递
- Fragment：vnode 的 type 之一，在此之前，插槽节点都需要挂载到 div 节点下，使得在父子节点之间就会多出一个 div 节点。Fragment 解决了这个问题
- 目前为止，children 如果是一个数组，其中是不接受 string 字面量的。现在新增 Text 节点，当 vnode 为 Text 类型时，挂载 textNode
- getCurrentInstance 可以使用户在 setup 函数中获取到当前的虚拟节点对象
- provide/inject 具备跨组件传递的状态变量的能力，具备原型链的特点~因为是用原型链做的~，provide 的值是挂载到当前组件实例上的，如同 props slots 等
- 为了实现自定义 render API 的能力，重构 renderer.ts 的内容，以闭包的方式，使 createRenderer 作为上层函数，接受自定义的 render 函数。规定其创建节点的函数名为 createElement、渲染节点的函数名为 patchProp、挂载节点的函数名为 insert。createRenderer 函数返回 createAPI 节点，createAPI 函数由 createApp 函数重构而来，使 createAPI 作为上层函数，同样以 render 函数为参数。
- 视图的更新，同样通过 effect 的依赖收集和触发依赖实现。同时，为了满足对新老 vnode 的对比，扩容 patch 的参数个数，增加对更新前 vnode 的参数
- 满足以下条件时，节点的 attribute 应该更新。
  - 新老节点的属性值发生改变时 ----> 更新
  - 对比新老节点，新节点的某些属性值为 null 或 undefined 时----> 删除这些属性
  - 对比新老节点，新节点中不存在老节点中的属性时 ----> 删除不存在的属性
- 对于节点的更新，存在以下四种场景
  - 新节点为文本时，老节点为数组；删除老数组，新增新文本
  - 新节点为文本时，老节点也是文本；新文本覆盖老文本
  - 新节点为数组时，老节点是文本；清空老文本，新增新节点
  - 新节点为数组时，老节点也是数组；需要找到不同的节点，对其进行操作
    - 比较节点不同依靠的是双端对比算法：
      - 首先从左侧进行对比，直到节点不同，保留结束节点下标
      - 其次从右侧开始对比，直到节点不同，保留各自结束节点的下标
      - 判断是否相等的公式：当 node 的 type 或 key 相同时，可以认为两者节点时相同的
    - 最后处理中间乱序部分数组
      - 处理的方式有
        - 新节点存在于老节点上，将老节点移动到相应位置
        - 新节点存在，老节点不存在，新增新节点
        - 新节点不存在，老节点存在，删除老节点
- 组件的更新流程,在 setup 状态发生变更后触发。父组件的状态发生变更后，其 children 会进入更新流程，如果其 children 的一个成员是组件，此时，如果该组件的 props 没有发生过变化，不应该对它进行更新。因为父组件和子组件之间是通过 props 联系的
- 视图的更新应该是异步的，为了实现在本轮更新事件结束后，才执行更新函数的目的。采用微任务的形式，开辟一个任务队列，等待主流程执行完毕后，再将微任务推入主流程。而 nextTick 的作用就是将回调函数推入任务队列

### compiler-core

- 生成 AST
  - 解析的时候分两个步骤：1、查找目标，2、找到目标处理完毕后，推进开始位置
  - 插值解析条件：以 {{ 开头
  - 标签解析条件：满足首字母为 < 且第二位为字母
  - 文本解析条件：不满足以上两种 o.O
  - 联合解析：以开始标签起始，至结束标签为一轮；结束标签应该与开始标签相一致
- 实现 transform
  - 将可变与不变的代码块分开维护，可变部分由插件规则提供。
- 实现文本类型的 render 代码生成，主要还是通过模板字符串完成拼接
- 生成联合类型：我看不懂，怎么办

### 所得

- 新增功能时，尽量减少对已实现功能逻辑层的修改，最好在应用层做出区分
- 遵循‘单一职责’原则，一个函数应该只负责一种功能的实现；同时满足函数式编程的思想
- 函数的命名可以参照它的实现，如果出现长串的函数名，说明该函数仍具备重构的可能
- 在大部分情况下，优先使用公共工具函数
- 一个新的 API，尽量使用已有的 API 实现：利用两者的共同点，或者是相反点
- 小步骤的开发思想：先实现静态功能，再进行动态化改造
- 遵循‘变与不变’的分离原则，保持动态代码的灵活性和静态代码的封闭性
