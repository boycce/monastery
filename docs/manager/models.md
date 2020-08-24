---
title: models
parent: Manager
---

# `manager.models`

Setup model definitions from a folder location

### Arguments

1. `path` *(string)*: path to model definitions, the filenames are used as the corresponding model name.

### Returns

An array of [model](../model) instances, the model instances will also be avaliable at:
```js
db.{model-name}
db.model.{model-name}
```

### Example

```js
// ./models/user.js
export default {
  fields: {
    name: { type: 'string', required: true },
    email: { type: 'email', required: true, index: 'unique' }
  },
  messages: {
    email: { required: 'Sorry, we require an email.' },
  }
}
```

```js
db.models(__dirname + "models")
db.user.insert()
```
