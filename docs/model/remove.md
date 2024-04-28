---
title: remove
parent: Model
---

# `model.remove`

Remove document(s) in a collection and calls model hooks: `beforeRemove`,  `afterRemove`

### Arguments

`options` *(object)*

- `query` *(object\|id)*: [`MongoDB query document`](https://www.mongodb.com/docs/v5.0/tutorial/query-documents/), or id
- [`sort`] *(string\|object\|array)*: same as the mongodb option, but  allows for string parsing e.g. 'name', 'name:1'
- [`multi`] *(boolean)*: set to false remove only the first document that match the query criteria
- [[`any mongodb option`](https://mongodb.github.io/node-mongodb-native/5.9/classes/Collection.html#deleteMany)] *(any)*

### Returns

A promise

### Example

```js
await user.remove({ query: { name: "Martin Luther" }})
```
