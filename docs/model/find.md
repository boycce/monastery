---
title: find
parent: Model
---

# `model.find`

Find document(s) in a collection and call the model hook: `afterFind`

### Arguments

`options` *(object)*

- `query` *(object\|id)*
- [[`blacklist`](#blacklisting)] *(array\|string\|false)*: augment `definition.findBL`. `false` will remove all blacklisting
- [`getSignedUrls`] *(boolean)*: get signed urls for all image objects
- [[`populate`](#populate)] *(array)*
- [`project`] *(string\|array\|object)*: return only these fields, ignores blacklisting
- [`sort`] *(string\|array\|object)*: same as the mongodb option, but allows string parsing e.g. 'name', 'name:1'
- [[`any mongodb option`](http://mongodb.github.io/node-mongodb-native/3.2/api/Collection.html#find)] *(any)*

[`callback`] *(function)*: pass instead of return a promise

### Returns

A promise if no callback is passed in.

### Example

```js
await user.find({ query: "5ebdd6677466b95109aa278e" })
// {..}

await user.find({ query: { name: "Martin Luther" }})
// [{..}]

await user.find({ query: { name: "Martin Luther" }, limit: 100 })
// [{..}]
```

### Blacklisting

You can augment the model's `definition.findBL` blacklist by passing a custom `blacklist`:

```js
// Prevents `name` and `pets.$.name` (array) from being returned.
user.find({ query: {}, blacklist: ['name', 'pets.name'] })
// You can also whitelist any blacklisted fields found in definition.findBL
user.find({ query: {}, blacklist: ['-name', '-pet'] })
```

### Populate

You are able to populate document references to other collections. Behind the scenes
this uses mongodb's [$lookup](https://docs.mongodb.com/manual/reference/operator/aggregation/lookup/) aggregation operator which can also be passed full $lookup syntax for more control.

Populate is first enabled by including a reference to another document in the field-type via `model`.
The value of the model reference should be an ID, e.g. `myBook = id`

```js
{
  fields: {
    myBook: {
      model: 'book'
    }
  }
}
```

You are then able to easily populate returned results via a find operation.

```js
user.find({ query: {...}, populate: ['myBook'] })
```

You can also populate within embedded document fields. Although at this time arrays are not supported,
you would need to use the [example below](#populate-multiple-documents-into-virtual-fields).
```js
user.find({ query: {...}, populate: ['myBooks.book'] })
```

### Custom Populate Query

If you would like more control you can either use monk's native
[aggregate](https://automattic.github.io/monk/docs/collection/aggregate.html) function via
`user._aggregate`, or simply pass a MongoDB lookup object to populate. When passing a lookup object, the
populated field still needs to be defined in `definition.fields` if you want to call any related hooks,
and prune any blacklisted fields. See the examples below,

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
{
  fields: {
    myBooks: [{
      model: 'book',
      virtual: true
    }],
  },
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
