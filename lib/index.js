module.exports = {

  ...require('./crud'),
  ...require('./rules'),
  ...require('./helpers'),
  ...require('./model'),
  ...require('./validate'),
  
  // Pass a monk db connection that'll be used for creating indexes.
  setdb: (db) => { module.exports.db = db },

  log: require('debug')('monastery*'),
  debug: require('debug')('monastery'),
  cache: {}

}
