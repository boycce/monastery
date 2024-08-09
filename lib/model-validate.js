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
   *     @param {array|string|true} <opts.skipValidation> - skip validation for these fields, or pass `true` to skip
   *         all fields and hooks
   *     @param {boolean} <opts.timestamps> - whether `createdAt` and `updatedAt` are inserted, or `updatedAt` is
   *         updated, depending on the `options.update` value
   *     @param {boolean(false)} <opts.update> - are we validating for insert or update? todo: change to `type`
   *     @param {array|string|false} <opts.validateUndefined> - validates all 'required' undefined fields, true by
   *         default, but false on update
   * @return promise(errors[] || pruned data{})
   * @this model
   */
  // console.time('1')
  data = util.deepCopy(data) // 30ms for 100k fields
  // console.timeEnd('1')
  opts = opts || {}
  opts.update = opts.update || opts.findOneAndUpdate
  opts.insert = !opts.update
  opts.skipValidation = opts.skipValidation === true ? true : util.toArray(opts.skipValidation||[])
  if (opts.skipValidation === true) return data

  // Get projection
  if (opts.project) var projectionValidate = this._getProjectionFromProject(opts.project)
  else projectionValidate = this._getProjectionFromBlacklist(opts.update ? 'update' : 'insert', opts.blacklist)
  opts.projectionKeys = Object.keys(projectionValidate || {})
  opts.projectionInclusion = (projectionValidate || {})[opts.projectionKeys[0]] ? true : false // default false

  // Hook: beforeValidate
  data = await util.runSeries.call(this, this.beforeValidate.map(f => f.bind(opts)), 'beforeValidate', data)

  // Recurse and validate fields
  // console.time('_validateFields')
  let response = util.toArray(data).map(item => {
    let validated = this._validateFields(item, this.fields, item, opts, '', '')
    if (validated[0].length) throw validated[0]
    else return validated[1]
  })
  // console.timeEnd('_validateFields')

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

Model.prototype._validateFields = function (dataRoot, fields, data, opts, parentPath, parentPath2) {
  /**
   * Recurse through and retrieve any errors and valid data (this needs to be perfomant)
   * Note: This is now super fast, it can validate 100k possible fields in 235ms
   * 
   * @param {any} dataRoot
   * @param {object|array} fields
   * @param {any} data
   * @param {object} opts
   * @param {string} parentPath - data localised parent, e.g. pets.1.name
   * @param {string} parentPath2 - no numerical keys, e.g. pets.name
   * @return [errors, valid-data]
   * @this model
   *
   *   Fields first recursion  = { pets: [{ name: {}, color: {} }] }
   *   Fields second recursion = [0]: { name: {}, color: {} }
   */
  let errors = []
  let fieldsIsArray = util.isArray(fields)
  let fieldsArray = fieldsIsArray ? fields : Object.keys(fields)
  let timestamps = util.isDefined(opts.timestamps) ? opts.timestamps : this.manager.opts.timestamps
  let dataArray = util.forceArray(data)
  let data2 = fieldsIsArray ? [] : {}
  let notStrict = fields.schema.strict === false

  for (let i=0, l=dataArray.length; i<l; i++) {
    const item = dataArray[i]

    for (let m=0, n=fieldsArray.length; m<n; m++) {
      // iterations++
      const fieldName = fieldsIsArray ? m : fieldsArray[m] // array|object key
      const field = fields[fieldName]
      if (fieldName == 'schema') continue
      // if (!parentPath && fieldName == 'categories') console.time(fieldName)
      // if (!parentPath && fieldName == 'categories') console.time(fieldName + 1)
      let schema = field.schema
      let value = fieldsIsArray ? item : (item||{})[fieldName]
      let indexOrFieldName = fieldsIsArray ? i : fieldName
      let path = `${parentPath}.${indexOrFieldName}`
      let path2 = fieldsIsArray ? parentPath2 : `${parentPath2}.${fieldName}`
      if (path[0] == '.') path = path.slice(1) // remove leading dot, e.g. .pets.1.name
      if (path2[0] == '.') path2 = path2.slice(1) // remove leading dot, e.g. .pets.1.name
      let isTypeRule = this.rules[schema.isType] || rules[schema.isType]

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

      // Ignore insert only
      if (opts.update && schema.insertOnly) continue
      // Ignore virtual fields
      if (schema.virtual) continue
      // Ignore blacklisted
      if (!schema.defaultOverride && this._pathBlacklisted(path2, opts.projectionInclusion, opts.projectionKeys)) continue
      // Type cast the value if tryParse is available, .e.g. isInteger.tryParse
      if (isTypeRule && typeof isTypeRule.tryParse == 'function') {
        value = isTypeRule.tryParse.call(dataRoot, value, fieldName, this) // 80ms // DISABLE
      }
      
      // Field is a subdocument
      if (schema.isObject) {
        // Object schema errors
        let res
        const verrors = this._validateRules(dataRoot, schema, value, opts, path)
        if (verrors.length) errors.push(...verrors)
        // Recurse if inserting, value is a subdocument, or a deep property (todo: not dot-notation)
        if (
          opts.insert ||
          util.isObject(value) ||
          (util.isDefined(opts.validateUndefined) ? opts.validateUndefined : (path||'').indexOf('.') !== -1)
        ) {
          res = this._validateFields(dataRoot, field, value, opts, path, path2)
          if (res[0].length) errors.push(...res[0])
        }
        if (util.isDefined(value) && !verrors.length) {
          data2[indexOrFieldName] = res ? res[1] : value
        }

      // Field is an array
      } else if (schema.isArray) {
        // Array schema errors
        let res2
        const verrors = this._validateRules(dataRoot, schema, value, opts, path)
        if (verrors.length) errors.push(...verrors)
        // Data value is array too
        if (util.isArray(value)) {
          res2 = this._validateFields(dataRoot, field, value, opts, path, path2)
          if (res2[0].length) errors.push(...res2[0])
        }
        if (util.isDefined(value) && !verrors.length) {
          data2[indexOrFieldName] = res2? res2[1] : value
        }

      // Field is a field-type/field-schema
      } else {
        const verrors = this._validateRules(dataRoot, schema, value, opts, path)
        if (verrors.length) errors.push(...verrors)
        if (util.isDefined(value) && !verrors.length) data2[indexOrFieldName] = value
      }
      // if (!parentPath && fieldName == 'categories') console.timeEnd(fieldName)
    }

    // Add any extra fields that are not in the schema. Item maybe false when inserting (from recursing above)
    if (notStrict && !fieldsIsArray && item) {
      const allDataKeys = Object.keys(item)
      for (let m=0, n=allDataKeys.length; m<n; m++) {
        const key = allDataKeys[m]
        if (!fieldsArray.includes(key)) data2[key] = item[key]
      }
    }
  }

  // Normalise array indexes and return
  if (data === null) data2 = null
  return [errors, data2]
}

