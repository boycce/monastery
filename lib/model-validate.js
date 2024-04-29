const util = require('./util.js')
const rules = require('./rules.js')
const Model = require('./model.js')

Model.prototype.validate = async function (data, opts) {
  /**
   * Validates a model
   * @param {object} data
   * @param {object} <opts>
   *     @param {array|string|false} <opts.blacklist> - augment insertBL/updateBL, `false` will remove blacklisting
   *     @param {array|string} <opts.project> - return only these fields, ignores blacklisting
   *     @param {array|string|true} <opts.skipValidation> - skip validation on these fields
   *     @param {boolean} <opts.timestamps> - whether `createdAt` and `updatedAt` are inserted, or `updatedAt` is
   *         updated, depending on the `options.update` value
   *     @param {boolean(false)} <opts.update> - are we validating for insert or update? todo: change to `type`
   *     @param {array|string|false} <opts.validateUndefined> - validates all 'required' undefined fields, true by
   *         default, but false on update
   * @return promise(errors[] || pruned data{})
   * @this model
   */
  data = util.deepCopy(data)
  opts = opts || {}
  opts.update = opts.update || opts.findOneAndUpdate
  opts.insert = !opts.update
  opts.skipValidation = opts.skipValidation === true ? true : util.toArray(opts.skipValidation||[])

  // Get projection
  if (opts.project) opts.projectionValidate = this._getProjectionFromProject(opts.project)
  else opts.projectionValidate = this._getProjectionFromBlacklist(opts.update ? 'update' : 'insert', opts.blacklist)

  // Hook: beforeValidate

  await util.runSeries(this.beforeValidate.map(f => f.bind(opts, data)), `${this.name}.beforeValidate`)

  // Recurse and validate fields
  let response = util.toArray(data).map(item => {
    let validated = this._validateFields(item, this.fields, item, opts, '')
    if (validated[0].length) throw validated[0]
    else return validated[1]
  })

  // Single document?
  response = util.isArray(data)? response : response[0]

  // Success/error
  return Promise.resolve(response)
}

Model.prototype._getMostSpecificKeyMatchingPath = function (object, path) {
  /**
   * Get all possible array variation matches from the object, and return the most specifc key
   * @param {object} object - messages, e.g. { 'pets.1.name', 'pets.$.name', 'pets.name', .. }
   * @path  {string} path - must be a specifc path, e.g. 'pets.1.name'
   * @return most specific key in object
   */
  let key
  for (let k in object) {
    if (path.match(object[k].regex)) {
      key = k
      break
    }
  }
  return key
}

Model.prototype._validateFields = function (dataRoot, fields, data, opts, path) {
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
  let timestamps = util.isDefined(opts.timestamps) ? opts.timestamps : this.manager.opts.timestamps

  util.forEach(util.forceArray(data), function(data, i) {
    util.forEach(fields, function(field, fieldName) {
      let verrors = []
      let schema = field.schema || field
      let value = util.isArray(fields)? data : (data||{})[fieldName]
      let indexOrFieldName = util.isArray(fields)? i : fieldName
      let path2 = `${path}.${indexOrFieldName}`.replace(/^\./, '')
      let path3 = path2.replace(/(^|\.)[0-9]+(\.|$)/, '$2') // no numerical keys, e.g. pets.1.name = pets.name
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
      if (this._pathBlacklisted(path3, opts.projectionValidate) && !schema.defaultOverride) return
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
}

Model.prototype._validateRules = function (dataRoot, field, value, opts, path) {
  /**
   * Validate all the field's rules
   * @param {object} dataRoot - data
   * @param {object} field - field schema
   * @param {string} path - full field path
   * @param {object} opts - original validate() options
   * @return {array} errors
   * @this model
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
}

Model.prototype._validateRule = function (dataRoot, ruleName, field, ruleArg, value, opts, path) {
  // this.debug(path, field, ruleName, ruleArg, value)
  // Remove [] from the message path, and simply ignore non-numeric children to test for all array items
  ruleArg = ruleArg === true? undefined : ruleArg
  let rule = this.rules[ruleName] || rules[ruleName]
  let fieldName = path.match(/[^.]+$/)[0]
  let isDeepProp = path.match(/\./) // todo: not dot-notation
  let ruleMessageKey = this.messagesLen && this._getMostSpecificKeyMatchingPath(this.messages, path)
  let ruleMessage = ruleMessageKey && this.messages[ruleMessageKey][ruleName]
  let validateUndefined = util.isDefined(opts.validateUndefined) ? opts.validateUndefined : opts.insert || isDeepProp
  if (!ruleMessage) ruleMessage = rule.message

  // Undefined value
  if (typeof value === 'undefined' && (!validateUndefined  || !rule.validateUndefined)) return

  // Ignore null (if nullObject is set on objects or arrays)
  if (value === null && (field.isObject || field.isArray) && field.nullObject && !rule.validateNull) return

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
    title: path,
  }
}

Model.prototype._ignoredRules = [ 
  // todo: change name? i.e. 'specialFields'
  // todo: need to remove filesize and formats..
  'awsAcl', 'awsBucket', 'default', 'defaultOverride', 'filename', 'filesize', 'fileSize', 'formats',
  'image', 'index', 'insertOnly', 'model', 'nullObject', 'params', 'path', 'getSignedUrl', 'timestampField',
  'type', 'virtual',
]
