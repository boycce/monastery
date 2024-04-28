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
 *   - expect().toMatchObject:  received object can have random properties (try not to use since its not strict)
 *   - expect.objectContaining:
 */

/* Run tests sequentially */
require('./util.js')
require('./manager.js')
require('./collection.js')
require('./model.js')
require('./crud.js')
require('./blacklisting.js')

require('./populate.js')
require('./validate.js')
require('./plugin-images.js')
require('./virtuals.js')
