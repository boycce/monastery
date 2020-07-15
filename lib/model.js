let crud = require('./model-crud')
let rules = require('./rules')
let util = require('./util')
let validate = require('./model-validate')

let Model = module.exports = function(name, opts, manager) {
  /**
   * Setup a model (aka monk collection)
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
    name: name,
    manager: manager,
    log: manager.log,
    debug: manager.debug,
    afterFind: opts.afterFind || [],
    afterInsert: opts.afterInsert || [],
    afterUpdate: opts.afterUpdate || [],
    afterRemove: opts.afterRemove || [],
    beforeInsert: opts.beforeInsert || [],
    beforeUpdate: opts.beforeUpdate || [],
    beforeRemove: opts.beforeRemove || [],
    beforeValidate: opts.beforeValidate || [],
    findBL: opts.findBL || ['password'],
    insertBL: opts.insertBL || opts.updateBl || [],
    updateBL: opts.updateBL || opts.insertBl || [],
    messages: opts.messages || {},
    fields: { ...(opts.fields || {}) },
    rules: { ...(opts.rules || {}) }
  })

  // Format and assign any custom rules
  util.forEach(this.rules, function(rule, ruleName) {
    if (ruleName == 'type') {
      // Overriding the 'type' rule is forbidden
      this.log(`You cannot override the implicit rule "type" for model "${name}"`)
      delete this.rules[ruleName]
    } else {
      // Update with formatted rule
      let formattedRule = util.isObject(rule)? rule : { fn: rule }
      if (!formattedRule.message) formattedRule.message = `Invalid data property for rule "${ruleName}".`
      this.rules[ruleName] = formattedRule
    }
  })

  // Extend default fields with passed in fields and check for invalid fields
  if (manager.defaultFields) this.fields = Object.assign({}, this._defaultFields, this.fields)
  this._setupFields(this.fields)

  this.findWL = this._getWhitelist(this.fields, '')
  this.findWLProject = this.findWL.reduce((o, v) => (o[v] = 1) && o, {})
  this.findBLProject = this.findBL.reduce((o, v) => (o[v] = 1) && o, {})
  
  //   console.log(0, this.findBL)
  //   console.log(0, this.findWL)
  //   console.log(0, this.findWLProject)
  //   console.log(0, this.findBLProject)

  // Extend model with monk collection actions
  this._collection = manager.get? manager.get(name) : null
  for (let key in (this._collection || {})) {
    if (key.match(/^manager$|^options$|^_|^middlewares$|^name$/)) continue
    this['_' + key] = this._collection[key].bind(this._collection)
  }

  // Ensure field indexes exist in mongodb
  this._setupIndexes().catch((err) => this.log(err))

  // Add model to manager
  if (typeof this.manager[name] === 'undefined' 
      || typeof this.manager.model[name] !== 'undefined') {
    this.manager[name] = this
  } else {
    this.log(`Your model name '${name}' is conflicting, you are only able to 
    access this model via \`db.model.${name}\``)
  }

  // Add model to manager.model
  this.manager.model[name] = this
}

Model.prototype._getWhitelist = function(fields, path) {
  let list = []
  util.forEach(fields, function(field, fieldName) {
    // Don't append array indexes to the new path e.g. '0.'
    let newPath = util.isArray(fields)? path : path + fieldName + '.'
    if (fieldName == 'schema') {
      return
    } else if (this.findBL.includes(newPath.replace(/\.$/, ''))) {
      return
    } else if (util.isArray(field)) {
      list = list.concat(this._getWhitelist(field, newPath))
    } else if (util.isSubdocument(field)) {
      list = list.concat(this._getWhitelist(field, newPath))
    } else {
      list.push(newPath.replace(/\.$/, ''))
    }
  }, this)
  return list
}

Model.prototype._setupFields = function(fields) {
  /**
   * Check for invalid rules on a field object, and set field.isType
   * @param {object} model - model instance
   * @param {object|array} fields - subsdocument or array
   */
  util.forEach(fields, function(field, fieldName) {
    // Schema field
    if (util.isSchema(field)) {
      if (field.image) field.type = 'string'
      if (field.model) field.type = 'id'
      let isType = 'is' + util.ucFirst(field.type)
      //if (field.index == '2dspehere') return

      // No type defined
      if (!field.type) {
        this.log(`No type defined on "${this.name}" for field "${fieldName}". Defaulting to string.`)
        field.type = 'string'

      // Type doesn't exist
      } else if (!this.rules[isType] && !rules[isType]) {
        this.log(`Not a valid type "${field.type}" defined on "${this.name}" for field "${fieldName}".
          Defaulting to string.`)
        field.type = 'string'
      }

      // Convert type into a is{type} rule
      field[isType] = true

      // Rule doesn't exist
      util.forEach(field, (rule, ruleName) => {
        if (!this.rules[ruleName] && !rules[ruleName] && this._ignoredRules.indexOf(ruleName) == -1) {
          this.log(`No rule "${ruleName}" exists for model "${this.name}". Ignoring rule.`)
          delete field[ruleName]
        }
      }, this)

    // Misused schema property
    } else if (fieldName == 'schema') {
      this.log(`Invalid schema on model "${this.name}", remember 'schema' is a reserverd property, ignoring field.`)
      delete fields[fieldName]

    // Fields be an array
    } else if (util.isArray(field)) {
      let arrayDefault = this.manager.defaultObjects? () => [] : undefined
      field.schema = field.schema || { type: 'array', isArray: true, default: arrayDefault }
      this._setupFields(field)

    // Fields can be a subdocument, e.g. user.pet = { name: {}, ..}
    } else if (util.isSubdocument(field)) {
      let objectDefault = this.manager.defaultObjects? () => ({}) : undefined
      field.schema = field.schema || { type: 'object', isObject: true, default: objectDefault }
      this._setupFields(field)
    }
  }, this)
}

