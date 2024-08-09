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

  deepFind: (obj, path) => {
    // Returns a nested value from a path URI e.g. user.books.1.title
    if (!obj) return undefined
    let last
    let chunks = (path || '').split('.')
    let target = obj
    for (let i = 0, l = chunks.length; i < l; i++) {
      last = l === i + 1
      if (!last && !target[chunks[i]]) break
      else target = target[chunks[i]]
    }
    return last ? target : undefined
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
     * Coverts dot notation objects, and then bracket notation objects (form data) into deep objects
     * @param {object} 
     * @return data
     */
    const data = this.parseDotNotation(obj)
    return this.parseBracketNotation(data)
  },

  parseDotNotation: function(obj) {
    /**
     * Converts dot notation field paths into deep objects
     * @param {object} obj - e.g. { 'deep.companyLogos2.1.logo': '' } (not mutated)
     * @return {object} - e.g. { deep: { companyLogos2: [{ logo: '' }] }}
     */
    if (!Object.keys(obj).some(key => key.includes('.'))) return obj
  
    const result = {}
  
    for (const key in obj) {
      if (key.includes('.')) {
        setValue(result, key.split('.'), obj[key])
      } else {
        result[key] = obj[key] // keep non-dot notation values
      }
    }
  
    function setValue(target, keys, value) {
      let current = target
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i]
        if (!current[key]) {
          current[key] = /^\d+$/.test(keys[i + 1]) ? [] : {}
        }
        current = current[key]
      }
      current[keys[keys.length - 1]] = value
    }
  
    return result
  },

  parseBracketNotation: function(obj) {
    /**
     * Converts bracket notation field paths (form data) into deep objects
     * @param {object} obj - e.g. { 'users[0][first]': 'Martin' } (not mutated)
     * @return {object} - e.g. { users: [{ first: 'Martin' }] }
     */
    if (!Object.keys(obj).some(key => key.includes('['))) return obj
  
    const result = {}
  
    for (const key in obj) {
      if (key.includes('[][')) {
        throw new Error(`Monastery: Array items in bracket notation need array indexes "${key}", e.g. users[0][name]`)
      }
      if (key.includes('[')) {
        // console.log(key, key.split(/[[\]]/).filter(Boolean), key.split(/[[\]]/))
        setValue(result, key.split(/[[\]]/).filter(Boolean), obj[key])
      } else {
        result[key] = obj[key] // keep non-dot notation values
      }
    }

    function setValue(target, keys, value) {
      let current = target
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i]
        if (!current[key]) {
          current[key] = /^\d+$/.test(keys[i + 1]) ? [] : {}
        }
        current = current[key]
      }
      current[keys[keys.length - 1]] = value
    }
  
    return result
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
    /**
     * Runs functions in series
     * 
     * @param {function(err, result)[]}  tasks - array of functions
     * @param {string}  hookName - e.g. 'afterFind'
     * @param {any}  data - data to pass to the first function
     * 
     * @return promise
     * @this Model
     * @source https://github.com/feross/run-series
     **/
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
