const util = require('./util.js')
const Model = require('./model.js')

Model.prototype.count = async function (opts) {
  /**
   * Count document(s)
   * @param {object} opts
   *     @param {object} <opts.query> - mongodb query object
   *     @param {boolean} <opts.respond> - automatically call res.json/error (requires opts.req)
   *     @param {any} <any mongodb option>
   * @return promise
   * @this model
   */
  try {
    opts = await this._queryObject(opts, 'remove')
    // Remove
    const response = await this._count(opts.query, util.omit(opts, this._queryOptions))
    // Success
    if (opts.req && opts.respond) opts.req.res.json(response)
    else return Promise.resolve(response)

  } catch (err) {
    if (opts && opts.req && opts.respond) opts.req.res.error(err)
    else throw err
  }
}

Model.prototype.insert = async function (opts) {
  /**
   * Inserts document(s) after validating data & before hooks.
   * @param {object} opts
   *     @param {object|array} opts.data - documents to insert
   *     @param {array|string|false} <opts.blacklist> - augment schema.insertBL, `false` will remove blacklisting
   *     @param {array|string} <opts.project> - return only these fields, ignores blacklisting
   *     @param {boolean} <opts.respond> - automatically call res.json/error (requires opts.req)
   *     @param {array|string|true} <opts.skipValidation> - skip validation for this field name(s)
   *     @param {boolean} <opts.timestamps> - whether `createdAt` and `updatedAt` are automatically inserted
   *     @param {array|string|false} <opts.validateUndefined> - validates all 'required' undefined fields, true by
   *         default, but false on update
   *     @param {any} <any mongodb option>
   * @return promise
   * @this model
   */
  try {
    opts = await this._queryObject(opts, 'insert')

    // Validate
    let data = await this.validate(opts.data || {}, opts) // was { ...opts }

    // Insert
    await util.runSeries(this.beforeInsert.map(f => f.bind(opts, data)))
    let response = await this._insert(data, util.omit(opts, this._queryOptions))
    await util.runSeries(this.afterInsert.map(f => f.bind(opts, response)))

    // Success/error
    if (opts.req && opts.respond) opts.req.res.json(response)
    else return Promise.resolve(response)

  } catch (err) {
    if (opts && opts.req && opts.respond) opts.req.res.error(err)
    else throw err
  }
}

