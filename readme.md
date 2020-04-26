# MonasteryJS

A straight forward MongoDB ODM built upon MonkJS.

[![NPM](https://img.shields.io/npm/v/css-cherry.svg)](https://www.npmjs.com/package/monasteryjs)
[![Build Status](https://travis-ci.org/boycce/monastery.svg?branch=master)](https://travis-ci.org/boycce/monastery)

## Install

This repository is distributed with NPM. After installing NPM, you can install Monastery via:

```sh
npm install --save monasteryjs
```

## Usage

```js
// Require monastery
const monastery = require('monasteryjs')

// Initalise a model
let user = monastery.model('user', { fields: {
  name: { type: 'string' },
  pets: [{ type: 'string' }],
  address: { city: { type: 'string' } },
  points: [[{ type: 'number' }]]
}})

// Validate a model
user.validate({ 
  name: 'Ip Man', 
  pets: ['sparky', 'tiny'],
  address: { city: 'Christchurch' },
  points: [[1, 5], [3, 1]]

}).then(data => {
  // valida data..

}).catch(errs => {
  // [error1, ..]
})
```

## Documentation

Coming soon...

## Copyright and license

Copyright 2019 Ricky Boyce. Code released under the MIT license.
