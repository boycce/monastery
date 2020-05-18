---
title: model
parent: Manager
---

# `manager.model`

Sets up a model, and retrieves a collection

#### Arguments

1. `name` *(string)*: name of the mongo collection

2. [`schema`] *(object)*: Schema (and [Monk collection](https://automattic.github.io/monk/docs/manager/get.html) level options)

#### Returns

A [Model](../model) instance.

#### Example

```js
const user = db.model('user', schema)
```
