module.exports = {

  forEach: function(obj, iteratee, context) {
    if (this.isArrayLike(obj)) {
      for (let i=0, l=obj.length; i<l; i++) {
        iteratee.call(context || null, obj[i], i, obj)
      }
    } else {
      for (let key in obj) {
        if (!obj.hasOwnProperty(key)) continue
        iteratee.call(context || null, obj[key], key, obj)
      }
    }
    return obj
  },

  forceArray: function(value) {
    return this.isArray(value)? value : [value]
  },

  isArray: function(value) {
    return Array.isArray(value)
  },

  isArrayLike: function(collection) {
    var shallowLen = collection == null? void 0 : collection['length']
    return typeof shallowLen == 'number' && shallowLen >= 0
  },

  isDefined: function(value) {
    return typeof value !== 'undefined'
  },

  isEmpty: function(obj) {
    if (obj === null || typeof obj === 'undefined') return true
    for (let prop in obj) if (obj.hasOwnProperty(prop)) return false
    return true
  },

  isFunction: function(value) {
    return typeof value === 'function'? true : false
  },

  isId: function(value) {
    // True if value is a string or mongodb ObjectID()
    return this.isString(value) || (this.isObject(value) && value.get_inc)
  },

  isNumber: function(value) {
    return !isNaN(parseFloat(value)) && isFinite(value)
  },

  isObject: function(value) {
    // Excludes null and array's
    return value !== null
      && typeof value === 'object'
      && !(value instanceof Array)
      ? true : false
  },

  isObjectAndNotID: function(value) {
    // A true object that is not an id, i.e. mongodb ObjectID()
    return this.isObject(value) && !value.get_inc
  },

  isRegex: function(value) {
    return value instanceof RegExp? true : false
  },

  isSchema: function(value) {
    return !this.isSubdocument(value) && !this.isArray(value)
  },

  isString: function(value) {
    return (typeof value === 'string' || value instanceof String)? true : false
  },

  isSubdocument: function(value) {
    /**
     * Is the value a subdocument which contains more fields? Or a just a field definition?
     * Note: Passing { index: '2dsphere' } as a subdocument as this is used to denote a 2dsphere object index
     * @param {object} value - object to check
     *   E.g. isSubdocument = {
     *     first: { type: 'string' },
     *     last: { type: 'string' }
     *   }
     */
    if (!this.isObject(value)) return false
    for (let key in value) {
      if (key == 'index' && value[key] == '2dsphere') continue
      if (this.isObject(value[key]) || this.isArray(value[key])) continue
      return false
    }
    return true
  },

  isUndefined: function(value) {
    return typeof value === 'undefined'
  },

  omit: function(obj, keys) {
    let target = {}
    for (let i in obj) {
      if (keys.indexOf(i) >= 0) continue
      if (!Object.prototype.hasOwnProperty.call(obj, i)) continue
      target[i] = obj[i]
    }
    return target
  },

  parseDotNotation: function(obj) {
    /**
     * Mutates dot notation objects into a deep object
     * @param {object}
     */
    for (let key in obj) {
      if (key.indexOf(".") !== -1) recurse(key, obj[key], obj)
    }
    return obj
    function recurse(str, val, obj) {
      let parentObj = obj
      let grandparentObj = obj
      let keys = str.split(/\./)

      for (var i=0, l=Math.max(1, keys.length-1); i<l; ++i) {
        let key = keys[i]
        // If denoting an array, make sure parent is an array
        if (key.match(/^[0-9]+$/) && !Array.isArray(parentObj)) {
          parentObj = grandparentObj[keys[i-1]] = []
        }
        grandparentObj = parentObj
        parentObj = parentObj[key] = parentObj[key] || {}
      }

      parentObj[keys[i]] = val
      delete obj[str]
    }
  },

  parseFormData: function(obj) {
    /**
     * Mutates FormData (bracket notation) objects into a deep object
     * @param {object}
     * @return promise(data)
     * E.g. ['user']['name']
     * E.g. ['users'][0]['name']
     */
    return new Promise(res => {
      for (let key in obj) {
        if (key.match(/\[\]/)) throw 'Bracket notation data needs array index numbers, e.g. users[0][name]'
        if (key.indexOf("[") !== -1) recurse(key, obj[key], obj)
      }
      res(obj)
    })
    function recurse(str, val, obj) {
      let parentObj = obj
      let grandparentObj = obj
      let keys = str.replace(/]/g, '').split('[')

      for (var i=0, l=Math.max(1, keys.length-1); i<l; ++i) {
        // If denoting an array, make sure parent is an array
        if (keys[i].match(/^$|^[0-9]+$/) && !Array.isArray(parentObj)) {
          parentObj = grandparentObj[keys[i-1]] = []
        }
        let key = keys[i] === ''? parentObj.length : keys[i]
        grandparentObj = parentObj
        parentObj = parentObj[key] = parentObj[key] || {}
      }

      parentObj[keys[i]] = val
      delete obj[str]
    }
  },

  removeUndefined: (variable) => {
    // takes an array or object
    if (Array.isArray(variable)) {
      for (let l=variable.length; i--;) {
        if (variable[i] === undefined) variable.splice(i, 1)
      }
    } else {
      Object.keys(variable).forEach(key => {
        variable[key] === undefined && delete variable[key]
      })
    }
    return variable
  },

  runSeries: function(tasks, cb) {
    // Runs functions in series and calls the cb when done
    // @param {function(err, result)[]} tasks - array of functions
    // @param {function(err, results[])} <cb>
    // @return promise
    // @source https://github.com/feross/run-series
    var current = 0
    var results = []
    var isSync = true

    return new Promise((res, rej) => {
      function each(err, result) {
        results.push(result)
        if (++current >= tasks.length || err) done(err)
        else tasks[current](each)
      }
      function done(err) {
        if (isSync) process.nextTick(() => end(err))
        else end(err)
      }
      function end(err) {
        if (cb) cb(err, results)
        if (err) rej(err)
        else res(results)
      }
      if (tasks.length) tasks[0](each)
      else done(null)
      isSync = false
    })
  },

  toArray: function(variable) {
    // converts a variable to an array, if not already so
    if (typeof variable === 'undefined') return []
    return Array.isArray(variable)? variable : [variable]
  },

  ucFirst: function(string) {
    if (!string) return ''
    return string.charAt(0).toUpperCase() + string.slice(1)
  }

}
