let fs = require('fs')
let debug = require('debug')
let monk = require('monk')
let util = require('./util')

// Apply monk monkey patches
monk.manager.prototype.open = require('./monk-monkey-patches').open
monk.Collection.prototype.findOneAndUpdate = require('./monk-monkey-patches').findOneAndUpdate

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
  manager.imagePluginFile = require('../plugins/images')
  manager.isId = util.isId.bind(util)
  manager.model = require('./model')
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

let arrayWithSchema = function(array, schema) {
  array.schema = schema
  return array
}

let models = async function(path) {
  /**
   * Setup model definitions from a folder location
   * @param {string} pathname
   * @return {Promise(object)} - e.g. { user: , article: , .. }
   * @this Manager
   */
  let models = {}
  if (!path || typeof path !== 'string') {
    throw 'The path must be a valid pathname'
  }
  await fs.readdirSync(path).forEach(async filename => {
    let definition = await import(require('path').join(path, filename))
    // let definition = require(require('path').join(path, filename)).default
    let name = filename.replace('.js', '')
    models[name] = this.model(name, definition)
  })
  return models
}
