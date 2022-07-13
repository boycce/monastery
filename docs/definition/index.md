---
title: Model Definition
nav_order: 4
has_children: true
---

# Model Definition

Model definition object.

### Table of Contents

- [Fields](#fields)
- [Field blacklisting](#field-blacklisting)
- [Field options](#field-options)
- [MongoDB indexes](#mongodb-indexes)
- [Custom field rules](#custom-field-rules)
- [Custom error messages](#custom-error-messages)
- [Operation hooks](#operation-hooks)
- [Full example](#full-example)

### Fields

1. Fields can either be a field-type, embedded document, or an array of field-types or embedded documents
2. Field-types are recognised by having a `type` property defined as a string
3. Field-types can contain [custom](#custom-field-rules) and [default field rules](./rules), e.g. `{ minLength: 2 }`
4. Field-types can contain [field options](#field-options).

```js
{
  fields: {
    name: { // Field-type
      type: 'string',
      required: true,
    },
    address: { // embedded document
      line1: { type: 'string', required: true },
      city: { type: 'string', minLength: 2 },
    },
    names: [ // array of field-types
      { type: 'string' },
    ],
    pets: [{ // array of embedded documents
      name: { type: 'string' },
      type: { type: 'string' },
    }]
    // You can add a rule on the embedded document or array using the following structure
    pets: {
      type: [{
        name: { type: 'string' },
        type: { type: 'string' },
      }],
      minLength: 1,
    }
  }
}
```

The fields below implicitly get assigned and take presidence over any input data when [`manager.timestamps`](./manager) is true (default). You can override the `timestamps` value per operation, e.g. `db.user.update({ ..., timestamps: false})`. These fields use unix timestamps in seconds (by default), but can be configured to use use milliseconds via the manager [`useMilliseconds` ](./manager) option.

```js
{
  fields: {
    createdAt: {
      type: 'date',
      insertOnly: true,
      default: function() { return Math.floor(Date.now() / 1000) }
    },
    updatedAt: {
      type: 'date',
      default: function() { return Math.floor(Date.now() / 1000) }
    }
  }
}
```

### Field blacklisting

You are able to provide a list of fields to blacklist per model operation.

```js
{
  // The 'password' field will be removed from the results returned from `model.find`
  findBL: ['password'],

  // The 'password' field will be removed before inserting via `model.insert`
  insertBL: ['password'],

  // The 'password' and 'createdAt' fields will be removed before updating via `model.update`
  updateBL: ['createdAt', 'password'],
}
```

You are also able to blacklist fields on embedded documents and arrays of embedded documents.

```js
{
  // Embedded document example: `address.city` will be excluded from the response
  findBL: ['address.city']

  // Array of embedded documents example: `meta` will be removed from each comment in the array
  findBL: ['addresses.city']
}
```

### Field options

Here are some other special field options that can be used alongside field rules.

```js
fieldType: {

  // Enables population, you would save the foreign document _id on this field.
  model: 'pet',

  // Field will only be allowed to be set on insert when calling model.insert
  insertOnly: true,

  // Default will always override any passed value (it has some use-cases)
  defaultOverride: true,

  // Default value
  default: 12,

  // Default value can be returned from a function. `this` refers to the data object, but be
  // sure to pass any referenced default fields along with insert/update/validate, e.g. `this.age`
  default: function(fieldName, model) { return `I'm ${this.age} years old` },

  // Monastery will automatically create a mongodb index for this field, see "MongoDB indexes"
  // below for more information
  index: true|1|-1|'text'|'unique'|Object,

  // The field  won't stored, handy for fields that get populated with documents, see ./find for more details
  virtual: true

}
```

### MongoDB indexes

You are able to automatically setup MongoDB indexes via the `index` field option.

```js
fieldType: {

  // This will create an ascending / descending index for this field
  index: true|1|-1,

  // This will create an ascending unique index which translates:
  // { key: { [fieldName]: 1 }, unique: true }
  index: 'unique',

  // Text indexes are handled a little differently in which all the fields on the model
  // definition that have a `index: 'text` set are collated into one index, e.g.
  // { key: { [fieldName1]: 'text', [fieldName2]: 'text', .. }}
  index: 'text'

  // You can also pass an object if you need to use mongodb's index options
  // https://docs.mongodb.com/manual/reference/command/createIndexes/
  // https://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#createIndexes
  index: { type: 1, ...(any mongodb index option) },

}
```

And here's how you would use a 2dsphere index, e.g.

```js
{
  fields: {
    location: {
      index: '2dsphere',
      type: { type: 'string', default: 'Point' },
      coordinates: [{ type: 'number' }] // lng, lat
    }
  }
}

// Inserting a 2dsphere point
await db.user.insert({
  data: {
    location: {
      coordinates: [170.2628528648167, -43.59467883784971]
    }
  }
}
```

Since unique indexes by default don't allow multiple documents with `null`, you use a partial index (less performant), e.g.

```js
{
  fields: {
    // So, instead of...
    email: {
      type: 'string',
      index: 'unique',
    },
    // You would use...
    email: {
      type: 'string',
      index: {
        type: 'unique',
        partialFilterExpression: {
          email: { $type: 'string' }
        },
      },
    },
  },
}
```

### Custom field rules

You are able to define custom field rules to use. 

- `this` will refer to the data object passed in
- by default, custom rules will ignore `undefined` values

```js
{
  rules: {
    // Basic definition
    isGrandMaster: function(value, ruleArgument, path, model) {
      return (value == 'Martin Luther')? true : false
    },
    // Full definition
    isGrandMaster: {
      validateUndefined: false,   // default
      validateNull: true,         // default
      validateEmptyString: true,  // default
      message: function(value, ruleArgument, path, model) {
        return 'Only grand masters are permitted'
      },
      fn: function(value, ruleArgument, path, model) {
        return (value == 'Martin Luther' || this.age > 100)? true : false
      },
    },
  },
}

// And referencing is the same as any other builtin rule
{
  fields: {
    user: {
      name: {
        type: 'string'
        isGrandMaster: true, // true is the ruleArgument
      },
    },
  },
}

// Additionally, you can define custom messages here
{
  messages: {
    'user.name': {
      isGrandMaster: 'Only grand masters are permitted'
    }
  },
}
```

### Custom error messages

You are able to define custom error messages for each field rule.

```js
{
  messages: {
    'name': {
      required: 'Sorry, even a monk cannot be nameless'
      type: 'Sorry, your name needs to be a string'
    },
    'address.city': {
      minLength: function(value, ruleArgument, path, model) {
        return `Is your city of residence really only ${ruleArgument} characters long?`
      }
    },
    // Assign custom error messages for arrays
    'pets': {
      minLength: `Please add at least one pet pet group.`
    },
    // You can assign custom error messages for all fields on embedded documents in an array
    // e.g. pets = [{ name: { type: 'string' }}]
    'pets.name': {
      required: `Your pet's name needs to be a string.`
    },
    // To target a specific array item
    'pets.0.name': {
      required: `You first pet needs a name`
    },
  },
}
```

### Operation hooks

You are able provide an array of callbacks to these model operation hooks. If you need to throw an error asynchronously, please pass an error as the first argument to `next()`, e.g. `next(new Error('Your error here'))`. You can also access the operation details via `this` in each callback.

```js
{
  afterFind: [function(data, next) {}],
  afterInsert: [function(data, next) {}],
  afterInsertUpdate: [function(data, next) {}],
  afterUpdate: [function(data, next) {}],
  afterRemove: [function(next) {}],
  beforeInsert: [function(data, next) {}],
  beforeInsertUpdate: [function(data, next) {}],
  beforeUpdate: [function(data, next) {}],
  beforeRemove: [function(next) {}],
  beforeValidate: [function(data, next) {}],
}
```

### Definition example

```js
{
  fields: {
    email: { type: 'email', required: true, index: 'unique' },
    firstName: { type: 'string', required: true },
    lastName: { type: 'string' }
  },

  messages: {
    email: { required: 'Please enter an email.' }
  },

  updateBL: ['email'],

  beforeValidate: [function (data, next) {
    if (data.firstName) data.firstName = util.ucFirst(data.firstName)
    if (data.lastName) data.lastName = util.ucFirst(data.lastName)
    next()
  }],

  afterFind: [function(data) {// Synchronous
    data = data || {}
    data.name = data.firstName + ' ' + data.lastName
  }],
}

```
