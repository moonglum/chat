// TODO: Switch from pub/sub to Redis Streams
// TODO: Render all existing messages in the index action
let path = require('path')

let express = require('express')
let app = express()
let bodyParser = require('body-parser')
let cons = require('consolidate')

let Redis = require('ioredis')

app.set('views', path.resolve('views'))
app.engine('mustache', cons.mustache)
app.set('view engine', 'mustache')
app.use(bodyParser.urlencoded({ extended: false }))
app.use(express.static(path.resolve('public')))

app.get('/', function (req, res) {
  res.render('index')
})

let publisher = new Redis()
app.post('/messages', function (req, res) {
  let { message } = req.body
  publisher.publish('updates', message)
  res.redirect('/')
})

app.get('/update-stream', function (req, res) {
  let messageCount = 0
  let subscriber = new Redis()

  subscriber.subscribe('updates')

  subscriber.on('message', (channel, message) => {
    messageCount++
    res.write(`id: ${messageCount}\n`)
    // We will use the same partial here that we use to render the items on the server side
    res.write(`data: <strong>Unknown User:</strong> ${message} \n\n`)
  })

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  })
  res.write('\n')

  res.on('close', () => {
    subscriber.unsubscribe()
    subscriber.disconnect()
  })
})

app.listen(8000)
console.log('App listening on 8000')
