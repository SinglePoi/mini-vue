<h1 align="center">hello-vue</h1> 
<p align="center"> vue 的简单实现 </p>

<p align="center"><img src="https://img.shields.io/badge/vue-code-blue?labelColor=green" alt="NPM version"></p>

### 结构目录

```
.
|-- packages
|   |-- compiler-core
|   |   |-- __tests__
|   |   |-- index.ts
|   |   |-- package.json
|   |   `-- src
|   |-- reactivity
|   |   |-- __tests__
|   |   |-- index.ts
|   |   |-- package.json
|   |   `-- src
|   |-- runtime-core
|   |   |-- __test__
|   |   |-- index.ts
|   |   |-- package.json
|   |   `-- src
|   |-- runtime-dom
|   |   |-- index.ts
|   |   |-- package.json
|   |   `-- src
|   |-- shared
|   |   |-- index.ts
|   |   |-- package.json
|   |   `-- src
|   `-- vue
|       |-- dist
|       |-- examples
|       |-- package.json
|       `-- src
|-- README.md
|-- babel.config.cjs
|-- package.json
|-- pnpm-workspace.yaml
|-- rollup.config.js
|-- tsconfig.json
`-- vitest.config.ts
```

## 技术栈

- :surfer: 单元测试 - 使用 vitest 代替 jest
- :pill: 类型校验 - ~~TypeScript？~~ AnyScript！
- :pencil2: 类库打包 - rollup

## 计划

- [x] 首先学习 mini-vue ，建立对 Vue 源码的初步印象，作为入门 Vue 源码学习的第一步
- [ ] 补全对数组、Set 以及 Map 的响应式拦截操作
- [ ] 通过官方的测试用例，补充完善功能代码，同步学习 TypeScript 的使用

## 介绍

### reactivity

####  实现 effect

effect 是响应式逻辑的载体，是 ReactiveEffect 的实例对象

effect 对象存在 run、stop 方法，其中 run 用于执行响应式逻辑；stop 用于暂缓响应式的执行，逻辑就是清空当前依赖项的所有依赖关系，使 trigger 方法无法执行响应式逻辑。但是可以调用 runner 函数，手动执行 effect 函数，但依赖仍然不会被收集

##### 具备的要求

- 副作用函数在定义时需要通过 run 方法立即执行一次，其中使 activeEffect 能够描述当前执行的 effect 

- 副作用函数的执行会返回一个 runner 函数，该函数的执行会导致响应式逻辑的再次执行，同时返回执行的结果。runner 函数指定 this 指向副作用函数本身

- 副作用函数存在第二个参数 options，作为函数的配置项

  - 其中存在调度器函数（scheduler），存在调度器的副作用函数在重新执行时会优先执行调度器函数，重新执行指的是除第一次执行外的后续执行

- 将 stop 的清空逻辑封装为 cleanupEffect 函数，以备复用。同时不再允许依赖的收集

- 为了反映 effect 的依赖状态，创建布尔类型的 active 变量，为 true 时代表该副作用函数的依赖关系仍然确立；执行过 stop 的副作用函数应该为 false，表示该副作用函数的依赖已经被清空，再次调用 stop 将不再执行

- onStop 回调函数在 stop 方法触发时执行，允许用户在 stop 时做额外的处理

- 为了避免 stop 状态下，对依赖的重新收集，设置全局状态变量 shouldTrack，初始值为 false，此时不应该进行依赖的收集

  - 正常执行 run 方法时，会将 shouldTrack 设置为 true，响应式逻辑执行完毕后，重置为 false

  - 如果此时调用 stop 函数，使 active 为 false，run 方法将直接返回响应式逻辑的执行结果，此时 shouldTrack 值为 false，不应该收集依赖

    ~~~ typescript
    run() {
    	if(!this.active){
    		return this._fn()
    	}
        shouldTrack = true
        const result = this._fn()
        shouldTrack = false
        return result
    }
    ~~~

#### 实现 reactive

