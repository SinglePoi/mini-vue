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
- 实现 effect
  - effect.fn 应该立即执行一次，并且将 effect.fn 赋值给 activeEffect
  - effect 需要返回一个 runner 函数，由开发者去控制执行的时机
  - stop 函数可以在依赖队列中删除依赖的 effect，~~?但是只能生效一次~~
  - onStop 函数是 stop 的钩子函数，在执行 stop 函数时触发
  - 为了避免 stop 状态下，对依赖的重新收集，设置新的状态变量 shouldTrack

### 所得

- 新增功能时，尽量减少对已实现功能逻辑层的修改，最好在应用层做出区分