Model.prototype.find = async function (opts, _one) {
  /**
   * Finds document(s), with auto population
   * @param {object} opts
   *     @param {array|string|false} <opts.blacklist> - augment schema.findBL, `false` will remove all blacklisting
   *     @param {array} <opts.populate> - population, see docs
   *     @param {array|string} <opts.project> - return only these fields, ignores blacklisting
   *     @param {object} <opts.query> - mongodb query object
   *     @param {boolean} <opts.respond> - automatically call res.json/error (requires opts.req)
   *     @param {any} <any mongodb option>
   * @param {boolean} <_one> - return one document
   * @return promise
   * @this model
   */
  try {
    let lookups = []
    opts = await this._queryObject(opts, 'find', _one)

    // Get projection
    if (opts.project) opts.projection = this._getProjectionFromProject(opts.project)
    else opts.projection = this._getProjectionFromBlacklist(opts.type, opts.blacklist)

    // Has text search?
    // if (opts.query.$text) {
    //   opts.projection.score = { $meta: 'textScore' }
    //   opts.sort = { score: { $meta: 'textScore' }}
    // }

    // Wanting to populate?
    if (!opts.populate) {
      var response = await this[`_find${opts._one? 'One' : ''}`](opts.query, util.omit(opts, this._queryOptions))
    } else {
      loop: for (let item of opts.populate) {
        let path = util.isObject(item)? item.as : item
        // Blacklisted?
        if (this._pathBlacklisted(path, opts.projection)) continue loop
        // Custom $lookup definition
        // https://thecodebarbarian.com/a-nodejs-perspective-on-mongodb-36-lookup-expr
        if (util.isObject(item)) {
          lookups.push({ $lookup: item })
        } else {
          let arrayTarget
          let arrayCount = 0
          let schema = path.split('.').reduce((o, i) => {
            if (util.isArray(o[i])) {
              arrayCount++
              arrayTarget = true
              return o[i][0]
            } else {
              arrayTarget = false
              return o[i]
            }
          }, this.fields)
          let modelName = (schema||{}).model
          if (!modelName) {
            this.error(
              `The field "${path}" passed to populate is not of type model. You would ` +
              'need to add the field option e.g. { model: \'comment\' } in your schema.'
            )
            continue
          } else if (arrayCount > 1) {
            this.error(
              `You cannot populate on array's nested in array's: ${path}: ` +
              `{ model: "${modelName}" }`
            )
            continue
          } else if (arrayCount == 1 && !arrayTarget) {
            this.error(
              `You cannot populate within an array of sub-documents: ${path}: ` +
              `{ model: "${modelName}" }`
            )
            continue
          } else if (!this.manager.models[modelName]) {
            this.error(
              `The field's model defined in your schema does not exist: ${path}: ` +
              `{ model: "${modelName}" }`
            )
            continue
          }
          // Convert array into a document for non-array targets
          if (!arrayTarget) {
            (opts.addFields = opts.addFields || {})[path] = { '$arrayElemAt': [ '$' + path, 0 ] }
          }
          // Create lookup
          lookups.push({ $lookup: {
            from: modelName,
            localField: path,
            foreignField: '_id',
            as: path,
          }})
        }
      }
      // console.log(1, opts.projection)
      // console.log(2, lookups)
      let aggregate = [
        { $match: opts.query },
        ...(util.isDefined(opts.sort) ? [{ $sort: opts.sort }] : []),
        ...(util.isDefined(opts.skip) ? [{ $limit: opts.skip }] : []),
        ...(util.isDefined(opts.limit) ? [{ $limit: opts.limit }] : []),
        ...lookups,
        ...(opts.addFields? [{ $addFields: opts.addFields }] : []),
        ...(opts.projection? [{ $project: opts.projection }] : []),
      ]
      response = await this._aggregate(aggregate)
      this.info('aggregate', JSON.stringify(aggregate))
    }

    // Returning one?
    if (opts._one && util.isArray(response)) response = response[0] || null

    // Process afterFind hooks
    response = await this._processAfterFind(response, opts.projection, opts)

    // Success
    if (opts.req && opts.respond) opts.req.res.json(response)
    else return Promise.resolve(response)

  } catch (err) {
    if (opts && opts.req && opts.respond) opts.req.res.error(err)
    else throw err
  }
}

Model.prototype.findOne = async function (opts) {
  return this.find(opts, true)
}

Model.prototype.findOneAndUpdate = async function (opts) {
  /**
   * Find and update document(s) with auto population
   * @param {object} opts
   *     @param {array|string|false} <opts.blacklist> - augment findBL/updateBL, `false` will remove all blacklisting
   *     @param {array} <opts.populate> - find population, see docs
   *     @param {array|string} <opts.project> - return only these fields, ignores blacklisting
   *     @param {object} <opts.query> - mongodb query object
   *     @param {boolean} <opts.respond> - automatically call res.json/error (requires opts.req)
   *     @param {any} <any mongodb option>
   *
   *     Update options:
   *     @param {object|array} opts.data - mongodb document update object(s)
   *     @param {array|string|true} <opts.skipValidation> - skip validation for this field name(s)
   *     @param {boolean} <opts.timestamps> - whether `updatedAt` is automatically updated
   *     @param {array|string|false} <opts.validateUndefined> - validates all 'required' undefined fields, true by
   *         default, but false on update
   * @return promise
   * @this model
   */

  if (opts.populate) {
    try {
      // todo: add transaction flag
      delete opts.multi
      let update = await this.update(opts, 'findOneAndUpdate')
      if (update) var response = await this.findOne(opts)
      else response = update

      // Success
      if (opts.req && opts.respond) opts.req.res.json(response)
      else return Promise.resolve(response)

    } catch (e) {
      if (opts && opts.req && opts.respond) opts.req.res.error(e)
      else throw e
    }
  } else {
    return this.update(opts, 'findOneAndUpdate')
  }
}

