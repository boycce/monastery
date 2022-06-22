---
title: validate
parent: Model
---

# `model.validate`

Validate a model and calls the model hook: `beforeValidate`


### Arguments

`data` *(object)*

[`options`] *(object)*

- [`skipValidation`] (string\|array\/boolean): skip validation for thse field name(s), or `true` for all fields
- [[`blacklist`](#blacklisting)] *(array\|string\|false)*: augment the model's blacklist. `false` will remove all blacklisting
- [`project`] *(string\|array\|object)*: project these fields, ignores blacklisting
- [`timestamps`] *(boolean)*: whether `createdAt` and `updatedAt` are inserted, or `updatedAt` is updated, depending on the `update` value. Defaults to the `manager.timestamps` value
- [`update`] *(boolean)*: If true, required rules will be skipped, defaults to false

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

await db.user.validate({
  name: 'Martin Luther',
  unknownField: 'Some data'
})
// { name: "Martin Luther" }

await db.user.validate({
  name: 'Martin Luther'
  address: { city: 'Eisleben' }
})
// Error [{
//   detail: "Value needs to be at least 10 characters long.",
//   status: "400",
//   title: "address.city",
//   meta: {
//     field: "city",
//     model: "user",
//     rule: "minLength"
//   }
// }]
```

### Blacklisting

Depending on the `update` option, you can augment the model's `insertBL` or `updateBL` by passing a custom `blacklist`:

```js
// Prevents `name` and `pets.$.name` (array) from being returned.
user.validate({}, { blacklist: ['name', 'pets.name'] })
// You can also whitelist any blacklisted fields found in insertBL/updateBL
user.validate({}, { blacklist: ['-name', '-pet'] })
```
