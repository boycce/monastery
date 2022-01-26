let ObjectId = require('mongodb').ObjectId
let util = require('./util')
let validator = require('validator')

module.exports = {

  required: {
    ignoreUndefined: false,
    message: 'This field is required.',
    fn: function(x) {
      if (util.isArray(x) && !x.length) return false
      return x || x === 0 || x === false? true : false
    }
  },

  // Type rules below ignore undefined (default for custom model rules)

  'isBoolean': {
    ignoreUndefined: true,
    message: 'Value was not a boolean.',
    tryParse: function(x) {
      if (typeof x === 'string' && x === 'true') return true
      else if (typeof x === 'string' && x === 'false') return false
      else return x
    },
    fn: function(x) {
      return typeof x === 'boolean'
    }
  },
  'isArray': {
    ignoreUndefined: true,
    message: 'Value was not an array.',
    tryParse: function(x) {
      if (x === '') return null
      if (!util.isString(x)) return x
      try { var parsed = JSON.parse(x) } catch (e) { return x }
      return Array.isArray(parsed)? parsed : x
    },
    fn: function(x) {
      return Array.isArray(x)
    }
  },
  'isDate': {
    ignoreUndefined: true,
    message: 'Value was not a unix timestamp.',
    tryParse: function(x) {
      if (util.isString(x) && x.match(/^[+-]?[0-9]+$/)) return x // keep string nums intact
      return isNaN(parseInt(x))? x : parseInt(x)
    },
    fn: function(x) {
      if (util.isString(x) && x.match(/^[+-]?[0-9]+$/)) return true
      return typeof x === 'number' && (parseInt(x) === x)
    }
  },
  'isImageObject': {
    ignoreUndefined: true,
    message: 'Invalid image value',
    messageLong: 'Image fields need to either be null, undefined, file, or an object containing the following '
      + 'fields \'{ bucket, date, filename, filesize, path, uid }\'',
    tryParse: function(x) {
      if (x === '') return null
      if (!util.isString(x)) return x
      try { var parsed = JSON.parse(x) } catch (e) { return x }
      return parsed !== null && typeof parsed === 'object' && !(parsed instanceof Array)? parsed : x
    },
    fn: function(x) {
      let isObject = x !== null && typeof x === 'object' && !(x instanceof Array)
      if (isObject && x.bucket && x.date && x.filename && x.filesize && x.path && x.uid) return true
    }
  },
  'isInteger': {
    ignoreUndefined: true,
    message: 'Value was not an integer.',
    tryParse: function(x) {
      if (util.isString(x) && x.match(/^[+-][0-9]+$/)) return x // keep string nums intact
      return isNaN(parseInt(x)) || (!x && x!==0) || x===true? x : parseInt(x)
    },
    fn: function(x) {
      if (util.isString(x) && x.match(/^[+-]?[0-9]+$/)) return true
      return typeof x === 'number' && (parseInt(x) === x)
    }
  },
  'isNumber': {
    ignoreUndefined: true,
    message: 'Value was not a number.',
    tryParse: function(x) {
      if (util.isString(x) && x.match(/^[+-][0-9]+$/)) return x // keep string nums intact
      return isNaN(Number(x)) || (!x && x!==0) || x===true? x : Number(x)
    },
    fn: function(x) {
      if (util.isString(x) && x.match(/^[+-][0-9]+$/)) return true
      return typeof x === 'number'
    }
  },
  'isObject': {
    ignoreUndefined: true,
    message: 'Value was not an object.',
    tryParse: function(x) {
      if (x === '') return null
      if (!util.isString(x)) return x
      try { var parsed = JSON.parse(x) } catch (e) { return x }
      return parsed !== null && typeof parsed === 'object' && !(parsed instanceof Array)? parsed : x
    },
    fn: function(x) {
      return x !== null && typeof x === 'object' && !(x instanceof Array)
    }
  },
  'isString': {
    ignoreUndefined: true,
    message: 'Value was not a string.',
    fn: function(x) {
      return typeof x === 'string'
    }
  },
  'isAny': {
    ignoreUndefined: true,
    message: '',
    fn: function(x) {
      return true
    }
  },
  'isId': {
    ignoreUndefined: true,
    message: 'Value was not a valid ObjectId.',
    tryParse: function(x) {
      // Try and parse value to a mongodb ObjectId
      if (x === '') return null
      if (util.isString(x) && ObjectId.isValid(x)) return ObjectId(x)
      else return x
    },
    fn: function(x) {
      // Must be a valid mongodb ObjectId
      if (x === null) return true
      return util.isObject(x) && ObjectId.isValid(x)/*x.get_inc*/? true : false
    }
  },
  'max': {
    ignoreUndefined: true,
    message: (x, arg) => 'Value was greater than the configured maximum (' + arg + ')',
    fn: function(x, arg) {
      if (typeof x !== 'number') { throw new Error ('Value was not a number.') }
      return x <= arg
    }
  },
  'min': {
    ignoreUndefined: true,
    message: (x, arg) => 'Value was less than the configured minimum (' + arg + ')',
    fn: function(x, arg) {
      if (typeof x !== 'number') { throw new Error ('Value was not a number.') }
      return x >= arg
    }
  },
  'isNotEmptyString': {
    ignoreUndefined: true,
    message: 'Value was an empty string.',
    fn: function(x) {
      return x !== ''
    }
  },

  // Rules below ignore undefined & empty strings
  // (e.g. an empty email field can be saved that isn't required)

  'enum': {
    ignoreEmptyString: true,
    ignoreUndefined: true,
    message: (x, arg) => 'Invalid enum value',
    fn: function(x, arg) {
      for (let item of arg) {
        if (x === item + '') return true
      }
    }
  },
  // 'hasAgreed': {
  //   message: (x, arg) => 'Please agree to the terms and conditions.',
  //   fn: function(x, arg) { return !x }
  // },
  'isAfter': {
    ignoreEmptyString: true,
    ignoreUndefined: true,
    message: (x, arg) => 'Value was before the configured time (' + arg + ')',
    fn: function(x, arg) { return validator.isAfter(x, arg) }
  },
  'isBefore': {
    ignoreEmptyString: true,
    ignoreUndefined: true,
    message: (x, arg) => 'Value was after the configured time (' + arg + ')',
    fn: function(x, arg) { return validator.isBefore(x, arg) }
  },
  'isCreditCard': {
    ignoreEmptyString: true,
    ignoreUndefined: true,
    message: 'Value was not a valid credit card.',
    fn: function(x, arg) { return validator.isCreditCard(x, arg) }
  },
  'isEmail': {
    ignoreEmptyString: true,
    ignoreUndefined: true,
    message: 'Please enter a valid email address.',
    fn: function(x, arg) { return validator.isEmail(x, arg) }
  },
  'isHexColor': {
    ignoreEmptyString: true,
    ignoreUndefined: true,
    message: 'Value was not a valid hex color.',
    fn: function(x, arg) { return validator.isHexColor(x, arg) }
  },
  'isIn': {
    ignoreEmptyString: true,
    ignoreUndefined: true,
    message: (x, arg) => 'Value was not in the configured whitelist (' + arg.join(', ') + ')',
    fn: function(x, arg) { return validator.isIn(x, arg) }
  },
  'isIP': {
    ignoreEmptyString: true,
    ignoreUndefined: true,
    message: 'Value was not a valid IP address.',
    fn: function(x, arg) { return validator.isIP(x, arg) }
  },
  'isNotIn': {
    ignoreEmptyString: true,
    ignoreUndefined: true,
    message: (x, arg) => 'Value was in the configured blacklist (' + arg.join(', ') + ')',
    fn: function(x, arg) { return !validator.isIn(x, arg) }
  },
  'isURL': {
    ignoreEmptyString: true,
    ignoreUndefined: true,
    message: 'Value was not a valid URL.',
    fn: function(x, arg) { return validator.isURL(x, arg === true? undefined : arg) }
  },
  'isUUID': {
    ignoreEmptyString: true,
    ignoreUndefined: true,
    message: 'Value was not a valid UUID.',
    fn: function(x, arg) { return validator.isUUID(x) }
  },
  'minLength': {
    ignoreEmptyString: true,
    ignoreUndefined: true,
    message: function(x, arg) {
      if (typeof x === 'string') return 'Value needs to be at least ' + arg + ' characters long.'
      else return 'Value needs to contain a minimum of ' + arg + ' items.'
    },
    fn: function(x, arg) {
      if (typeof x !== 'string' && !util.isArray(x)) throw new Error ('Value was not a string or an array.')
      else if (typeof x === 'string') return validator.isLength(x, arg)
      else return x.length >= arg
    }
  },
  'maxLength': {
    ignoreEmptyString: true,
    ignoreUndefined: true,
    message: function(x, arg) {
      if (typeof x === 'string') return 'Value was longer than the configured maximum length (' + arg + ')'
      else return 'Value cannot contain more than ' + arg + ' items.'
    },
    fn: function(x, arg) {
      if (typeof x !== 'string' && !util.isArray(x)) throw new Error ('Value was not a string or an array.')
      else if (typeof x === 'string') return validator.isLength(x, 0, arg)
      else return x.length <= arg
    }
  },
  'regex': {
    ignoreEmptyString: true,
    ignoreUndefined: true,
    message: (x, arg) => 'Value did not match the configured regular expression (' + arg + ')',
    fn: function(x, arg) {
      if (util.isRegex(arg)) return validator.matches(x, arg)
      throw new Error('This rule expects a regular expression to be configured, but instead got the '
        + typeof arg + ' `' + arg + '`.')
    }
  }
}
