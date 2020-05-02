let util = require('./util')
let rules = require('./rules')

module.exports = {

  validate: function(data, opts, cb) {
    /**
     * Validates a model
     * @param {instance} model
     * @param {object} data
     * @param {object} <opts> -  { insert: true, allow: '' }
     * @param {function} <cb> - instead of returning a promise
     * @this model

     * @return promise(errors[] || pruned data{})
     */

    // Optional cb and opts
    if (util.isFunction(opts)) { cb = opts; opts = undefined }
    opts = opts || { insert: true }
    opts.allow = opts.allow || ''
    opts.action = opts.update? 'update' : 'insert'
    opts.blacklist = [ ...this[`${opts.action}BL`] ]

    // Modify the data blacklist depending on the action and allow list
    for (let name of opts.allow.split(/\s+/g)) {
      if (!name) continue
      let split = name.split(/^[-+]/)
      if (name.match(/^-/)) opts.blacklist.push(split[1])
      else opts.blacklist = opts.blacklist.filter(o => o != (split[1] || split[0]))
    }

    // Recurse through the model's fields
    let res = this._validateFields(this.fields, data, opts, '')

    // Call a handler or return a promise
    let errors = res[0].length? res[0] : null
    if (cb) cb(errors, res[1])
    else if (errors) return Promise.reject(errors)
    else return Promise.resolve(res[1])
  },

  _validateFields: function(fields, data, opts, path) {
    /**
     * Recurse through and retrieve any errors and valid data 
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
    let data2 = util.isArray(fields)? [] : {}

    util.forEach(util.forceArray(data), function(data, i) {
      util.forEach(fields, function(field, fieldName) {
        let verrors = []
        let schema = field.schema || field
        let value = util.isArray(fields)? data : (data||{})[fieldName]
        let indexOrFieldName = util.isArray(fields)? i : fieldName
        let path2 = `${path}.${indexOrFieldName}`.replace(/^\./, '')
        let isType = 'is' + util.ucFirst(schema.type)
        let isTypeRule = this.rules[isType] || rules[isType]

        // Use the default if available
        if (util.isDefined(schema.default)) {
          if (schema.defaultOverride || (opts.insert && !util.isDefined(value))) {
            value = util.isFunction(schema.default)? schema.default() : schema.default
          }
        }

        // Ignore blacklisted
        if (opts.blacklist.indexOf(fieldName) >= 0) return
        // Ignore insert only
        if (opts.update && schema['insertOnly']) return
        // Type cast the value if tryParse is avaliable, .e.g. isInteger.tryParse
        if (isTypeRule && util.isFunction(isTypeRule.tryParse)) value = isTypeRule.tryParse.call(this, value)

        // Schema field (ignore object/array schemas)
        if (util.isSchema(field) && fieldName !== 'schema') {
          errors.push(...(verrors = this._validateRules(schema, value, opts, path2)))
          if (util.isDefined(value) && !verrors.length) data2[indexOrFieldName] = value
        
        // Fields can be a subdocument
        } else if (util.isSubdocument(field)) {
          // Object schema errors
          errors.push(...(verrors = this._validateRules(schema, value, opts, path2)))
          // Data value is a subdocument, or force recursion when inserting
          if (util.isObject(value) || opts.insert) {
            let res = this._validateFields(field, value, opts, path2)
            if (util.isDefined(value) && !verrors.length) data2[indexOrFieldName] = res[1]
            errors.push(...res[0])
          }

        // Fields can be an array
        } else if (util.isArray(field)) {
          // Array schema errors
          errors.push(...(verrors = this._validateRules(schema, value, opts, path2)))
          // Data value is an array too
          if (util.isArray(value)) {
            let res = this._validateFields(field, value, opts, path2)
            if (!verrors.length) data2[indexOrFieldName] = res[1]
            errors.push(...res[0])
          }
        }
      }, this)
    }, this)

    // Normalise array indexes and return
    if (util.isArray(fields)) data2 = data2.filter(() => true)
    return [errors, data2]
  },

  _validateRules: function(field, value, opts, path) {
    /**
     * Validate all the field's rules
     * @param {string} path - full field path
     * @return {array} errors
     */
    let errors = []
    for (let ruleName in field) {
      if (this._ignoredRules.indexOf(ruleName) > -1) continue
      if (util.isUndefined(value) && opts.update) continue
      let error = this._validateRule(ruleName, field[ruleName], value, path)
      if (error && ruleName == 'required') return [error] // only show the required error
      if (error) errors.push(error)
    }
    return errors
  },

  _validateRule: function(ruleName, ruleArg, value, path) {
    //this.debug(path, ruleName, ruleArg, value)
    path = path.replace(/^\./, '')
    let rule = this.rules[ruleName] || rules[ruleName]
    let fieldName = path.match(/[^\.]+$/)[0]
    let ruleMessage = this.messages[path] && this.messages[path][ruleName]
    if (!ruleMessage) ruleMessage = rule.message

    // Ignore null/undefined when not testing 'required'
    if (ruleName !== 'required' && (value === null || typeof value === 'undefined')) return

    // Ignore empty strings
    else if (value === '' && rule.ignoreEmptyString) return

    // Rule failed
    else if (!rule.fn.call(this, value, ruleArg, fieldName)) return {
      status: '400',
      title: fieldName,
      detail: util.isFunction(ruleMessage)? ruleMessage.call(this, value, ruleArg) : ruleMessage,
      meta: { rule: ruleName, model: this.name, path: path }
    }
  },

  _ignoredRules: [
    'default', 'defaultOverride', 'image', 'index', 'insertOnly', 'model', 'type', 'unique'
  ]

}
