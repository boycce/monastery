const fs = require('fs')
const debug = require('debug')
const path = require('path')
const EventEmitter = require('events').EventEmitter
const { MongoClient } = require('mongodb')
const Collection = require('./collection.js')
const imagePluginFile = require('../plugins/images/index.js')
const Model = require('./model.js')
const util = require('./util.js')

let hasDefaultManager = false

function Manager(uri, opts, parent) {
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
  const that = (!hasDefaultManager && parent) ? parent : this

  if (!opts) opts = {}
  if (!(this instanceof Manager)) return new Manager(uri, opts)
  if (uri == 'init') return

  // opts: timestamps
  if (typeof opts.defaultFields != 'undefined') throw Error('opts.defaultFields has been depreciated, use opts.timestamps')
  if (typeof opts.timestamps == 'undefined') opts.timestamps = true

  // opts: logLevel
  if (typeof opts.logLevel == 'undefined') opts.logLevel = 2

  // opts: separate out monastery options
  const mongoOpts = Object.keys(opts||{}).reduce((acc, key) => {
    if (![
      'databaseName', 'defaultObjects', 'logLevel', 'imagePlugin', 'limit', 'noDefaults', 'nullObjects',
      'promise', 'timestamps', 'useMilliseconds',
    ].includes(key)) {
      acc[key] = opts[key]
    }
    return acc
  }, {})

  // Add properties
  that.uri = uri
  that.error = debug('monastery:error' + (opts.logLevel >= 1 ? '*' : ''))
  that.warn = debug('monastery:warn' + (opts.logLevel >= 2 ? '*' : ''))
  that.info = debug('monastery:info' + (opts.logLevel >= 3 ? '*' : ''))
  that.opts = opts
  that.beforeModel = []
  that.collections = {}
  that._openQueue = []
  that.emitter = new EventEmitter()

  // If there is no DEBUG= environment variable, we will need to force the debugs on (due to bug on debug@4.3.4)
  if (!debug.namespaces) {
    if (opts.logLevel >= 1) that.error.enabled = true
    if (opts.logLevel >= 2) that.warn.enabled = true
    if (opts.logLevel >= 3) that.info.enabled = true
  }
  
  // Create a new MongoDB Client
  if (typeof that.uri == 'string' || Array.isArray(that.uri)) {
    that.uri = that.connectionString(that.uri, opts.databaseName)
    that.client = new MongoClient(that.uri, mongoOpts)
  } else {
    that.client = that.uri
  }

  // Listen to MongoDB events
  for (let eventName of ['close', 'error', 'timeout']) {
    that.client.on(eventName, (e) => that.emitter.emit(eventName, e))
  }

  // Listen to custom open event
  that.emitter.on('open', () => {
    // wait for all the on('open') events to get called first
    setTimeout(() => {
      for (let item of that._openQueue) {
        item()
      }
    })
  })

  // Initiate any plugins
  if (opts.imagePlugin) {
    imagePluginFile.setup(that, util.isObject(opts.imagePlugin) ? opts.imagePlugin : {})
  }

  // Update the parent manager with the new manager
  if (!hasDefaultManager && parent) hasDefaultManager = true
  if (opts.promise) return that.open()
  else that.open()
}

Manager.prototype.manager = function(uri, opts) {
  return new Manager(uri, opts, this)
}

Manager.prototype.arrayWithSchema = function(array, schema) {
  array.schema = schema
  return array
}

