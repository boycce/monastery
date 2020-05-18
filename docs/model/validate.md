---
title: validate
parent: Model
---

# `model.validate`

Validate a model and call related hook: `schema.beforeValidate`


#### Arguments

1. `data` *(object)*: data to validate

#### Returns

A promise

#### Example

```js
// Initalise a model
db.model('user', {
  fields: {
    name: { type: 'string' },
    address: { city: { type: 'string', minLength: 10 } }
  }
})

db.user.validate({
  name: 'Martin Luther',
  unknownField: 'Some data'

}).then(data => {
  // { name: "Martin Luther" }
})

db.user.validate({
  name: 'Martin Luther'
  address: { city: 'Eisleben' }

}).catch(errs => {
  // [{
  //   detail: "Value needs to be at least 10 characters long.",
  //   status: "400",
  //   title: "address.city",
  //   meta: {
  //     field: "city",
  //     model: "user",
  //     rule: "minLength"
  //   }
  // }]
})
```
