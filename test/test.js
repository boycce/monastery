/**
 * Todo:
 *   - Test custom model rules
 *   - Test custom messages
 *   - Test for index and unique schema fields
 *   - Test blacklisting
 *   - Test deep/array population
 * Notes:
 *   - expect().toEqual:  strict deep match
 *   - expect().toMatchObject:  received object can have random properties
 *   - expect.objectContaining:
 */

let monastery = require('../lib')
let db = monastery(false, { defaultFields: false })
db.log = () => {}

// Run tests sequentially
require('./monk')(monastery, db)
require('./model')(monastery, db)
require('./crud')(monastery, db)
require('./blacklisting')(monastery, db)
require('./populate')(monastery, db)
require('./validate')(monastery, db)
require('./plugin-images')(monastery, db)
