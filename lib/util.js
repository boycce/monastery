module.exports = {

  deepCopy: function(obj) {
    // Deep clones an object
    if (!obj) return obj
    let obj2 = Array.isArray(obj)? [] : {}
    for (let key in obj) {
      let v = obj[key]
      if (this.isId(v)) obj2[key] = v.toString()
      else obj2[key] = (typeof v === "object")? this.deepCopy(v) : v
    }
    return obj2
  },

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

  inArray: (array, key, value) => {
    /**
     * Property match inside an array of objects
     * (For a string/number value check just use [].includes(x))
     * @param {string} <key> - optional to match across on a colleciton of objects
     * @param {any} value
     */
    if (!array || typeof key == 'undefined') return false
    if (typeof value == 'undefined') return array.includes(key)
    for (let i = array.length; i--;) {
      if (array[i] && array[i].hasOwnProperty(key) && array[i][key] == value) return array[i]
    }
    return false
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
    return !this.isSubdocument(value) && !this.isArray(value) && typeof value !== 'string'
  },

  isString: function(value) {
    return (typeof value === 'string' || value instanceof String)? true : false
  },

  isSubdocument: function(value) {
    /**
     * Is the value a subdocument which contains more fields? Or a just a field definition?
     * @param {object} value - object to check
     *   E.g. isSubdocument = {
     *     first: { type: 'string' },
     *     last: { type: 'string' }
     *   }
     */
    if (!this.isObject(value)) return false
    for (let key in value) {
      let v = value[key]
      if (key == 'index' && this.isSubdocument2dsphere({ index: v })) continue
      if (this.isObject(v) || this.isArray(v)) continue
      return false
    }
    return true
  },

  isSubdocument2dsphere: function(value) {
    /**
     * Index 2dsphere implies that the parent object is a subdocument
     * @return index value
     */
    if (value.index == '2dsphere') return '2dsphere'
    else if (this.isObject(value.index) && value.index.type == '2dsphere') return value.index
    else return false
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
     * E.g. ['user']['petnames'][0]
     * E.g. ['users'][0]['name']
     */
    return new Promise(res => {
      for (let key in obj) {
        if (key.match(/\[\]\[/i)) throw `Array items in bracket notation need array indexes "${key}", e.g. users[0][name]`
        if (key.indexOf("[") !== -1) setup(key)
      }
      res(obj)
    })
    function setup(path) {
      let parent = obj
      let grandparent = obj
      let chunks = path.replace(/]/g, '').split('[')
      for (var i=0, l=chunks.length; i<l; ++i) {
        // If denoting an array, make sure parent is an array
        if (chunks[i].match(/^$|^[0-9]+$/) && !Array.isArray(parent)) {
          parent = grandparent[chunks[i-1]] = []
        }
        if (i !== l-1) {
          grandparent = parent
          parent = parent[chunks[i]] = parent[chunks[i]] || {}
        } else {
          parent[chunks[i]] = obj[path]
        }
      }
      delete obj[path]
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

  setDeepValue: function(obj, path, value, onlyUndefined) {
    /**
     * Sets deep value
     * @param {object} obj
     * @param {string} path
     * @param {any} value
     * @param {boolean} onlyUndefined - set value only if it's undefined
     * @return obj
     */
    let chunks = path.split('.')
    let target = obj
    for (let i=0, l=chunks.length; i<l; i++) {
      if (l === i+1) { // Last
        if (!onlyUndefined || (onlyUndefined && typeof target[chunks[i]] == 'undefined')) {
          target[chunks[i]] = value
        }
      } else {
        let isArray = chunks[i+1].match(/^[0-9]+$/)
        let parentCopy = target[chunks[i]] || (isArray? [] : {})
        target = target[chunks[i]] = parentCopy
      }
    }
    return obj
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
