module.exports = {

  models: function(path) {
    /**
     * Setup model definitions from a folder location
     * @param {string} pathname
     * @return {object} - e.g. { user: , article: , .. }
     */
    let models = {}
    if (!path || typeof path !== 'string') {
      throw 'The path must be a valid pathname'
    }

    require('fs').readdirSync(path).forEach(filename => {
      let definition = require(require('path').join(path, filename)).default
      let name = filename.replace('.js', '')
      models[name] = this.model(name, definition)
    })

    return models
  },

  model: function(name, opts) {
    /**
     * Setup a model
     * @param {string} name
     * @param {object} opts - see documentation
     */
    let model = {
      name: name,
      messages: {},
      findBL: ['password'],
      insertBL: ['createdAt', 'updatedAt'],
      updateBL: ['createdAt', 'updatedAt'],
      beforeFind: [],
      beforeInsert: [],
      beforeUpdate: [],
      beforeRemove: [],
      beforeValidate: [],
      afterFind: [],
      afterInsert: [],
      afterUpdate: [],
      afterRemove: [],
      ...(opts || (opts = {})),
      fields: { ...this.defaultFields },
      rules: { ...this.defaultRules },
      validate: this.validate.bind(this, name)
    }

    // Format and assign any custom rules
    this.forEach((opts.rules || {}), function(rule, ruleName) {
      let formattedRule = this.isObject(rule)? rule : { fn: rule }
      if (ruleName == 'type') {
        // Overriding the 'type' rule is forbidden
        this.log(`You cannot override the implicit rule "type" for model "${model.name}"`)
      } else if (this.defaultFields[ruleName]) {
        // A defaultRule with the same name already exists, merge.
        model.rules[ruleName] = { ...this.defaultRules[ruleName], ...formattedRule }
      } else {
        // Update with formatted rule
        formattedRule.message = `Invalid data property for rule "${ruleName}".`
        model.rules[ruleName] = formattedRule
      }
    }, this)

    // Extend default fields with passed in fields, and check for invalid fields
    model.fields = Object.assign(model.fields, opts.fields)
    this.setupModelFields(model, model.fields)

    // Find whitelist
    model.findWL = Object.keys(model.fields).filter(o => !model.findBL.includes(o))
    model.findWLProject = model.findWL.reduce((o, v) => (o[v] = 1) && o, {})
    model.findBLProject = model.findBL.reduce((o, v) => (o[v] = 1) && o, {})

    // Ensure indexes exist in mongodb e.g. unique indexes
    this.setupModelIndexes(model.name, model.fields)
    return this.cache[model.name] = model
  },

  setupModelFields: function(model, fields) {
    /**
     * Check for invalid rules on a field object, and set field.isType
     * @param {object} model - model instance
     * @param {object|array} fields - subsdocument or array
     */
    this.forEach(fields, function(field, fieldName) {
      // Schema field
      if (this.isSchema(field)) {
        if (field.image) field.type = 'string'
        if (field.model) field.type = 'id'
        //if (field.index == '2dspehere') return

        // No type defined
        if (!field.type) {
          this.log(`No type defined on "${model.name}" for field "${fieldName}". Defaulting to string.`)
          field.type = 'string'

        // Type doesn't exist
        } else if (!model.rules['is' + this.ucFirst(field.type)]) {
          this.log(`Not a valid type "${field.type}" defined on "${model.name}" for field "${fieldName}".
            Defaulting to string.`)
          field.type = 'string'
        }

        // Convert type into a is{type} rule
        field['is' + this.ucFirst(field.type)] = true

        // Rule doesn't exist
        this.forEach(field, (rule, ruleName) => {
          if ((!model.rules[ruleName]) && this.ignoredRules.indexOf(ruleName) == -1) {
            this.log(`No rule "${ruleName}" exists for model "${model.name}". Ignoring rule.`)
            delete field[ruleName]
          }
        }, this)

      // Misused schema property
      } else if (fieldName == 'schema') {
        this.log(`Invalid schema on model "${model.name}", remember 'schema' is a reserverd property, ignoring field.`)
        delete fields[fieldName]

      // Fields be an array
      } else if (this.isArray(field)) {
        field.schema = field.schema || { type: 'array', isArray: true }
        this.setupModelFields(model, field)

      // Fields can be a subdocument, e.g. user.pet = { name: {}, ..}
      } else if (this.isSubdocument(field)) {
        field.schema = field.schema || { type: 'object', isObject: true }
        this.setupModelFields(model, field)
      }

    }, this)
  },

  setupModelIndexes: function(modelName, fields) {
    /**
     * Creates indexes for the model
     * Note: We only add one text index per model, and currently don't support indexes
     * on sub-collections, sub-documents yes!
     * @param {object} model
     * @param {object} fields - model.fields
     * @return Promise( {array} indexes | {string} error )
     * 
     * MongoDB index structures = [
     *   normal =   { name: 'name_1', key: { name: 1 } },
     *   unique =   { name: 'email_1', key: { email: 1 }, unique: true },
     *   text =     { name: 'text', key: { name: 'text', description, 'text', ..} },
     *   2dsphere = { name: 'center_2dsphere', key: { center: '2dsphere' } },
     *   ..
     * ]
     */
    let api = this
    let hasText = false
    let indexes = []
    let textIndex = { name: 'text', key: {} }
    let db = this.db

    // Find all indexes
    recurseFields(fields, '')
    if (hasText) indexes.push(textIndex)

    // No indexes or db defined
    if (!indexes.length) {
      return Promise.resolve([])
    } else if (!db) {
      let error = `Skipping createIndex on the '${modelName}' model, no connection assigned to this.db.`
      return this.log(error), Promise.reject(error)
    }

    // Create indexes
    return db.then(data => {
      return e._db.collection(modelName).createIndexes(indexes).then(data => {
        api.debug('db index created:', data)
      }).catch(err => {
        api.log('db error', err)
        throw err
      })
    })

    function recurseFields(fields, prefix) {
      api.forEach(fields, (field, name) => {
        if (api.isSubdocument(field)) recurseFields(field, prefix + name + '.')
        if (!field.index || api.isObject(field.index)) return
        let path = prefix + name
        let type = field.index === true? 1 : field.index
        let index = { name: `${path}_${type}`, key: { [path]: type }}

        if (type == 'text') {
          hasText = textIndex.key[path] = 'text'
        } else if (type == '1' || type == '-1' || type == '2dsphere') {
          indexes.push(index)
        }  else if (type == 'unique') {
          indexes.push({ name: path + '_1', key: { [path]: 1 }, unique: true })
        }
      })
    }
  },

  defaultFields: {
    // _id: { type: 'string', unique: true },
    createdAt: {
      type: 'integer',
      default: () => Math.floor(Date.now() / 1000),
      defaultOverride: true,
      insertOnly: true
    },
    updatedAt: {
      type: 'integer',
      default: () => Math.floor(Date.now() / 1000),
      defaultOverride: true
    }
  }
  
}