Model.prototype.update = async function (opts, type='update') {
  /**
   * Updates document(s) after validating data & before hooks.
   * @param {object} opts
   *     @param {object|array} opts.data - mongodb document update object(s)
   *     @param {array|string|false} <opts.blacklist> - augment schema.updateBL, `false` will remove blacklisting
   *     @param {array|string} <opts.project> - return only these fields, ignores blacklisting
   *     @param {object} <opts.query> - mongodb query object
   *     @param {boolean} <opts.respond> - automatically call res.json/error (requires opts.req)
   *     @param {array|string|true} <opts.skipValidation> - skip validation for this field name(s)
   *     @param {boolean} <opts.timestamps> - whether `updatedAt` is automatically updated
   *     @param {array|string|false} <opts.validateUndefined> - validates all 'required' undefined fields, true by
   *         default, but false on update
   *     @param {any} <any mongodb option>
   * @param {function} <type> - 'update', or 'findOneAndUpdate'
   * @return promise(data)
   * @this model
   */
  try {
    opts = await this._queryObject(opts, type)
    let data = opts.data
    let response = null
    let operators = util.pick(opts, [/^\$/])

    // Validate
    if (util.isDefined(data)) {
      data = await this.validate(opts.data, opts) // was {...opts}
    }
    if (!util.isDefined(data) && util.isEmpty(operators)) {
      throw new Error(`Please pass an update operator to ${this.name}.${type}(), e.g. data, $unset, etc`)
    }
    if (util.isDefined(data) && (!data || util.isEmpty(data))) {
      throw new Error(`No valid data passed to ${this.name}.${type}({ data: .. })`)
    }

    // Hook: beforeUpdate (has access to original, non-validated opts.data)
    await util.runSeries(this.beforeUpdate.map(f => f.bind(opts, data||{})))

    if (data && operators['$set']) {
      this.info(`'$set' fields take precedence over the data fields for \`${this.name}.${type}()\``)
    }
    if (data || operators['$set']) {
      operators['$set'] = { ...data, ...(operators['$set'] || {}) }
    }

    // findOneAndUpdate, get 'find' projection
    if (type == 'findOneAndUpdate') {
      if (opts.project) opts.projection = this._getProjectionFromProject(opts.project)
      else opts.projection = this._getProjectionFromBlacklist('find', opts.blacklist)
      // Just peform a normal update if we need to populate a findOneAndUpdate
      if (opts.populate) type = 'update'
    }

    // Update
    let update = await this['_' + type](opts.query, operators, util.omit(opts, this._queryOptions))
    if (type == 'findOneAndUpdate') {
      response = update
    } else if (util.isDefined(update.upsertedId)) {
      response = Object.assign(
        Object.create({ _output: update }),
        operators['$set'] || {},
        update.upsertedId ? { _id: update.upsertedId } : {}
      )
    }

    // Hook: afterUpdate (doesn't have access to validated data)
    if (response) await util.runSeries(this.afterUpdate.map(f => f.bind(opts, response)))

    // Hook: afterFind if findOneAndUpdate
    if (response && type == 'findOneAndUpdate') {
      response = await this._processAfterFind(response, opts.projection, opts)
    }

    // Success
    if (opts.req && opts.respond) opts.req.res.json(response)
    else return response

  } catch (err) {
    if (opts && opts.req && opts.respond) opts.req.res.error(err)
    else throw err
  }
},

Model.prototype.remove = async function (opts) {
  /**
   * Remove document(s) with before and after hooks.
   * @param {object} opts
   *     @param {object} <opts.query> - mongodb query object
   *     @param {boolean} <opts.respond> - automatically call res.json/error (requires opts.req)
   *     @param {boolean=true} <opts.multi> - set to false to limit the deletion to just one document
   *     @param {any} <any mongodb option>
   * @return promise
   * @this model
   */
  try {
    opts = await this._queryObject(opts, 'remove')

    // Remove
    await util.runSeries(this.beforeRemove.map(f => f.bind(opts)))
    let response = await this._remove(opts.query, util.omit(opts, this._queryOptions))
    await util.runSeries(this.afterRemove.map(f => f.bind(response)))

    // Success
    if (opts.req && opts.respond) opts.req.res.json(response)
    else return Promise.resolve(response)

  } catch (err) {
    if (opts && opts.req && opts.respond) opts.req.res.error(err)
    else throw err
  }
}

