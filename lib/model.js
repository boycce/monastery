let crud = require('./model-crud')
let rules = require('./rules')
let util = require('./util')
let validate = require('./model-validate')

let Model = module.exports = function(name, opts, manager) {
  /**
   * Setup a model (aka monk collection)
   * Todo: convert into a promise
   * @param {string} name
   * @param {object} opts - see mongodb colleciton documentation
   * @this Model
   */
  if (!(this instanceof Model)) {
    return new Model(name, opts, this)

  } else if (!name) {
    throw 'No model name defined'

  } else if (name.match(/^_/)) {
    throw 'Model names cannot start with an underscore'
  }

  // Add schema options
  opts = opts || {}
  Object.assign(this, {
    ...(opts.methods || {}),
    name: name,
    manager: manager,
    error: manager.error,
    info: manager.info,
    afterFind: opts.afterFind || [],
    afterInsert: (opts.afterInsert || []).concat(opts.afterInsertUpdate || []),
    afterUpdate: (opts.afterUpdate || []).concat(opts.afterInsertUpdate || []),
    afterRemove: opts.afterRemove || [],
    beforeInsert: (opts.beforeInsert || []).concat(opts.beforeInsertUpdate || []),
    beforeUpdate: (opts.beforeUpdate || []).concat(opts.beforeInsertUpdate || []),
    beforeRemove: opts.beforeRemove || [],
    beforeValidate: opts.beforeValidate || [],
    findBL: opts.findBL || ['password'],
    insertBL: opts.insertBL || [],
    updateBL: opts.updateBL || [],
    messages: opts.messages || {},
    fields: { ...(util.deepCopy(opts.fields) || {}) },
    rules: { ...(opts.rules || {}) }
  })

  // Run before model hooks
  for (let hook of this.manager.beforeModel) {
    hook(this)
  }

  // Format and assign any custom rules
  util.forEach(this.rules, function(rule, ruleName) {
    if (ruleName == 'type') {
      // Overriding the 'type' rule is forbidden
      this.error(`You cannot override the implicit rule "type" for model "${name}"`)
      delete this.rules[ruleName]
    } else {
      // Update with formatted rule
      let formattedRule = util.isObject(rule)? rule : { fn: rule }
      if (!formattedRule.message) formattedRule.message = `Invalid data property for rule "${ruleName}".`
      this.rules[ruleName] = formattedRule
    }
  }, this)

  // Extend default fields with passed in fields and check for invalid fields
  if (manager.defaultFields) this.fields = Object.assign({}, this._defaultFields, this.fields)
  this._setupFieldsAndWhitelists(this.fields)

  //   console.log(0, this.fieldlist)
  //   console.log(0, this.findBL)
  //   console.log(0, this.findBLProject)

  // Extend model with monk collection actions
  this._collection = manager.get? manager.get(name) : null
  if (!this._collection) {
    this.info('There is no mongodb connection, a lot of the monk/monastery methods will be unavailable')
  }
  for (let key in (this._collection || {})) {
    if (key.match(/^manager$|^options$|^_|^middlewares$|^name$/)) continue
    this['_' + key] = this._collection[key].bind(this._collection)
  }

  // Add model to manager
  if (typeof this.manager[name] === 'undefined'
      || typeof this.manager.model[name] !== 'undefined') {
    this.manager[name] = this
  } else {
    this.warn(`Your model name '${name}' is conflicting, you are only able to
    access this model via \`db.model.${name}\``)
  }

  // Add model to manager.model
  this.manager.model[name] = this

  // Ensure field indexes exist in mongodb
  let errHandler = err => {
    if (err.type == 'info') this.info(err.detail)
    else this.error(err)
  }
  if (opts.promise) return this._setupIndexes().catch(errHandler)
  else this._setupIndexes().catch(errHandler)
}

Model.prototype._getFieldlist = function(fields, path) {
  /**
   * Get all field paths (without array indices, handy for blacklisting)
   * @param {object|array} fields - subdocument or array
   * @param {string} path
   * @return {array} e.g. ['name', 'pets.dog']
   */
  let list = []
  util.forEach(fields, function(field, fieldName) {
    // Don't append array indexes to the new path e.g. '0.'
    let newPath = util.isArray(fields)? path : path + fieldName + '.'
    if (fieldName == 'schema') {
      return
    /*} else if (this.findBL.includes(newPath.replace(/\.$/, ''))) {
      return*/
    } else if (util.isArray(field)) {
      list = list.concat(this._getFieldlist(field, newPath))
    } else if (util.isSubdocument(field)) {
      list = list.concat(this._getFieldlist(field, newPath))
    } else {
      list.push(newPath.replace(/\.$/, ''))
    }
  }, this)
  return list
}

