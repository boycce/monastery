---
title: findOne
parent: Model
---

# `model.findOne`

Find a single document and call the model hook: `afterFind`

### Arguments

Same argument signature as [`model.find`](./find).

### Returns

A promise

### Example

```js
await user.findOne({ query: { name: "Martin Luther" }})
// {..}
```
