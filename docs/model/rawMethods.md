---
title: ...collection methods
parent: Model
nav_order: 9
---

# Collection Methods

These MongoDB collection methods are made available if you need to test or run any method without hooks or Monastery argument/return processing.

These methods can be accessed via `model._*`.

## Returns

All methods return a promise.

## Methods

  * model.[_aggregate](#model_aggregate)
  * model.[_bulkWrite](#model_bulkwrite)
  * model.[_count](#model_count)
  * model.[_createIndex](#model_createindex)
  * model.[_createIndexes](#model_createindexes)
  * model.[_distinct](#model_distinct)
  * model.[_drop](#model_drop)
  * model.[_dropIndex](#model_dropindex)
  * model.[_dropIndexes](#model_dropindexes)
  * model.[_find](#model_find)
  * model.[_findOne](#model_findone)
  * model.[_findOneAndDelete](#model_findoneanddelete)
  * model.[_findOneAndUpdate](#model_findoneandupdate)
  * model.[_indexes](#model_indexes)
  * model.[_indexInformation](#model_indexinformation)
  * model.[_insert](#model_insert)
  * model.[_remove](#model_remove)
  * model.[_stats](#model_stats)
  * model.[_update](#model_update)

### [`model._aggregate`](https://mongodb.github.io/node-mongodb-native/5.9/classes/Collection.html#aggregate)

  Execute an aggregation framework pipeline against the collection. Arguments: 

  1. `Pipeline` *(array)*
  2. `[Options]` *(object)*

  ```js
  await users.aggregate([
    { $project : { author : 1, tags : 1 }},
    { $unwind : "$tags" },
    { $group : { _id : { tags : "$tags" }}}
  ])
  ```

### [`model._bulkWrite`](https://mongodb.github.io/node-mongodb-native/5.9/classes/Collection.html#bulkWrite)

  Perform a bulkWrite operation without a fluent API. Arguments:

  1. `Operations` *(array)* - Bulk operations to perform
  2. `[Options]` *(object)*

  Legal operation types are:

  ```js
  await users._bulkWrite([
    { insertOne: { document: { a: 1 } } },
    { updateOne: { filter: {a:2}, update: {$set: {a:2}}, upsert:true } },
    { updateMany: { filter: {a:2}, update: {$set: {a:2}}, upsert:true } },
    { deleteOne: { filter: {c:1} } },
    { deleteMany: { filter: {c:1} } },
    { replaceOne: { filter: {c:3}, replacement: {c:4}, upsert:true}}
  ])
  ```

### [`model._count`](https://mongodb.github.io/node-mongodb-native/5.9/classes/Collection.html#count)

  Returns the count of documents that would match a find() query. The method uses collection.countDocuments() in the mongo driver. Arguments:

  1. `[Filter]` *(string\|objectId\|object)*
  2. `[Options]` *(object)*

  ```js
  await users._count({ name: 'foo' })
  await users._count('id') // a bit useless but consistent with the rest of the API
  await users._count()
  ```

  If you need to get a fast order of magnitude of the count of all documents in your collection, you can use the estimate option.

  ```js
  await users._count({}, { estimate: true }) // Filter is ignored
  ```

### [`model._createIndex`](https://mongodb.github.io/node-mongodb-native/5.9/classes/Collection.html#createIndex)

  Creates an index on the db and collection collection. Arguments:

  1. `IndexSpec` *(string\|array\|object)* - The field name or index specification to create an index for
  2. `[Options]` *(object)*

  ```js
  await users.createIndex({ a: 1, b: -1 });
  // Alternate syntax for { c: 1, d: -1 } that ensures order of indexes
  await users.createIndex([ [c, 1], [d, -1] ]);
  // Equivalent to { e: 1 }
  await users.createIndex('e');
  // Equivalent to { f: 1, g: 1 }
  await users.createIndex(['f', 'g'])
  // Equivalent to { h: 1, i: -1 }
  await users.createIndex([ { h: 1 }, { i: -1 } ]);
  // Equivalent to { j: 1, k: -1, l: 2d }
  await users.createIndex(['j', ['k', -1], { l: '2d' }])
  ```

### [`model._createIndexes`](https://mongodb.github.io/node-mongodb-native/5.9/classes/Collection.html#createIndexes)

  Creates multiple indexes in the collection. Arguments:

  1. `IndexSpec` *(array<IndexSpec>)*- The field names or index specifications to create an indexes for
  2. `[Options]` *(object)*

  ```js
  await users.createIndexes([
    // Simple index on field fizz
    { key: { fizz: 1 } }
    // wildcard index
    { key: { '$**': 1 } },
    // named index on darmok and jalad
    { key: { darmok: 1, jalad: -1 } name: 'tanagra' }
  ])
  ```

### [`model._distinct`](https://mongodb.github.io/node-mongodb-native/5.9/classes/Collection.html#distinct)

  Returns a list of distinct values for the given key across a collection. Arguments:

  1. `Key` *(string)*
  2. `[Filter]` *(string\|objectId\|object)*
  3. `[Options]` *(object)*

  ```js
  await users._distinct('name')
  ```

### [`model._drop`](https://mongodb.github.io/node-mongodb-native/5.9/classes/Collection.html#drop)

  Drops the entire collection. Arguments: `None`

  ```js
  await users._drop()
  ```

### [`model._dropIndex`](https://mongodb.github.io/node-mongodb-native/5.9/classes/Collection.html#dropIndex)

  Drops an index on the collection. Arguments:

  1. `IndexName` *(string)*
  2. `[Options]` *(object)*

  ```js
  await users._dropIndex('name')
  await users._dropIndex('name.last')
  ```

### [`model._dropIndexes`](https://mongodb.github.io/node-mongodb-native/5.9/classes/Collection.html#dropIndexes)

  Drops all indexes from the collection. Arguments: `None`

  ```js
  await users._dropIndexes()
  ```

### [`model._find`](https://mongodb.github.io/node-mongodb-native/5.9/classes/Collection.html#find)

  Finds documents in the collection. Arguments:

  1. `[Filter]` *(string\|objectId\|object)*
  2. `[Options]` *(object)*

  ```js
  await users._find()
  await users._find({ name: 'John' })
  await users._find({}, { projection: { name: 1 } }) // only the name field will be selected
  await users._find({}, { rawCursor: true }) // returns raw mongo cursor
  await users._find({}, { 
    stream: ((doc, { close, pause, resume }) => {
      // the users are streaming here
      // call `close()` to stop the stream
    })
  })
  ```

### [`model._findOne`](https://mongodb.github.io/node-mongodb-native/5.9/classes/Collection.html#findOne)

  Fetches the first document that matches the filter. Arguments:

  1. `[Filter]` *(string\|objectId\|object)*
  2. `[Options]` *(object)*

  ```js
  await users._findOne({ name: 'John' })
  await users._findOne({}, { projection: { name: 1 } }) // only the name field will be selected
  ```

### [`model._findOneAndDelete`](https://mongodb.github.io/node-mongodb-native/5.9/classes/Collection.html#findOneAndDelete)

  Find a document and delete it in one atomic operation. Requires a write lock for the duration of the operation. Arguments: 

  1. `[Filter]` *(string\|objectId\|object)*
  2. `[Options]` *(object)*

  ```js
  await users._findOneAndDelete({ name: 'John' })
  ```

### [`model._findOneAndUpdate`](https://mongodb.github.io/node-mongodb-native/5.9/classes/Collection.html#findOneAndUpdate)

  Find a document and update it in one atomic operation. Requires a write lock for the duration of the operation. Arguments: 

  1. `Filter` *(string\|objectId\|object)*
  2. `Update` *(object)*
  3. `[Options]` *(object)*

  ```js
  await users._findOneAndUpdate({ name: 'John' }, { $set: { age: 30 } })
  ```

### [`model._indexInformation`](https://mongodb.github.io/node-mongodb-native/5.9/classes/Collection.html#indexInformation)

  Retrieves this collections index info. Argument(s):

  1. `[Options]` *(object)* 

  ```js
  await users._indexInformation()
  ```

### [`model._indexes`](https://mongodb.github.io/node-mongodb-native/5.9/classes/Collection.html#indexes)

  Lists all indexes on the collection. Argument(s):

  1. `[Options]` *(object)*

  ```js
  await users._indexes()
  ```

### [`model._insert`](https://mongodb.github.io/node-mongodb-native/5.9/classes/Collection.html#insertMany)

  Inserts one or more documents into the collection. Arguments:

  1. `Doc` *(object\|array)* - one or many documents
  2. `[Options]` *(object)*

  ```js
  await users._insert({ name: 'John', age: 30 })
  await users._insert([{ name: 'John', age: 30 }, { name: 'Bill', age: 32 }])
  ```

### [`model._remove`](https://mongodb.github.io/node-mongodb-native/5.9/classes/Collection.html#deleteMany)

  Removes one or more document(s) from the collection. Arguments:

  1. `Filter` *(string\|objectId\|object)*
  2. `[Options]` *(object)*

  ```js
  await users._remove({ name: 'John' })
  ```

### [`model._stats`](https://mongodb.github.io/node-mongodb-native/5.9/classes/Collection.html#stats)

  Returns statistics about the collection. Arguments:

  1. `[Options]` *(object)*

  ```js
  await users._stats()
  ```

### [`model._update`](https://mongodb.github.io/node-mongodb-native/5.9/classes/Collection.html#updateMany)

  Updates one or more document(s) from the collection. Arguments:

  1. `Filter` *(string\|objectId\|object)*
  1. `Update` *(object)*
  2. `[Options]` *(object)*

  ```js
  await users._update({ name: 'John' }, { $set: { age: 30 } })
  ```