通过 Proxy 实现，通过代理对象能够拦截对元素对象的多种语义操作；通过 Reflect 完成对拦截操作的默认实现，依靠 receive 使运行时 this 固定指向代理对象

为 get 拦截函数创建 createGetter 高阶函数，参数 isReadonly 默认为 false， shallow 默认为 false

##### 具备的要求

- get 中通过 track 实现收集依赖，如果已经收集过了，就不要再收集了 `dep.has(activeEffect)`
- set 中通过 trigger 实现触发依赖
- 依赖是否收集需要通过 activeEffect 和 shouldTrack 判断
  - 在没有定义 effect 函数时，track 函数 中的 activeEffect 为 undefined，此时不应该收集依赖
  - shouldTrack 为 false 时，也就是 stop 执行之后，不应该收集依赖
  - 通过 isTracking() 函数统一状态变量，当 shouldTrack 为 true 时，且 activeEffect 不为 undefined 时，返回 true，认为依赖正在被收集
- readonly 对对象的 set 方法进行拦截，阻止对值的更改且输出提示（在开发环境中）
- reactive 默认的深层次代理，如果 get 拦截方法的返回值仍然是一个对象，且 isReadonly 为 false 时，使用 reactive 去代理返回值
- readonly 默认的深层代理，如同 reactive 的思路，且当 isReadonly 为 true 时，使用 readonly 代理返回值
- shallowReadonly 的实现在于：在 shallow 参数为 true 时，不再对返回值使用 readonly 代理，使代理的转化止于第一层

##### 工具函数

​	枚举 ReactiveFlags 包含了 `__v_isReadonly` 和 `__v_isReactive` 

- isReactive(): 目标值是否是通过 reactive() 创建的；当 get 拦截函数的 key 为 ReactiveFlags.isReactive 时，返回 !isReadonly 的值；为了应对非响应式数据无法拦截 get 函数，同时不存在 ReactiveFlags.isReactive 属性时，值为 undefined 的问题，采用 !! 将值转为布尔值后返回
- isReadonly(): 目标值是否是通过 readonly() 创建的；当 get 拦截函数的 key 为 ReactiveFlags.isReadonly 时，返回 isReadonly 的值；为了应对非响应式数据无法拦截 get 函数，同时不存在 ReactiveFlags.isReadonly 属性时，值为 undefined 的问题，采用 !! 将值转为布尔值后返回
- isProxy(): 目标值能否满足 isReactive 和 isReadonly 其中之一

#### 实现 ref

通过 RefImpl 类实现，通过对 value 的 getter/setter 方法；为了满足响应式的需求，封装 track 方法中进行依赖收集的逻辑为 trackEffects 函数，其参数为 dep。在 getter 方法中触发；封装 trigger 方法中进行触发依赖的逻辑为 triggerEffects 函数，其参数为 dep。在 setter 方法中触发

##### 具备的要求

- 和 reactive 一样，需要处理没有定义 effect 函数的情况。当 isTracking() 为 true 时，才应该收集依赖
- ref 对 value 赋值时需要满足新旧值不同的要求，因此采用 Object.is() 设立对比条件
- 如果 ref 的目标是一个非原始类型，则需要调用 reactive 进行代理；同时为了满足对比的需求，对 ref 实例对象添加 _rawValue 属性用于存储原始值，将旧值与原始值做对比。
- 参数是非原始类型数据时，将其转化为 reactive，同时仍然需要使用 .value 获取转换后的代理对象

##### 工具函数

- isRef(): 判断是否是 RefImpl 的实例对象
  - 新建 `__v_isRef` 属性，初始值为 true，通过 !! 返回布尔值
- unRef(): 接受 ref 作为参数，返回值本身
  - 对于满足 isRef 判定的值，返回 .value，否则原样返回
