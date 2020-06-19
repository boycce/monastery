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
    opts.model = this
    let data = util.parseDotNotation(opts.data || (opts.req? opts.req.body : {}))

    return this.validate(data, { ...opts }).then(data => {
      return util.runSeries(this.beforeInsert.map(f => f.bind(opts, data))).then(() => data)

    }).then(data => {
      return this._insert(data)

    }).then(data => {
      return util.runSeries(this.afterInsert.map(f => f.bind(opts, data))).then(() => data)

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

    // Format query
    let query = opts.query || {}
    if (util.isId(query)) query = { _id: query }
    else query = util.removeUndefined(query)
    if (util.isId(query._id)) {
      query._id = this.manager.id(query._id) // for aggregation
      opts.one = true
    }

    // Operation options
    let options = opts.options || {}
    options.sort = opts.sort || options.sort || { "created-at": -1 }
    options.skip = Math.max(0, opts.skip || options.skip || 0)
    options.limit = opts.one? 1 : parseInt(opts.limit || options.limit || 25)
    options.projection = opts.project || { ...this.findWLProject }

    // Whitelisting
    if (opts.whitelist) {
      if (opts.whitelist === true) var whitelist = this.findBLProject
      else whitelist = opts.whitelist.reduce((o, v) => (o[v] = 1) && o, {})
      options.projection = { ...this.findWLProject, ...whitelist }
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
        } else {
          let modelName = fname.split('.').reduce((o,i) => o[i], this.fields).model
          if (!modelName) {
            console.error(`The field "${fname}" passed to populate is not of type 
            model. You would need to add the field option e.g. { model: 'comment' } in your schema.`)
            continue
          } else if (!this.manager.model[modelName]) {
            console.error(`The field's model defined in your schema does not exist: 
            ${fname}: { model: "${modelName}" }`)
            continue
          }
          // let modelName = fname.split('.')[fname.split('.').length-1]
          // Populate model (convert array into document & create lookup)
          options.projection[fname] = { "$arrayElemAt": [ "$" + fname, 0 ] }
          lookups.push({ $lookup: {
            from: modelName,
            localField: fname,
            foreignField: '_id',
            as: fname
          }})
        }
      }

      // console.log(1, options.projection)
      // console.log(2, lookups)
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
      // Remove blacklisted properties from joined models, because subpiplines with 'project' are slower
      if (opts.one && util.isArray(data)) data = data[0]
      if (opts.populate) this._removeBlacklisted(data, opts.whitelist)
      this._callAfterFind(opts, data)

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
    opts = opts || {}
    opts.update = true
    opts.model = this
    opts.query = util.isObjectAndNotID(opts.query)? util.removeUndefined(opts.query) : { _id: opts.query }
    opts.options = { limit: 25, sort: { "created-at": -1 },  multi: false, ...opts.options }
    let data = util.parseDotNotation(opts.data || (opts.req? opts.req.body : null))

    return this.validate(data, { ...opts }).then(data => {
      if (!data || util.isEmpty(data)) throw `No valid data passed to ${this.name}.update()`
      return util.runSeries(this.beforeUpdate.map(f => f.bind(opts, data))).then(() => data)

    }).then(data => {
      return this._update(opts.query, { $set: data }, opts.options).then(() => data)

    }).then(data => {
      return util.runSeries(this.afterUpdate.map(f => f.bind(opts, data))).then(() => data)

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

    opts.remove = true
    opts.model = this
    opts.query = util.isObjectAndNotID(opts.query)? util.removeUndefined(opts.query) : { _id: opts.query }
    opts.options = { limit: 1, sort: { "created-at": -1 },  multi: false, ...opts.options }
    if (opts.query.hasOwnProperty('_id')) opts.query._id = this.manager.id(opts.query._id)
    if (util.isEmpty(opts.query)) throw 'please specify opts.query'

    return util.runSeries(this.beforeRemove.map(f => f.bind(opts, null))).then(() => {
      return this._remove(opts.query, opts.options)

    }).then(data => {
      return util.runSeries(this.afterRemove.map(f => f.bind(opts, null))).then(() => data)

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

  _callAfterFind: function(opts, data) {
    /**
     * Calls model.afterFind(), and recurses through fields that are models.
     * Be sure to add any properties to the schema that your populating on,
     * e.g. "nurses": [{ model: 'user' }]
     * @param {object} opts
     * @param {object|array} data
     */
    // Start with parent model data, and recurse down
    let model = this.manager.model
    let parentmodeldata = util.toArray(data).map(o => ({ modelName: this.name, dataRef: o }))
    let modeldata = parentmodeldata.concat(this._recurseAndFindModels(this.fields, data))

    // Loop found (deep) model data objects, and call afterFind on each
    for (let item of modeldata) {
      for (let fn of model[item.modelName].afterFind) {
        fn.call({ req: opts? opts.req : null }, item.dataRef)
      }
    }
    return data
  },

  _removeBlacklisted: function(data, whitelist) {
    /**
     * Remove blacklisted fields, takes foreign model blacklists into account
     * @param {object|array} data
     * @param {array} <whitelist>
     */
    let findBL = this.findBL
    let findWL = [ '_id', ...this.findWL ]
    let exclude = []
    let model = this.manager.model

    
    this._recurseFields(this.fields, "", function(path, field) {
      // Remove array indexes from the path e.g. '0.'
      path = path.replace(/(\.[0-9])(\.|$)/, '$2')
      if (field.type == 'any') exclude.push(path)

      // Below: Merge in model whitelists (we should cache the results)
      if (!field.model) return
      else if (!model[field.model]) return

      // Has this path been blacklisted already?
      for (let blacklisted of findBL) {
        if (blacklisted === path || path.includes(blacklisted + '.', 0)) {
          return
        }
      }
      // Okay, merge in the model's whitelist
      findWL.push(path + '.' + '_id')
      for (let prop of model[field.model].findWL) {
        // Dont add model properties that are already blacklisted
        if (findBL.includes(path + '.' + prop)) continue
        // Add model prop to whitelist
        findWL.push(path + '.' + prop)
      }
    })

    // Merge in the passed in whitelist
    findWL = findWL.concat(whitelist || [])

    // Fill in missing parents e.g. pets.dog.name, pets.dog doesn't exist
    // Doesn't matter what order these are added in
    for (let whitelisted of findWL) {
      let parents = whitelisted.split('.')
      let target = ''
      for (let parent of parents) {
        if (!findWL.includes(target + parent)) findWL.push(target + parent)
        target = target + parent + '.'
      }
    }

    function recurseAndDeleteData(data, path) {
      // Remove array indexes from the path e.g. '0.'
      let newpath = path.replace(/(\.[0-9])(\.|$)/, '$2')
      util.forEach(data, function(field, fieldName) {
        if (!findWL.includes(newpath + fieldName) && !util.isNumber(fieldName)) {
          delete data[fieldName]
        } else if ((util.isArray(field) || util.isObjectAndNotID(field)) && !exclude.includes(newpath + fieldName)) {
          recurseAndDeleteData(field, newpath + fieldName + '.')
        }
      })
    }

    for (let doc of util.toArray(data)) {
      recurseAndDeleteData(doc, "")
    }
    return data
  },

  _recurseAndFindModels: function(fields, dataArr) {
    /**
     * Returns a flattened list of data-objects that are models
     * @param {object} fields
     * @param {object|array} dataArr 
     * @return [{
     *   dataRef: { *fields here* }, 
     *   fieldName: usersNewCompany,
     *   modelName: company
     * },..] 
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
  },

  _recurseFields: function(fields, path, cb) {
    util.forEach(fields, function(field, fieldName) {
      if (fieldName == 'schema') {
        return
      } else if (util.isArray(field)) {
        this._recurseFields(field, path + fieldName + '.', cb)
      } else if (util.isSubdocument(field)) {
        this._recurseFields(field, path + fieldName + '.', cb)
      } else {
        cb(path + fieldName, field)
      }
    }, this)
  }

}
