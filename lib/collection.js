const util = require('./util.js')

function Collection (manager, name, options) {
  this.col = null
  this.manager = manager
  this.name = name
  this.options = options
}

Collection.prototype._middleware = async function (args) {
  /**
   * Modfy the arguments before passing them to the MongoDB driver collection operations
   * @return {Object} args
   */
  const objectsToCast = ['operations', 'query', 'data', 'update']
  let { fields, opts, query } = args
  if (!opts) args.opts = opts = {}

  // Get the collection
  this.col = this.col || this.manager.db.collection(this.name)

  // Query: convert strings to ObjectIds
  if (query) {
    if (typeof query === 'string' || typeof query.toHexString === 'function') {
      args.query = {_id: args.query}
    }
  }

  // Options: setup
  if (typeof opts === 'string' || Array.isArray(opts)) {
    throw new Error('You can no longer pass an array or string `projection` to find()')
  } else {
    // MongoDB 5.0 docs seem to be a little off, projection is still included in `opts`...
    if (opts.fields) opts.projection = _fields(opts.fields, 0)
    if (opts.sort) opts.sort = _fields(opts.sort, -1)
    delete opts.fields
  }

  // Options: use collection defaults
  for (let key in this.options) {
    if (typeof opts[key] === 'undefined') {
      opts[key] = this.options[key]
    }
  }

  // Options: castIds (defaults on)
  if (opts.castIds !== false) {
    for (const key of objectsToCast) {
      if (args[key]) args[key] = util.cast(args[key])
    }
  }

  // Fields: convert strings/arrays to objects, e.g. 'name _id' -> {name: 1, _id: 1}
  if (fields && !util.isObject(fields)) {
    let fieldsArray = typeof fields === 'string' ? fields.split(' ') : (fields || [])
    args.fields = fieldsArray.reduce((acc, fieldName) => {
      acc[fieldName] = 1
      return acc
    }, {})
  }

  function _fields (obj, numberWhenMinus) {
    if (!Array.isArray(obj) && typeof obj === 'object') return obj
    obj = typeof obj === 'string' ? obj.split(' ') : (obj || [])
    let fields = {}
    for (let i = 0, l = obj.length; i < l; i++) {
      if (obj[i][0] === '-') fields[obj[i].substr(1)] = numberWhenMinus
      else fields[obj[i]] = 1
    }
    return fields
  }

  return args
}

Collection.prototype.aggregate = async function (stages, opts) {
  const args = await this._middleware({ stages, opts })
  return this.col.aggregate(args.stages, args.opts).toArray()
}

Collection.prototype.bulkWrite = async function (operations, opts) {
  const args = await this._middleware({ operations, opts })
  return this.col.bulkWrite(args.operations, args.opts)
}

Collection.prototype.count = async function (query, opts) {
  const args = await this._middleware({ query, opts })
  const { estimate, ..._opts } = args.opts
  if (estimate) {
    return this.col.estimatedDocumentCount(_opts)
  } else {
    return this.col.countDocuments(args.query, _opts)
  }
}

Collection.prototype.createIndex = async function (indexSpec, opts) {
  const args = await this._middleware({ indexSpec, opts })
  return await this.col.createIndex(args.indexSpec, args.opts)
}

Collection.prototype.createIndexes = async function (indexSpecs, opts) {
  const args = await this._middleware({ indexSpecs, opts }) // doesn't currently accept string or array parsing.
  return await this.col.createIndexes(args.indexSpecs, args.opts)
}

Collection.prototype.distinct = async function (field, query, opts) {
  const args = await this._middleware({ field, query, opts })
  return this.col.distinct(args.field, args.query, args.opts)
}

Collection.prototype.drop = async function () {
  try {
    await this._middleware({})
    await this.col.drop()
    // this.col = null
  } catch (err) {
    if ((err||{}).message == 'ns not found') return 'ns not found'
    throw err
  }
}

Collection.prototype.dropIndex = async function (name, opts) {
  const args = await this._middleware({ name, opts })
  return await this.col.dropIndex(args.name, args.opts)
}

Collection.prototype.dropIndexes = async function () {
  await this._middleware({})
  return this.col.dropIndexes()
}

Collection.prototype.find = async function (query, opts) {
  // v3.0 - removed the abillity to pass an array or string to opts as `opts.projection`
  // v3.0 - find().each() is removed, use `opts.stream` instead
  const args = await this._middleware({ query, opts })
  query = args.query
  opts = args.opts
  const rawCursor = opts.rawCursor

  // Get the raw cursor 
  const cursor = this.col.find(query, opts)

  // If a raw cursor is requested, return it now
  if (rawCursor) return cursor

  // If no stream is requested, return now the array of results
  if (!opts.stream) return cursor.toArray()

  if (typeof opts.stream !== 'function') {
    throw new Error('opts.stream must be a function')
  }

  const stream = cursor.stream()
  return new Promise((resolve, reject) => {
    let closed = false
    let finished = false
    let processing = 0
    function close () {
      closed = true
      processing -= 1
      cursor.close()
    }
    function pause () {
      processing += 1
      stream.pause()
    }
    function resume () {
      processing -= 1
      stream.resume()
      if (processing === 0 && finished) done()
    }
    function done () {
      finished = true
      if (processing <= 0) resolve()
    }
  
    stream.on('close', done)
    stream.on('end', done)
    stream.on('error', (err) => reject(err))
    stream.on('data', (doc) => {
      if (!closed) opts.stream(doc, { close, pause, resume })
    })
  })
}