Model.prototype._getProjectionFromBlacklist = function (type, customBlacklist) {
  /**
   * Returns an exclusion projection
   *
   * Path collisions are removed
   * E.g. ['pets.dogs', 'pets.dogs.name', '-cat', 'pets.dogs.age'] = { 'pets.dog': 0 }
   *
   * @param {string} type - find, insert, or update
   * @param {array|string|false} customBlacklist - normally passed through options
   * @return {array|undefined} exclusion $project {'pets.name': 0}
   * @this model
   *
   * 1. collate deep-blacklists
   * 2. concatenate the model's blacklist and any custom blacklist
   * 3. create an exclusion projection object from the blacklist, overriding from left to right
   */

  let list = []
  let manager = this.manager
  let projection = {}
  if (customBlacklist === false) return

  // String?
  if (typeof customBlacklist === 'string') {
    customBlacklist = customBlacklist.trim().split(/\s+/)
  }

  // Concat deep blacklists
  if (type == 'find') {
    util.forEach(this.fieldsFlattened, (schema, path) => {
      if (!schema.model) return
      let deepBL = manager.models[schema.model][`${type}BL`] || []
      let pathWithoutArrays = path.replace(/\.0(\.|$)/, '$1')
      list = list.concat(deepBL.map(o => {
        return `${o.charAt(0) == '-'? '-' : ''}${pathWithoutArrays}.${o.replace(/^-/, '')}`
      }))
    })
  }

  // Concat model, and custom blacklists
  list = list.concat([...this[`${type}BL`]]).concat(customBlacklist || [])

  // Loop blacklists
  for (let _key of list) {
    let key = _key.replace(/^-/, '')
    let whitelisted = _key.match(/^-/)

    // Remove any child fields. E.g remove { user.token: 0 } = key2 if iterating { user: 0 } = key
    for (let key2 in projection) {
      // todo: need to write a test, testing that this is scoped to \.
      if (key2.match(new RegExp('^' + key.replace(/\./g, '\\.') + '(\\.|$)'))) {
        delete projection[key2]
      }
    }

    // Whitelist
    if (whitelisted) {
      projection[key] = 1
      // Whitelisting a child of a blacklisted field (blacklist expansion)
      // let parent = '' // highest blacklisted parent
      // for (let key2 in projection) {
      //   if (key2.length > parent.length && key.match(new RegExp('^' + key2.replace(/\./g, '\\.')))) {
      //     parent = key2
      //   }
      // }

    // Blacklist (only if there isn't a parent blacklisted)
    } else {
      let parent
      for (let key2 in projection) { // E.g. [address = key2, addresses.country = key]
        if (projection[key2] == 0 && key.match(new RegExp('^' + key2.replace(/\./g, '\\.') + '\\.'))) {
          parent = key2
        }
      }
      if (!parent) projection[key] = 0
    }
  }

  // Remove whitelist projections
  for (let key in projection) {
    if (projection[key]) delete projection[key]
  }

  return util.isEmpty(projection) ? undefined : projection
}

Model.prototype._getProjectionFromProject = function (customProject) {
  /**
   * Returns an in/exclusion projection
   * todo: tests
   *
   * @param {object|array|string} customProject - normally passed through options
   * @return {array|undefined} in/exclusion projection {'pets.name': 0}
   * @this model
   */
  let projection
  if (util.isString(customProject)) {
    customProject = customProject.trim().split(/\s+/)
  }
  if (util.isArray(customProject)) {
    projection = customProject.reduce((o, v) => {
      o[v.replace(/^-/, '')] = v.match(/^-/)? 0 : 1
      return o
    }, {})
  }
  return projection
}

