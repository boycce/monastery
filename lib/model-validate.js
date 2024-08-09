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
   *     @param {boolran} <opts.skipHooks> - skip hooks
   *     @param {array|string} <opts.skipValidation> - skip validation for these fields
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
  opts.skipValidation = opts.skipValidation === true ? true : util.toArray(opts.skipValidation || [])
  opts.timestamps = util.isDefined(opts.timestamps) ? opts.timestamps : this.manager.opts.timestamps

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
    const [errors, validated] = this._validateFields(item, this.fields, item, opts, '', '')
    if (errors.length) throw errors // todo: maybe add trace to this object?
    else return validated
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
   * @param {object|array} fields (from definition)
   * @param {any} data
   * @param {object} opts
   * @param {string} parentPath - parent data path, e.g. pets.1.name
   * @param {string} parentPath2 - parent field path, no numerical keys, e.g. pets.name
   * @return [errors, valid-data]
   * @this model
   *
   *   Fields first recursion  = { pets: [{ name: {}, color: {} }] }
   *   Fields second recursion = [0]: { name: {}, color: {} }
   */
  let errors = []
  let fieldsIsArray = util.isArray(fields)
  let fieldsArray = fieldsIsArray ? fields : Object.keys(fields)
  let dataArray = util.forceArray(data)
  let data2 = fieldsIsArray ? [] : {}
  let notStrict = fields.schema.strict === false

  for (let i=0, l=dataArray.length; i<l; i++) {
    const dataItem = dataArray[i]
    const dataKeys = Object.keys(dataItem || {}) // may be false when inserting, e.g. mode.insert({ data: false })

    // Add any non-schema properties, excluding array properties
    if (notStrict && !fieldsIsArray) {
      for (let m=0, n=dataKeys.length; m<n; m++) {
        if (!fieldsArray.includes(dataKeys[m])) data2[dataKeys[m]] = dataItem[dataKeys[m]]
      }
    }

    // Loop through each schema field
    for (let m=0, n=fieldsArray.length; m<n; m++) {
      const fieldName = fieldsIsArray ? m : fieldsArray[m] // array|object key
      const dataFieldName = fieldsIsArray ? i : fieldName
      const value = fieldsIsArray ? dataItem : (dataItem||{})[fieldName]
      const field = fields[fieldName] // schema field

      // Field paths
      const path = `${parentPath ? parentPath + '.' : ''}${dataFieldName}` // e.g. pets.1.name
      const path2 = fieldsIsArray ? parentPath2 : (`${parentPath2 ? parentPath2 + '.' : ''}${fieldName}`) // e.g. pets.name

      const [errors2, value2] = this._validateField(dataRoot, field, fieldName, value, opts, path, path2)
      if (errors2.length) errors = errors.concat(errors2)
      else if (typeof value2 !== 'undefined') data2[dataFieldName] = value2
    }

    // Validate dot-notation fields on the dataRoot, e.g. pets.1.name
    if (!parentPath) {
      for (let j=0, k=dataKeys.length; j<k; j++) {
        if (dataKeys[j].includes('.')) {
          const path = dataKeys[j]
          const path2 = path.replace(/\.(\d|\$)+/g, '')
          const pathWithZeroIndexes = path.replace(/\.(\d|\$)+/g, '.0')
          const fieldName = pathWithZeroIndexes.split('.')[0]
          const field = util.deepFind(fields, pathWithZeroIndexes)
          if (!field) continue

          const [errors2, value2] = this._validateField(dataRoot, field, fieldName, dataItem[path], opts, path, path2)
          if (errors2.length) errors = errors.concat(errors2)
          else if (typeof value2 !== 'undefined') data2[path] = value2
        }
      }
    }
  }

  // Normalise array indexes and return
  if (data === null) data2 = null
  return [errors, data2]
}

