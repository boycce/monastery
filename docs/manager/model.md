---
title: model
parent: Manager
---

# `manager.model`

Sets up a model, retrieves a collection, and sets up any required indexes

### Arguments

`name` *(string)*: name of the mongo collection

[`definition`] *(object)*: [definition](../definition)

### Returns

A [model](../model) instance, the model instance will also be avaliable at:

```js
db.user
db.model.user
```

### Example

```js
const user = db.model('user', definition)
```