-  proxyRef(): 使用 Proxy 创建代理对象，拦截参数的 get/set 操作
  - get：取值时需要判断原始数据是否是 ref 数据
    - 如果是 ref 数据，返回 value 的读取结果
    - 如果不是 ref 数据，返回原始数据
    - 直接使用 unRef 转换返回值即可
  - set：赋值时需要判断原始数据是否是 ref 数据
    - 如果新值不是 ref 数据，但原始值是 ref 数据，需要对原始值的 value 进行赋值
    - 如果新值是 ref，直接覆盖原始值

#### 实现 computed

通过 ComputedRefImpl 类实现，和 RefImpl 一样，实现对 value 的取操作

##### 具备的要求

- 第一次执行时，并不会去调用用户传递的 getter 函数

- computed 表现和 ref 差不多，都是通过 .value 求值，最大的不同点在于，computed 具备缓存能力：如果新值没有发生变化，computed 的执行返回缓存的值
  - 如何缓存？第一次执行时，将结果缓存；下次执行时，如果依赖目标没有发生变化，直接返回缓存的值
  - 如何判断依赖目标有没有发生变化？设置 _dirty 状态变量，初始值为 true。当值为 true 时认为响应式对象发生变化，computed 内部的逻辑应该执行。每次执行 getter 时，更新为 false 。响应式对象发生变化时，借用 effect 的 scheduler 能力：每当 effect 触发时，执行 scheduler 使中间值的状态变更为 true
- computed 返回实例对象，当用户执行 value 读取操作时，computed 才会再次执行
- computed 应该内部创建一个副作用函数用于建立依赖关系
  - 在构造函数中，通过 ReactiveEffect ，将用户传入的 getter 函数作为响应式逻辑，创建实例对象，将其设置到 _effect 属性上
  - 此时 computed 的取值操作应该返回 _effect.run() 的值
  - 创建一个调度函数作为 ReactiveEffect 的第二个参数传递，调度函数中需要将 _dirty 重新赋值为 true，此时认为依赖目标发生了变化

#### runtime-core

将编译后的 render 函数渲染为真实 DOM的结构，由 setup 函数完成对真实 DOM 数据的填充，其中包含 class、props、响应式数据等。当依赖的响应式数据发生更新后，DOM 节点也应该随之更新

##### 组件的挂载流程

Step1 通过 createVNode 方法创建 vnode，接收的三个参数，第一个参数有两种情况（组件或元素标签），返回创建的 vnode

Step2 将 vnode 传递给 render 函数（该 render 不是组件中的 render），在 render 函数中，调用 patch 函数

Step3 在 patch 函数中，通过分析 type 的类型为 Object，判断本次补丁对象是一个组件，随之进入组件补丁流程

Step4 在组件补丁流程中，通过判断其旧节点不存在，意味着本次需要进入挂载组件流程

Step5 在组件挂载流程中，创建组件实例，实例中通过属性 vnode 缓存了 vnode 的信息。然后要对组件实例进行挂载操作，在其中要完成 props、slots 以及对实例绑定 setup 的状态的任务

Step6 通过组件实例对象的 vnode 属性获取到 vnode，执行其中的 setup 函数，返回值会有两种类型：函数与对象。如果是函数，认为该函数是组件的 render 函数；如果是对象，需要将其赋值给组件实例对象的 setupState 属性

Step7 确保组件实例中存在 render 函数，需要将 vnode 的 render 函数赋值给组件实例。只有 render 函数才能返回最终要渲染的虚拟节点

Step8 在将组件实例组装完毕之后，通过执行实例对象的 render 方法，得到最终要渲染的虚拟节点树。接着以虚拟节点树作为参数，通过 patch 函数进行补丁操作

h 函数本质就是调用了 createVNode 函数

##### HTML 标签的挂载流程

Step1 通过 patch 函数进入元素流程，如果旧标签不存在，进入标签挂载流程

Step2 通过 createElement 创建标签，设置标签的内容和属性，通过 append 渲染到页面

Step3 遍历虚拟节点的 props 对象，使用 setAttribute 来设置标签的属性

Step4 标签的内容存在两种情况：是文本时，直接使用 textContent；是数组时，遍历 children，通过 patch 补丁每一个子成员

