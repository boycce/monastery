let id = require('monk').id
let util = require('./util')
let validator = require('validator')

module.exports = {

  required: {
    message: 'This field is required.',
    fn: function(x, typeval) {
      if (util.isArray(x) && !x.length) return false
      return x || x === 0 || x === false? true : false
    }
  },

  // Rules below ignore null

  'isBoolean': {
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
  'isNotEmptyString': {
    message: 'Value was an empty string.',
    fn: function(x) {
      return x !== ''
    }
  },
  'isArray': {
    message: 'Value was not an array.',
    tryParse: function(x) {
      if (!util.isString(x)) return x
      try { var parsed = JSON.parse(x) }
      catch (e) { return x }
      return Array.isArray(parsed)? parsed : x
    },
    fn: function(x) {
      return Array.isArray(x)
    }
  },
  'isInteger': {
    message: 'Value was not an integer.',
    tryParse: function(x) {
      if (util.isString(x) && x.match(/^[\+-]?[0-9]+$/)) return x // keep string nums intact 
      return isNaN(parseInt(x))? x : parseInt(x)
    }, 
    fn: function(x) {
      if (util.isString(x) && x.match(/^[\+-]?[0-9]+$/)) return true 
      return typeof x === 'number' && (parseInt(x) === x)
    }
  },
  'isNumber': {
    message: 'Value was not a number.',
    tryParse: function(x) {
      if (util.isString(x) && x.match(/^[\+-][0-9]+$/)) return x // keep string nums intact
      return isNaN(Number(x)) || x===true || x===false? x : Number(x)
    }, 
    fn: function(x) {
      if (util.isString(x) && x.match(/^[\+-][0-9]+$/)) return true
      return typeof x === 'number'
    }
  },
  'isObject': {
    message: 'Value was not an object.',
    tryParse: function(x) {
      if (!util.isString(x)) return x
      try { var parsed = JSON.parse(x) } 
      catch (e) { return x }
      return parsed !== null && typeof parsed === 'object' && !(parsed instanceof Array)? parsed : x
    },
    fn: function(x) {
      return x !== null && typeof x === 'object' && !(x instanceof Array)
    }
  },
  'isString': {
    message: 'Value was not a string.',
    fn: function(x) {
      return typeof x === 'string'
    }
  },
  'isAny': {
    message: '',
    fn: function(x) { return true }
  },
  'isId': {
    message: 'Value was not a valid ObjectId.',
    tryParse: function(x) {
      // Try and parse value to a mongodb id object
      if (x === '') return null
      let checkForHexRegExp = RegExp("^[0-9a-fA-F]{24}$")
      if (util.isString(x) && x.match(checkForHexRegExp)) return id(x)
      else return x
    },
    fn: function(x) {
      // Must be a valid mongodb id object
      let checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$")
      if (x === null) return true
      return util.isObject(x) && x.toString().match(checkForHexRegExp)? true : false
    }
  },
  'max': {
    message: (x, val) => 'Value was greater than the configured maximum (' + val + ')',
    fn: function(x, val) {
      if (typeof x !== 'number') { throw new Error ('Value was not a number.') }
      return x <= val
    }
  },
  'min': {
    message: (x, val) => 'Value was less than the configured minimum (' + val + ')',
    fn: function(x, val) {
      if (typeof x !== 'number') { throw new Error ('Value was not a number.') }
      return x >= val
    }
  },

  // Rules below ignore null & empty strings

  'hasAgreed': {
    ignoreEmptyString: true,
    message: (x, val) => 'Please agree to the terms and conditions.',
    fn: (x, bool) => !x
  },
  'isAfter': {
    ignoreEmptyString: true,
    message: (x, val) => 'Value was before the configured time (' + val + ')',
    fn: validator.isAfter
  },
  'isBefore': {
    ignoreEmptyString: true,
    message: (x, val) => 'Value was after the configured time (' + val + ')',
    fn: validator.isBefore
  },
  'isCreditCard': {
    ignoreEmptyString: true,
    message: 'Value was not a valid credit card.',
    fn: validator.isCreditCard
  },
  'isEmail': {
    ignoreEmptyString: true,
    message: 'Please enter a valid email address.',
    fn: validator.isEmail
  },
  'isHexColor': {
    ignoreEmptyString: true,
    message: 'Value was not a valid hex color.',
    fn: validator.isHexColor
  },
  'isIn': {
    ignoreEmptyString: true,
    message: (x, val) => 'Value was not in the configured whitelist (' + val.join(', ') + ')',
    fn: validator.isIn
  },
  'isIP': {
    ignoreEmptyString: true,
    message: 'Value was not a valid IP address.',
    fn: validator.isIP
  },
  'isNotIn': {
    ignoreEmptyString: true,
    message: (x, val) => 'Value was in the configured blacklist (' + val.join(', ') + ')',
    fn: (x, arrayOrString) => !validator.isIn(x, arrayOrString)
  },
  'isURL': {
    ignoreEmptyString: true,
    message: 'Value was not a valid URL.',
    fn: (x, opt) => validator.isURL(x, opt === true? undefined : opt)
  },
  'isUUID': {
    ignoreEmptyString: true,
    message: 'Value was not a valid UUID.',
    fn: validator.isUUID
  },
  'minLength': {
    ignoreEmptyString: true,
    message: (x, val) => 'Value needs to be at least ' + val + ' characters long.',
    fn: function(x, min) {
      if (typeof x !== 'string') throw new Error ('Value was not a string.')
      return validator.isLength(x, min)
    }
  },
  'maxLength': {
    ignoreEmptyString: true,
    message: (x, val) => 'Value was longer than the configured maximum length (' + val + ')',
    fn: function(x, max) {
      if (typeof x !== 'string') throw new Error ('Value was not a string.')
      return validator.isLength(x, 0, max)
    }
  },
  'regex': {
    ignoreEmptyString: true,
    message: (x, val) => 'Value did not match the configured regular expression (' + val + ')',
    fn: function(x, regex) {
      if (util.isRegex(regex)) return validator.matches(x, regex)
      throw new Error('This rule expects a regular expression to be configured, but instead got the ' 
        + typeof regex + ' `' + regex + '`.')
    }
  }
}
