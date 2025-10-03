```
const OrderEntity = createEntity({
// schema: ...
// actions:
})
const { mutations, props } = OrderEntity.create(orderDto);

// todo: props should be not immutable object
// mutation returns changed props slice
// each prop mutation be validated before happening (call zod.parse for each of props that mutation are returns)
```

```
в createAggregate от entities перейти к relations с лямбдами которые возвращают либо oneToOne, oneToMany, manyToOne, manyToMany

```
