let util = require('./util')
let rules = require('./rules')

module.exports = {

  validate: function(data, opts, cb) {
    /**
     * Validates a model
     * @param {instance} model
     * @param {object} data
     * @param {object} <opts> - { insert: true, whitelist: []|true }
     * @param {function} <cb> - instead of returning a promise
     * @this model

     * @return promise(errors[] || pruned data{})
     */

    // Optional cb and opts
    if (util.isFunction(opts)) { cb = opts; opts = undefined }
    opts = opts || { insert: true }
    opts.action = opts.update? 'update' : 'insert'
    opts.blacklist = [ ...this[`${opts.action}BL`] ]
    //opts.ignoreFields = [ ...this[`${opts.action}BL`], ...(opts.ignoreFields||[]) ]

    // Whitelisting, returns a blacklist
    if (opts.whitelist) {
      if (opts.whitelist === true) opts.whitelist = opts.blacklist
      opts.blacklist = opts.blacklist.filter(o => !opts.whitelist.includes(o))
      // Remove any deep blacklisted fields that have a whitelisted parent specified.
      // E.g remove ['deep.deep2.deep3'] if ['deep'] exists in the whitelist
      for (let i=opts.blacklist.length; i--;) {
        let split = opts.blacklist[i].split('.')
        for (let j=split.length; j--;) {
          if (split.length > 1) split.pop()
          else continue
          if (opts.whitelist.includes(split.join())) {
            opts.blacklist.splice(i, 1)
            break;
          }
        }
      }
    }

    // Skip validation on certian fields
    // if (opts.skipValidation) {
    //   let skipped = util.isString(opts.skipValidation)? opts.skipValidation.split(' ') : opts.skipValidation
    //   for (let item of skipped) {
    //     if (!item) continue
    //     // Remove field if existing
    //     let parent = data
    //     let path = item.split('.')
    //     for (let i=0, l=path.length; i<l; i++) {
    //       console.log(path[i])
    //       if (i == l && util.isDefined(parent[path[i]])) delete parent[path[i]]
    //       else if (util.isDefined(parent[path[i]])) parent = parent[path[i]]
    //       else break;
    //     }
    //   }
    // }

    // Run before hook, then recurse through the model's fields
    return util.runSeries(this.beforeValidate.map(f => f.bind(opts, data))).then(() => {
      return util.toArray(data).map(item => {
        let validated = this._validateFields(this.fields, item, opts, '')
        if (validated[0].length) throw validated[0]
        else return validated[1]
      })

    // Success/error
    }).then(data2 => {
      let response = util.isArray(data)? data2 : data2[0]
      if (cb) cb(null, response)
      else return Promise.resolve(response)

    }).catch(errs => {
      if (cb) cb(errs)
      else throw errs
    })
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
        let path3 = path2.replace(/(^|\.)[0-9]+(\.|$)/, '$2') // no numirical keys, e.g. pets.1.name
        let isType = 'is' + util.ucFirst(schema.type)
        let isTypeRule = this.rules[isType] || rules[isType]

        // Use the default if available
        if (util.isDefined(schema.default)) {
          if (schema.defaultOverride || (opts.insert && !util.isDefined(value))) {
            value = util.isFunction(schema.default)? schema.default() : schema.default
          }
        }

        // Ignore blacklisted
        //////////////////console.log(path3, opts.blacklist)
        if (opts.blacklist.indexOf(path3) >= 0 && !schema.defaultOverride) return
        // Ignore insert only
        if (opts.update && schema.insertOnly) return
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
    ruleArg = ruleArg === true? undefined : ruleArg
    let rule = this.rules[ruleName] || rules[ruleName]
    let fieldName = path.match(/[^\.]+$/)[0]
    let context = { model: this, fieldName: fieldName }
    let ruleMessage = this.messages[path] && this.messages[path][ruleName]
    if (!ruleMessage) ruleMessage = rule.message

    // Ignore null/undefined when not testing 'required'
    if (ruleName !== 'required' && (value === null || typeof value === 'undefined')) return

    // Ignore empty strings
    else if (value === '' && rule.ignoreEmptyString) return

    // Rule failed
    else if (!rule.fn.call(context, value, ruleArg)) return {
      detail: util.isFunction(ruleMessage)? ruleMessage.call(context, value, ruleArg) : ruleMessage,
      meta: { rule: ruleName, model: this.name, field: fieldName },
      status: '400',
      title: path
    }
  },

  _ignoredRules: [
    'default', 'defaultOverride', 'image', 'index', 'insertOnly', 'model', 'type'
  ]

}
