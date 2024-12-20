const Manager = require('./manager')
const inherits = require('util').inherits
const rules = require('./rules.js')

function Monastery() {
  let hasDefaultManager = false

  this.manager = function(uri, opts) {
    const manager = new Manager(uri, opts)
    // Inherit the default manager onto Monastery once
    if (!hasDefaultManager) {
      hasDefaultManager = true
      Object.assign(this, manager)
    }
    return manager
  }
}

// Inherit Manager prototypes onto Monastery
inherits(Monastery, Manager)

// Exports
module.exports = new Monastery()
module.exports.arrayWithSchema = Manager.prototype.arrayWithSchema
module.exports.getSignedUrl = Manager.prototype.getSignedUrl
module.exports.id = Manager.prototype.id
module.exports.isId = Manager.prototype.isId
module.exports.parseBracketNotation = Manager.prototype.parseBracketNotation
module.exports.parseBracketToDotNotation = Manager.prototype.parseBracketToDotNotation
module.exports.parseData = Manager.prototype.parseData
module.exports.parseDotNotation = Manager.prototype.parseDotNotation
module.exports.rules = rules