Collection.prototype.findOne = async function (query, opts) {
  const args = await this._middleware({ query, opts })
  const docs = await this.col.find(args.query, args.opts).limit(1).toArray()
  return (docs||{})[0] || null
}

Collection.prototype.findOneAndDelete = async function (query, opts) {
  const args = await this._middleware({ query, opts })
  const doc = await this.col.findOneAndDelete(args.query, args.opts)

  if (doc && typeof doc.value !== 'undefined') return doc.value
  if (doc.ok && doc.lastErrorObject && doc.lastErrorObject.n === 0) return null
  return doc
}

Collection.prototype.findOneAndUpdate = async function (query, update, opts) {
  const args = await this._middleware({ query, update, opts })
  let method = 'findOneAndUpdate'

  if (typeof (args.opts||{}).returnDocument === 'undefined') {
    args.opts.returnDocument = 'after'
  }
  if (typeof (args.opts||{}).returnOriginal !== 'undefined') {
    this.manager.warn('The `returnOriginal` option is deprecated, use `returnDocument` instead.')
    args.opts.returnDocument = args.opts.returnOriginal ? 'before' : 'after'
  }
  if (args.opts.replaceOne || args.opts.replace) {
    method = 'findOneAndReplace'
  }

  const doc = await this.col[method](args.query, args.update, args.opts)
  if (doc && typeof doc.value !== 'undefined') return doc.value
  if (doc.ok && doc.lastErrorObject && doc.lastErrorObject.n === 0) return null
  return doc
}

Collection.prototype.geoHaystackSearch = async function (x, y, opts) {
  // https://www.mongodb.com/docs/manual/geospatial-queries/
  throw new Error('geoHaystackSearch is depreciated in MongoDB 4.0, use geospatial queries instead, e.g. $geoWithin')
}

Collection.prototype.indexInformation = async function (opts) {
  try {
    const args = await this._middleware({ opts })
    return await this.col.indexInformation(args.opts)
  } catch (e) {
    // col.indexInformation() throws an error if the collection is created yet...
    if ((e||{}).message.match(/ns does not exist/)) return {}
    else throw new Error(e)
  } 
}

Collection.prototype.indexes = async function (opts) {
  try {
    const args = await this._middleware({ opts })
    return await this.col.indexes(args.opts)
  } catch (e) {
    // col.indexes() throws an error if the collection is created yet...
    if ((e||{}).message.match(/ns does not exist/)) return []
    else throw new Error(e)
  } 
}

Collection.prototype.insert = async function (data, opts) {
  const args = await this._middleware({ data, opts })
  const arrayInsert = Array.isArray(args.data)


  if (arrayInsert && args.data.length === 0) {
    return Promise.resolve([])
  }

  const doc = await this.col[`insert${arrayInsert ? 'Many' : 'One'}`](args.data, args.opts)
  if (!doc) return

  // Starting MongoDB 4 the `insert` method only returns the _id, rather than the whole doc.
  // We need to return the whole doc for consistency with previous versions.
  const output = util.deepCopy(args.data)
  if (arrayInsert) {
    for (let i=output.length; i--;) {
      output[i]._id = doc.insertedIds[i]
    }
  } else {
    output._id = doc.insertedId
  }

  return output
}

Collection.prototype.mapReduce = async function (map, reduce, opts) {
  // https://www.mongodb.com/docs/manual/reference/method/db.collection.mapReduce/
  throw new Error('mapReduce is depreciated in MongoDB 5.0, use aggregation pipeline instead')
}

Collection.prototype.remove = async function (query, opts) {
  const args = await this._middleware({ query, opts })
  const method = args.opts.single || args.opts.multi === false ? 'deleteOne' : 'deleteMany'
  return this.col[method](args.query, args.opts)
}

Collection.prototype.stats = async function (opts) {
  const args = await this._middleware({ opts })
  return this.col.stats(args.opts)
}

Collection.prototype.update = async function (query, update, opts) {
  // v3.0 - returns now an object with the following properties:
  // {
  //   acknowledged: true,
  //   matchedCount: 0,
  //   modifiedCount: 0,
  //   upsertedCount: 1,
  //   upsertedId: expect.any(ObjectId),
  // }
  // was:
  // {
  //   result: { 
  //     ok: 1,  
  //     n: 1, 
  //     nModified: 1, 
  //     upserted: [{ _id: expect.any(ObjectId) }],
  //   }
  // }
  const args = await this._middleware({ query, update, opts })
  let method = args.opts.multi || args.opts.single === false ? 'updateMany' : 'updateOne'

  if (args.opts.replace || args.opts.replaceOne) {
    if (args.opts.multi || args.opts.single === false) {
      throw new Error('The `replace` option is only available for single updates.')
    }
    method = 'replaceOne'
  }

  const doc = await this.col[method](args.query, args.update, args.opts)
  // return (doc||{}).result || doc
  return doc
}

module.exports = Collection