const monastery = require('../lib/index.js')
const mongoose = require('mongoose') // very slow initialisation

test('comparison insert', async () => {
  const db = monastery('127.0.0.1/monastery', { timestamps: false }) 
  const Test1 = db.model('Test1', { fields: {
    raw: {
      words: [{
        id: { type: 'number' },
        isVertical: { type: 'boolean' },
        text: { type: 'string' },
        confidence: { type: 'number' },
      }],
    },
  }})
  function getData() {
    return {
      words: Array(500).fill(0).map((_, i) => ({
        id: i,
        isVertical: i % 2 === 0,
        text: 'Test ' + i,
        confidence: Math.random(),
        sub: {
          greeting: 'Hello ' + i,
        },
      })),
    }
  }
  console.time('Monastery')
  for (let i = 0; i < 100; ++i) {
    const res = await Test1.insert({ data: { raw: getData() } })
    if (i == 50) console.log(res.raw.words[0])
  }
  console.timeEnd('Monastery') // 320ms =50,  935ms =500
  db.close()

  
  await mongoose.connect('mongodb://127.0.0.1:27017/mongoose_test')
  const schema = new mongoose.Schema({
    raw: {
      words: [{
        id: Number,
        isVertical: Boolean,
        text: String,
        confidence: Number,
      }],
    },
  })
  const Test2 = mongoose.model('Test2', schema)
  console.time('Mongoose')
  for (let i = 0; i < 100; ++i) {
    const res = await Test2.create({ raw: getData() })
    if (i == 50) console.log(res.raw.words[0])
  }
  console.timeEnd('Mongoose') // 1202ms =50, 9203ms =500
  //result: monastery is 4.5-10x faster than mongoose
}, 20000)

test('comparison validate', async () => {
  function getData() {
    return {
      words: Array(5000).fill(0).map((_, i) => ({
        id: i,
        isVertical: i % 2 === 0,
        // text: 'Test ' + i,
        confidence: Math.random(),
        sub: {
          greeting: 'Hello ' + i,
        },
      })),
    }
  }
  const db = monastery('127.0.0.1/monastery', { timestamps: false }) 
  const Test1 = db.model('Test1', { fields: {
    raw: {
      words: [{
        id: { type: 'number' },
        isVertical: { type: 'boolean' },
        text: { type: 'string', default: 'hi'},
        confidence: { type: 'number' },
        sub: {
          greeting: { type: 'string' },
        },
      }],
    },
  }})
  const data1 = getData()
  console.time('Monastery')
  const test1 = await Test1.validate({
    raw: data1,
  })
  console.log(test1.raw.words[0])
  console.timeEnd('Monastery') // 59ms =5000, 495ms =50000  

  await mongoose.connect('mongodb://127.0.0.1:27017/mongoose_test')
  const schema = new mongoose.Schema({
    raw: {
      words: [{
        id: Number,
        isVertical: Boolean,
        text: { type: String, default: 'hi' },
        confidence: Number,
        sub: {
          greeting: String,
        },
      }],
    },
  })
  const Test2 = mongoose.model('Test2', schema)

  const data2 = getData()
  console.time('Mongoose 1')
  const test2 = new Test2({ raw: data2 }) // calls validate too
  console.timeEnd('Mongoose 1') // 429ms =5000, 3722ms =50000
  console.time('Mongoose 2')
  test2.validateSync()
  console.timeEnd('Mongoose 2') // 284ms =5000, 2486ms =50000
  console.log(test2.raw.words[0])

  //result: monastery is 7.3x faster than mongoose
}, 20000)

