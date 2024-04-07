let crud = require('./model-crud.js')
let rules = require('./rules.js')
let util = require('./util.js')
let validate = require('./model-validate.js')

let Model = module.exports = function(name, opts, manager) {
  /**
   * Setup a model (aka monk collection)
   * @param {string} name
   * @param {object} opts - see mongodb colleciton documentation
   * @param {boolean} opts.waitForIndexes
   * @return Promise(model) | this
   * @this model
   */
  if (!(this instanceof Model)) {
    return new Model(name, opts, this)
  } else if (!name) {
    throw 'No model name defined'
  } else if (name.match(/^_/)) {
    throw 'Model names cannot start with an underscore'
  } else if (!opts) {
    throw `No model definition passed for "${name}"`
  } else if (!opts.fields) {
    throw `We couldn't find ${name}.fields in the model definition, the model maybe setup ` 
      + `or exported incorrectly:\n${JSON.stringify(opts, null, 2)}`
  }

  // Add schema options
  Object.assign(this, {
    ...(opts.methods || {}),
    afterFind: opts.afterFind || [],
    afterInsert: (opts.afterInsert || []).concat(opts.afterInsertUpdate || []),
    afterUpdate: (opts.afterUpdate || []).concat(opts.afterInsertUpdate || []),
    afterRemove: opts.afterRemove || [],
    beforeInsert: (opts.beforeInsert || []).concat(opts.beforeInsertUpdate || []),
    beforeUpdate: (opts.beforeUpdate || []).concat(opts.beforeInsertUpdate || []),
    beforeRemove: opts.beforeRemove || [],
    beforeValidate: opts.beforeValidate || [],
    error: manager.error,
    info: manager.info,
    warn: manager.warn,
    insertBL: opts.insertBL
      ? !opts.insertBL.includes('_id') && !opts.insertBL.includes('-_id') ? ['_id'].concat(opts.insertBL) : opts.insertBL
      : ['_id'],
    fields: { ...(util.deepCopy(opts.fields) || {}) },
    findBL: opts.findBL || ['password'], // todo: password should be removed
    manager: manager,
    messages: opts.messages || {},
    messagesLen: Object.keys(opts.messages || {}).length > 0,
    name: name,
    rules: { ...(opts.rules || {}) },
    updateBL: opts.updateBL || [],
  })

  // Sort messages by specifity first, then we can just return the first match
  this.messages = Object
    .keys(this.messages)
    .sort((a, b) => {
      function getScore(key) {
        // Make sure the keys are sorted by specifity, e.g. the most specific keys are at the top
        // That means the variable indexes need to be sorted last, 
        // e.g. 'gulls.1.name' is more specific than 'gulls.$.name' 
        // e.g. 'gulls.1.name' is more specific than 'gulls.1.$'
        // e.g. 'gulls.1.$' is more specific than 'gulls.$.1'
        // e.g. 'gulls.1.1.$' is more specific than 'gulls.$.1.1'
        if (!key.match(/\.\$/)) return 0
        let score = 0
        let parts = key.split('.')
        for (let i = 0; i < parts.length; i++) {
          if (parts[i] == '$') score += 100 * (100 - i) // higher score is less specific 
        }
        return score
      }
      const scoreA = getScore(a)
      const scoreB = getScore(b)
      // this.messages[a].score = scoreA
      // this.messages[b].score = scoreB 
      return scoreA > scoreB ? 1 : (scoreA < scoreB ? -1 : 0)
    })
    .reduce((acc, key) => {
      // Now covert the path to a regex
      // e.g. pets.$.names.4.first => pets\.[0-9]+\.names\.4\.first
      this.messages[key].regex = new RegExp(`^${key.replace(/\./g, '\\.').replace(/\.\$/g, '.[0-9]+')}$`)
      // this.messages[key].regex = new RegExp(`^${key.replace(/\.\$/g, '(.[0-9]+|.)').replace(/\./g, '\\.')}$`) 
      // return an ordered object
      acc[key] = this.messages[key]
      return acc
    }, {})

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
      if (typeof formattedRule.validateNull == 'undefined') formattedRule.validateNull = true
      if (typeof formattedRule.validateEmptyString == 'undefined') formattedRule.validateEmptyString = true
      this.rules[ruleName] = formattedRule
    }
  }, this)

  // Extend default fields with passed in fields and check for invalid fields
  this._setupFields(this.fields = Object.assign({}, this._defaultFields, this.fields))
  this.fieldsFlattened = this._getFieldsFlattened(this.fields, '') // test output?

  // Extend model with monk collection queries
  this._collection = manager.get? manager.get(name, { castIds: false }) : null
  if (!this._collection) {
    this.info('There is no mongodb connection, a lot of the monk/monastery methods will be unavailable')
  }
  for (let key in (this._collection || {})) {
    if (key.match(/^manager$|^options$|^_|^middlewares$|^name$/)) continue
    this['_' + key] = this._collection[key].bind(this._collection)
  }

  // Add model to manager
  if (typeof this.manager[name] === 'undefined' || typeof this.manager.model[name] !== 'undefined') {
    this.manager[name] = this
  } else {
    this.warn(`Your model name '${name}' is conflicting with an builtin manager property, you are only able to
    access this model via \`db.model.${name}\``)
  }

  // Add model to manager.model
  this.manager.model[name] = this

  // Setup/Ensure field indexes exist in MongoDB
  let errHandler = err => {
    if (err.type == 'info') this.info(err.detail)
    else this.error(err)
  }
  if (opts.waitForIndexes) return this._setupIndexes().catch(errHandler).then(() => this)
  else this._setupIndexes().catch(errHandler) // returns this
}

