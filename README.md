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

- 实现 reactive
  - 通过 Proxy 实现
    - get 中通过 track 实现收集依赖（activeEffect）
    - set 中通过 trigger 实现触发依赖（activeEffect）
    - 依赖是否收集需要通过 activeEffect 和 shouldTrack 判断
    - readonly 对对象的 set 方法进行拦截，阻止对值的更改且输出提示
    - reactive 默认的深层次代理，是通过对上层代理的 Reflect.get 返回的值在进行一次 reactive；当然，需要判断是否是对象类型
    - readonly 默认的深层代理，如同 reactive 的思路
    - shallowReadonly 的实现在于：在 shallow 状态为 true 时，直接返回上层代理的返回值
- 实现 effect
  - effect.fn 应该立即执行一次，并且将 effect.fn 赋值给 activeEffect
  - effect 需要返回一个 runner 函数，由开发者去控制执行的时机
  - stop 函数可以在依赖队列中删除依赖的 effect，~~?但是只能生效一次~~
  - onStop 函数是 stop 的钩子函数，在执行 stop 函数时触发
  - 为了避免 stop 状态下，对依赖的重新收集，设置新的状态变量 shouldTrack
- 实现 ref
  - ref 目标参数是原始类型，同时又需要收集 effect，因此采用 class 的存取器函数实现；这也是 ref 的值需要通过 .value 来获取的原因
  - 如果 ref 的实参是一个对象类型，则调用 reactive 代理参数
  - ref 的 setter 函数需要对新老值进行对比，同时要兼容对象类型，因此采用 Object.is()
  - 也因为要对比对象类型的值，需要在 reactive 代理之前存储这个对象

### 所得

- 新增功能时，尽量减少对已实现功能逻辑层的修改，最好在应用层做出区分
- 一个函数应该只负责一种功能的实现
- 函数的命名可以参照它的实现，如果出现长串的函数名，说明该函数仍具备重构的可能
- 在大部分情况下，优先使用公共工具函数
- 一个新的 API，尽量使用已有的 API 实现：利用两者的共同点，或者是相反点
