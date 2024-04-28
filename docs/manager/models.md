---
title: models
parent: Manager
---

# `manager.models`

Setup model definitions from a folder location

### Arguments

`path` *(string)*: path to model definitions, the filenames are used as the corresponding model name. Make sure the model definition is exported as the default

### Returns

A promise with an array of [model](../model) instances, the model instances will also be available at:
```js
db.{model-name}
db.models.{model-name}
```

### Example

```js
// ./models/user.js
export default { // Make sure the model definition is exported as the default
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
await db.models(__dirname + "models")
```
