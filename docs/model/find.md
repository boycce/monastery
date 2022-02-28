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
- [`options.sort`] *(string\|array\|object)*: same as the mongodb option, but allows string parsing e.g. 'name', 'name:1'
- [`options.blacklist`] *(array\|string\|false)*: augment `schema.findBL`. `false` will remove all blacklisting
- [`options.getSignedUrls`] *(boolean)*: get signed urls for all image objects
- [`options.project`] *(string\|array\|object)*: return only these fields, ignores blacklisting
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

### Blacklisting

You can augment the model's `schema.findBL` blacklist by passing a custom `blacklist`:

```js
// Prevents `name` and `pets.$.name` (array) from being returned.
user.find({ query: {}, blacklist: ['name', 'pets.name'] })
// You can also whitelist any blacklisted fields found in schema.findBL
user.find({ query: {}, blacklist: ['-name', '-pet'] })
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

### Custom Populate Query

If you would like more control you can either use monk's native
[aggregate](https://automattic.github.io/monk/docs/collection/aggregate.html) function via
`user._aggregate`, or simply pass a MongoDB lookup object to populate. When passing a lookup object, the
populated field still needs to be defined on the schema. See the examples below,

#### Populate a single document

(*Below is the same as using `populate: ['myBook']`.*)

```js
user.find({
  query: {...},
  populate: [{
    as: 'myBook',
    from: 'book',
    localField: 'myBook',
    foreignField: '_id'
  }]
})
```

#### Populate multiple documents into virtual fields

Below populates all books into `user.myBooks` with a `bookOwnerId` equal to the `user._id`. Since `myBooks`
isn't stored on the user, you will need define it as virtual field

```js
schema.fields = {
  myBooks: [{
    model: 'book',
    virtual: true
  }]
}

user.find({
  query: {...},
  populate: [{
    as: 'myBooks',
    from: 'book',
    let: { id: '$_id' },
    pipeline: [{
      $match: {
        $expr: {
          $eq: ['$bookOwnerId', '$$id']
        }
      }
    }]
  }]
})
```
