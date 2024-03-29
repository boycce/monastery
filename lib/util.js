let ObjectId = require('mongodb').ObjectId

module.exports = {

  deepCopy: function(obj) {
    // Deep clones an object
    if (!obj) return obj
    let obj2 = Array.isArray(obj)? [] : {}
    for (let key in obj) {
      let v = obj[key]
      if (this.isId(v)) obj2[key] = v.toString()
      else obj2[key] = (typeof v === 'object')? this.deepCopy(v) : v
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
    // Called from db.isId
    // True if value is a MongoDB ObjectID() or a valid id string
    if (this.isObject(value) && value.get_inc) return true
    else if (value && this.isString(value) && ObjectId.isValid(value)) return true
    else return false
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
    return this.parseFormData(this.parseDotNotation(obj))
  },

  parseDotNotation: function(obj) {
    /**
     * Mutates dot notation objects into a deep object
     * @param {object}
     */
    let original = this.deepCopy(obj)
    for (let key in obj) {
      if (key.indexOf('.') !== -1) {
        recurse(key, obj[key], obj)
      } else {
        // Ordinary values may of been updated by the bracket notation values, we are
        // reassigning, trying to preserve the order of keys (not always guaranteed in for loops)
        obj[key] = original[key]
      }
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
    let original = this.deepCopy(obj)
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
        if (key.match(/\[\]\[/i)) {
          throw `Array items in bracket notation need array indexes "${key}", e.g. users[0][name]`
        }
        if (key.indexOf('[') !== -1) {
          setup(key)
        } else {
          // Ordinary values may of been updated by the bracket notation values, we are
          // reassigning, trying to preserve the order of keys (not always guaranteed in for loops)
          obj[key] = original[key]
        }
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

  runSeries: function(tasks, cb) {
    /*
     * Runs functions in series and calls the cb when done
     * @param {function(err, result)[]} tasks - array of functions
     * @param {function(err, results[])} <cb>
     * @return promise
     * @source https://github.com/feross/run-series
     */
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