Manager.prototype.close = async function() {
  /**
   * Close the database connection, gracefully
   */
  const _close = async () => {
    this.emitter.emit(this._state = 'closing')
    await this.client.close()
    this.emitter.emit(this._state = 'close')
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
  if (!this.collections[name] || (options||{}).cache === false) {
    delete (options||{}).cache
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

Manager.prototype.models = async function(pathname, opts={}) {
  /**
   * Setup model definitions from a folder location
   * @param {string} pathname
   * @param {object} opts:
   *   @param {boolean} opts.waitForIndexes - Wait for indexes to be created?
   *   @param {boolean} opts.skipIfExists - Skip if the model already exists?
   * @return {Promise(object)} - e.g. { user: , article: , .. }
   * @this Manager
   */
  let out = {}
  let { waitForIndexes } = opts
  if (!pathname || typeof pathname !== 'string') {
    throw 'The path must be a valid pathname'
  }
  if (!fs.existsSync(pathname)) {
    this.warn(`The models path ${pathname} does not exist`)
    return out
  }
  let filenames = fs.readdirSync(pathname)
  for (let filename of filenames) {
    // Ignore folders
    if (!filename.match(/\.[cm]?js$/)) continue
    let name = filename.replace('.js', '')
    let filepath = path.join(pathname, filename)
    // Skip
    if (opts.skipIfExists && this.models[name]) continue
    // We can't use require() here since we need to be able to import both CJS and ES6 modules
    let definition = ((await import(filepath))||{}).default
    // When a commonJS project uses babel (e.g. `nodemon -r @babel/register`, similar to `-r esm`), import() 
    // will return ES6 model definitions in another nested `default` object
    if (definition && definition.default) definition = definition.default
    if (!definition) throw new Error(`The model definition for '${name}' must export a default object`)
    // Wait for indexes to be created?
    if (waitForIndexes) out[name] = await this.model(name, definition, waitForIndexes)
    else out[name] = this.model(name, definition)
  }
  return out
}

Manager.prototype.onError = function(fn) {
  /**
   * Called when an error occurs when trying to connect to the MongoClient.
   * @param {Function} fn
   * @return {Promise}
   */
  return new Promise((resolve, reject) => {
    if (!this.emitter) {
      reject(new Error('Emitter not found! This can happen if two seperate monastery packages are imported into the ' +
        'same project. E.g. the first package initializes the manager, and the second package tries to use it.'))
    }
    this.emitter.on('error', (err) => {
      resolve(err)
    })
  }).then((err) => {
    return fn(err)
  })
}

Manager.prototype.onOpen = function(fn) {
  /**
   * Called when a successful MongoClient connection has been made.
   * @param {Function} fn
   * @return {Promise(manager)}
   */
  return new Promise((resolve, reject) => {
    if (!this.emitter) {
      reject(new Error('Emitter not found! This can happen if two seperate monastery packages are imported into the ' +
        'same project. E.g. the first package initializes the manager, and the second package tries to use it.'))
    }
    if (this._state == 'open') {
      resolve(this)
    }
    this.emitter.on('open', () => {
      resolve(this)
    })
    this.emitter.on('error', (err) => {
      reject(err)
    })
  }).then((err) => { // If `then` is not chained, the error will be thrown, detached!
    return fn(err)
  })
}

Manager.prototype.open = async function() {
  /**
   * Connect to the database
   * @return {Promise(manager)}
   */
  try {
    this._state = 'opening'
    this.db = this.client.db()
    await this.client.connect() // now optional since db().command() will auto-connect
    this.emitter.emit(this._state = 'open', this)
    return this

  } catch (err) {
    this._state = 'closed'
    // Only emit the error if there are listeners, since it will throw an unhandled error
    if (this.emitter.listeners('error').length > 0) {
      this.emitter.emit('error', err)
    }
    if (this.opts.promise || this.emitter.listeners('error').length == 0) {
      throw new Error(err)
    }
  }
}

Manager.prototype.parseData = function(obj, parseBracketToDotNotation, parseDotNotation) {
  return util.parseData(obj, parseBracketToDotNotation, parseDotNotation)
}

Manager.prototype.model = Model

Manager.prototype.getSignedUrl = imagePluginFile.getSignedUrl

Manager.prototype._getSignedUrl = () => { 
  throw new Error('monastery._getSignedUrl() has been moved to monastery.getSignedUrl()')
}

module.exports = Manager