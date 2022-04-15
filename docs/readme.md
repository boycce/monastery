![](./assets/imgs/monastery.jpg)

[![NPM](https://img.shields.io/npm/v/monastery.svg)](https://www.npmjs.com/package/monastery) [![Build Status](https://travis-ci.com/boycce/monastery.svg?branch=master)](https://app.travis-ci.com/github/boycce/monastery)

## Features

* User friendly API design, built around the awesome [Monk](https://automattic.github.io/monk/)
* Simple CRUD operations with model population
* Model validation deriving from your schema
* Custom error messages can be defined in your schema
* Normalised error responses ready for client consumption
* Automatic mongodb index setup

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

This package uses [Debug](https://github.com/visionmedia/debug) which allows you to see different levels of output:

```bash
$ DEBUG=monastery:info
# or show all levels of output, currently shows the same output as above
$ DEBUG=monastery:*
```

To run isolated tests with Jest:

```bash
npm run dev -- -t 'Model indexes'
```

## Contributing

Coming soon...

## Roadmap

- ~~Add FindOneAndUpdate~~
- Add before/afterInsertUpdate
- Bug: Setting an object literal on an ID field ('model') saves successfully
- Population within array items
- ~~Blacklist false removes all blacklisting~~
- ~~Add project to insert/update/validate~~
- ~~Whitelisting a parent will remove any previously blacklisted children~~
- ~~Blacklist/project works the same across find/insert/update/validate~~
- Automatic subdocument ids
- Remove ACL default 'public read'
- ~~Public db.arrayWithSchema method~~
- Global after/before hooks
- docs: Make the implicit ID query conversion more apparent
- Split away from Monk (unless updated)

## Special Thanks

[Jerome Gravel-Niquet](https://github.com/jeromegn)

## License

Copyright 2020 Ricky Boyce. Code released under the MIT license.