##### 具体的说明

- patch 函数内部的分支

  - 组件挂载流程 processComponent ：当 type 类型为 object 时，进入组件流程。目前会直接执行 mountComponent 函数，其中第一步完成对组件实例的创建、装箱；第二步完成组件实例的开箱，最后渲染 render 函数内的 vnode，进入 patch 函数

  - 元素挂载流程 processElement：当 type 类型为 string 时，进入元素流程。其中分别处理 attribute 和 children ，最后挂载到容器上
  
- 为了在 render 函数中，能够使用 this 来获取特定的数据，例如 setup 或 $el 等。需要创建一个 代理对象来拦截取值方法。在执行 render 函数时，使其 this 指向这个代理对象，这样在 render 函数中就可以使用 this 来获取特定的值了

- 以性能为主，使用位运算代替之前的分支判断，这部分内容包含在 ShapeFlags 中
  - 位运算 | 或 ：用于设置 ShapeFlags 枚举的值
    - 两位都是 0，才为 0；（0001 | 0001 === 0001 或 0000 | 0001 === 0001）
    - 例如 ShapeFlage.element  | 0001，就是设置 ShapeFlage.element 为 1；

  - 位运算 & 和：用于匹配 ShapeFlags 枚举的值
    - 两位都为 1，才为 1；（0001 & 0001 === 0001 或 0000 & 0001 === 0000）
    - 例如表达式 ShapeFlags.element & 0001 === 0001 ，为 true 时说明 ShapeFlags.element 的值是 0001
  
- 为元素绑定事件，在挂载 mountElement 流程中，如果 props 的 key 以 on 开头且之后的单词首字母是大写的（正则表达式可以写成 /^on[A-Z]/），可以认为是事件，此时需要 addEventListener

- 实现 setup(props, {emit})
  - props 的要求：
    - 能够在组件 setup 里使用 props： setupStatefulComponent 方法中获取 setup 返回值时，将 props 作为 setup 的参数传递
    - 能够在组件 render 函数中通过 this 获取到 props 的值，主要原因在于：之前为 this 能够获取到特定值而创建过代理对象，props 同样在这个代理对象的 get 拦截函数中，如果 key 存在 props 中，返回 props[key]
    - props 是只读的：但只对首层进行只读处理，因此使用 shallowReadonly 包含
    - 对于边界的处理：如果 props 不是一个对象类型，应该给予警告；或者在初始化 props 时默认给予空对象
  
  - emit 的要求：
    - emit 的本质是调用在父组件中为子组件注册的事件。而组件的事件都是存在 props 中的，于 mountElement 方法中挂载。emit 查找到本组件中同名的事件函数（ emit add -> props onAdd），然后使用 bind 将当前组件实例对象作为参数传入，使事件函数绑定实例对象，用户只需要关注 emit 的事件名和其余入参即可
    - 除了 add 以外还应该支持中划线命名 add-foo。通过正则表达式 /-(\w)/g 来匹配 -x 格式的内容，之后将组内容大写，就能得到 X，再与之前的内容拼接即可
  
