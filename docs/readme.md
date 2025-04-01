![](./assets/imgs/monastery.jpg)

[![NPM](https://img.shields.io/npm/v/monastery.svg)](https://www.npmjs.com/package/monastery) [![Build Status](https://travis-ci.com/boycce/monastery.svg?branch=master)](https://app.travis-ci.com/github/boycce/monastery)

> v3.0 has been released 🎉 refer to [breaking changes](#v3-breaking-changes) below when upgrading from v2.x.

## Features

* User friendly API design, *inspired by SailsJS*
* Simple CRUD operations, with simple but fast model population
* Model validation controlled by your model definitions
* Normalized error responses objects ready for client consumption
* Custom error messages can be defined in your model definitions
* Blacklist sensitive fields once in your model definition, or per operation
* Model methods can accept data in bracket (multipart/form) and dot notation, you can also mix these together
* Automatic Mongo index creation
* Documents validate, insert and update 7-10x faster than Mongoose

#### Why Monastery over Mongoose?

* User friendly API designed for busy agencies, allowing you to quickly build projects without distractions
* Model schema and configurations are all defined within a single object (model definition)
* You can blacklist/exclude sensitive model fields in the model definition for each CRUD operation
* Model population uses a single aggregation call instead of multiple queries for faster responses
* Errors throw normalized error objects that contain the model, field, error message etc, handy in the client

## Install

This repository is distributed with NPM. After installing NPM, you can install Monastery via:

```bash
$ npm install --save monastery
```

## Usage

```javascript
import db from 'monastery'

// Initialize a monastery manager
db.manager('localhost/mydb')

// Define a model
db.model('user', {
  fields: {
    name: { type: 'string' },
    pets: [{ type: 'string' }],
    address: { city: { type: 'string', minLength: 10 } },
    points: [[{ type: 'number' }]]
  }
})

// Insert some data
try {
  const newUser = await db.user.insert({
    data: {
      name: 'Martin Luther',
      pets: ['sparky', 'tiny'],
      address: { city: 'Eisleben' },
      points: [[1, 5], [3, 1]]
    }
  })
} catch (errs) {
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
}
```
## Version Compatibility

You can view MongoDB's [compatibility table here](https://www.mongodb.com/docs/drivers/node/current/compatibility/), and see all of MongoDB NodeJS Driver [releases here](https://mongodb.github.io/node-mongodb-native/)

| Monastery            | Mongo NodeJS Driver | MongoDB Server    | Node                |
| :------------------- | :-----------------: | :---------------: | ------------------: |
| `3.x` | [`5.9.x`](https://mongodb.github.io/node-mongodb-native/5.9/) | `>=3.6  <=7.x` | `>=14.x <=latest` |
| `2.x` | [`3.7.x`](https://mongodb.github.io/node-mongodb-native/3.7/api/) | `>=2.6  <=6.x` | `>=4.x  <=14.x` |


## v3 Breaking Changes

  - Removed callback functions on all model methods, you can use the returned promise instead
  - model.update() now returns the following res._output property: `{ acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedCount: 0, upsertedId: null }` instead of `{ n: 1, nModified: 1, ok: 1 }`
  - model.remove() now returns `{ acknowledged: true, deletedCount: 1 }`, instead of `{ results: {n:1, ok:1} }`
  - model._indexes() now returns collection._indexes() not collection._indexInformation()
  - db.model.* moved to db.models.*
  - db.models(path, waitForIndex) changed to db.models(path, { waitForIndex })
  - db._client moved to db.client
  - db._db moved to db.db
  - db.catch/then() moved to db.onError/db.onOpen()
  - next() is now redundant when returning promises from hooks, e.g. `afterFind: [async (data) => {...}]`
  - deep paths in data, e.g. `books[].title` are now validated, and don't replace the whole object, e.g. `books`
  - `db()` moved to `db.manager()`

## v2 Breaking Changes

  - changed model.messages, array paths now must include '.$'
  - updated AWS to client v3 (requires ES6 features, NodeJs >=14)

## Roadmap

- Add Aggregate
- ~~Add FindOneAndUpdate~~
- ~~Add beforeInsertUpdate / afterInsertUpdate~~
- Bug: Setting an object literal on an ID field ('model') saves successfully
- ~~Blacklist false removes all blacklisting~~
- ~~Add project to insert/update/validate~~
- ~~Whitelisting a parent will remove any previously blacklisted children~~
- ~~Blacklist/project works the same across find/insert/update/validate~~
- Automatic embedded document ids/createdAt/updatedAt fields
- ~~Ability to change ACL default on the manager~~
- ~~Public db.arrayWithSchema method~~
- ~~Added support for array population~~
- ~~MongoClient instances can now be reused when initializing the manager, e.g. `monastery(mongoClient)`, handy for migrate-mongo~~
- Change population warnings into errors
- Global after/before hooks
- Before hooks can receive a data array, remove this
- Docs: Make the implicit ID query conversion more apparent
- ~~Split away from Monk so we can update the MongoDB NodeJS Driver version~~
- Add a warning if an invalid model is referenced in jthe schema
- Remove leading forward slashes from custom image paths (AWS adds this as a seperate folder)
- Double check await db.model.remove({ query: idfromparam }) doesnt cause issues for null, undefined or '', but continue to allow {}
- ~~Can't insert/update model id (maybe we can allow this and add _id to default insert/update blacklists)~~
- timstamps are blacklisted by default (instead of the `timestamps` opt), and can be switched off via blacklisting
- Allow rules on image types, e.g. `required`
- Test importing of models
- ~~Docs: model.methods~~
- ~~Convert hooks to promises~~
- ~~added `model.count()`~~
- Typescript support
- Add soft remove plugin
- ~~Added deep path validation support for updates~~
- ~~Added option skipHooks~~

## Debugging

This package uses [debug](https://github.com/visionmedia/debug) which allows you to set the level of output via the `DEBUG` environment variable. Using `DEBUG` will override the manager's `logLevel` option, e.g. `monastery('...', { logLevel: 3 })`.

```bash
$ DEBUG=monastery:error # level 1, shows errors
$ DEBUG=monastery:warn  # level 2, shows warnings and depreciation notices
$ DEBUG=monastery:info  # level 3, shows operation information
```

## Contributing

All pull requests are welcome. To run isolated tests with Jest:

```bash
npm run dev -- -t 'Model indexes'
```

## Special Thanks

[Jerome Gravel-Niquet](https://github.com/jeromegn)

## License

Copyright 2024 Ricky Boyce. Code released under the MIT license

