---
title: find
parent: Model
---

# `model.find`

Find document(s) in a collection, and call the model hook: `afterFind`

### Arguments

`options` *(object)*

- `query` *(object\|id)*: [`MongoDB query document`](https://www.mongodb.com/docs/v5.0/tutorial/query-documents/), or id
- [[`blacklist`](#blacklisting)] *(array\|string\|false)*: augment `definition.findBL`. `false` will remove all blacklisting
- [`getSignedUrls`] *(boolean)*: get signed urls for all image objects
- [[`populate`](#populate)] *(array)*
- [`project`] *(string\|array\|object)*: return only these fields, ignores blacklisting
- [`sort`] *(string\|array\|object)*: same as the mongodb option, but allows string parsing e.g. 'name', 'name:1'
- [[`any mongodb option`](https://mongodb.github.io/node-mongodb-native/5.9/classes/Collection.html#find)] *(any)*

### Returns

A promise

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
    myBook: { model: 'book' },
    myBooks: [{ model: 'books' }], // you can even populate arrays
  }
}
```

You are then able to easily populate the returned results in the find method:

```js
user.find({ query: {...}, populate: ['myBook', 'myBooks', ...] })
```

You can also populate within embedded document fields.
```js
user.find({ query: {...}, populate: ['myBooks.book'] })
```

### Custom Populate Query

If you would like more control you can either use Mongo's `aggregate` method via [`model._aggregate`](./rawMethods), or simply pass a MongoDB lookup object to `populate`. When passing a lookup object, the
populated field still needs to be defined in `definition.fields` if you want Monastery to process any related hooks, field blacklisting and default values. See the example belows,

#### Populate a single document

(*Below is the same as using `populate: ['myBook']`.*)

```js
user.find({
  query: {...},
  populate: [{
    as: 'myBook',
    from: 'book',
    foreignField: '_id',
    localField: 'myBook',
  }]
})
```

#### Populate multiple documents into virtual fields

Below populates all books into `user.myBooks` with a `bookOwnerId` equal to the `user._id`. Since `myBooks` isn't stored on the user, you will need define it as virtual field.

```js
db.model('user', {
  fields: {
    name: { type: 'string' },
    myBooks: [{ model: 'book', virtual: true }],
  },
})
db.model('book', {
  fields: {
    bookTitle: { type: 'string' },
    bookOwnerId: { model: 'user' },
  },
})

// books and user inserted here...

user.find({
  query: {...},
  populate: [{
    as: 'myBooks',
    from: 'book',
    let: { userId: '$_id' },
    pipeline: [{
      $match: {
        $expr: {
          $eq: ['$bookOwnerId', '$$userId']
        }
      }
    }]
  }]
})
```