- 关于插槽，其实就是当 vnode 的 type 为组件时，这个时候走的是组件处理分支，此时 vnode 的 children 就是 slots

  - 对于父组件来说，插槽就是子组件的子组件；同时插槽在 vnode.type 为组件时才有效

  - 为了配合插槽的使用，子节点的 render 函数内部需要通过 slots 获取插槽内容，将其渲染到指定位置
  - slots 的实现：
    - slots 也是在 render 内部通过 this.$slots 获取的，自然也是依靠 this 代理对象的 getter 拦截函数返回插槽内容
    - 返回的 slots 值是从哪里获取的呢？在 setupComponent 的内部，initProps 完成之后的 initSlots 函数中。此时知道组件的 children 就是 slots，所以在 initSlots 函数内部可以暂时直接将 children 赋值给实例对象的 slots 函数。getter 拦截函数就可以返回 slots 了
    - 针对 slots 是数组的情况，创建 renderSlots 函数将 slots 转换为数组，也就是 [slots]
  - 具名插槽的实现
    - 为了满足这个要求，使用插槽时，children 需要用对象代替数组，使插槽具备 key: slot 格式
    - 修改 renderSlots 工具函数，接受 key 作为参数传入。内部逻辑根据 key 的值，将 slot 挂载到指定的位置
    - 针对 slots 是对象的情况，修改 renderSLots 函数，通过遍历 slots 将 slot 逐个转化为数组0
  - 作用域插槽的实现
    - 作用域插槽的表现，子组件内部能够向外部传递值，听起来很像 emit。所以外部的 slot 应该是一个函数，参数就是内部传递的值，其作为回调函数被内部调用，调用时将需要暴露的值作为参数传入
  - 总结：
    - 当 children 是一个对象时，认为此时的 children 是一个插槽
    - slots 是键值对的，但是值是函数，其参数为子组件需要传递给父组件的状态变量
    - 既然 children 是一个对象，ShapeFlags 自然要新增一个 SLOT_CHILDREN 选项。同时在 createVNode 初始化 vnode 时，为 vnode.shapeFlage 设置对应的二进制位
  
- Fragment：
  - 表现：和 DocumentFragment 作用相似，作为 vnode.type 的内容之一，使 children 可以跳过该容器直接挂载到父容器上。在此之前，子节点都需要挂载到父节点下，使得在祖孙节点之间就会多出一个节点。Fragment 可以使子节点直接挂载到祖节点下
  - 代码中体现在：新增了 processFragment 分支，在该函数中直接调用 mountChildren 函数，将祖组件作为容器传入
  
- Text：
  - 目前为止，children 如果是一个数组，其中是不接受 string 字面量的。现在新增 Text 节点，当 vnode 为 Text 类型时，挂载 textNode
  - 代码中体现在：新增 createTextVNode 函数，在组件的 render 函数中将目标字符串作为参数传入。函数内部调用 createVNode 创建 vnode，vnode.type 的值为 Text = Symbol('Text')。
    - 新增 processText 分支，在该函数中通过 document.createTextNode 创建 textNode，将其直接 append 到父容器下
  
- getCurrentInstance 可以使用户在 setup 函数中获取到当前的虚拟节点对象
  - 代码实现：为了能够获取到当前的组件实例对象，需要在 setupStatefulComponent 函数，也就是在执行 setup 获取组件状态变量之前，将 instance 赋值给 currentInstance 全局变量
  - getCurrentInstance 的逻辑就是返回 currentInstance 的内容
  - 在 setup 函数执行完毕之后，清空 currentInstance 的值
  - 为什么要在 setup 执行后清空？以为 getCurrentInstance 方法只能在组件的 setup 函数中调用，用来获取当前的组件实例对象，setup 函数执行完毕后自然不需要保持 currentInstance 的内容了
  
- provide(key, value) / inject(key)
  - 需要具备跨组件传递的状态变量的能力

  - 初始化 provides 时，默认值为 parent.provides，否则为 {}
    - 存在的问题：parent.provides 是引用类型，设置本组件的 provides 时，会设置到父组件的 provides 上，本质上两者都是同一个引用
    - 理想的结果：赋值时，能够在得到 parent.provides 属性的前提下，也能够设置自己的 provides ；取值时，如果本组件没有就去查找父组件，父组件没有就去查找祖组件，一直向上找。这不就是原型链吗？
    - 解决的方法：使用 Object.create(parentProvides) 创建原型为 parentProvides 的对象，且将该对象赋值给 currentInstance.provides 。同时需要保证只有在初始化的时候创建原型对象，设置条件：当 currentInstance.provides === parentInstance.provides 时。为什么设置这个条件？因为对 provides 初始化时，默认值为 parent.provides，此时是相等的，但是赋值完毕后，两者就不同了

  - 只能在组件的 setup 中使用，因为是通过 getCurrentInstance 获取的组件实例
  - provide(key, value)
    - 得到组件实例后，对 instance.provides 赋值：provides[key] = value

  - inject(key, defaultValue)
    - 得到父组件的实例后，对 parentInstance.provides 取值：provides[key]
    - 父组件实例怎么获取？currentInstance.parent 
    - 增加默认值，如果 parent.provides 不存在 key，则使用 defaultValue 作为默认值
  
