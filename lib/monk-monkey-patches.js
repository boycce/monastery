let MongoClient = require('mongodb').MongoClient
let STATE = {
  CLOSED: 'closed',
  OPENING: 'opening',
  OPEN: 'open'
}

module.exports.open = function(uri, opts, fn) {
  /*
   * Monkey patch to remove db event listener warnings
   * @todo remove when monk is removed
   * @see https://www.mongodb.com/community/forums/t/node-44612-deprecationwarning-listening-to-events-on-
       the-db-class-has-been-deprecated-and-will-be-removed-in-the-next-major-version/15849/4
   */
  MongoClient.connect(uri, opts, function (err, client) {
    // this = Manager
    if (err) {
      this._state = STATE.CLOSED
      this.emit('error-opening', err)
    } else {
      this._state = STATE.OPEN

      this._client = client
      this._db = client.db()

      // set up events
      var self = this
      ;['authenticated', 'close', 'error', 'parseError', 'timeout'].forEach(function (eventName) {
        self._client.on(eventName, function (e) {
          self.emit(eventName, e)
        })
      })

      this.emit('open', this._db)
    }
    if (fn) {
      fn(err, this)
    }
  }.bind(this))
}

module.exports.then = function (fn) {
  /*
   * Unfortuantly db.then doesn't run after the promise has been fulfilled, this fixes this issue.
   * @see https://github.com/Automattic/monk/blob/master/lib/manager.js#L194
   */
  return new Promise(function (resolve, reject) {
    if (this._state == STATE.OPEN) {
      resolve()
    } else if (this._state == STATE.CLOSED) {
      reject()
    } else {
      this.once('open', resolve)
      this.once('error-opening', reject)
    }
  }.bind(this)).then(fn.bind(null, this))
}

module.exports.findOneAndUpdate = function(query, update, opts, fn) {
  /*
   * Monkey patch to use returnDocument
   * @todo remove when monk is removed
   * @see https://github.com/Automattic/monk/blob/master/lib/collection.js#L265
   */
  // this = model
  if (typeof opts === 'function') {
    fn = opts
    opts = {}
  }
  return this._dispatch(function findOneAndUpdate(args) {
    var method = 'findOneAndUpdate'
    if (typeof (args.options || {}).returnDocument === 'undefined') {
      args.options.returnDocument = 'after'
    }
    if (args.options.replaceOne | args.options.replace) {
      method = 'findOneAndReplace'
    }
    return args.col[method](args.query, args.update, args.options)
      .then(function (doc) {
        if (doc && typeof doc.value !== 'undefined') {
          return doc.value
        }
        if (doc.ok && doc.lastErrorObject && doc.lastErrorObject.n === 0) {
          return null
        }
        return doc
      })
  })({options: opts, query: query, update: update, callback: fn}, 'findOneAndUpdate')
}

