![](./assets/imgs/monastery.jpg)

[![NPM](https://img.shields.io/npm/v/monastery.svg)](https://www.npmjs.com/package/monastery) [![Build Status](https://travis-ci.com/boycce/monastery.svg?branch=master)](https://app.travis-ci.com/github/boycce/monastery)

> [!IMPORTANT]  
> v3.0 has been released 🎉 refer to [breaking changes](#v3.0BreakingChanges) below when upgrading from v2.x.

## Features

* User friendly API design, *inspired by SailsJS*
* Simple CRUD operations, with simple but fast model population
* Model validation controlled by your model definitions
* Normalized error responses objects ready for client consumption
* Custom error messages can be defined in your model definitions
* Blacklist sensitive fields once in your model definition, or per operation
* Model methods can accept bracket (multipart/form-data) and dot notation data formats, you can also mix these together
* Automatic Mongo index creation

#### Why Monastery over Mongoose?

* User friendly API designed for busy agencies, allowing you to quickly build projects without distractions
* Model schema and configurations are all defined within a single object (model definition)
* You can blacklist/exclude sensitive model fields in the model definition for each CRUD operation
* Model population uses a single aggregation call instead of multiple queries for faster responses
* Errors throw normalized error objects that contain the model and field name, error message etc, handy in the client

## Install

This repository is distributed with NPM. After installing NPM, you can install Monastery via:

```bash
$ npm install --save monastery
```

## Usage

```javascript
import monastery from 'monastery'

// Initialize a monastery manager
const db = monastery('localhost/mydb')

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


## v3.0 Breaking Changes

  - Removed callback functions on all model methods, you can use the returned promise instead
  - `model.update()` now returns the following _update property:
    - `{ acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedCount: 0, upsertedId: null }`, instead of
    - `{ n: 1, nModified: 1, ok: 1 }`
  - `model.remove()` now returns `{ acknowledged: true, deletedCount: 1 }`, instead of `{ results: { n: 1, ok: 1} }`
  - Models are now added to `db.models` instead of `db.model`, e.g. `db.models.user`
  - MongoDB connection can be found here `db.db` changed from `db._db`
  - `model._indexes()` now returns `collection._indexes()` not `collection._indexInformation()`

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
- Docs: model.methods
- ~~Convert hooks to promises~~
- ~~added `model.count()` ~~

## Debugging

This package uses [debug](https://github.com/visionmedia/debug) which allows you to set different levels of output via the `DEBUG` environment variable. Due to known limations `monastery:warning` and `monastery:error` are forced on, you can however disable these via [manager settings](./manager).

```bash
$ DEBUG=monastery:info # shows operation information
```

## Contributing

All pull requests are welcome. To run isolated tests with Jest:

```bash
npm run dev -- -t 'Model indexes'
```

## Special Thanks

[Jerome Gravel-Niquet](https://github.com/jeromegn)

## License

Copyright 2024 Ricky Boyce. Code released under the MIT license.






///////////////////////////////
/////3. add 'Collection' to monastery docs sidebar ( also add model.count)
//// docs sapcing.... +4px