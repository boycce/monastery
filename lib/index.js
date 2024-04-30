let fs = require('fs')
let debug = require('debug')
let monk = require('monk')
let path = require('path')
let rules = require('./rules.js')
let util = require('./util.js')

// Apply monk monkey patches
monk.manager.prototype.open = require('./monk-monkey-patches.js').open
monk.manager.prototype.then = require('./monk-monkey-patches.js').then
monk.Collection.prototype.findOneAndUpdate = require('./monk-monkey-patches.js').findOneAndUpdate

module.exports = function(uri, opts, fn) {
  /**
   * Constructs and augments a new monk manager
   * @param {String|Array|Manager|false} uri:
   *   {string|array} - monk connection URI string / replica sets (see monk)
   *   {object} - reuse a monk manager instance
   *   {false} - no open database connection, used in testing
   * @param {object} opts
   * @return monk manager
   */
  if (!opts) opts = {}
  let monasteryOpts = [
    'defaultObjects', 'hideWarnings', 'hideErrors', 'imagePlugin', 'limit', 'nullObjects',
    'timestamps', 'useMilliseconds',
  ]

  // Note: Debug doesn't allow debuggers to be enabled by default
  let info = debug('monastery:info')
  let warn = debug('monastery:warn' + (opts.hideWarnings ? '' : '*'))
  let error = debug('monastery:error' + (opts.hideErrors ? '' : '*'))

  if (util.isDefined(opts.defaultFields)) {
    warn('opts.defaultFields has been depreciated in favour of opts.timestamps')
    opts.timestamps = opts.defaultFields
    delete opts.defaultFields
  }
  if (!util.isDefined(opts.timestamps)) {
    opts.timestamps = true
  }

  // Monk manager instance or manager mock
  // Monk manager instances have manager._db defined which is the raw mongodb connection
  if (typeof uri === 'object') var manager = uri
  else if (uri) manager = monk(uri, { useUnifiedTopology: true, ...util.omit(opts, monasteryOpts) }, fn)
  else manager = { id: monk.id }

  // Add monastery properties
  manager.arrayWithSchema = arrayWithSchema
  manager.beforeModel = []
  manager.imagePluginFile = require('../plugins/images/index.js')
  manager.isId = util.isId.bind(util)
  manager.model = require('./model.js')
  manager.models = models
  manager.parseData = util.parseData.bind(util)
  manager.info = info
  manager.warn = warn
  manager.error = error

  // Add opts onto manager
  for (let key of monasteryOpts) {
    manager[key] = opts[key]
  }

  // Initiate any plugins
  if (manager.imagePlugin) {
    manager.imagePluginFile.setup(manager, util.isObject(manager.imagePlugin)? manager.imagePlugin : {})
  }

  // Catch mongodb connectivity errors
  if (uri) manager.catch(err => manager.error(err))
  return manager
}

module.exports.rules = rules

let arrayWithSchema = function(array, schema) {
  array.schema = schema
  return array
}

let models = async function(pathname, waitForIndexes, commonJs) {
  /**
   * Setup model definitions from a folder location
   * @param {string} pathname
   * @param {boolean} waitForIndexes - Wait for indexes to be created?
   * @param {boolean} commonJs - Use commonJs require() instead of ES6 import()
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
    let definition
    if (commonJs) {
      definition = require(require('path').join(path, filename)).default
    } else {
      // We can't use require() here since we need to be able to import both CJS and ES6 modules
      definition = ((await import(filepath))||{}).default
      // When a commonJS project uses babel (e.g. `nodemon -r @babel/register`, similar to `-r esm`), import() 
      // will return ES6 model definitions in another nested `default` object
      if (definition && definition.default) definition = definition.default
      if (!definition) throw new Error(`The model definition for '${name}' must export a default object`)
    }
    // Wait for indexes to be created?
    if (waitForIndexes) out[name] = await this.model(name, { ...definition, waitForIndexes })
    else out[name] = this.model(name, definition)
  }
  return out
}
