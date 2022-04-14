let util = require('./util')
let monk = require('monk')
let debug = require('debug')

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
  let monasteryOpts = [
    'defaultObjects', 'imagePlugin', 'limit', 'nullObjects', 'timestamps', 'useMilliseconds'
  ]

  if (!opts) opts = {}
  if (util.isDefined(opts.defaultFields)) {
    var depreciationWarningDefaultField = true
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
  manager.warn = debug('monastery:warn')
  manager.error = debug('monastery:error*')
  manager.info = debug('monastery:info')

  // Add opts onto manager
  for (let key of monasteryOpts) {
    manager[key] = opts[key]
  }

  // Depreciation warnings
  if (depreciationWarningDefaultField) {
    manager.error('opts.defaultFields has been depreciated in favour of opts.timestamps')
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

let models = function(path) {
  /**
   * Setup model definitions from a folder location
   * @param {string} pathname
   * @return {object} - e.g. { user: , article: , .. }
   * @this Manager
   */
  let models = {}
  if (!path || typeof path !== 'string') {
    throw 'The path must be a valid pathname'
  }
  require('fs').readdirSync(path).forEach(filename => {
    let definition = require(require('path').join(path, filename)).default
    let name = filename.replace('.js', '')
    models[name] = this.model(name, definition)
  })
  return models
}
