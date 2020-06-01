const Redis = require('ioredis')

foo()

Redis.Command.setReplyTransformer('xread', xreadResultParser)

async function foo () {
  const subscriber = new Redis('redis://redis:6379')

  let lastId = '$'
  while (true) {
    // The timeout is set to 0 to wait indefinitely
    const { messages } = await subscriber.xread('block', 0, 'STREAMS', 'messages', lastId)
    messages.forEach(message => {
      lastId = message.id
      console.log(message)
    })
  }
}

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

function arrayToObject (arr) {
  const result = {}
  for (let i = 0; i < arr.length; i += 2) {
    const key = arr[i]
    const value = arr[i + 1]
    result[key] = value
  }
  return result
}
