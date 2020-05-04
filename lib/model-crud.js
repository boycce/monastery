let util = require('./util')

module.exports = {

  insert: function(opts, cb) {
    /**
     * Inserts document(s) with monk after validating data & before hooks.
     * @param {object} opts - options
     * @param {boolean} <opts.respond> - automatically call res.json/error (requires opts.req)
     * @param {function} <cb> - execute cb(err, data) instead of responding
     * @return promise
     */
    opts = opts || {}
    opts.insert = true
    let data = util.parseDotNotation(opts.data || (opts.req? opts.req.body : null))
    let operation = { opts: opts, model: this, insert: true }
    if (!data) throw 'no data passed to insert'

    return util.runSeries(this.beforeValidate.map(f => f.bind(operation, data))).then(() => {
      return this.validate(data, { insert: true, allow: opts.allow }).then(data => {
        return util.runSeries(this.beforeInsert.map(f => f.bind(operation, data))).then(() => data)
      })

    }).then(data => {
      return this._insert(data)

    }).then(data => {
      return util.runSeries(this.afterInsert.map(f => f.bind(operation, data))).then(() => data)

    // Success/error
    }).then(data => {
      if (cb) cb(null, data)
      else if (opts.req && opts.respond) opts.req.res.json(data)
      else return Promise.resolve(data)

    }).catch(err => {
      if (cb) cb(err)
      else if (opts.req && opts.respond) opts.req.res.error(err) 
      else throw err
    })
  },

  find: function(opts, cb) {
    /**
     * Finds document(s) with monk, also auto populates
     * @param {object} opts - options
     * @param {boolean} <opts.respond> - automatically call res.json/error (requires opts.req)
     * @param {function} <cb> - execute cb(err, data) instead of responding
     * @return promise
     */
    opts = opts || {}
    let lookups = []
    let query = util.isObject(opts.query)? util.removeUndefined(opts.query) : { _id: opts.query }
    if (query.hasOwnProperty('_id')) {
      opts.one = true
      query._id = this.manager.id(query._id) // for aggregation
    }

    // Operation options
    let options = opts.options || {}
    options.sort = opts.sort || options.sort || { "created-at": -1 }
    options.skip = Math.max(0, opts.skip || options.skip || 0)
    options.limit = opts.one? 1 : parseInt(opts.limit || options.limit || 25)
    options.projection = opts.project || { ...this.findWLProject }

    // Projection override
    if (opts.noBlacklisting) {
      options.projection = { ...this.findWLProject, ...this.findBLProject }
    }

    // Sort string passed
    if (util.isString(options.sort)) {
      let name = options.sort.match(/([a-z0-9-_]+)/)
      let order = options.sort.match(/:(-?[0-9])/)
      options.sort = { [name]: parseInt(order || 1) }
    }

    // Has text search?
    if (query.$text) {
      options.projection.score = { $meta: "textScore" }
      options.sort = { score: { $meta: "textScore" }}
    }

    // Wanting to populate?
    if (opts.populate) {
      for (let fname of opts.populate) {
        // Custom $lookup definition
        // https://thecodebarbarian.com/a-nodejs-perspective-on-mongodb-36-lookup-expr
        if (util.isObject(fname)) {
          options.projection[fname.as] = 1
          lookups.push({ $lookup: fname })
        } else if (!this.findWL.includes(fname)) {
          continue
        // Populate model (convert array into document & create lookup)
        } else if (this.fields[fname].model) {
          options.projection[fname] = { "$arrayElemAt": [ "$" + fname, 0 ] }
          lookups.push({ $lookup: {
            from: this.fields[fname].model,
            localField: fname,
            foreignField: '_id',
            as: fname
          }})
        }
      }
      var operation = this._aggregate.bind(this._collection, [
        { $match: query },
        { $sort: options.sort },
        { $skip: options.skip },
        { $limit: options.limit },
        ...lookups,
        { $project: options.projection }
      ])

    // Normal operation
    } else {
      operation = this[opts.one? '_findOne' : '_find'].bind(this._collection, query, options)
    }

    // Success/error
    return operation().then(data => {
      // Remove blacklisted keys from joined models, because subpiplines with 'project' are slower
      if (opts.one && util.isArray(data)) data = data[0]
      if (opts.populate && !opts.noBlacklisting) this._removeBlacklisted(data)
      this._callAfterFind(data, opts.req)

      if (cb) cb(null, data)
      else if (opts.req && opts.respond) opts.req.res.json(data)
      else return Promise.resolve(data)

    }).catch(err => {
      if (cb) cb(err)
      else if (opts.req && opts.respond) opts.req.res.error(err) 
      else throw err
    })
  },

  findOne: function(opts, cb) {
    return this.find({ ...opts, one: true }, cb)
  },

  update: function(opts, cb) {
    /**
     * Updates document(s) with monk after validating data & before hooks.
     * @param {object} opts - options
     * @param {boolean} <opts.respond> - automatically call res.json/error (requires opts.req)
     * @param {function} <cb> - execute cb(err, data) instead of responding
     * @return promise
     */
    let data = util.parseDotNotation(opts.data || (opts.req? opts.req.body : null))
    let operation = { opts: opts, model: this, update: true }
    opts.query = util.isObject(opts.query)? util.removeUndefined(opts.query) : { _id: opts.query }
    opts.options = { limit: 25, sort: { "created-at": -1 },  multi: false, ...opts.options }
    if (!data) throw 'no data passed to update'

    return util.runSeries(this.beforeValidate.map(f => f.bind(operation, data))).then(() => {
      return this.validate(data, { update: true, allow: opts.allow }).then(data => {
        return util.runSeries(this.beforeUpdate.map(f => f.bind(operation, data))).then(() => data)
      })

    }).then(data => {
      return this._update(opts.query, { $set: data }, opts.options).then(() => data)

    }).then(data => {
      return util.runSeries(this.afterUpdate.map(f => f.bind(operation, data))).then(() => data)

    // Success/error
    }).then(data => {
      if (cb) cb(null, data)
      else if (opts.req && opts.respond) opts.req.res.json(data)
      else return Promise.resolve(data)

    }).catch(err => {
      if (cb) cb(err)
      else if (opts.req && opts.respond) opts.req.res.error(err) 
      else throw err
    })
  },

  remove: function(opts, cb) {
    /**
     * Remove document(s) with monk after before hooks.
     * @param {object} opts - options
     * @param {boolean} <opts.respond> - automatically call res.json/error (requires opts.req)
     * @param {function} <cb> - execute cb(err, data) instead of responding
     * @return promise
     */
    let operation = { opts: opts, model: this, remove: true }
    opts.query = util.isObject(opts.query)? util.removeUndefined(opts.query) : { _id: opts.query }
    opts.options = { limit: 25, sort: { "created-at": -1 },  multi: false, ...opts.options }
    if (opts.query.hasOwnProperty('_id')) opts.query._id = this.manager.id(opts.query._id)
    if (util.isEmpty(opts.query)) return res.error('Please specify opts.query')

    return util.runSeries(this.beforeRemove.map(f => f.bind(operation, null))).then(() => {
      return this._remove(opts.query, opts.options)

    }).then(data => {
      return util.runSeries(this.afterRemove.map(f => f.bind(operation, null))).then(() => data)

    // Success/error
    }).then(data => {
      if (cb) cb(null, data)
      else if (opts.req && opts.respond) opts.req.res.json(data)
      else return Promise.resolve(data)

    }).catch(err => {
      if (cb) cb(err)
      else if (opts.req && opts.respond) opts.req.res.error(err) 
      else throw err
    })
  },

  _callAfterFind: function(data, opts) {
    /**
     * Calls model.afterFind(), and recurses through fields that are models.
     * Be sure to add any properties to the schema that your populating on,
     * e.g. "nurses": [{ model: 'user' }]
     * @param {object|array} data
     */
    // Start with parent model data, and recurse down
    let parentmodeldata = util.toArray(data).map(o => ({ modelName: this.name, dataRef: o }))
    let modeldata = parentmodeldata.concat(this._recurseAndFindModels(this.fields, data))

    // Loop found (deep) model data objects, and call afterFind on each
    for (let item of modeldata) {
      for (let fn of this.afterFind) {
        //console.log(item.modelName)
        fn({ req: opts.req }, item.dataRef)
      }
    }
    return data
  },

  _removeBlacklisted: function(data) {
    /**
     * Remove blacklisted fields, and recurses through fields that are models. (NOTE: move to models?)
     * @param {object} model
     * @param {object|array} data
     */
    // Start with parent model data, and recurse down
    let parentmodeldata = util.toArray(data).map(o => ({ modelName: this.name, dataRef: o }))
    let modeldata = parentmodeldata.concat(this._recurseAndFindModels(this.fields, data))

    // Loop found (deep) model data objects, and remove blacklisted fields
    for (let item of modeldata) {
      for (let fieldName in item.dataRef) {
        if (this.findBL.includes(fieldName)) {
          delete item.dataRef[fieldName]
        }
      }
    }
    return data
  },

  _recurseAndFindModels: function(fields, dataArr) {
    /**
     * Returns a flattened list of data-objects that are models
     * @param {object} fields
     * @param {object|array} dataArr 
     * @return [{}, ...] 
     */
    let out = []
    for (let data of util.toArray(dataArr)) {
      util.forEach(fields, (field, fieldName) => {
        if (!data) return
        // Valid model object field
        if (field.model && util.isObjectAndNotID(data[fieldName])) {
          out.push({
            dataRef: data[fieldName],
            fieldName: fieldName,
            modelName: field.model
          })

        // Recurse through fields that are sub-documents
        } else if (util.isSubdocument(field) && util.isObjectAndNotID(data[fieldName])) {
          out = [...out, ...this._recurseAndFindModels(field, data[fieldName])]

        // Array of sub-documents or models
        } else if (util.isArray(field) && data[fieldName] && util.isObjectAndNotID(data[fieldName][0])) {
          // Valid model object found in array
          if (field[0].model) {
            for (let item of data[fieldName]) {
              out.push({
                dataRef: item,
                fieldName: fieldName,
                modelName: field[0].model
              })
            }
          // Objects ares sub-documents, recurse through fields
          } else if (util.isSubdocument(field[0])) {
            // console.log('101', fieldName, field[0])
            out = [...out, ...this._recurseAndFindModels(field[0], data[fieldName])]
          }
        }
      }, this)
    }
    return out
  }

}
