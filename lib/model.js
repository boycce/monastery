const rules = require('./rules.js')
const util = require('./util.js')

function Model(name, definition, waitForIndexes, manager) {
  /**
   * Setup a model
   * @param {string} name
   * @param {object} definition - model definition
   * @param {boolean} waitForIndexes - wait for indexes to be created before returning (returns a promise)
   * 
   * @return model or Promise(model)
   * @this Manager | Model
   */
  if (!(this instanceof Model)) {
    return new Model(name, definition, waitForIndexes, this)
  } else if (!name) {
    throw 'No model name defined'
  } else if (name.match(/^_/)) {
    throw 'Model names cannot start with an underscore'
  } else if (!definition) {
    throw `No model definition passed for "${name}"`
  } else if (!definition.fields) {
    throw `We couldn't find ${name}.fields in the model definition, the model maybe setup ` 
      + `or exported incorrectly:\n${JSON.stringify(definition, null, 2)}`
  } else if (!util.isSubdocument(definition.fields) && definition.fields.type == 'any') {
    throw `Instead of using { type: 'any' } for ${name}.fields, please use the new 'strict' definition rule` +
      ', e.g. { schema: { strict: false }}'
  } else if (!util.isSubdocument(definition.fields) && !util.isEmpty(definition.fields)) {
    throw `The ${name}.fields object should be a valid document, e.g. { name: { type: 'string' }}`
  } 
  // else if (manager.models[name]) {
  //   manager.warn(`The model '${name}' already exists, skipping model setup.`)
  //   return manager.models[name]
  // }

  // Add schema options
  Object.assign(this, {
    ...(definition.methods || {}),
    afterFind: definition.afterFind || [],
    afterInsert: (definition.afterInsert || []).concat(definition.afterInsertUpdate || []),
    afterUpdate: (definition.afterUpdate || []).concat(definition.afterInsertUpdate || []),
    afterRemove: definition.afterRemove || [],
    beforeInsert: (definition.beforeInsert || []).concat(definition.beforeInsertUpdate || []),
    beforeUpdate: (definition.beforeUpdate || []).concat(definition.beforeInsertUpdate || []),
    beforeRemove: definition.beforeRemove || [],
    beforeValidate: definition.beforeValidate || [],
    error: manager.error,
    info: manager.info,
    warn: manager.warn,
    insertBL: !definition.insertBL 
      ? ['_id'] : !definition.insertBL.includes('_id') && !definition.insertBL.includes('-_id')
      ? ['_id'].concat(definition.insertBL) : definition.insertBL,
    fields: { ...(util.deepCopy(definition.fields) || {}) },
    findBL: definition.findBL || ['password'], // todo: password should be removed
    manager: manager,
    messages: definition.messages || {},
    messagesLen: Object.keys(definition.messages || {}).length > 0,
    name: name,
    rules: { ...(definition.rules || {}) },
    updateBL: definition.updateBL || [],
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
  this._setupFields(
    this.fields = util.isSchema(this.fields) ? this.fields : Object.assign({}, this._defaultFields, this.fields)
  )
  this.fieldsFlattened = this._getFieldsFlattened(this.fields, '') // test output?
  this.modelFieldsArray = this._getModelFieldsArray()

  // Get collection, and extend model with collection methods
  this.collection = this.manager.get(name, { castIds: false })
  for (let key in Object.getPrototypeOf(this.collection||{})) {
    this['_' + key] = this.collection[key].bind(this.collection)
  }

  // Add model to manager
  if (typeof this.manager[name] !== 'undefined' && typeof this.manager.models[name] === 'undefined') {
    this.warn(`Your model name '${name}' is conflicting with an builtin manager property, you are only able to
    access this model via \`db.models.${name}\``)
  } else {
    this.manager[name] = this
  }

  // Add model to manager.models
  this.manager.models[name] = this

  // Setup/Ensure field indexes exist in MongoDB
  let errHandler = err => {
    if (err.type == 'info') this.info(err.detail)
    else this.error(err)
  }
  if (waitForIndexes) return this._setupIndexes().catch(errHandler).then(() => this)
  else this._setupIndexes().catch(errHandler) // returns this
}

Model.prototype._getFieldsFlattened = function(fields, path) {
  /**
   * Get flattened fields
   * @param {object|array} fields - can be a nested subdocument or array
   * @param {string} path
   * @return {object} e.g. {'name': Schema, 'pets.dog': Schema}
   */
  let obj = {}
  util.forEach(fields, function(field, fieldName) {
    const schema = field.schema
    const newPath = /*util.isArray(fields)? path : */path + fieldName + '.'
    if (fieldName == 'schema') return
    if (schema.isArray) {
      Object.assign(obj, this._getFieldsFlattened(field, newPath))
    } else if (schema.isObject) {
      Object.assign(obj, this._getFieldsFlattened(field, newPath))
    } else {
      obj[newPath.replace(/\.$/, '')] = schema
    }
  }, this)
  return obj
}

Model.prototype._getModelFieldsArray = function() {
  /**
   * Get all the model fields in an array
   * @return {array} e.g. [{ path: 'pets.0.dog', 'path2': 'pets.dog'}, ...]
   */
  return Object.keys(this.fieldsFlattened).reduce((acc, path) => {
    if (this.fieldsFlattened[path].model) {
      acc.push({ path: path, path2: path.replace(/\.[0-9]+(\.|$)/g, '$1') })
    }
    return acc
  }, [])
},

Model.prototype._setupFields = function(fields, isSub) {
  /**
   * Check for invalid rules on a field object, and set field.isType
   * @param {object|array} fields - subsdocument or array
   */
  // We need to allow the processing of the root schema object
  if (!isSub) fields = { fields }
  
  util.forEach(fields, function(field, fieldName) {
    // Schema field
    if (fieldName == 'schema') return
    if (util.isSchema(field)) {
      const schema = field
      fields[fieldName] = field = { schema }

      // Type 'model'
      if (schema.model) {
        schema.type = 'id'

      // Type 'image', but no image plugin schema processing done, e.g. image plugin not setup
      } else if (schema.type == 'image' && !schema.image) {
        schema.image = true
        schema.type = 'any'

      // No type
      } else if (!schema.type) {
        this.error(`No type defined on "${this.name}" for field "${fieldName}". Defaulting to string.`)
        schema.type = 'string'
      }

      // Type isn't a rule
      const isType = schema.isType = 'is' + util.ucFirst(schema.type)
      if (!this.rules[isType] && !rules[isType]) {
        this.error(`Not a valid type "${schema.type}" defined on "${this.name}" for field "${fieldName}".
          Defaulting to string.`)
         schema.type = 'string'
      }

      field.schema = {
        ...field.schema,
        [isType]: true, // e.g. isString rule
        isSchema: true,
      }

      // Remove invalid rules
      this._removeInvalidRules(field)

    // Misused schema property
    } else if (fieldName == 'schema' || fieldName == 'isSchema') {
      this.error(`Invalid field '${fieldName}' on model '${this.name}', this is a reserved property, ignoring field.`)
      delete fields[fieldName]

    // Fields be an array
    } else if (util.isArray(field)) {
      this._removeInvalidRules(field)
      field.schema = util.removeUndefined({
        type: 'array',
        isArray: true,
        isSchema: true,
        isType: 'isArray',
        default: this.manager.opts.defaultObjects? () => [] : undefined,
        nullObject: this.manager.opts.nullObjects,
        virtual: field.length == 1 && (field[0] || {}).virtual ? true : undefined,
        ...(field.schema || {}),
      })
      this._setupFields(field, true)

    // Fields can be a subdocument, e.g. user.pet = { name: {}, ..}
    } else if (util.isSubdocument(field)) {
      let index2dsphere = util.isSubdocument2dsphere(field)
      field.schema = field.schema || {}
      if (index2dsphere) {
        field.schema.index = index2dsphere
        delete field.index
      }
      this._removeInvalidRules(field)
      field.schema = util.removeUndefined({ 
        type: 'object', 
        isObject: true, 
        isSchema: true,
        isType: 'isObject',
        default: this.manager.opts.defaultObjects? () => ({}) : undefined, 
        nullObject: this.manager.opts.nullObjects, 
        ...field.schema, 
      })
      this._setupFields(field, true)
    }
  }, this)
},

Model.prototype._removeInvalidRules = function(field) {
  /**
   * Remove invalid rules on a field object
   * @param {object} field
   * @return {object} field
   **/
  for (let ruleName in (field||{}).schema) {
    const ruleFn = this.rules[ruleName] || rules[ruleName]
    // Rule doesn't exist
    if (!ruleFn && this._ignoredRules.indexOf(ruleName) == -1) {
      // console.log(field.schema)
      this.error(`No rule "${ruleName}" exists for model "${this.name}", ignoring rule.`)
      delete field.schema[ruleName]
    }
    // Reserved rule
    if (this.rules[ruleName] && this._ignoredRules.indexOf(ruleName) != -1) {
      this.error(`The rule "${ruleName}" for the model "${this.name}" is a reserved keyword, ignoring custom rule function.`)
    }
  }
  return field
},

Model.prototype._setupIndexes = async function(fields, opts={}) {
  /**
   * Creates indexes for the model (multikey, and sub-document supported)
   * Note: the collection be created beforehand???
   * Note: only one text index per model(collection) is allowed due to mongodb limitations
   * @param {object} <fields> - processed or unprocessed fields, e.g. {schema: {name: {index}}} or {name: {index}}
   * @return Promise( {array} indexes ensured ) || error
   *
   * MongoDB index structures = [
   *   true =     { name: 'name_1', key: { name: 1 } },
   *   unique =   { name: 'email_1', key: { email: 1 }, unique: true },
   *   text =     { name: 'text', key: { name: 'text', description, 'text', ..} },
   *   2dsphere = { name: 'center_2dsphere', key: { center: '2dsphere' } },
   *   ..
   * ]
   */
  let hasTextIndex = false
  let indexes = []
  let model = this
  let textIndex = { name: 'text', key: {} }

  // No db defined
  if (!((model.manager||{})._state||'').match(/^open/)) {
    throw new Error(`Skipping createIndex on the '${model.name||''}' model, no mongodb connection found.`)
  }

  // Process custom 'unprocessed' fields
  if (fields && !(fields[Object.keys(fields)[0]].schema||{}).isSchema) {
    fields = util.deepCopy(fields)
    this._setupFields(fields)
    // console.dir(fields, { depth: null })
  }

  // Find all indexes
  recurseFields(fields || model.fields, '')

  // console.log(2, indexes, fields)
  if (hasTextIndex) indexes.push(textIndex)
  if (opts.dryRun) return indexes || []
  if (!indexes.length) return [] // No indexes defined

  // Create indexes
  // As of MongoDB 5 we no longer need to wait for the connection to be open
  //   await (model.manager._state == 'open' ? new Promise(res => res()) : model.manager).then()....

  // Get collection
  const collection = this.collection

  // Get the collections indexes
  const existingIndexes = await collection.indexes() // returns [] if collection doesn't exist

  // Remove any existing text index that has different options as createIndexes will throws error about this
  if (existingIndexes.length) {
    // console.log(0, textIndex)
    // console.log(1, existingIndexes, indexes)
    // Todo: Remove unused index names
    const textIndexNames = []
    for (let existingIndex of existingIndexes) {
      if (!existingIndex.textIndexVersion) continue
      for (let index of indexes) {
        let fieldsInTextIndex1 = Object.keys(existingIndex.weights).sort().join()
        let fieldsInTextIndex2 = Object.keys(index.key).sort().join()
        if (existingIndex.name == index.name && fieldsInTextIndex1 !== fieldsInTextIndex2) {
          model.info(`Text index options are different for '${existingIndex.name}', removing old text index`)
          if (!textIndexNames.includes(existingIndex.name)) {
            textIndexNames.push(existingIndex.name)
          }
        }
      }
    }
    for (let name of textIndexNames) {
      await collection.dropIndex(name)
    }
  }

  // create indexes
  await collection.createIndexes(indexes)
  model.info('db index(s) created for ' + model.name)
  return indexes

  function recurseFields(schemaFields, parentPath) {
    /**
     * Recursively find fields with an index property
     * @param {object} schemaFields
     */
    util.forEach(schemaFields, (field, fieldName) => {
      const index = (field.schema||{}).index
      if (fieldName == 'schema') return
      if (index) {
        let options = util.isObject(index)? util.omit(index, ['type']) : {}
        let type = util.isObject(index)? index.type : index
        let path = parentPath + fieldName
        let path2 = path.replace(/(^|\.)[0-9]+(\.|$)/g, '$2') // no numirical keys, e.g. pets.1.fieldName
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
      if (field.schema.isObject) {
        recurseFields(field, parentPath + fieldName + '.')

      } else if (field.schema.isArray) {
        recurseFields(field, parentPath + fieldName + '.')
      }
    })
  }
}

Model.prototype._callHooks = async function(hookName, data, hookContext) {
  /**
   * Calls hooks in series
   * 
   * @param {string} hookName - e.g. 'beforeValidate'
   * @param {any} arg - data to pass to the first function
   * @param {object} hookContext - operation options, e.g. { data, skipValidation, ... }
   * 
   * @return {any} - the result of the last function
   * @this model
   */
  if (hookContext.skipHooks) return data
  return await util.runSeries.call(this, this[hookName].map(f => f.bind(hookContext)), hookName, data)
}

Model.prototype._defaultFields = {
  _id: {
    insertOnly: true,
    type: 'id',
  },
  createdAt: {
    default: function(fieldName, model) {
      return model.manager.opts.useMilliseconds? Date.now() : Math.floor(Date.now() / 1000)
    },
    insertOnly: true,
    timestampField: true,
    type: 'integer',
  },
  updatedAt: {
    default: function(fieldName, model) {
      return model.manager.opts.useMilliseconds? Date.now() : Math.floor(Date.now() / 1000)
    },
    timestampField: true,
    type: 'integer',
  },
}

module.exports = Model

// Extend Model prototype
require('./model-crud.js')
require('./model-validate.js')
