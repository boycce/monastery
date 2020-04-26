module.exports = {

  validate: function(modelName, data, opts, cb) {
    /**
     * Validates a model
     * @param {string} modelName
     * @param {object} data
     * @param {object} <opts> -  { insert: true, allow: '' }
     * @param {function} <cb> - instead of returning a promise
     * @return promise(errors[] || pruned data{})
     */
    let model = this.cache[modelName]
    if (!model) {
      this.log(`Cannot validate a non-existant model named ${modelName}`)
      return
    }

    // Optional cb and opts
    if (this.isFunction(opts)) { cb = opts; opts = undefined }
    opts = opts || { insert: true }
    opts.allow = opts.allow || ''
    opts.action = opts.update? 'update' : 'insert'
    opts.blacklist = [ ...model[`${opts.action}BL`] ]

    // Modify the data blacklist depending on the action and allow list
    for (let name of opts.allow.split(/\s+/g)) {
      if (!name) continue
      let split = name.split(/^[-+]/)
      if (name.match(/^-/)) opts.blacklist.push(split[1])
      else opts.blacklist = opts.blacklist.filter(o => o != (split[1] || split[0]))
    }

    // Recurse through the model's fields
    let res = this.validateFields(model, model.fields, data, opts, '')

    // Call a handler or return a promise
    let errors = res[0].length? res[0] : null
    if (cb) cb(errors, res[1])
    else if (errors) return Promise.reject(errors)
    else return Promise.resolve(res[1])
  },

  validateFields: function(model, fields, data, opts, path) {
    /**
     * Recurse through and retrieve any errors and valid data 
     * @param {object} model
     * @param {object|array} fields
     * @param {any} data
     * @param {object} opts
     * @param {string} path
     * @return [errors, valid-data]
     * 
     *   Fields first recursion  = { pets: [{ name: {}, color: {} }] }
     *   Fields second recursion = [0]: { name: {}, color: {} }
     */
    let errors = []
    let data2 = this.isArray(fields)? [] : {}

    this.forEach(this.forceArray(data), function(data, i) {
      this.forEach(fields, function(field, fieldName) {
        let verrors = []
        let schema = field.schema || field
        let value = this.isArray(fields)? data : (data||{})[fieldName]
        let indexOrFieldName = this.isArray(fields)? i : fieldName
        let path2 = `${path}.${indexOrFieldName}`.replace(/^\./, '')
        let isTypeRule = model.rules['is' + this.ucFirst(schema.type)]

        // Use the default if available
        if (this.isDefined(schema.default)) {
          if (schema.defaultOverride || (opts.insert && !this.isDefined(value))) {
            value = this.isFunction(schema.default)? schema.default() : schema.default
          }
        }

        // Ignore blacklisted
        if (opts.blacklist.indexOf(fieldName) >= 0) return
        // Ignore insert only
        if (opts.update && schema['insertOnly']) return
        // Type cast the value if tryParse is avaliable, .e.g. isInteger.tryParse
        if (isTypeRule && this.isFunction(isTypeRule.tryParse)) value = isTypeRule.tryParse.call(this, value)

        // Schema field (ignore object/array schemas)
        if (this.isSchema(field) && fieldName !== 'schema') {
          errors.push(...(verrors = this.validateRules(model, schema, value, opts, path2)))
          if (this.isDefined(value) && !verrors.length) data2[indexOrFieldName] = value
        
        // Fields can be a subdocument
        } else if (this.isSubdocument(field)) {
          // Object schema errors
          errors.push(...(verrors = this.validateRules(model, schema, value, opts, path2)))
          // Data value is a subdocument, or force recursion when inserting
          if (this.isObject(value) || opts.insert) {
            let res = this.validateFields(model, field, value, opts, path2)
            if (this.isDefined(value) && !verrors.length) data2[indexOrFieldName] = res[1]
            errors.push(...res[0])
          }

        // Fields can be an array
        } else if (this.isArray(field)) {
          // Array schema errors
          errors.push(...(verrors = this.validateRules(model, schema, value, opts, path2)))
          // Data value is an array too
          if (this.isArray(value)) {
            let res = this.validateFields(model, field, value, opts, path2)
            if (!verrors.length) data2[indexOrFieldName] = res[1]
            errors.push(...res[0])
          }
        }

      }, this)
    }, this)

    // Normalise array indexes and return
    if (this.isArray(fields)) data2 = data2.filter(() => true)
    return [errors, data2]
  },

  validateRules: function(model, field, value, opts, path) {
    /**
     * Validate all the field's rules
     * @param {string} path - full field path
     * @return {array} errors
     */
    let errors = []
    for (let ruleName in field) {
      if (this.ignoredRules.indexOf(ruleName) > -1) continue
      if (this.isUndefined(value) && opts.update) continue
      let error = this.validateRule(model, ruleName, field[ruleName], value, path)
      if (error && ruleName == 'required') return [error] // only show the required error
      if (error) errors.push(error)
    }
    return errors
  },

  validateRule: function(model, ruleName, rule, value, path) {
    //this.debug(path, ruleName, rule, value)
    path = path.replace(/^\./, '')
    let fieldName = path.match(/[^\.]+$/)[0]
    let ruleMessage = model.messages[path] && model.messages[path][ruleName]
    if (!ruleMessage) ruleMessage = model.rules[ruleName].message

    // Ignore null/undefined when not testing 'required'
    if (ruleName !== 'required' && (value === null || typeof value === 'undefined')) return

    // Ignore empty strings
    else if (value === '' && model.rules[rule].ignoreEmptyString) return

    // Rule failed
    else if (!model.rules[ruleName].fn.call(this, value, rule, fieldName)) return {
      status: '400',
      title: fieldName,
      detail: this.isFunction(ruleMessage)? ruleMessage.call(this, value, rule) : ruleMessage,
      meta: { rule: ruleName, model: model.name, path: path }
    }
  },

  ignoredRules: [
    'default', 'defaultOverride', 'image', 'index', 'insertOnly', 'model', 'type', 'unique'
  ]

}
