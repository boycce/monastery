module.exports = function(monastery, opendb) {

  test('Monk conflicts', async () => {
    // Setup
    let db = (await opendb(false)).db
    let monkdb = require('monk')(':badconnection', () => {})
    db.model('user', { fields: {} })
    let modelNamedConnected = db.model('connected', { fields: {} })

    // Any of our monastery properties already exist on the manager?
    for (let name of ['connected', 'debug', 'log', 'model', 'models']) {
      expect(monkdb).not.toHaveProperty(name)
    }

    // Model without a name conflict is added to manager[model]
    expect(db.user).toEqual(expect.any(Object))

    // Model with a name conflict is only added to manager.model[name]
    expect(db.connected).toEqual(db.connected)
    expect(db.model.connected).toEqual(modelNamedConnected)

    // Close test since monk(uri) awaits upoin a connection (Update, done not needed in latest jest)
    // done()
  })

  test('Monastery connect with promise', (done) => {
    let db = monastery('localhost/monastery', { serverSelectionTimeoutMS: 2000 })

    db.then(db => {
      expect(db).toEqual(expect.any(Object))
      db.close()
      done()

    }).catch(err => {
      console.error(err)
      done()
    })
  })

}
