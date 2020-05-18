---
title: findOne
parent: Model
---

# `model.findOne`

Find a single document and call related hook: `schema.afterFind`

#### Arguments

Same argument signature as [`model.find`](/model/find).

#### Returns

A promise if no callback is passed in.

#### Example

```js
db.user.findOne({ query: { name: "Martin Luther" }}).then(data => {
  // {..}
})
```