- 为了实现多平台渲染的能力，需要由用户传递对应平台的视图操作方法，将其封装为指定的 createElement、insert、patchProps 方法等。以浏览器平台为例，这部分方法被封装在了 runtime-dom 包里
  - 通过 createRenderer 高阶函数将原本静态的 render 能力封装，用于接收用户传递的操作方法，填充在 render 函数指定的操作函数位置上
  - 同时，因为封装了 render 函数，导致之前 mount 方法里的 render 失效。为了解决这个问题，将原先的 createApp 方法封装为 createAppAPI 高阶函数，该高阶函数接收 render 作为参数，这样 mount 方法里的 render 函数就能正常使用了。还要将 createAppAPI 暴露出去
  - 为了兼容之前 createApp().mount() 的组件挂载方式，导入 runtime-dom 提供的 createApp 函数，该函数返回 renderer 的 createApp 方法
  - 而 renderer 对象正是高阶函数 createRenderer 的返回值，其 createApp 方法正是 createAppAPI 方法的别名。这样一来，在 runtime_dom 中调用的 createApp 方法实际就是 createAppAPI 方法，即原先的 createApp 方法

- 怎样监听视图依赖变量的更新？还记得 render 函数中 this 的代理对象吗，在代理对象中拦截了 get 操作，这样就可以利用 effect 来进行依赖收集了
  - 首先，在 setupRenderEffect 函数中，用 effect 包裹 render 函数，在 render 函数内会触发状态变量的 get 函数，使 render 函数被依赖收集
  - 当状态变量发生变更，需要判断 instance.isMounted 的值是否为 true，为 true 说明组件需要更新；
  - 无论 isMounted 的值是什么，都会触发收集的 render 函数，这样就会返回一个全新的 vnode。这样才能继续操作
  - 如果 isMounted 的值是 false，进入挂载分支，此时 render 函数返回的 subTree 同时需要赋值给组件实例的 subTree 属性，作为更新时的老节点
  - 如果 isMounted 的值是 true，进入更新分支，此时通过 render 函数得到新的 subTree，通过 instance.subTree 得到老节点
    - 当然还要将新的 subTree 赋值给 instance.subTree

- 满足以下条件时，节点的 attribute 应该更新。
  - 新老节点的属性值发生改变时 ----> 更新
    - 实现：新增 element 更新流程，通过 n1 和 n2 获取新旧 props
    - 新建 patchProps 函数，函数内首先遍历新 props，通过 key 得到新老 props 对应的 value。比对新老 prop，如果不等，进入 hostPatchProp 方法
    - hostPatchProp 就是 patchProp 方法，是用户传入的自定义视图操作方法。
  - 对比新老节点，新节点的某些属性值为 null 或 undefined 时----> 删除这些属性
    - 如果新 prop 是 null 或 undefined ，使用 removeAttribute 删除属性
  - 对比新老节点，新节点中不存在老节点中的属性时 ----> 删除不存在的属性
    - 遍历老 props，如果 prop 不在新 props 中，删除 prop
  
