const path = require('path')

const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const cons = require('consolidate')
const faker = require('faker')

const Redis = require('ioredis')
Redis.Command.setArgumentTransformer('xadd', xaddArgumentTransformer)
Redis.Command.setReplyTransformer('xread', xreadResultParser)

app.set('views', path.resolve('views'))
app.engine('mustache', cons.mustache)
app.set('view engine', 'mustache')
app.use(bodyParser.urlencoded({ extended: false }))
app.use(express.static(path.resolve('public')))

const producer = new Redis('redis://redis:6379')

// 10 is an arbitrary number
app.get('/', async function (req, res) {
  // TODO: Argument transformer and result parser
  // This is a weird way of getting the last 10 messages
  const user = faker.name.findName()
  let messages = await producer.xrevrange('messages', '+', '-', 'COUNT', 10)
  messages = messages.reverse()

  let lastId = '$'
  if (messages.length > 0) {
    lastId = messages[messages.length - 1][0]
  }

  // Get it into a shape that is compatible with mustache
  messages = messages.map(message => arrayToObject(message[1]))

  res.render('index', { messages, lastId, user })
})

app.post('/messages', function (req, res) {
  const { message, user } = req.body
  producer.xadd('messages', {
    id: '*', // The * means: Determine the ID yourself
    text: message,
    user: user
  })
  res.redirect('/')
})

// This parameter is written into the template by Node
app.get('/update-stream', async function (req, res) {
  const consumer = new Redis('redis://redis:6379')

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  })
  res.write('\n')

  // This doesn't help due to the infinite loop
  res.on('close', () => {
    consumer.disconnect()
  })

  let lastId = req.query.start || '$'
  while (true) {
    // TODO: Build an argument parser for xread?
    // The timeout is set to 0 to wait indefinitely. This probably has to be set to something different
    // so we can handle disconnecting clients
    const { messages } = await consumer.xread('block', 0, 'STREAMS', 'messages', lastId)
    messages.forEach(message => {
      lastId = message.id
      res.write(`id: ${message.id}\n`)
      // We will use the same partial here that we use to render the items on the server side
      res.write(`data: <strong>${message.user}:</strong> ${message.text} \n\n`)
    })
  }
})

app.listen(8000)
console.log('App listening on 8000')

// Clean up these methods
function xreadResultParser (results) {
  const x = {}
  results.forEach(result => {
    const y = []
    result[1].forEach(message => {
      const [id, foo] = message
      const parsedMessage = arrayToObject(foo)
      parsedMessage.id = id
      y.push(parsedMessage)
    })
    x[result[0]] = y
  })
  return x
}

function xaddArgumentTransformer (args) {
  if (args.length !== 2) {
    return args
  }

  const result = []

  const [stream, kv] = args
  result.push(stream)
  result.push(kv.id) // default to *?
  delete kv.id
  for (const key in kv) {
    result.push(key)
    result.push(kv[key])
  }

  return result
}

function arrayToObject (arr) {
  const result = {}
  for (let i = 0; i < arr.length; i += 2) {
    const key = arr[i]
    const value = arr[i + 1]
    result[key] = value
  }
  return result
}