Model.prototype._validateField = function (dataRoot, field, fieldName, value, opts, path, path2) {
  /**
   * Validate a field
   * 
   * @param {object} dataRoot - data
   * @param {object} field - field (from definition)
   * @param {string} fieldName
   * @param {any} value
   * @param {object} opts - original validate() options
   * @param {string} path - full data path, e.g. pets.1.name
   * @param {string} path2 - full field path, without numerical keys, e.g. pets.name
   * @return [errors[], valid-value]
   * @this model
   */
  // iterations++
  const schema = field.schema
  if (fieldName == 'schema') return [[]]
  // if (!parentPath && fieldName == 'categories') console.time(fieldName)
  // if (!parentPath && fieldName == 'categories') console.time(fieldName + 1)

  const isTypeRule = this.rules[schema.isType] || rules[schema.isType]

  // Timestamp overrides
  if (schema.timestampField) {
    if (opts.timestamps && ((fieldName == 'createdAt' && opts.insert) || fieldName == 'updatedAt')) {
      value = schema.default.call(dataRoot, fieldName, this)
    }
  // Use the default if available
  } else if (util.isDefined(schema.default)) {
    if ((!util.isDefined(value) && opts.insert) || schema.defaultOverride) {
      value = util.isFunction(schema.default)? schema.default.call(dataRoot, fieldName, this) : schema.default
    }
  }

  // Ignore insert only
  if (opts.update && schema.insertOnly) return [[]]
  // Ignore virtual fields
  if (schema.virtual) return [[]]
  // Ignore blacklisted
  if (!schema.defaultOverride && this._pathBlacklisted(path2, opts.projectionInclusion, opts.projectionKeys)) return [[]]
  // Type cast the value if tryParse is available, .e.g. isInteger.tryParse
  if (isTypeRule && typeof isTypeRule.tryParse == 'function') {
    value = isTypeRule.tryParse.call(dataRoot, value, fieldName, this) // 80ms // DISABLE
  }
  
  // Field is a subdocument
  if (schema.isObject) {
    // Object schema errors
    let verrors2, value2
    let verrors = this._validateRules(dataRoot, schema, value, opts, path)
    // Recurse if inserting, value is a subdocument, or we're within a subdocument (todo: not dot-notation)
    const parentIsSubdocument = (path||'').indexOf('.') !== -1
    if (
      opts.insert ||
      util.isObject(value) ||
      (util.isDefined(opts.validateUndefined) ? opts.validateUndefined : parentIsSubdocument)
    ) {
      [verrors2, value2] = this._validateFields(dataRoot, field, value, opts, path, path2)
      if (verrors2.length) verrors = verrors.concat(verrors2)
    }
    if (verrors.length) return [verrors]
    else return [[], typeof value2 !== 'undefined' && typeof value !== 'undefined' ? value2 : value]

  // Field is an array
  } else if (schema.isArray) {
    // Array schema errors
    let verrors2, value2
    let verrors = this._validateRules(dataRoot, schema, value, opts, path)
    // Data value is array too
    if (util.isArray(value)) {
      [verrors2, value2] = this._validateFields(dataRoot, field, value, opts, path, path2)
      if (verrors2.length) verrors = verrors.concat(verrors2)
    }
    if (verrors.length) return [verrors]
    else return [[], typeof value2 !== 'undefined' && typeof value !== 'undefined' ? value2 : value]

  // Field is a field-type/field-schema
  } else {
    const verrors = this._validateRules(dataRoot, schema, value, opts, path)
    if (verrors.length) return [verrors]
    else return [[], value]
  }
  // if (!parentPath && fieldName == 'categories') console.timeEnd(fieldName)
}

Model.prototype._validateRules = function (dataRoot, fieldSchema, value, opts, path) {
  /**
   * Validate all the field's rules
   * @param {object} dataRoot - data
   * @param {object} fieldSchema - field schema
   * @param {any} value - data value
   * @param {object} opts - original validate() options
   * @param {string} path - full data path, e.g. pets.1.name
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