Model.prototype._setupIndexes = function(fields) {
  /**
   * Creates indexes for the model
   * Note: We only add one text index per model, and currently don't support indexes
   * on sub-collections, sub-documents yes!
   * @param {object} <fields>
   * @return Promise( {array} indexes | {string} error )
   * @link https://docs.mongodb.com/manual/reference/command/createIndexes/
   * @link https://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#createIndexes
   * 
   * MongoDB index structures = [
   *   true =     { name: 'name_1', key: { name: 1 } },
   *   unique =   { name: 'email_1', key: { email: 1 }, unique: true },
   *   text =     { name: 'text', key: { name: 'text', description, 'text', ..} },
   *   2dsphere = { name: 'center_2dsphere', key: { center: '2dsphere' } },
   *   ..
   * ]
   */
  let model = this
  let hasText = false
  let indexes = []
  let textIndex = { name: 'text', key: {} }

  // Find all indexes
  recurseFields(fields || model.fields, '')
  if (hasText) indexes.push(textIndex)

  // No indexes or db defined
  if (!indexes.length) {
    return Promise.resolve([])
  } else if (!(model.manager._state || '').match(/^open/)) {
    let error = `Skipping createIndex on the '${model.name}' model, no mongodb connection found.`
    return Promise.reject(error)
  }

  // Create indexes
  return (model.manager._state == 'open'? Promise.resolve() : model.manager).then(data => {
    return model.manager._db.collection(model.name).createIndexes(indexes).then(data => {
      model.debug('db index(s) created for ' + model.name)
    })
  })

  function recurseFields(fields, parentPath) {
    util.forEach(fields, (field, name) => {
      if (util.isSubdocument(field)) recurseFields(field, parentPath + name + '.')
      if (!field.index/* || util.isObject(field.index)*/) return // commented out for future options

      let path = parentPath + name
      let options = util.isObject(field.index)? field.index.filter((o, k) => k !== 'type') : {}
      let type = util.isObject(field.index)? field.index.type : field.index
      if (type === true) type = 1

      if (type == 'text') {
        hasText = textIndex.key[path] = 'text'
        Object.assign(textIndex, options)
      } else if (type == '1' || type == '-1' || type == '2dsphere') {
        indexes.push({ name: `${path}_${type}`, key: { [path]: type }, ...options })
      } else if (type == 'unique') {
        indexes.push({ name: `${path}_1`, key: { [path]: 1 }, unique: true, ...options  })
      }
    })
  }
}

Model.prototype._defaultFields = {
  createdAt: {
    type: 'integer',
    default: () => Math.floor(Date.now() / 1000),
    insertOnly: true
  },
  updatedAt: {
    type: 'integer',
    default: () => Math.floor(Date.now() / 1000)
  }
}

for (var key in crud) {
  Model.prototype[key] = crud[key]
}

for (var key in validate) {
  Model.prototype[key] = validate[key]
}