Model.prototype._queryObject = async function (opts, type, _one) {
  /**
   * Normalize options
   * @param {MongoId|string|object} opts
   * @param {string} type - insert, update, find, remove, findOneAndUpdate
   * @param {boolean} _one - return one document
   * @return {Promise} opts
   * @this model
   *
   * Query parsing logic:
   * opts == string|MongodId - treated as an id
   * opts == undefined|null|false - throw error
   * opts.query == string|MongodID - treated as an id
   * opts.query == undefined|null|false - throw error
   */

  // Query
  if (type != 'insert') {
    let isIdType = (o) => util.isId(o) || util.isString(o)
    if (isIdType(opts)) {
      opts = { query: { _id: opts || '' }}
    }
    if (isIdType((opts||{}).query)) {
      opts.query = { _id: opts.query || '' }
    }
    if (!util.isObject(opts) || !util.isObject(opts.query)) {
      throw new Error('Please pass an object or MongoId to options.query')
    }
    // For security, if _id is set and undefined, throw an error
    if (typeof opts.query._id == 'undefined' && opts.query.hasOwnProperty('_id')) {
      throw new Error('Please pass an object or MongoId to options.query')
    }
    if (util.isId(opts.query._id)) opts.query._id = this.manager.id(opts.query._id)
    if (isIdType(opts.query._id) || _one || type == 'findOneAndUpdate') opts._one = true
    opts.query = util.removeUndefined(opts.query)

    // Query options
    const limit = opts.limit || this.manager.opts.limit
    opts.limit = opts._one ? 1 : (util.isDefined(limit) ? parseInt(limit) : undefined)
    opts.skip = util.isDefined(opts.skip) ? Math.max(0, opts.skip || 0) : undefined
    opts.sort = opts.sort || { 'createdAt': -1 }
    if (util.isString(opts.sort)) {
      let name = (opts.sort.match(/([a-z0-9-_]+)/) || [])[0]
      let order = (opts.sort.match(/:(-?[0-9])/) || [])[1]
      opts.sort = { [name]: parseInt(order || 1) }
    }
  }

  // Data
  if (!opts) opts = {}
  if (!util.isDefined(opts.data) && util.isDefined((opts.req||{}).body)) opts.data = opts.req.body
  if (util.isDefined(opts.data)) opts.data = await util.parseData(opts.data)

  opts.type = type
  opts[type] = true // still being included in the operation options..
  opts.model = this
  util.removeUndefined(opts)
  return opts
}

Model.prototype._pathBlacklisted = function (path, projection, matchDeepWhitelistedKeys=true) {
  /**
   * Checks if the path is blacklisted within a inclusion/exclusion projection
   * @param {string} path - path without array brackets e.g. '.[]'
   * @param {object} projection - inclusion/exclusion projection, not mixed
   * @param {boolean} matchDeepWhitelistedKeys - match deep whitelisted keys containing path
   *     E.g. pets.color == pets.color.age
   * @return {boolean}
   */
  for (let key in projection) {
    if (projection[key]) {
      // Inclusion (whitelisted)
      // E.g. pets.color.age == pets.color.age  (exact match)
      // E.g. pets.color.age == pets.color      (path contains key)
      var inclusion = true
      if (path.match(new RegExp('^' + key.replace(/\./g, '\\.') + '(\\.|$)'))) return false
      if (matchDeepWhitelistedKeys) {
        // E.g. pets.color   == pets.color.age  (key contains path)
        if (key.match(new RegExp('^' + path.replace(/\./g, '\\.') + '\\.'))) return false
      }
    } else {
      // Exclusion (blacklisted)
      // E.g. pets.color.age == pets.color.age  (exact match)
      // E.g. pets.color.age == pets.color      (path contains key)
      if (path.match(new RegExp('^' + key.replace(/\./g, '\\.') + '(\\.|$)'))) return true
    }
  }
  return inclusion? true : false
}

