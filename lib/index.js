module.exports = function(uri, opts, fn) {
  // Manager instance or manager parameters
  if (typeof uri === 'object') var manager = uri
  else if (uri) manager = require('monk')(uri, { useUnifiedTopology: true, ...opts }, fn)
  else manager = { id: require('monk').id }

  // Add monastery properties
  manager.connected = connected
  manager.debug = require('debug')('monastery')
  manager.log = require('debug')('monastery*')
  manager.model = require('./model')
  manager.models = models

  // Catch mongodb connectivity errors
  if (uri) manager.catch(err => manager.log(err))
  return manager
}

function connected() { 
  /** Is the mongodb connection succusful */
  this._id && this._state === "open" 
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