Model.prototype._getFieldsFlattened = function(fields, path) {
  /**
   * Flatten fields
   * @param {object|array} fields - subdocument or array
   * @param {string} path
   * @return {object} e.g. ['name', 'pets.dog']
   */
  let obj = {}
  util.forEach(fields, function(field, fieldName) {
    let newPath = path + fieldName + '.'
    if (fieldName == 'schema') {
      return
    } else if (util.isArray(field)) {
      Object.assign(obj, this._getFieldsFlattened(field, newPath))
    } else if (util.isSubdocument(field)) {
      Object.assign(obj, this._getFieldsFlattened(field, newPath))
    } else {
      if (util.isDefined(field.default)) {
        obj[newPath.replace(/\.$/, '')] = field
      }
    }
  }, this)
  return obj
}

Model.prototype._setupFields = function(fields) {
  /**
   * Check for invalid rules on a field object, and set field.isType
   * @param {object|array} fields - subsdocument or array
   */
  util.forEach(fields, function(field, fieldName) {
    // Schema field
    if (util.isSchema(field)) {
      // No image schema pre-processing done yet by a plugin
      if (field.type == 'image' && !field.image) field.image = true, field.type = 'any'
      if (field.model) field.type = 'id'
      let isType = 'is' + util.ucFirst(field.type)

      // No type defined
      if (!field.type) {
        this.error(`No type defined on "${this.name}" for field "${fieldName}". Defaulting to string.`)
        field.type = 'string'

      // Type doesn't exist
      } else if (!this.rules[isType] && !rules[isType]) {
        this.error(`Not a valid type "${field.type}" defined on "${this.name}" for field "${fieldName}".
          Defaulting to string.`)
        field.type = 'string'
      }

      // Convert type into a is{type} rule
      field[isType] = true

      // Rule doesn't exist
      util.forEach(field, (rule, ruleName) => {
        if (!this.rules[ruleName] && !rules[ruleName] && this._ignoredRules.indexOf(ruleName) == -1) {
          // console.log(field)
          this.error(`No rule "${ruleName}" exists for model "${this.name}". Ignoring rule.`)
          delete field[ruleName]
        }
      }, this)

    // Misused schema property
    } else if (fieldName == 'schema') {
      this.error(`Invalid schema on model "${this.name}", remember 'schema' is a reserverd property, ignoring field.`)
      delete fields[fieldName]

    // Fields be an array
    } else if (util.isArray(field)) {
      let arrayDefault = this.manager.defaultObjects? () => [] : undefined
      let nullObject = this.manager.nullObjects
      field.schema = { type: 'array', isArray: true, default: arrayDefault, nullObject: nullObject, ...(field.schema || {}) }
      this._setupFields(field)

    // Fields can be a subdocument, e.g. user.pet = { name: {}, ..}
    } else if (util.isSubdocument(field)) {
      let objectDefault = this.manager.defaultObjects? () => ({}) : undefined
      let nullObject = this.manager.nullObjects
      let index2dsphere = util.isSubdocument2dsphere(field)
      field.schema = field.schema || {}
      if (index2dsphere) {
        field.schema.index = index2dsphere
        delete field.index
      }
      field.schema = { type: 'object', isObject: true, default: objectDefault, nullObject: nullObject, ...field.schema }
      this._setupFields(field)
    }
  }, this)
},

Model.prototype._setupFieldsAndWhitelists = function(fields, path) {
  /**
   * Setup fields and retrieve a handy schema field list. This can be called mulitple times.
   * Note: the project fields are only required when finding with projections.
   * @param {object} fields - can be a nested subdocument or array
   * @param {string} <path>
   */
  this._setupFields(fields)
  this.fieldlist = this._getFieldlist(fields, path || '')
  this.defaultFieldsFlattened = this._getFieldsFlattened(fields, path || '') // test output?
  this.findBLProject = this.findBL.reduce((o, v) => { (o[v] = 0); return o }, {})
},