Model.prototype._processAfterFind = function (data, projection={}, afterFindContext={}) {
  /**
   * Todo: Maybe make this method public?
   * Recurses through fields that are models and populates missing default-fields and calls model.afterFind([fn,..])
   * Be sure to add any virtual fields to the schema that your populating on,
   * e.g. "nurses": [{ model: 'user' }]
   *
   * @param {object|array|null} data
   * @param {object} projection - opts.projection (== opts.blacklist is merged with all found deep model blacklists)
   * @param {object} afterFindContext - handy context object given to schema.afterFind
   * @return Promise(data)
   * @this model
   */
  // Recurse down from the parent model, ending with the parent model as the parent afterFind hook may
  // want to manipulate any populated models
  let callbackSeries = []
  let models = this.manager.models
  let parent = util.toArray(data).map(o => ({ dataRef: o, dataPath: '', dataFieldName: '', modelName: this.name }))
  let modelFields = this._recurseAndFindModels('', this.fields, data).concat(parent)

  // Loop found model/deep-model data objects, and populate missing default-fields and call afterFind on each
  for (let item of modelFields) {
    // Populate missing default fields if data !== null
    // NOTE: maybe only call functions if default is being set.. fine for now
    if (item.dataRef) {
      for (const localSchemaFieldPath in models[item.modelName].fieldsFlattened) {
        const schema = models[item.modelName].fieldsFlattened[localSchemaFieldPath]
        if (!util.isDefined(schema.default) || localSchemaFieldPath.match(/^\.?(createdAt|updatedAt)$/)) continue

        // const parentPath = item.dataFieldName ? item.dataFieldName + '.' : ''
        const fullPathWithoutArrays = [item.dataPath, localSchemaFieldPath]
          .filter(o => o)
          .join('.')
          .replace(/\.[0-9]+(\.|$)/g, '$1')

        // Ignore default fields that are blacklisted
        if (this._pathBlacklisted(fullPathWithoutArrays, projection)) continue

        // Set default value
        const value = util.isFunction(schema.default) ? schema.default(this.manager) : schema.default
        util.setDeepValue(item.dataRef, localSchemaFieldPath.replace(/\.0(\.|$)/g, '.$$$1'), value, true, false, true)
      }
    }
    // Collect all of the model's afterFind hooks
    for (let fn of models[item.modelName].afterFind) {
      callbackSeries.push(fn.bind(afterFindContext, item.dataRef))
    }
  }
  return util.runSeries(callbackSeries).then(() => data)
}

Model.prototype._recurseAndFindModels = function (parentPath, schemaFields, dataArr) {
  /**
   * Returns a flattened list of models fields
   * @param {string} parentPath
   * @param {object} schemaFields - schema fields object
   * @param {object|array} dataArr
   * @return [{
   *   dataRef: { *fields here* },
   *   dataPath: 'usersNewCompany',
   *   dataFieldName: usersNewCompany,
   *   modelName: company
   * },..]
   */
  let out = []
  for (let data of util.toArray(dataArr)) {
    util.forEach(schemaFields, (field, fieldName) => {
      if (!data || !data[fieldName]) return
      const newParentPath = parentPath ? `${parentPath}.${fieldName}` : fieldName 
      // console.log(11, newParentPath, fieldName, field)

      // Recurse through sub-document fields
      if (util.isObjectAndNotID(data[fieldName]) && util.isSubdocument(field)) {
        out = [...out, ...this._recurseAndFindModels(newParentPath, field, data[fieldName])]

      // Recurse through array of sub-documents
      } else if (util.isArray(data[fieldName]) && util.isSubdocument((field||[])[0])) {
        for (let i=0, l=data[fieldName].length; i<l; i++) {
          out = [...out, ...this._recurseAndFindModels(newParentPath + '.' + i, field[0], data[fieldName][i])]
        }

      // Single data model (schema field can be either a single or array of models, due to custom $lookup's)
      } else if (util.isObjectAndNotID(data[fieldName]) && (field.model || (field[0]||{}).model)) {
        out.push({
          dataRef: data[fieldName],
          dataPath: newParentPath,
          dataFieldName: fieldName,
          modelName: field.model || field[0].model,
        })
      
      // Array of data models (schema field can be either a single or array of models, due to custom $lookup's)
      } else if (util.isObjectAndNotID(data[fieldName][0]) && (field.model || (field[0]||{}).model)) {
        for (let i=0, l=data[fieldName].length; i<l; i++) {
          out.push({
            dataRef: data[fieldName][i],
            dataPath: newParentPath + '.' + i,
            dataFieldName: fieldName,
            modelName: field.model || field[0].model,
          })
        }
      } 
    }, this)
  }
  return out
}

Model.prototype._queryOptions = [
  // todo: remove type properties
  'blacklist', 'data', 'find', 'findOneAndUpdate', 'insert', 'model', '_one', 'populate', 'project',
  'projectionValidate', 'query', 'remove', 'req', 'respond', 'skipValidation', 'type', 'update',
  'validateUndefined',
]
