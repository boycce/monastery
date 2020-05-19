---
title: find
parent: Model
---

# `model.find`

Find document(s) in a collection and call related hook: `schema.afterFind`

### Arguments

1. `options` *(object)*
  - `options.query` *(object\|id)*
  - [`options.whitelist`] *(boolean|array)*: override `schema.findBl`. True will remove all blacklisting
  - [[`options.populate`](#populate)] *(array)*
  - [[`mongodb options`](http://mongodb.github.io/node-mongodb-native/3.2/api/Collection.html#find)]
2. [`callback`] *(function)*: pass instead of return a promise

### Returns

A promise if no callback is passed in.

### Example

```js
user.find({ query: "5ebdd6677466b95109aa278e" }).then(data => {
  // {..}
}) 

user.find({ query: { name: "Martin Luther" }}).then(data => {
  // [{..}]
})

user.find({ query: { name: "Martin Luther" }, limit: 100 }).then(data => {
  // [{..}]
})
```

### Populate

You are able to populate document references to other collections. Behind the scenes 
this uses mongodb's [$lookup](https://docs.mongodb.com/manual/reference/operator/aggregation/lookup/) aggregation operator which can also be passed full $lookup syntax for more control.

Populate is first enabled by including a reference to another document in the schema via `model`.
The value of the model reference should be an ID, e.g. `myPet = id`

```js
schema.fields = {
  myPet: {
    model: 'pet'
  }
}
```

You are then able to easily populate returned results via a find operation.

```js
user.find({ query: {...}, populate: ['myPet'] })
```

#### More control

If you would like more control you can either use monk's native 
[aggregate](https://automattic.github.io/monk/docs/collection/aggregate.html) function via 
`user._aggregate`, or simply pass $lookup syntax to populate.

```js
user.find({ 
  query: {...},
  populate: [{
    from: 'pet',
    localField: 'myPet',
    foreignField: '_id',
    as: 'myPet'
  }]
})
```
