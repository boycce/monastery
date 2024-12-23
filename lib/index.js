const Manager = require('./manager')
const rules = require('./rules.js')

// Exports
module.exports = new Manager('init')
module.exports.arrayWithSchema = Manager.prototype.arrayWithSchema
module.exports.getSignedUrl = Manager.prototype.getSignedUrl
module.exports.id = Manager.prototype.id
module.exports.isId = Manager.prototype.isId
module.exports.parseBracketNotation = Manager.prototype.parseBracketNotation
module.exports.parseBracketToDotNotation = Manager.prototype.parseBracketToDotNotation
module.exports.parseData = Manager.prototype.parseData
module.exports.parseDotNotation = Manager.prototype.parseDotNotation
module.exports.rules = rules