Model.prototype._getFieldsFlattened = function(fields, path) {
  /**
   * Flatten fields
   * @param {object|array} fields - can be a nested subdocument or array
   * @param {string} path
   * @return {object} e.g. {'name': Schema, 'pets.dog': Schema}
   */
  let obj = {}
  util.forEach(fields, function(field, fieldName) {
    let newPath = /*util.isArray(fields)? path : */path + fieldName + '.'
    if (fieldName == 'schema') {
      return
    } else if (util.isArray(field)) {
      Object.assign(obj, this._getFieldsFlattened(field, newPath))
    } else if (util.isSubdocument(field)) {
      Object.assign(obj, this._getFieldsFlattened(field, newPath))
    } else {
      obj[newPath.replace(/\.$/, '')] = field
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
        if ((this.rules[ruleName] || rules[ruleName]) && this._ignoredRules.indexOf(ruleName) != -1) {
          this.error(`The rule name "${ruleName}" for the model "${this.name}" is a reserved keyword, ignoring rule.`)
        }
        if (!this.rules[ruleName] && !rules[ruleName] && this._ignoredRules.indexOf(ruleName) == -1) {
          // console.log(field)
          this.error(`No rule "${ruleName}" exists for model "${this.name}", ignoring rule.`)
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
      let virtual = field.length == 1 && (field[0]||{}).virtual ? true : undefined
      field.schema = {
        type: 'array',
        isArray: true,
        default: arrayDefault,
        nullObject: nullObject,
        virtual: virtual,
        ...(field.schema || {})
      }
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
      field.schema = { 
        type: 'object', 
        isObject: true, 
        default: objectDefault, 
        nullObject: nullObject, 
        ...field.schema 
      }
      this._setupFields(field)
    }
  }, this)
},

Model.prototype._setupIndexes = function(fields, opts={}) {
  /**
   * Creates indexes for the model (multikey, and sub-document supported)
   * Note: only one text index per model(collection) is allowed due to mongodb limitations
   * @link https://docs.mongodb.com/manual/reference/command/createIndexes/
   * @link https://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#createIndexes
   * @param {object} <fields>
   * @return Promise( {array} indexes ensured | {string} error )
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
    let error = {
      type: 'info',
      detail: `Skipping createIndex on the '${model.name}' model, no mongodb connection found.`
    }
    return Promise.reject(error)
  }

  // Find all indexes
  recurseFields(fields || model.fields, '')
  // console.log(2, indexes, fields)
  if (hasTextIndex) indexes.push(textIndex)
  if (opts.dryRun) return Promise.resolve(indexes || [])
  if (!indexes.length) return Promise.resolve([]) // No indexes defined

  // Create indexes
  return (model.manager._state == 'open'? new Promise(res => res()) : model.manager)
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
      if (!existingIndexes.length) return new Promise(res => res())
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
      else return new Promise(res => res())
    })
    .then(() => {
      // Ensure/create indexes
      return collection.createIndexes(indexes)
    })
    .then(response => {
      model.info('db index(s) created for ' + model.name)
      return indexes
    })

  function recurseFields(fields, parentPath) {
    util.forEach(fields, (field, name) => {
      let index = field.index
      if (index) {
        let options = util.isObject(index)? util.omit(index, ['type']) : {}
        let type = util.isObject(index)? index.type : index
        let path = name == 'schema'? parentPath.slice(0, -1) : parentPath + name
        let path2 = path.replace(/(^|\.)[0-9]+(\.|$)/g, '$2') // no numirical keys, e.g. pets.1.name
        if (type === true) type = 1
        if (type == 'text') {
          hasTextIndex = textIndex.key[path2] = 'text'
          Object.assign(textIndex, options)
        } else if (type == '1' || type == '-1' || type == '2dsphere') {
          indexes.push({ name: `${path2}_${type}`, key: { [path2]: type }, ...options })
        } else if (type == 'unique') {
          indexes.push({ name: `${path2}_1`, key: { [path2]: 1 }, unique: true, ...options  })
        }
      }
      if (util.isSubdocument(field)) {
        recurseFields(field, parentPath + name + '.')
      } else if (util.isArray(field)) {
        recurseFields(field, parentPath + name + '.')
      }
    })
  }
}

Model.prototype._defaultFields = {
  _id: {
    insertOnly: true,
    type: 'id'
  },
  createdAt: {
    default: function(fieldName, model) {
      return model.manager.useMilliseconds? Date.now() : Math.floor(Date.now() / 1000)
    },
    insertOnly: true,
    timestampField: true,
    type: 'integer'
  },
  updatedAt: {
    default: function(fieldName, model) {
      return model.manager.useMilliseconds? Date.now() : Math.floor(Date.now() / 1000)
    },
    timestampField: true,
    type: 'integer'
  }
}

for (let key in crud) {
  Model.prototype[key] = crud[key]
}

for (let key in validate) {
  Model.prototype[key] = validate[key]
}
