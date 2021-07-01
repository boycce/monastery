---
title: validate
parent: Model
---

# `model.validate`

Validate a model and call related hook: `schema.beforeValidate`


### Arguments

`data` *(object)*

[`options`] *(object)*

- [`options.skipValidation`] (string\|array): skip validation for this field name(s)
- [`options.blacklist`] *(array\|string\|false)*: augment the model's blacklist. `false` will remove all blacklisting
- [`options.timestamps`] *(boolean)*: whether `createdAt` and `updatedAt` are inserted, or `updatedAt` is updated, depending on the `options.update` value. Defaults to the `manager.timestamps` value
- [`options.update`] *(boolean)*: If true, required rules will be skipped, defaults to false

### Returns

A promise

### Example

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
### Blacklisting

Depending on the `update` option, you can augment the model's `schema.insertBL` or `schema.updateBL` by passing a custom `blacklist`:

```js
// Prevents `name` and `pets.$.name` (array) from being returned.
user.validate({}, { blacklist: ['name', 'pets.name'] })
// You can also whitelist any blacklisted fields found in schema's blacklist
user.validate({}, { blacklist: ['-name', '-pet'] })
```