- 对于节点的更新，存在以下四种场景
  - 新节点为文本时，老节点为数组：删除老数组，新增新文本
  
  ```js
  // 删除节点
  function remove() {
      const parent = child.parentNode
      if(parent) {
          parent.removeChild(child)
      }
  }
  
  // 需要注意，文本节点要删除的节点是父节点
  function setElementText(el, text) {
      el.textContent = text
  }
  ```
  
  - 新节点为文本时，老节点也是文本；新文本覆盖老文本
  
    - 需要比对新老文本内容是否相同，然后调用 setElementText 方法
  
  - 新节点为数组时，老节点是文本；清空老文本，遍历挂载数组节点
  
    - 清空：setElementText(el, "")
    - 挂载：mountChildren
  
  - 新节点为数组时，老节点也是数组；需要找到不同的节点，对其进行操作
    - 通过对比算法快速过滤掉相同的节点：
      - 首先从左侧进行对比，直到节点不同，保留结束节点下标
      - 其次从右侧开始对比，直到节点不同，保留各自结束节点的下标
      - 判断是否相等的公式：当 node 的 type 或 key 相同时，可以认为两者节点时相同的
      - 假设有一方被完全遍历：
      - 老数组遍历完毕，新数组还有剩余。这个判断条件是：i > e1 && i <= e2 
        - 左侧对比完成后，新数组剩余节点应该挂载到尾部。这里的条件是 e2 + 1 > l2
        - 右侧对比完成后，新数组剩余节点应该挂载到锚点之前。锚点是 e2 + 1，条件是 e2 + 1 <= l2
        - 这里需要注意：将 append 改成了 insertBefore，insertBefore 需要一个锚点节点，将 el 挂载到锚点节点之前，如果锚点是 null， 就会挂载到容器的末尾，和 append 效果一样
      - 新数组遍历完毕，老数组还有剩余。这个判断条件是：i > e2
        - 左侧对比完成后，将老数组剩余成员用 remove删除
        - 右侧对比完成后，条件是 i >= e2 && i == e1
    - 最后处理中间乱序部分数组
    - 删除
      - 这部分内容也需要对比
      - 首先是建立新数组节点和索引的映射表
      - 遍历老数组
      - 如果用户给了 key
        - 通过 key 判断是否存在可复用节点 map.get(key)，接收节点在新数组中的索引
      - 否则，遍历新数组，每次判断新老节点是否相同。当发现相同节点就跳出当前循环。接收节点在新数组中的索引
      - 最后，如果索引为 undefined，表示新数组不存在节点，应该删除
      - 如果索引有值，继续调用 patch 补丁函数
      - 如果在新数组全部遍历完的情况下，老数组还有值，说明这些值都是不需要的，直接删除即可
  
    - 移动
      - 创建 newIndexToOldIndexMap 映射表，填充为 0 
        - 该表的数据结构是：新节点的下标：对应老节点的下标
      - 通过映射表算出新节点索引的最长递增子序列，与老数组做对比
        - 不在序列中的老节点需要移动位置
  
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

### rollup

安装

```shell
pnpm add rollup -D
// pnpm add tslib -D
```

rollup.config.js

```js
export default = {
    input: './src/index.js'
    output: [
        {
            format: 'cjs',
            file: 'lib/mini-vue.cjs.js'
        },
    	{
            format: 'es',
            file: 'lib/mini-vue.esm.js'
        }
    ],
    // pnpm add @rollup/plugin-typescript -D
    plugins: [typescript()]
}
```

package.json

```json
script: {
    // -c 指定配置文件
    build: 'rollup -c rollup.config.js'
}
```

## 收获

- 新增功能时，尽量减少对已实现功能逻辑层的修改，最好在应用层做出区分
- 遵循‘单一职责’原则，一个函数应该只负责一种功能的实现；
- 函数的命名应该参照它的实现，如果出现长串的函数名，说明该函数仍具备重构的可能
- 在大部分情况下，优先使用公共工具函数
- 一个新的 API，尽量使用已有的 API 实现：利用两者的共同点，或者是相反点
- 小步骤的开发思想：先实现静态功能，再进行动态化改造
- 遵循‘变与不变’的分离原则，保持变化部分的灵活性和不变部分的稳定性

## 感谢

- [Vue](https://github.com/vuejs/core) - 由 Vue 开发人员提供的优秀项目
- [mini-vue](https://github.com/cuixiaorui/mini-vue) - 由崔大提供的 vue3 学习模型
- [稀土掘金](https://juejin.cn/) - 在学习过程中给予了很多灵感
