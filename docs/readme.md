![](./assets/imgs/monastery.jpg)

[![NPM](https://img.shields.io/npm/v/monastery-js.svg)](https://www.npmjs.com/package/monastery-js) [![Build Status](https://travis-ci.org/boycce/monastery.svg?branch=master)](https://travis-ci.org/boycce/monastery)

## Features

* User friendly API design, built around the awesome [Monk](https://automattic.github.io/monk/)
* Simple CRUD methods with model population
* Model validation deriving from your schema
* Custom error messages can be defined in your schema
* Error response ready for client consumption
* Automatic index setup
* Lightweight

## Install

This repository is distributed with NPM. After installing NPM, you can install Monastery via:

```bash
npm install --save monastery-js
```

## Usage

```javascript
// Initialise a monastery manager
const db = require('monastery-js')('localhost/mydb')
// const db = require('monastery-js')('user:pass@localhost:port/mydb')

// Define a model
db.model('user', {
  fields: {
    name: { type: 'string' },
    pets: [{ type: 'string' }],
    address: { city: { type: 'string', minLength: 20 } },
    points: [[{ type: 'number' }]]
  }
})

// Validate some data
db.user.validate({
  name: 'Martin Luther', 
  pets: ['sparky', 'tiny'],
  address: { city: 'Eisleben' },
  points: [[1, 5], [3, 1]]

}).then(data => {
  // valid data..

}).catch(errs => {
  // [{
  //   detail: "Value needs to be at least 10 characters long.",
  //   status: "400",
  //   title: "city",
  //   meta: {
  //     model: "user",
  //     path: "address.city",
  //     rule: "minLength"
  //   }
  // }]
})
```

## Contributing

Coming soon...

## License

Copyright 2019 Ricky Boyce. Code released under the MIT license.

