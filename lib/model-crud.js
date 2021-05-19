let util = require('./util')

module.exports = {

  insert: function(opts, cb) {
    /**
     * Inserts document(s) with monk after validating data & before hooks.
     * @param {object} opts
     *     @param {object|array} <opts.data> - documents to insert
     *     @param {array|string|false} <opts.blacklist> - augment schema.insertBL, `false` will remove all blacklisting
     *     @param {boolean} <opts.respond> - automatically call res.json/error (requires opts.req)
     *     @param {string|array} <opts.skipValidation> - skip validation for this field name(s)
     *     @param {any} <opts.any> - any mongodb option
     * @param {function} <cb> - execute cb(err, data) instead of responding
     * @this model
     * @return promise
     */
    opts = opts || {}
    opts.insert = true
    opts.model = this
    let data = opts.data = opts.data || (opts.req? opts.req.body : {})
    let options = util.omit(opts, ['data', 'insert', 'model', 'respond', 'skipValidation', 'blacklist'])

    return util.parseFormData(util.parseDotNotation(data)).then(data => {
      opts.data = data
      return this.validate(data, { ...opts })

    }).then(data => {
      return util.runSeries(this.beforeInsert.map(f => f.bind(opts, data))).then(() => data)

    }).then(data => {
      return this._insert(data, options)

    }).then(data => {
      return util.runSeries(this.afterInsert.map(f => f.bind(opts, data))).then(() => data)

    // Success/error
    }).then(data => {
      if (cb) cb(null, data)
      else if (opts.req && opts.respond) opts.req.res.json(data)
      else return Promise.resolve(data)

    }).catch(err => {
      if (cb) cb(err)
      else if (opts && opts.req && opts.respond) opts.req.res.error(err)
      else throw err
    })
  },

  find: function(opts, cb, one) {
    /**
     * Finds document(s) with monk, also auto populates
     * @param {object} opts
     *     @param {object} <opts.query> - mongodb query object
     *     @param {boolean} <opts.respond> - automatically call res.json/error (requires opts.req)
     *     @param {array} <opts.populate> - population, see docs
     *     @param {array|string|false} <opts.blacklist> - augment schema.findBL, `false` will remove all blacklisting
     *     @param {array|string} <opts.project> - return only these fields, ignores blacklisting
     *     @param {any} <opts.any> - any mongodb option
     * @param {function} <cb> - execute cb(err, data) instead of responding
     * @this model
     * @return promise
     */
    let options, lookups = []
    return Promise.resolve().then(() => {
      opts = this._queryObject(opts)
      opts.one = one || opts.one
      // Operation options
      options = util.omit(opts, ['blacklist', 'one', 'populate', 'project', 'query', 'respond'])
      options.sort = options.sort || { "createdAt": -1 }
      options.skip = Math.max(0, options.skip || 0)
      options.limit = opts.one? 1 : parseInt(options.limit || this.manager.limit || 0)
      options.addFields = {}
      // Project, or use blacklisting
      if (opts.project) {
        // Can be an inclusion or exclusion projection
        if (util.isString(opts.project)) {
          opts.project = opts.project.trim().split(/\s+/)
        }
        if (util.isArray(opts.project)) {
          options.projection = opts.project.reduce((o, v) => {
            o[v.replace(/^-/, '')] = v.match(/^-/)? 0 : 1
            return o
          }, {})
        }
      } else {
        // Calculate the exclusion-projection
        let blacklistProjection = { ...this.findBLProject }
        blacklistProjection = this._addDeepBlacklists(blacklistProjection, opts.populate)
        options.projection = this._addBlacklist(blacklistProjection, opts.blacklist)
      }
      // Has text search?
      // if (opts.query.$text) {
      //   options.projection.score = { $meta: "textScore" }
      //   options.sort = { score: { $meta: "textScore" }}
      // }
      // Sort string passed
      if (util.isString(options.sort)) {
        let name = (options.sort.match(/([a-z0-9-_]+)/) || [])[0]
        let order = (options.sort.match(/:(-?[0-9])/) || [])[1]
        options.sort = { [name]: parseInt(order || 1) }
      }
      // Wanting to populate?
      if (opts.populate) {
        loop: for (let item of opts.populate) {
          let path = util.isObject(item)? item.as : item
          // Blacklisted?
          if (!this._pathInProjection(path, options.projection, true)) continue loop
          // Custom $lookup definition
          // https://thecodebarbarian.com/a-nodejs-perspective-on-mongodb-36-lookup-expr
          if (util.isObject(item)) {
            lookups.push({ $lookup: item })
          } else {
            let modelName = (path.split('.').reduce((o,i) => o[i], this.fields) ||{}).model
            if (!modelName) {
              this.error(`The field "${path}" passed to populate is not of type
              model. You would need to add the field option e.g. { model: 'comment' } in your schema.`)
              continue
            } else if (!this.manager.model[modelName]) {
              this.error(`The field's model defined in your schema does not exist:
              ${path}: { model: "${modelName}" }`)
              continue
            }
            // Populate model (convert array into document & create lookup)
            options.addFields[path] = { "$arrayElemAt": [ "$" + path, 0 ] }
            lookups.push({ $lookup: {
              from: modelName,
              localField: path,
              foreignField: '_id',
              as: path
            }})
          }
        }
        // console.log(1, options.projection)
        // console.log(2, lookups)
        let aggreagte = [
          { $match: opts.query },
          { $sort: options.sort },
          { $skip: options.skip },
          ...(options.limit? [{ $limit: options.limit }] : []),
          ...lookups,
          ...util.isEmpty(options.addFields)? [] : [{ $addFields: options.addFields }],
          { $project: options.projection }
        ]
        var operation = this._aggregate.bind(this._collection, aggreagte)
        this.info('aggregate', JSON.stringify(aggreagte))

      // Normal operation
      } else {
        operation = this[opts.one? '_findOne' : '_find'].bind(this._collection, opts.query, options)
      }
      return operation()

    }).then(data => {
      if (opts.one && util.isArray(data)) data = data[0]
      // (Not using) Project works with lookup.
      // Remove blacklisted properties from joined models, because subpiplines with 'project' are slower
      // if (opts.populate) this._depreciated_removeBlacklisted(data, opts.populate, options.projection)
      return this._processAfterFind(data, options.projection, { req: opts? opts.req : null })

    }).then(data => {
      if (cb) cb(null, data)
      else if (opts.req && opts.respond) opts.req.res.json(data)
      else return Promise.resolve(data)

    }).catch(err => {
      if (cb) cb(err)
      else if (opts && opts.req && opts.respond) opts.req.res.error(err)
      else throw err
    })
  },

  findOne: function(opts, cb) {
    return this.find(opts, cb, true)
  },

  update: function(opts, cb) {
    /**
     * Updates document(s) with monk after validating data & before hooks.
     * @param {object} opts
     *     @param {object} <opts.query> - mongodb query object
     *     @param {object|array} <opts.data> - mongodb document update object(s)
     *     @param {boolean} <opts.respond> - automatically call res.json/error (requires opts.req)
     *     @param {string|array} <opts.skipValidation> - skip validation for this field name(s)
     *     @param {array|string|false} <opts.blacklist> - augment schema.updateBL, `false` will remove all blacklisting
     *     @param {any} <opts.any> - any mongodb option
     * @param {function} <cb> - execute cb(err, data) instead of responding
     * @this model
     * @return promise(data)
     */
    let data, options, operators
    return Promise.resolve().then(() => {
      opts = this._queryObject(opts)
      opts.update = true
      opts.model = this
      data = opts.data = opts.data || (opts.req? opts.req.body : null)
      operators = util.pluck(opts, [/^\$/])
      // Operation options
      options = util.omit(opts, ['data', 'query', 'respond', 'skipValidation', 'blacklist'])
      options.sort = options.sort || { "createdAt": -1 }
      options.limit = parseInt(options.limit || 0)
      // Sort string passed
      if (util.isString(options.sort)) {
        let name = (options.sort.match(/([a-z0-9-_]+)/) || [])[0]
        let order = (options.sort.match(/:(-?[0-9])/) || [])[1]
        options.sort = { [name]: parseInt(order || 1) }
      }
      if (operators['$set'] && data) {
        throw new Error(`Please only pass options.$set or options.data to ${this.name}.update()`)
      }
      return util.parseFormData(util.parseDotNotation(data))

    }).then(data => {
      opts.data = data
      if (util.isEmpty(operators)) return this.validate(data, { ...opts })

    }).then(data => {
      if (util.isEmpty(operators) && (!data || util.isEmpty(data))) {
        throw new Error(`No valid data passed to ${this.name}.update()`)
      }
      return util.runSeries(this.beforeUpdate.map(f => f.bind(opts, data||{}))).then(() => data)

    }).then(data => {
      if (data) operators['$set'] = data
      return this._update(opts.query, operators, options).then(output => {
        if (!output.n) return null
        let response = Object.assign(Object.create({ _output: output }), operators['$set']||{})
        output = data = null // Cleanup (just incase)
        return response
      })

    }).then(data => {
      if (!data) return data
      return util.runSeries(this.afterUpdate.map(f => f.bind(opts, data))).then(() => data)

    // Success/error
    }).then(data => {
      if (cb) cb(null, data)
      else if (opts.req && opts.respond) opts.req.res.json(data)
      else return Promise.resolve(data)

    }).catch(err => {
      if (cb) cb(err)
      else if (opts && opts.req && opts.respond) opts.req.res.error(err)
      else throw err
    })
  },

  remove: function(opts, cb) {
    /**
     * Remove document(s) with monk after before hooks.
     * @param {object} opts
     *     @param {object} <opts.query> - mongodb query object
     *     @param {boolean} <opts.respond> - automatically call res.json/error (requires opts.req)
     *     @param {any} <opts.any> - any mongodb option
     * @param {function} <cb> - execute cb(err, data) instead of responding
     * @this model
     * @return promise
     */
    let options
    return Promise.resolve().then(() => {
      opts = this._queryObject(opts)
      opts.remove = true
      opts.model = this
      if (util.isEmpty(opts.query)) throw new Error('Please specify opts.query')
      // Operation options
      options = util.omit(opts, ['query', 'respond'])
      options.sort = options.sort || { "createdAt": -1 }
      options.limit = parseInt(options.limit || 1)
      // Sort string passed
      if (util.isString(options.sort)) {
        let name = (options.sort.match(/([a-z0-9-_]+)/) || [])[0]
        let order = (options.sort.match(/:(-?[0-9])/) || [])[1]
        options.sort = { [name]: parseInt(order || 1) }
      }
      return util.runSeries(this.beforeRemove.map(f => f.bind(opts)))

    }).then(() => {
      return this._remove(opts.query, options)

    }).then(data => {
      return util.runSeries(this.afterRemove.map(f => f.bind(opts))).then(() => data)

    // Success/error
    }).then(data => {
      if (cb) cb(null, data)
      else if (opts.req && opts.respond) opts.req.res.json(data)
      else return Promise.resolve(data)

    }).catch(err => {
      if (cb) cb(err)
      else if (opts && opts.req && opts.respond) opts.req.res.error(err)
      else throw err
    })
  },

  _queryObject: function(opts) {
    /**
     * Extract the query id from opts, opts.query
     * @param {MongoId|ID string|Query object} opts
     * @return opts
     *
     * opts == string|MongodID - treated as an id
     * opts == undefined|null|false - throw error
     * opts.query == string|MongodID - treated as an id
     * opts.query == undefined|null|false - throw error
     */
    let isIdType = (o) => util.isId(o) || util.isString(o)
    if (isIdType(opts)) opts = { query: { _id: opts || '' }}
    if (isIdType((opts||{}).query)) opts.query = { _id: opts.query || '' }
    if (!util.isObject(opts) || !util.isObject(opts.query)) {
      throw new Error('Please pass an object or MongoId to options.query')
    }
    // For security, if _id is set and undefined, throw an error
    if (typeof opts.query._id == 'undefined' && opts.query.hasOwnProperty('_id')) {
      throw new Error('Please pass an object or MongoId to options.query')
    }
    // Remove undefined query parameters
    opts.query = util.removeUndefined(opts.query)
    if (util.isId(opts.query._id)) opts.query._id = this.manager.id(opts.query._id)
    if (isIdType(opts.query._id)) opts.one = true
    return opts
  },

  _processAfterFind: function(data, projection, afterFindContext) {
    /**
     * Todo: Maybe make this method public?
     * Recurses through fields that are models and populates missing default-fields and calls model.afterFind([fn,..])
     * Be sure to add any virtual fields to the schema that your populating on,
     * e.g. "nurses": [{ model: 'user' }]
     * @param {object|array|null} data
     * @param {object} projection - $project object
     * @param {object} afterFindContext - handy fontext object given to schema.afterFind
     * @this model
     * @return Promise(data)
     */
    // Start with parent model data, and recurse down
    let callbackSeries = []
    let model = this.manager.model
    let parentModelData = util.toArray(data).map(o => ({ modelName: this.name, dataRef: o }))
    let modelData = parentModelData.concat(this._recurseAndFindModels(this.fields, data))

    // Loop found model/deep-model data objects, and populate missing default-fields and call afterFind on each
    for (let item of modelData) {
      // Populuate missing default fields if data !== null
      // NOTE: maybe only call functions if default is being set.. fine for now
      if (item.dataRef) {
        util.forEach(model[item.modelName].defaultFieldsFlattened, (schema, path) => {
          let parentPath = item.fieldName? item.fieldName + '.' : ''
          let pathWithoutArrays = (parentPath + path).replace(/\.0(\.|$)/, '$1')
          // Ignore default fields that are excluded in a blacklist/parent-blacklist
          if (!this._pathInProjection(pathWithoutArrays, projection, true)) return
          // Ignore default
          let value = util.isFunction(schema.default)? schema.default(this.manager) : schema.default
          util.setDeepValue(item.dataRef, path.replace(/\.0(\.|$)/g, '.$$$1'), value, false, true, true)
        })
      }
      // Collect all of the model's afterFind hooks
      for (let fn of model[item.modelName].afterFind) {
        callbackSeries.push(fn.bind(afterFindContext, item.dataRef))
      }
    }
    return util.runSeries(callbackSeries).then(() => data)
  },

  _addDeepBlacklists: function(blacklistProjection, populate) {
    /**
     * Include deep-model blacklists into the projection
     * @param {object} blacklistProject
     * @param {array} populate - find populate array
     * @return {object} exclusion blacklist
     * @this model
     */
    let model = this
    let manager = this.manager
    let paths = (populate||[]).map(o => o && o.as? o.as : o)

    if (!paths.length) return blacklistProjection
    this._recurseFields(model.fields, "", function(path, field) {
      // Remove array indexes from the path e.g. '0.'
      path = path.replace(/(\.[0-9]+)(\.|$)/, '$2')
      if (!field.model || !paths.includes(path)) return
      loop: for (let prop of manager.model[field.model].findBL) {
        // Don't include any deep model projection keys that already have a parent specified. E.g if
        // both { users.secrets: 1 } and { users.secrets.token: 1 } exist, remove the later
        for (let key in blacklistProjection) {
          if ((path + '.' + prop).match(new RegExp('^' + key.replace(/\./g, '\\.') + '(\\.|$)'))) {
            continue loop
          }
        }
        // Add model property to blacklist
        blacklistProjection[path + '.' + prop] = 0
      }
    })
    return blacklistProjection
  },

  _addBlacklist: function(blacklistProjection, blacklist) {
    /**
     * Merge blacklist in
     * @param {object} blacklistProjection
     * @param {array} paths - e.g. ['password', '-email'] - email will be whitelisted / removed from exlcusion projection
     * @return {object} exclusion blacklist
     * @this model
     */
    if (blacklist === false) {
      return {}
    } else if (!blacklist) {
      return blacklistProjection
    } else {
      // Loop blacklist
      for (let _key of blacklist) {
        let key = _key.replace(/^-/, '')
        let negated = _key.match(/^-/)
        // Remove any deep projection keys that already have a parent specified. E.g if
        // both { users.secrets: 0 } and { users.secrets.token: 0 } exist, remove the later
        for (let key2 in blacklistProjection) {
          if (key2.match(new RegExp('^' + key.replace(/\./g, '\\.') + '(\\.|$)'))) {
            delete blacklistProjection[key2]
          }
        }
        if (negated) {
          if (blacklistProjection.hasOwnProperty(key)) delete blacklistProjection[key]
        } else {
          blacklistProjection[key] = 0
        }
      }
      return blacklistProjection
    }
  },

  _depreciated_removeBlacklisted: function(data, populate, whitelist) {
    /**
     * Remove blacklisted fields, takes foreign model blacklists into account
     * @param {object|array} data
     * @param {array} <populate> find populate list
     * @param {array} <whitelist>
     */
    let findBL = this.findBL
    let findWL = [ '_id', ...this.findWL ]
    let model = this.manager.model

    this._recurseFields(this.fields, "", function(path, field) {
      // Remove array indexes from the path e.g. '0.'
      path = path.replace(/(\.[0-9]+)(\.|$)/, '$2')
      //if (field.type == 'any') findWL.push(path) //exclude.push(path)

      // Below: Merge in model whitelists (we should cache the results)
      if (!field.model) return
      else if (!model[field.model]) return

      // Has this path been blacklisted already?
      for (let blacklisted of findBL) {
        if (blacklisted === path || path.includes(blacklisted + '.', 0)) {
          return
        }
      }

      // Populating?
      if ((populate||[]).includes(path)) {
        // Remove the model-field from the whitelist if populating
        let parentIndex = findWL.indexOf(path)
        if (parentIndex !== -1) findWL.splice(parentIndex, 1)

        // Okay, merge in the model's whitelist
        findWL.push(path + '.' + '_id')
        for (let prop of model[field.model].findWL) {
          // Dont add model properties that are already blacklisted
          if (findBL.includes(path + '.' + prop)) continue
          // Add model prop to whitelist
          findWL.push(path + '.' + prop)
        }
      }
    })

    // Merge in the passed in whitelist
    findWL = findWL.concat(whitelist || [])

    // Fill in missing parents e.g. pets.dog.name, pets.dog doesn't exist
    // Doesn't matter what order these are added in
    // for (let whitelisted of findWL) {
    //   let parents = whitelisted.split('.')
    //   let target = ''
    //   for (let parent of parents) {
    //     if (!findWL.includes(target + parent)) findWL.push(target + parent)
    //     target = target + parent + '.'
    //   }
    // }

    console.log(1, findWL)
    console.log(2, data)

    // "data.cat.colour" needs to add "data.cat"
    // "data.cat" needs to everything

    function recurseAndDeleteData(data, path) {
      // Remove array indexes from the path e.g. '0.'
      let newpath = path.replace(/(\.[0-9]+)(\.|$)/, '$2')
      util.forEach(data, function(field, fieldName) {
        if ((util.isArray(field) || util.isObjectAndNotID(field))/* && !exclude.includes(newpath + fieldName)*/) {
          if (findWL.includes(newpath + fieldName)) return
          recurseAndDeleteData(field, newpath + fieldName + '.')
        } else if (!findWL.includes(newpath + fieldName) && !util.isNumber(fieldName)) {
          console.log(3, fieldName)
          delete data[fieldName]
        }
      })
    }

    for (let doc of util.toArray(data)) {
      recurseAndDeleteData(doc, "")
    }
    return data
  },

  _pathInProjection: function(path, projection, matchParentPaths) {
    /**
     * Checks if the path is valid within a inclusion/exclusion projection
     * @param {string} path - path without array brackets e.g. '.[]'
     * @param {object} projection
     * @param {boolean} matchParentPaths - match paths included in a key (inclusive only)
     * @return {boolean}
     */
    let inc
    // console.log(path, projection)
    for (let key in projection) {
      if (projection[key] && matchParentPaths) {
        // Inclusion
        // E.g. 'pets.color.age'.match(/^pets.color.age(.|$)/) = match
        // E.g. 'pets.color.age'.match(/^pets.color(.|$)/) = match
        // E.g. 'pets.color'.match(/^pets.color.age(.|$)/) = match
        inc = true
        if (key.match(new RegExp('^' + path.replace(/\./g, '\\.') + '(\\.|$)'))) return true
        if (path.match(new RegExp('^' + key.replace(/\./g, '\\.') + '(\\.|$)'))) return true
      } else if (projection[key]) {
        // Inclusion (equal to key, or key included in path)
        // E.g. 'pets.color.age'.match(/^pets.color.age(.|$)/) = match
        // E.g. 'pets.color.age'.match(/^pets.color(.|$)/) = match
        // E.g. 'pets.color'.match(/^pets.color.age(.|$)/) = no match
        inc = true
        if (path.match(new RegExp('^' + key.replace(/\./g, '\\.') + '(\\.|$)'))) return true
      } else {
        // Exclusion
        // E.g. 'pets.color.age'.match(/^pets.color(.|$)/) = match
        if (path.match(new RegExp('^' + key.replace(/\./g, '\\.') + '(\\.|$)'))) return false
      }
    }
    return inc? false : true
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
