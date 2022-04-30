---
title: findOneAndUpdate
parent: Model
---

# `model.findOneAndUpdate`

Find a document and update it in one atomic operation (unless using `opt.populate`), requires a write lock for the duration of the operation. Calls the following model hooks: `beforeUpdate`,  `afterUpdate`,  `afterFind`.

### Arguments

Same argument signatures as [`model.find`](./find) and [`model.update`](./update).

### Returns

A promise if no callback is passed in.

### Example

```js
await user.findOneAndUpdate({
  query: { name: "Martin" },
  data: { name: "Martin2" },
})
// { name: 'Martin2', ... }

// You can return a populated model which isn't atomic
await user.findOneAndUpdate({
  query: { name: "Martin" },
  data: { name: "Martin2" },
  populate: ['pet'],
})
// { name: 'Martin2', pet: {...}, ... }

// Blacklisting prunes the data and returned document
await user.findOneAndUpdate({
  query: { name: "Martin" },
  data: { name: "Martin2", age: 100 },
  blacklist: ['age'],
})
// { name: 'Martin2', ... }
```
