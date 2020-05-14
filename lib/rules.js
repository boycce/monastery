let id = require('monk').id
let util = require('./util')
let validator = require('validator')

module.exports = {

  required: {
    message: 'This field is required.',
    fn: function(x) {
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
    fn: function(x) { 
      return true
    }
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
    message: (x, arg) => 'Value was greater than the configured maximum (' + arg + ')',
    fn: function(x, arg) {
      if (typeof x !== 'number') { throw new Error ('Value was not a number.') }
      return x <= arg
    }
  },
  'min': {
    message: (x, arg) => 'Value was less than the configured minimum (' + arg + ')',
    fn: function(x, arg) {
      if (typeof x !== 'number') { throw new Error ('Value was not a number.') }
      return x >= arg
    }
  },

  // Rules below ignore null & empty strings

  'hasAgreed': {
    ignoreEmptyString: true,
    message: (x, arg) => 'Please agree to the terms and conditions.',
    fn: (x, arg) => !x
  },
  'isAfter': {
    ignoreEmptyString: true,
    message: (x, arg) => 'Value was before the configured time (' + arg + ')',
    fn: (x, arg) => validator.isAfter(x, arg)
  },
  'isBefore': {
    ignoreEmptyString: true,
    message: (x, arg) => 'Value was after the configured time (' + arg + ')',
    fn: (x, arg) => validator.isBefore(x, arg)
  },
  'isCreditCard': {
    ignoreEmptyString: true,
    message: 'Value was not a valid credit card.',
    fn: (x, arg) => validator.isCreditCard(x, arg)
  },
  'isEmail': {
    ignoreEmptyString: true,
    message: 'Please enter a valid email address.',
    fn: (x, arg) => validator.isEmail(x, arg)
  },
  'isHexColor': {
    ignoreEmptyString: true,
    message: 'Value was not a valid hex color.',
    fn: (x, arg) => validator.isHexColor(x, arg)
  },
  'isIn': {
    ignoreEmptyString: true,
    message: (x, arg) => 'Value was not in the configured whitelist (' + arg.join(', ') + ')',
    fn: (x, arg) => validator.isIn(x, arg)
  },
  'isIP': {
    ignoreEmptyString: true,
    message: 'Value was not a valid IP address.',
    fn: (x, arg) => validator.isIP(x, arg)
  },
  'isNotIn': {
    ignoreEmptyString: true,
    message: (x, arg) => 'Value was in the configured blacklist (' + arg.join(', ') + ')',
    fn: (x, arg) => !validator.isIn(x, arg)
  },
  'isURL': {
    ignoreEmptyString: true,
    message: 'Value was not a valid URL.',
    fn: (x, arg) => validator.isURL(x, arg === true? undefined : arg)
  },
  'isUUID': {
    ignoreEmptyString: true,
    message: 'Value was not a valid UUID.',
    fn: (x, arg) => validator.isUUID(x)
  },
  'minLength': {
    ignoreEmptyString: true,
    message: (x, arg) => 'Value needs to be at least ' + arg + ' characters long.',
    fn: function(x, arg) {
      if (typeof x !== 'string') throw new Error ('Value was not a string.')
      return validator.isLength(x, arg)
    }
  },
  'maxLength': {
    ignoreEmptyString: true,
    message: (x, arg) => 'Value was longer than the configured maximum length (' + arg + ')',
    fn: function(x, arg) {
      if (typeof x !== 'string') throw new Error ('Value was not a string.')
      return validator.isLength(x, 0, arg)
    }
  },
  'regex': {
    ignoreEmptyString: true,
    message: (x, arg) => 'Value did not match the configured regular expression (' + arg + ')',
    fn: function(x, arg) {
      if (util.isRegex(arg)) return validator.matches(x, arg)
      throw new Error('This rule expects a regular expression to be configured, but instead got the ' 
        + typeof arg + ' `' + arg + '`.')
    }
  }
}