Model.prototype._setupIndexes = function(fields) {
  /**
   * Creates indexes for the model
   * Note: only one text index per model(collection) is allowed due to mongodb limitations
   * Note: we and currently don't support indexes on sub-collections, but sub-documents yes!
   * @link https://docs.mongodb.com/manual/reference/command/createIndexes/
   * @link https://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#createIndexes
   * @param {object} <fields>
   * @return Promise( {array} indexes | {string} error )
   *
   * MongoDB index structures = [
   *   true =     { name: 'name_1', key: { name: 1 } },
   *   unique =   { name: 'email_1', key: { email: 1 }, unique: true },
   *   text =     { name: 'text', key: { name: 'text', description, 'text', ..} },
   *   2dsphere = { name: 'center_2dsphere', key: { center: '2dsphere' } },
   *   ..
   * ]
   */
  let collection
  let hasTextIndex = false
  let indexes = []
  let model = this
  let textIndex = { name: 'text', key: {} }

  // No db defined
  if (!(model.manager._state || '').match(/^open/)) {
    let error = { type: 'info', detail: `Skipping createIndex on the '${model.name}' model, no mongodb connection found.` }
    return Promise.reject(error)
  }

  // Find all indexes
  recurseFields(fields || model.fields, '')
  if (hasTextIndex) indexes.push(textIndex)
  if (!indexes.length) return Promise.resolve([]) // No indexes defined

  // Create indexes
  return (model.manager._state == 'open'? Promise.resolve() : model.manager)
    .then(data => {
      // Collection exist?
      collection = model.manager._db.collection(model.name)
      return model.manager._db.listCollections({ name: model.name }).toArray()
    })
    .then(collections => {
      // Get the collection's indexes
      if (collections.length > 0) return collection.indexes()
      else return Promise.resolve([])
    })
    .then(existingIndexes => {
      // Remove any existing text index that has different options as createIndexes will throws error about this
      let indexNames = []
      if (!existingIndexes.length) return Promise.resolve()
      // console.log(0, textIndex)
      // console.log(1, existingIndexes, indexes)
      // Todo: Remove unused index names

      for (let existingIndex of existingIndexes) {
        if (!existingIndex.textIndexVersion) continue
        for (let index of indexes) {
          let fieldsInTextIndex1 = Object.keys(existingIndex.weights).sort().join()
          let fieldsInTextIndex2 = Object.keys(index.key).sort().join()
          if (existingIndex.name == index.name && fieldsInTextIndex1 !== fieldsInTextIndex2) {
            model.info(`Text index options are different for '${existingIndex.name}', removing old text index`)
            indexNames.push(existingIndex.name)
            break
          }
        }
      }

      if (indexNames.length > 1) return collection.dropIndex(indexNames)
      else if (indexNames.length) return collection.dropIndex(indexNames[0])
      else return Promise.resolve()
    })
    .then(() => {
      // Ensure/create indexes
      return collection.createIndexes(indexes)
    })
    .then(response => {
      model.info('db index(s) created for ' + model.name)
    })

  function recurseFields(fields, parentPath) {
    util.forEach(fields, (field, name) => {
      let index = field.index
      if (index) {
        let path = name == 'schema'? parentPath.slice(0, -1) : parentPath + name
        let options = util.isObject(index)? util.omit(index, ['type']) : {}
        let type = util.isObject(index)? index.type : index
        if (type === true) type = 1

        if (type == 'text') {
          hasTextIndex = textIndex.key[path] = 'text'
          Object.assign(textIndex, options)
        } else if (type == '1' || type == '-1' || type == '2dsphere') {
          indexes.push({ name: `${path}_${type}`, key: { [path]: type }, ...options })
        } else if (type == 'unique') {
          indexes.push({ name: `${path}_1`, key: { [path]: 1 }, unique: true, ...options  })
        }
      }
      if (util.isSubdocument(field)) {
        recurseFields(field, parentPath + name + '.')
      }
    })
  }
}

Model.prototype._defaultFields = {
  createdAt: {
    default: function(manager) {
      return manager.useMilliseconds? Date.now() : Math.floor(Date.now() / 1000)
    },
    insertOnly: true,
    type: 'integer'
  },
  updatedAt: {
    default: function(manager) {
      return manager.useMilliseconds? Date.now() : Math.floor(Date.now() / 1000)
    },
    type: 'integer'
  }
}

for (var key in crud) {
  Model.prototype[key] = crud[key]
}

for (var key in validate) {
  Model.prototype[key] = validate[key]
}
