let util = require('./util')
let rules = require('./rules')

module.exports = {

  validate: function(data, opts, cb) {
    /**
     * Validates a model
     * @param {instance} model
     * @param {object} data
     * @param {object} <opts>
     *     @param {boolean(false)} update - are we validating for insert or update?
     *     @param {array|string|false} blacklist - augment schema blacklist, `false` will remove all blacklisting
     *     @param {array|string} projection - only return these fields, ignores blacklist
     *     @param {array|string|false} validateUndefined - validates all 'required' undefined fields, true by
     *         default, but false on update
     *     @param {array|string|true} skipValidation - skip validation on these fields
     *     @param {boolean} timestamps - whether `createdAt` and `updatedAt` are inserted, or `updatedAt` is
     *         updated, depending on the `options.update` value
     * @param {function} <cb> - instead of returning a promise
     * @this model

     * @return promise(errors[] || pruned data{})
     */

    // Optional cb and opts
    if (util.isFunction(opts)) { cb = opts; opts = undefined }
    if (cb && !util.isFunction(cb)) {
      throw new Error(`The callback passed to ${this.name}.validate() is not a function`)
    }
    data = util.deepCopy(data)
    opts = opts || {}
    opts.insert = !opts.update
    opts.action = opts.update? 'update' : 'insert'
    opts.skipValidation = opts.skipValidation === true? true : util.toArray(opts.skipValidation||[])

    // Blacklist
    if (opts.blacklist) {
      let whitelist = []
      let blacklist = [ ...this[`${opts.action}BL`] ]
      if (typeof opts.blacklist === 'string') {
        opts.blacklist = opts.blacklist.trim().split(/\s+/)
      }
      // Auguemnt the schema blacklist
      for (let _path of opts.blacklist) {
        let path = _path.replace(/^-/, '')
        if (_path.match(/^-/)) whitelist.push(path)
        else blacklist.push(path)
      }
      // Remove whitelisted/negated fields
      blacklist = blacklist.filter(o => !whitelist.includes(o))
      // Remove any deep blacklisted fields that have a whitelisted parent specified.
      // E.g remove ['deep.deep2.deep3'] if ['deep'] exists in the whitelist
      for (let i=blacklist.length; i--;) {
        let split = blacklist[i].split('.')
        for (let j=split.length; j--;) {
          if (split.length > 1) split.pop()
          else continue
          if (whitelist.includes(split.join())) {
            blacklist.splice(i, 1)
            break
          }
        }
      }
      opts.blacklist = blacklist
    } else {
      opts.blacklist = [ ...this[`${opts.action}BL`] ]
    }

    // Run before hook, then recurse through the model's fields
    return util.runSeries(this.beforeValidate.map(f => f.bind(opts, data))).then(() => {
      return util.toArray(data).map(item => {
        let validated = this._validateFields(item, this.fields, item, opts, '')
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

  _getMostSpecificKeyMatchingPath: function(object, path) {
    /**
     * Get all possible array variation matches from the object, and return the most specifc key
     * @param {object} object - e.g. { 'pets.1.name', 'pets.$.name', 'pets.name', .. }
     * @path  {string} path - must be a specifc path, e.g. 'pets.1.name'
     * @return most specific key in object
     *
     * 1. Get all viable messages keys, e.g. (key)dogs.$ == (path)dogs.1
     * 2. Order array key list by scoring, i.e. [0-9]=2, $=1, ''=0
     * 3. Return first
     */
    let keys = []
    let pathExpand = path.replace(/\.([0-9]+)/g, '(.$1|.\\$|)').replace(/\./g, '\\.')
    let pathreg = new RegExp(`^${pathExpand}$`)

    for (let key in object) {
      if (key.match(pathreg)) {
        let score = (key.match(/\.[0-9]+/g)||[]).length * 1001
        score += (key.match(/\.\$/g)||[]).length * 1000
        keys.push({ score: score, key: key })
      }
    }

    if (!keys.length) return
    else if (keys.length == 1) return keys[0].key
    return keys.sort((a, b) => a.score - b.score).reverse()[0].key // descending
  },

  _validateFields: function(dataRoot, fields, data, opts, path) {
    /**
     * Recurse through and retrieve any errors and valid data
     * @param {any} dataRoot
     * @param {object|array} fields
     * @param {any} data
     * @param {object} opts
     * @param {string} path
     * @return [errors, valid-data]
     * @this model
     *
     *   Fields first recursion  = { pets: [{ name: {}, color: {} }] }
     *   Fields second recursion = [0]: { name: {}, color: {} }
     */
    let errors = []
    let data2 = util.isArray(fields)? [] : {}
    let timestamps = util.isDefined(opts.timestamps)? opts.timestamps : this.manager.timestamps

    util.forEach(util.forceArray(data), function(data, i) {
      util.forEach(fields, function(field, fieldName) {
        let verrors = []
        let schema = field.schema || field
        let value = util.isArray(fields)? data : (data||{})[fieldName]
        let indexOrFieldName = util.isArray(fields)? i : fieldName
        let path2 = `${path}.${indexOrFieldName}`.replace(/^\./, '')
        let path3 = path2.replace(/(^|\.)[0-9]+(\.|$)/, '$2') // no numerical keys, e.g. pets.1.name
        let isType = 'is' + util.ucFirst(schema.type)
        let isTypeRule = this.rules[isType] || rules[isType]

        // Timestamp overrides
        if (schema.timestampField) {
          if (timestamps && ((fieldName == 'createdAt' && opts.insert) || fieldName == 'updatedAt')) {
            value = schema.default.call(dataRoot, fieldName, this)
          }
        // Use the default if available
        } else if (util.isDefined(schema.default)) {
          if ((!util.isDefined(value) && opts.insert) || schema.defaultOverride) {
            value = util.isFunction(schema.default)? schema.default.call(dataRoot, fieldName, this) : schema.default
          }
        }

        // Ignore blacklisted
        if (opts.blacklist.indexOf(path3) >= 0 && !schema.defaultOverride) return
        // Ignore insert only
        if (opts.update && schema.insertOnly) return
        // Ignore virtual fields
        if (schema.virtual) return
        // Type cast the value if tryParse is available, .e.g. isInteger.tryParse
        if (isTypeRule && util.isFunction(isTypeRule.tryParse)) {
          value = isTypeRule.tryParse.call(dataRoot, value, fieldName, this)
        }

        // Schema field (ignore object/array schemas)
        if (util.isSchema(field) && fieldName !== 'schema') {
          errors.push(...(verrors = this._validateRules(dataRoot, schema, value, opts, path2)))
          if (util.isDefined(value) && !verrors.length) data2[indexOrFieldName] = value

        // Fields can be a subdocument
        } else if (util.isSubdocument(field)) {
          // Object schema errors
          errors.push(...(verrors = this._validateRules(dataRoot, schema, value, opts, path2)))
          // Recurse if inserting, value is a subdocument, or a deep property (todo: not dot-notation)
          if (
            opts.insert ||
            util.isObject(value) ||
            (util.isDefined(opts.validateUndefined) ? opts.validateUndefined : (path2||'').match(/\./))
          ) {
            var res = this._validateFields(dataRoot, field, value, opts, path2)
            errors.push(...res[0])
          }
          if (util.isDefined(value) && !verrors.length) {
            data2[indexOrFieldName] = res? res[1] : value
          }

        // Fields can be an array
        } else if (util.isArray(field)) {
          // Array schema errors
          errors.push(...(verrors = this._validateRules(dataRoot, schema, value, opts, path2)))
          // Data value is array too
          if (util.isArray(value)) {
            var res2 = this._validateFields(dataRoot, field, value, opts, path2)
            errors.push(...res2[0])
          }
          if (util.isDefined(value) && !verrors.length) {
            data2[indexOrFieldName] = res2? res2[1] : value
          }
        }
      }, this)
    }, this)

    // Normalise array indexes and return
    if (util.isArray(fields)) data2 = data2.filter(() => true)
    if (data === null) data2 = null
    return [errors, data2]
  },

  _validateRules: function(dataRoot, field, value, opts, path) {
    /**
     * Validate all the field's rules
     * @param {object} dataRoot - data
     * @param {object} field - field schema
     * @param {string} path - full field path
     * @param {object} opts - original validate() options
     * @this model
     * @return {array} errors
     */
    let errors = []
    if (opts.skipValidation === true) return []

    // Skip validation for a field, takes in to account if a parent has been skipped.
    if (opts.skipValidation.length) {
      //console.log(path, field, opts)
      let pathChunks = path.split('.')
      for (let skippedField of opts.skipValidation) {
        // Make sure there is numerical character representing arrays
        let skippedFieldChunks = skippedField.split('.')
        for (let i=0, l=pathChunks.length; i<l; i++) {
          if (pathChunks[i].match(/^[0-9]+$/)
              && skippedFieldChunks[i]
              && !skippedFieldChunks[i].match(/^\$$|^[0-9]+$/)) {
            skippedFieldChunks.splice(i, 0, '$')
          }
        }
        for (let i=0, l=skippedFieldChunks.length; i<l; i++) {
          if (skippedFieldChunks[i] == '$') skippedFieldChunks[i] = '[0-9]+'
        }
        if (path.match(new RegExp('^' + skippedFieldChunks.join('.') + '(.|$)'))) return []
      }
    }

    for (let ruleName in field) {
      if (this._ignoredRules.indexOf(ruleName) > -1) continue
      let error = this._validateRule(dataRoot, ruleName, field, field[ruleName], value, opts, path)
      if (error && ruleName == 'required') return [error] // only show the required error
      if (error) errors.push(error)
    }
    return errors
  },

  _validateRule: function(dataRoot, ruleName, field, ruleArg, value, opts, path) {
    // this.debug(path, field, ruleName, ruleArg, value)
    // Remove [] from the message path, and simply ignore non-numeric children to test for all array items
    ruleArg = ruleArg === true? undefined : ruleArg
    let rule = this.rules[ruleName] || rules[ruleName]
    let fieldName = path.match(/[^.]+$/)[0]
    let isDeepProp = path.match(/\./) // todo: not dot-notation
    let ruleMessageKey = this._getMostSpecificKeyMatchingPath(this.messages, path)
    let ruleMessage = ruleMessageKey && this.messages[ruleMessageKey][ruleName]
    let validateUndefined = util.isDefined(opts.validateUndefined) ? opts.validateUndefined : opts.insert || isDeepProp
    if (!ruleMessage) ruleMessage = rule.message

    // Undefined value
    if (typeof value === 'undefined' && (!validateUndefined  || !rule.validateUndefined)) return

    // Ignore null (if nullObject is set on objects or arrays)
    if (value === null && (field.isObject || field.isArray) && field.nullObject) return

    // Ignore null
    if (value === null && !(field.isObject || field.isArray) && !rule.validateNull) return

    // Ignore empty strings
    if (value === '' && !rule.validateEmptyString) return

    // Rule failed
    if (!rule.fn.call(dataRoot, value, ruleArg, path, this)) return {
      detail: util.isFunction(ruleMessage)
        ? ruleMessage.call(dataRoot, value, ruleArg, path, this)
        : ruleMessage,
      meta: { rule: ruleName, model: this.name, field: fieldName, detailLong: rule.messageLong },
      status: '400',
      title: path
    }
  },

  _ignoredRules: [ // todo: change name? i.e. 'specialFields'
    // Need to remove filesize and formats..
    'default', 'defaultOverride', 'filename', 'filesize', 'formats', 'image', 'index', 'insertOnly',
    'model', 'nullObject', 'params', 'getSignedUrl', 'timestampField', 'type', 'virtual'
  ]

}
