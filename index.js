const path = require('path')

const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const cons = require('consolidate')
const { faker } = require('@faker-js/faker')

const Redis = require('ioredis')
Redis.Command.setArgumentTransformer('xadd', xaddArgumentTransformer)
Redis.Command.setReplyTransformer('xread', xreadResultParser)

const port = process.env.PORT || '8000'
const redisURL = process.env.REDIS_URL || 'redis://localhost:6379'

app.set('views', path.resolve('views'))
app.engine('mustache', cons.mustache)
app.set('view engine', 'mustache')
app.use(bodyParser.urlencoded({ extended: false }))
app.use(express.static(path.resolve('public')))

const redis = new Redis(redisURL)

app.get('/', async function (req, res) {
  const user = faker.name.fullName()

  try {
    // TODO: Argument transformer and result parser
    // This is a weird way of getting the last 10 messages
    // also: 10 is an arbitrary number
    let messages = await redis.xrevrange('messages', '+', '-', 'COUNT', 10)
    messages = messages.reverse()

    let lastId = '$'
    if (messages.length > 0) {
      lastId = messages[messages.length - 1][0]
    }

    // Get it into a shape that is compatible with mustache
    messages = messages.map(message => arrayToObject(message[1]))

    res.render('index', { messages, lastId, user })
  } catch (err) {
    console.error(err)
    res.end('Error')
  }
})

app.post('/messages', async function (req, res) {
  const { message, user } = req.body
  try {
    await redis.xadd('messages', {
      id: '*', // The * means: Determine the ID yourself
      text: message,
      user
    })
  } catch (err) {
    console.error(err)
  }
  res.redirect('/')
})

// This parameter is written into the template by Node
app.get('/update-stream', function (req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  })
  res.write('\n')

  let lastId = req.query.start || '$'
  const intervalID = setInterval(async () => {
    try {
      const result = await redis.xread('STREAMS', 'messages', lastId)
      if (result && result.messages) {
        result.messages.forEach(message => {
          lastId = message.id
          res.write(`id: ${message.id}\n`)
          // We will use the same partial here that we use to render the items on the server side
          res.write(`data: <strong>${message.user}:</strong> ${message.text} \n\n`)
        })
      }
    } catch (err) {
      console.error(err)
    }
  }, 100)

  res.on('close', () => {
    clearInterval(intervalID)
  })
})

app.listen(port)
console.log(`App listening on ${port}`)

// XXX Clean up these methods
function xreadResultParser (results) {
  if (!results) {
    return null
  }
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