Model.prototype._validateRules = function (dataRoot, fieldSchema, value, opts, path) {
  /**
   * Validate all the field's rules
   * @param {object} dataRoot - data
   * @param {object} fieldSchema - field schema
   * @param {any} value - data value
   * @param {object} opts - original validate() options
   * @param {string} path - full field path, e.g. pets.1.name
   * @return {array} errors
   * @this model
   */
  let errors = []
  if (opts.skipValidation === true) return []

  // Skip validation for a field, takes in to account if a parent has been skipped.
  // Todo: Maybe we can use model-crud:blacklisted logic? But just allow it to skip all [0-9] paths via '$'
  // if (!parentPath && fieldName == 'categories') console.timeEnd(i + ' - ' + m + ' - ' + fieldName + ' - 1')/////
  if (opts.skipValidation.length) {
    //console.log(path, field, opts)
    let pathChunks = path.split('.')
    for (let skippedField of opts.skipValidation) {
      // Make sure there is numerical character representing arrays
      let skippedFieldChunks = skippedField.split('.')
      for (let i=0, l=pathChunks.length; i<l; i++) {
        if (
          pathChunks[i].match(/^[0-9]+$/)
          && skippedFieldChunks[i]
          && !skippedFieldChunks[i].match(/^\$$|^[0-9]+$/)
        ) {
          skippedFieldChunks.splice(i, 0, '$')
        }
      }
      for (let i=0, l=skippedFieldChunks.length; i<l; i++) {
        if (skippedFieldChunks[i] == '$') skippedFieldChunks[i] = '[0-9]+'
      }
      if (path.match(new RegExp('^' + skippedFieldChunks.join('.') + '(.|$)'))) return []
    }
  }

  for (let ruleName in fieldSchema) {
    if (this._ignoredRules.indexOf(ruleName) > -1) continue
    let error = this._validateRule(dataRoot, ruleName, fieldSchema, fieldSchema[ruleName], value, opts, path)
    if (error && ruleName == 'required') return [error] // only show the required error
    if (error) errors.push(error)
  }
  return errors
}

Model.prototype._validateRule = function (dataRoot, ruleName, fieldSchema, ruleArg, value, opts, path) {
  // this.debug(path, fieldSchema, ruleName, ruleArg, value)
  // Remove [] from the message path, and simply ignore non-numeric children to test for all array items
  ruleArg = ruleArg === true ? undefined : ruleArg
  let rule = this.rules[ruleName] || rules[ruleName]
  let validateUndefined = typeof opts.validateUndefined != 'undefined' 
    ? opts.validateUndefined 
    : opts.insert || path.includes('.') // is a deep property

  // Undefined value
  if (typeof value === 'undefined' && (!validateUndefined  || !rule.validateUndefined)) return

  // Ignore null (if nullObject is set on objects or arrays)
  if (value === null && (fieldSchema.isObject || fieldSchema.isArray) && fieldSchema.nullObject && !rule.validateNull) return

  // Ignore null
  if (value === null && !(fieldSchema.isObject || fieldSchema.isArray) && !rule.validateNull) return

  // Ignore empty strings
  if (value === '' && !rule.validateEmptyString) return

  // Rule failed
  if (!rule.fn.call(dataRoot, value, ruleArg, path, this)) {
    let ruleMessageKey = this.messagesLen && this._getMostSpecificKeyMatchingPath(this.messages, path)
    let ruleMessage = ruleMessageKey && this.messages[ruleMessageKey][ruleName]
    if (!ruleMessage) ruleMessage = rule.message
    return {
      detail: util.isFunction(ruleMessage)
        ? ruleMessage.call(dataRoot, value, ruleArg, path, this)
        : ruleMessage,
      meta: { rule: ruleName, model: this.name, field: path.match(/[^.]+$/)[0], detailLong: rule.messageLong },
      status: '400',
      title: path,
    }
  }
}

Model.prototype._ignoredRules = [ 
  // todo: change name? i.e. 'specialFields'
  // todo: need to remove filesize and formats..
  'awsAcl', 'awsBucket', 'default', 'defaultOverride', 'filename', 'filesize', 'fileSize', 'formats',
  'image', 'index', 'insertOnly', 'model', 'nullObject', 'params', 'path', 'getSignedUrl', 'timestampField',
  'type', 'isType', 'isSchema', 'virtual', 'strict',
]
