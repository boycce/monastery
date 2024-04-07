/**
 * Todo:
 *   - Test custom model rules
 *   - Test custom messages
 *   - Test for index and unique schema fields
 *   - Test blacklisting
 *   - Test deep/array population
 *   - Test default limit
 * Notes:
 *   - expect().toEqual:  strict deep match
 *   - expect().toMatchObject:  received object can have random properties
 *   - expect.objectContaining:
 */

global.oid = require('mongodb').ObjectID

let monastery = require('../lib/index.js')
let opendb = async function(uri, opts) {
  let db = monastery(
    uri === false? false : (uri || 'localhost/monastery'),
    opts || { timestamps: false, serverSelectionTimeoutMS: 2000 }
  )
  // Wait until mongo is open
  if (db.then) await db.then(() => {})
  // Returning an object instead of promise
  return { db: db }
}

/* Run tests sequentially */
require('./util.js')(monastery, opendb)
require('./monk.js')(monastery, opendb)
require('./model.js')(monastery, opendb)
require('./crud.js')(monastery, opendb)
require('./blacklisting.js')(monastery, opendb)
require('./populate.js')(monastery, opendb)
require('./validate.js')(monastery, opendb)
require('./plugin-images.js')(monastery, opendb)
require('./virtuals.js')(monastery, opendb)
