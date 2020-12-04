let util = require('./util')
let imagePlugin = require('./util')
let monk = require('monk')
let debug = require('debug')

module.exports = function(uri, opts, fn) {
  /**
   * Constructs and augments a new monk manager
   * @return monk manager
   */
  if (!opts) opts = {}
  if (typeof opts.defaultFields == 'undefined') opts.defaultFields = true
  var defaultFields = opts.defaultFields
  var defaultObjects = opts.defaultObjects
  var imagePlugin = opts.imagePlugin
  var nullObjects = opts.nullObjects
  delete opts.defaultFields
  delete opts.defaultObjects
  delete opts.imagePlugin
  delete opts.nullObjects

  // Manager instance or manager parameters
  if (typeof uri === 'object') var manager = uri
  else if (uri) manager = monk(uri, { useUnifiedTopology: true, ...opts }, fn)
  else manager = { id: monk.id }

  // Add monastery properties
  manager.error = debug('monastery:error*')
  manager.warn = debug('monastery:warn')
  manager.info = debug('monastery:info')
  manager.model = require('./model')
  manager.models = models
  manager.defaultFields = defaultFields
  manager.defaultObjects = defaultObjects
  manager.imagePlugin = imagePlugin
  manager.imagePluginFile = require('../plugins/images')
  manager.nullObjects = nullObjects
  manager.beforeModel = []

  // Initiate any plugins
  if (manager.imagePlugin) {
    manager.imagePluginFile.setup(manager, util.isObject(imagePlugin)? imagePlugin : {})
  }

  // Catch mongodb connectivity errors
  if (uri) manager.catch(err => manager.error(err))
  return manager
}

function models(path) {
  /**
   * Setup model definitions from a folder location
   * @param {string} pathname
   * @return {object} - e.g. { user: , article: , .. }
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
