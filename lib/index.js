/*eslint-disable max-len*/
const fs = require('fs')
const debug = require('debug')
const path = require('path')
const EventEmitter = require('events').EventEmitter
const inherits = require('util').inherits
const { MongoClient } = require('mongodb')
const Collection = require('./collection.js')
const imagePluginFile = require('../plugins/images/index.js')
const Model = require('./model.js')
const rules = require('./rules.js')
const util = require('./util.js')

function Manager(uri, opts) {
  /**
   * Constructs a new manager which contains a new MongoDB client
   * 
   * @param {String|Array|Object} uri - MongoDB connection URI string / replica set, or reuse a MongoClient instance
   * @param {Object} opts -
   *   {String} <opts.databaseName> - the name of the database
   *   {Boolean} <opts.promise(manager)> - return a promise
   * 
   * @return {Connection|Promise}
   * @link https://www.mongodb.com/docs/drivers/node/v5.9/quick-reference/
   * @link https://mongodb.github.io/node-mongodb-native/ (all versions)
   */
  if (!opts) opts = {}
  if (!(this instanceof Manager)) return new Manager(uri, opts)

  // opts: timestamps
  if (typeof opts.defaultFields != 'undefined') throw Error('opts.defaultFields has been depreciated, use opts.timestamps')
  if (typeof opts.timestamps == 'undefined') opts.timestamps = true

  // opts: separate out monastery options
  const mongoOpts = Object.keys(opts||{}).reduce((acc, key) => {
    if (
      ![
        'databaseName', 'defaultObjects', 'hideWarnings', 'hideErrors', 'imagePlugin', 'limit', 'nullObjects',
        'promise', 'timestamps', 'useMilliseconds',
      ].includes(key)) {
        acc[key] = opts[key]
    }
    return acc
  }, {})

  // Add properties
  this.info = debug('monastery:info') // debug doesn't allow debuggers to be enabled by default
  this.warn = debug('monastery:warn' + (opts.hideWarnings ? '' : '*'))
  this.error = debug('monastery:error' + (opts.hideErrors ? '' : '*'))
  this.opts = opts
  this.beforeModel = []
  this.collections = {}
  this.models = {}
  this._openQueue = []
  
  // Create a new MongoDB Client
  if (typeof uri == 'string' || Array.isArray(uri)) {
    uri = this.connectionString(uri, opts.databaseName)
    this.client = new MongoClient(uri, mongoOpts)
  } else {
    this.client = uri
  }

  // Listen to MongoDB events
  for (let eventName of ['close', 'error', 'timeout']) {
    this.client.on(eventName, (e) => this.emit(eventName, e))
  }

  // Listen to custom open event
  this.on('open', () => {
    // wait for all the on('open') events to get called first
    setTimeout(() => {
      for (let item of this._openQueue) {
        item()
      }
    })
  })

  // Initiate any plugins
  if (opts.imagePlugin) {
    imagePluginFile.setup(this, util.isObject(opts.imagePlugin) ? opts.imagePlugin : {})
  }

  // Expose the last manager
  module.exports.manager = this

  // Connect to the database
  if (opts.promise) return this.open()
  else this.open()
}

Manager.prototype.arrayWithSchema = function(array, schema) {
  array.schema = schema
  return array
}

Manager.prototype.catch = function(fn) {
  /**
   * Catch any errors that occur during the opening of the database, and still return the manager
   * @param {Function} fn
   * @return {Manager}
   */
  this.catching = true
  this.on('error', fn)
  return this
}

Manager.prototype.close = async function() {
  /**
   * Close the database connection, gracefully
   */
  const _close = async () => {
    this.emit(this._state = 'closing')
    await this.client.close()
    this.emit(this._state = 'close')
  }
  if (this._state == 'open') {
    return await _close()

  } else if (this._state == 'opening') {
    return new Promise((resolve) => {
      this._openQueue.push(() => _close().then(resolve))
    })

  } else if (this._state == 'close' || this._state == 'closing') {
    return
  }
}

Manager.prototype.command = function(...args) {
  /**
   * Run a raw MongoDB command
   */
  return this.db.command(...args)
}

Manager.prototype.connectionString = function(uri, databaseName) {
  /**
   * get the connection string
   * @param {string|array} uri
   * @param {string} <databaseName>
   * @return {string}
   */
  if (!uri) {
    throw Error('No connection URI provided.')
  }
  // uri: array, sort out the connection string
  if (util.isArray(uri)) {
    if (!databaseName) {
      for (var i=0, l=uri.length; i<l; i++) {
        if (!databaseName) databaseName = uri[i].replace(/([^\/])+\/?/, '') // eslint-disable-line
        uri[i] = uri[i].replace(/\/.*/, '')
      }
    }
    uri = uri.join(',') + '/' + databaseName
  }
  // uri: string, sort out the connection string
  if (typeof uri === 'string') {
    if (!/^mongodb(\+srv)?:\/\//.test(uri)) {
      uri = 'mongodb://' + uri
    }
  }
  return uri
}

Manager.prototype.get = function(name, options) {
  /**
   * Returns a MongoDB collection
   * @param {String} name
   * @param {Object} [options] - options to pass to the collection
   * @return {MongoDB Collection}
   */
  if (!this.collections[name] || options?.cache === false) {
    delete options?.cache
    this.collections[name] = new Collection(this, name, options)
  }
  return this.collections[name]
}

Manager.prototype.id = function(str) {
  return util.id(str)
}

Manager.prototype.isId = function(value) {
  return util.isId(value)
}

Manager.prototype.models = async function(pathname, waitForIndexes) {
  /**
   * Setup model definitions from a folder location
   * @param {string} pathname
   * @return {Promise(object)} - e.g. { user: , article: , .. }
   * @this Manager
   */
  let out = {}
  if (!pathname || typeof pathname !== 'string') {
    throw 'The path must be a valid pathname'
  }
  let filenames = fs.readdirSync(pathname)
  for (let filename of filenames) {
    // Ignore folders
    if (!filename.match(/\.[cm]?js$/)) continue
    let name = filename.replace('.js', '')
    let filepath = path.join(pathname, filename)
    // We can't use require() here since we need to be able to import both CJS and ES6 modules
    let definition = ((await import(filepath))||{}).default
    // When a commonJS project uses babel (e.g. `nodemon -r @babel/register`, similar to `-r esm`), import() 
    // will return ES6 model definitions in another nested `default` object
    if (definition && definition.default) definition = definition.default
    if (!definition) throw new Error(`The model definition for '${name}' must export a default object`)
    // Wait for indexes to be created?
    if (waitForIndexes) out[name] = await this.model(name, { ...definition, waitForIndexes })
    else out[name] = this.model(name, definition)
  }
  return out
}

Manager.prototype.open = async function() {
  /**
   * Connect to the database
   * @return {Promise}
   */
  try {
    this._state = 'opening'
    this.db = this.client.db()
    await this.client.connect() // now optional since db().command() will auto-connect
    this.emit(this._state = 'open', this)
    return this

  } catch (err) {
    this._state = 'closed'
    // Only emit the error if there are listeners, since it will throw an unhandled error
    if (this.listeners('error').length > 0) {
      this.emit('error', err)
    }
    if (!this.catching) {
      throw err
    }
  }
}

Manager.prototype.parseData = function(obj) {
  return util.parseData(obj)
}

Manager.prototype.model = Model

inherits(Manager, EventEmitter)
module.exports = Manager 
module.exports.manager = null
module.exports.rules = rules
