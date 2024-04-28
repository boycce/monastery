---
title: count
parent: Model
---

# `model.count`

Count document(s) in a collection

### Arguments

`options` *(object)*

- `query` *(object\|id)*: [`MongoDB query document`](https://www.mongodb.com/docs/v5.0/tutorial/query-documents/), or id
- [[`any mongodb option`](https://mongodb.github.io/node-mongodb-native/5.9/classes/Collection.html#count)] *(any)*

### Returns

A promise

### Example

```js
await user.count({ query: { name: "Martin Luther" }}) // 4
```
