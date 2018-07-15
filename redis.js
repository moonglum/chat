let Redis = require('ioredis')

foo()

Redis.Command.setReplyTransformer('xread', xreadResultParser)

async function foo () {
  let subscriber = new Redis('redis://redis:6379')

  let lastId = '$'
  while (true) {
    // The timeout is set to 0 to wait indefinitely
    let { messages } = await subscriber.xread('block', 0, 'STREAMS', 'messages', lastId)
    messages.forEach(message => {
      lastId = message.id
      console.log(message)
    })
  }
}

function xreadResultParser (results) {
  let x = {}
  results.forEach(result => {
    let y = []
    result[1].forEach(message => {
      let [id, foo] = message
      let parsedMessage = arrayToObject(foo)
      parsedMessage.id = id
      y.push(parsedMessage)
    })
    x[result[0]] = y
  })
  return x
}

function arrayToObject (arr) {
  let result = {}
  for (let i = 0; i < arr.length; i += 2) {
    let key = arr[i]
    let value = arr[i + 1]
    result[key] = value
  }
  return result
}
