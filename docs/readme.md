![](./assets/imgs/monastery.jpg)

[![NPM](https://img.shields.io/npm/v/monastery.svg)](https://www.npmjs.com/package/monastery) [![Build Status](https://travis-ci.com/boycce/monastery.svg?branch=master)](https://app.travis-ci.com/github/boycce/monastery)

## Features

* User friendly API design, built around the awesome [Monk](https://automattic.github.io/monk/)
* Simple CRUD operations with model population
* Model validation deriving from your model definitions
* Custom error messages can be defined in your model definition
* Normalised error responses ready for client consumption
* Automatic mongodb index setup
* CRUD operations can accept bracket (multipart/form-data) and dot notation data formats, you can also mix these together


## Install

This repository is distributed with NPM. After installing NPM, you can install Monastery via:

```bash
$ npm install --save monastery
```

## Usage

```javascript
// Initialise a monastery manager
const db = require('monastery')('localhost/mydb')
// const db = require('monastery')('user:pass@localhost:port/mydb')

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
db.user.insert({
  data: {
    name: 'Martin Luther',
    pets: ['sparky', 'tiny'],
    address: { city: 'Eisleben' },
    points: [[1, 5], [3, 1]]
  }

}).then(data => {
  // valid data..

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
## Debugging

This package uses [debug](https://github.com/visionmedia/debug) which allows you to set different levels of output via the `DEBUG` environment variable. Due to known limations `monastery:warning` and `monastery:error` are forced on, you can however disable these via [manager settings](./manager).

```bash
$ DEBUG=monastery:info # shows operation information
```

To run isolated tests with Jest:

```bash
npm run dev -- -t 'Model indexes'
```

## Contributing

Coming soon...

## Roadmap

- Add Aggregate
- ~~Add FindOneAndUpdate~~
- ~~Add beforeInsertUpdate / afterInsertUpdate~~
- Bug: Setting an object literal on an ID field ('model') saves successfully
- Population within array items
- ~~Blacklist false removes all blacklisting~~
- ~~Add project to insert/update/validate~~
- ~~Whitelisting a parent will remove any previously blacklisted children~~
- ~~Blacklist/project works the same across find/insert/update/validate~~
- Automatic embedded document ids/createdAt/updatedAt fields
- ~~Ability to change ACL default on the manager~~
- ~~Public db.arrayWithSchema method~~
- Global after/before hooks
- before hooks can receive a data array, remove this
- docs: Make the implicit ID query conversion more apparent
- Split away from Monk (unless updated)

## Versions

- Monk: `v7.3.4`
- MongoDB NodeJS driver: `v3.2.3`
- MongoDB: [`v4.0.0`](https://www.mongodb.com/docs/drivers/node/current/compatibility/#compatibility)

## Special Thanks

[Jerome Gravel-Niquet](https://github.com/jeromegn)

## License

Copyright 2020 Ricky Boyce. Code released under the MIT license.
