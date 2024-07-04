const { ObjectId } = require('mongodb')

module.exports = {

  cast: function(obj) {
    /**
     * Applies ObjectId casting to _id fields.
     * @param {Object} optional, query
     * @return {Object} query
     * @private
     */
    if (this.isArray(obj)) {
      return obj.map(this.cast.bind(this))
    }
    if (obj && typeof obj === 'object') {
      for (let k of Object.keys(obj)) {
        if (k == '_id' && obj._id) {
          if (obj._id.$in) obj._id.$in = obj._id.$in.map(this.id.bind(this))
          else if (obj._id.$nin) obj._id.$nin = obj._id.$nin.map(this.id.bind(this))
          else if (obj._id.$ne) obj._id.$ne = this.id(obj._id.$ne)
          else obj._id = this.id(obj._id)
        } else {
          obj[k] = this.cast(obj[k])
        }
      }
    }

    return obj
  },

  deepCopy: function(obj) {
    // Deep clones an object
    // v3.0.0 - MongoIds now remain as objects, not strings. 
    if (!obj) return obj
    let obj2 = Array.isArray(obj)? [] : {}
    for (let key in obj) {
      let v = obj[key]
      obj2[key] = (typeof v === 'object' && !this.isHex24(v))? this.deepCopy(v) : v //isHex24
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
  
  id: function(str) {
    /**
     * Casts to ObjectId
     * @param {string|ObjectId} str - string = hex string
     * @return {ObjectId}
     */
    if (str == null) return new ObjectId()
    return typeof str === 'string' ? ObjectId.createFromHexString(str) : str
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
    // Called from db.isId
    // True if value is a MongoDB ObjectId() or a valid id string
    if (ObjectId.isValid(value) && typeof value !== 'number') return true
    else return false
  },

  isHex24: (value) => {
    // Fast function to check if the length is exactly 24 and all characters are valid hexadecimal digits
    const str = (value||'').toString()
    if (str.length !== 24) return false
    else if (Array.isArray(value)) return false
    
    // Check if all characters are valid hexadecimal digits
    for (let i=24; i--;) {
      const charCode = str.charCodeAt(i)
      const isDigit = charCode >= 48 && charCode <= 57     // '0' to '9'
      const isLowerHex = charCode >= 97 && charCode <= 102 // 'a' to 'f'
      const isUpperHex = charCode >= 65 && charCode <= 70  // 'A' to 'F'
      if (!isDigit && !isLowerHex && !isUpperHex) {
        return false
      }
    }
    return true
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
    // A true object that is not an id, i.e. mongodb ObjectId()
    return this.isObject(value) && !ObjectId.isValid(value) // was value.get_inc
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
     * "are all fields objects/arrays?"
     * 
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

  omit: function(obj, fields) {
    const shallowCopy = Object.assign({}, obj)
    for (let i=0; i<fields.length; i+=1) {
      const key = fields[i]
      delete shallowCopy[key]
    }
    return shallowCopy
  },

  parseData: function(obj) {
    /**
     * Mutates dot notation objects, and then FormData (bracket notation) objects into a deep object
     * @param {object}
     * @return promise(data)
     */
    let data = this.parseDotNotation(obj)
    return this.parseFormData(data)
  },

  parseDotNotation: function(obj) {
    /**
     * Mutates dot notation objects into a deep object
     * @param {object}
     */
    if (!Object.keys(obj).find(o => o.indexOf('.') !== -1)) return obj
    let objCopy = this.deepCopy(obj) // maybe convert to JSON.parse(JSON.stringify(obj))

    for (let key in obj) {
      if (key.indexOf('.') !== -1) {
        setup(key, obj[key], obj)
      } else {
        // Ordinary values may of been updated by the bracket notation values, we are
        // reassigning, trying to preserve the order of keys (not always guaranteed in for loops)
        obj[key] = objCopy[key]
      }
    }
    return obj
    function setup(str, val, obj) {
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
    if (!Object.keys(obj).find(o => o.indexOf('[') !== -1)) return obj
    let objCopy = this.deepCopy(obj) // maybe convert to JSON.parse(JSON.stringify(obj))

    for (let key in obj) {
      if (key.match(/\[\]\[/i)) {
        throw new Error(`Monastery: Array items in bracket notation need array indexes "${key}", e.g. users[0][name]`)
      }
      if (key.indexOf('[') !== -1) {
        setup(key)
      } else {
        // Ordinary values may of been updated by the bracket notation values, we are
        // reassigning, trying to preserve the order of keys (not always guaranteed in for loops)
        obj[key] = objCopy[key]
      }
    }
    return obj
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

  pick: function(obj, keys) {
    // Similiar to underscore.pick
    // @param {string[] | regex[]} keys
    if (!this.isObject(obj) && !this.isFunction(obj)) return {}
    keys = this.toArray(keys)
    let res = {}
    for (let key of keys) {
      if (this.isString(key) && obj.hasOwnProperty(key)) res[key] = obj[key]
      if (this.isRegex(key)) {
        for (let key2 in obj) {
          if (obj.hasOwnProperty(key2) && key2.match(key)) res[key2] = obj[key2]
        }
      }
    }
    return res
  },

  removeUndefined: function(variable) {
    // takes an array or object
    if (Array.isArray(variable)) {
      for (let i=variable.length; i--;) {
        if (variable[i] === undefined) variable.splice(i, 1)
      }
    } else {
      Object.keys(variable).forEach(key => {
        variable[key] === undefined && delete variable[key]
      })
    }
    return variable
  },

  runSeries: function(tasks, hookName, data) {
    /*
     * Runs functions in series
     * @param {function(err, result)[]} tasks - array of functions
     * @param {string} <hookName> - e.g. 'afterFind'
     * @param {any} data - data to pass to the first function
     * @param {function(err, results[])} <cb>
     * @return promise
     * @this Model
     * @source https://github.com/feross/run-series
     */
    let current = 0
    let isSync = true
    let caller = (this.afterFindName || this.name) + '.' + hookName
    let lastDefinedResult = data

    return new Promise((res, rej) => {
      const next = (i, err, result) => { // aka next(err, data)
        if (i !== current) {
          this.manager.error(`Monastery ${caller} error: you cannot return a promise AND call next()`)
          return
        }
        current++
        if (!err && typeof result !== 'undefined') lastDefinedResult = result
        if (!err && current < tasks.length) callTask(current, lastDefinedResult)
        else done(err)
      }
      const done = (err) => {
        if (isSync) process.nextTick(() => end(err))
        else end(err)
      }
      const end = (err) => {
        if (err) rej(err)
        else res(lastDefinedResult)
      }
      const callTask = (i, data) => {
        const next2 = next.bind(null, i)
        const args = hookName.match(/remove/i)? [next2] : [data, next2]
        const res = tasks[i](...args)
        if (res instanceof Promise) {
          res.then((result) => next2(null, result)).catch((e) => next2(e))
        }
      }
      
      // Start
      if (!tasks.length) done(null)
      else callTask(current, lastDefinedResult)
      
      isSync = false
    })
  },

  setDeepValue: function(obj, path, value, onlyUndefined, onlyUndefinedNull, ignoreEmptyArrays) {
    /**
     * Sets deep value
     * @param {object} obj - mutated
     * @param {string} path
     * @param {any} value
     * @param {boolean} onlyUndefined - set value only if it's undefined
     * @param {boolean} onlyUndefinedNull - set value only if it's null or undefined
     * @param {boolean} ignoreEmptyArrays -  ignore empty arrays
     * @return obj
     */
    let chunks = path.split('.') //  ['pets', '$|0-9', 'dog']
    let target = obj
    for (let i=0, l=chunks.length; i<l; i++) {
      if (l === i+1) { // Last
        if (
          (!onlyUndefined && !onlyUndefinedNull) ||
          (onlyUndefinedNull && target[chunks[i]] == null) ||
          (onlyUndefined && typeof target[chunks[i]] == 'undefined')
        ) {
          target[chunks[i]] = value
        }
      } else {
        let isArray = chunks[i+1].match(/^[0-9$]+$/)
        let parentCopy = target[chunks[i]] || (isArray? [] : {})
        if (ignoreEmptyArrays && isArray && !parentCopy.length) break
        target = target[chunks[i]] = parentCopy
        // Recurse if we need to update all array items
        if (chunks[i+1] == '$') {
          for (let m=0, n=target.length; m<n; m++) {
            let newPath = chunks.slice(i+2).join('.')
            if (newPath) {
              this.setDeepValue(target[m], newPath, value, onlyUndefined, onlyUndefinedNull, ignoreEmptyArrays)
            }
          }
          break
        }
      }
    }
    return obj
  },

  setTimeoutPromise: function(ms) {
    return new Promise(res => setTimeout(res, ms))
  },

  toArray: function(variable) {
    // converts a variable to an array, if not already so
    if (typeof variable === 'undefined') return []
    return Array.isArray(variable)? variable : [variable]
  },

  ucFirst: function(string) {
    if (!string) return ''
    return string.charAt(0).toUpperCase() + string.slice(1)
  },

  wait: async function(ms) {
    return new Promise(res => setTimeout(res, ms))
  },
  
}
