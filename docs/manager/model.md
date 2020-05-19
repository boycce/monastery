---
title: model
parent: Manager
---

# `manager.model`

Sets up a model, retrieves a collection, and sets up any required indexes

### Arguments

1. `name` *(string)*: name of the mongo collection

2. [`schema`] *(object)*: [Schema](../schema) (and collection level options)

### Returns

A [model](../model) instance, the model instance will also be avaliable at:
```js
db.user
db.models.user
```

### Example

```js
const user = db.model('user', schema)
```
