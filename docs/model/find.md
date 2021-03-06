---
title: find
parent: Model
---

# `model.find`

Find document(s) in a collection and call related hook: `schema.afterFind`

### Arguments

`options` *(object)*

- `options.query` *(object\|id)*
- [[`options.populate`](#populate)] *(array)*
- [`options.sort`] *(string\|object\|array)*: same as the mongodb option, but  allows for string parsing e.g. 'name', 'name:1'
- [`options.whitelist`] *(boolean\|array)*: override `schema.findBl`. `true` will remove all blacklisting
- [[`any mongodb option`](http://mongodb.github.io/node-mongodb-native/3.2/api/Collection.html#find)] *(any)*

[`callback`] *(function)*: pass instead of return a promise

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
The value of the model reference should be an ID, e.g. `myBook = id`

```js
schema.fields = {
  myBook: {
    model: 'book'
  }
}
```

You are then able to easily populate returned results via a find operation.

```js
user.find({ query: {...}, populate: ['myBook'] })
```

You can also populate within subdocument fields. Although at this time arrays are not supported,
you would need to use the [example below](#more-control).
```js
user.find({ query: {...}, populate: ['myBooks.book'] })
```

#### More control

If you would like more control you can either use monk's native
[aggregate](https://automattic.github.io/monk/docs/collection/aggregate.html) function via
`user._aggregate`, or simply pass $lookup syntax to populate.

```js
user.find({
  query: {...},
  populate: [{
    from: 'book',
    localField: 'myBook',
    foreignField: '_id',
    as: 'myBook'
  }]
})
```
