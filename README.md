# pino-test

A set of API to easily test the Pino logger.

## Getting started
```sh
npm install pino-test --save-dev
```

```js
const test = require('node:test')
const pino = require('pino')
const pinoTest = require('pino-test')

test('pino should log a info message', async () => {
  const stream = pinoTest.sink()
  const logger = pino(stream)

  logger.info('hello world')

  const expected = { msg: 'hello world', level: 30 }
  await pinoTest.once(stream, expected)
})
```

Using tap
```js
const pino = require('pino')
const pinoTest = require('pino-test')

test('pino should log a info message on tap', async () => {
  const stream = pinoTest.sink()
  const logger = pino(stream)

  logger.info('hello world')

  const expected = { msg: 'hello world', level: 30 }
  await pinoTest.once(stream, expected)
})

// with a own assert function
test('pino should log a info message using a own assert function', async ({ same }) => {
  const stream = pinoTest.sink()
  const logger = pino(stream)

  logger.info('hello world')

  const expected = { msg: 'hello world', level: 30 }
  await pinoTest.once(stream, expected, same)
})
```

Using jest

```js
const pino = require('pino')
const pinoTest = require('pino-test')

test('pino should log a info message on jest', async () => {
  const stream = pinoTest.sink()
  const logger = pino(stream)

  logger.info('hello world')
  logger.info('hi world')

  const expected = [
    { msg: 'hello world', level: 30 },
    { msg: 'hi world', level: 30 }
  ]
  await pinoTest.consecutive(stream, expected)
})

// with a own assert function
function is (received, expected, msg) {
  expect(received).toStrictEqual(expected)
}

test('pino should log a info message using a own assert function on jest', async () => {
  const stream = pinoTest.sink()
  const logger = pino(stream)

  logger.info('hello world')
  logger.info('hi world')

  const expected = [
    { msg: 'hello world', level: 30 },
    { msg: 'hi world', level: 30 }
  ]
  await pinoTest.consecutive(stream, expected, is)
})
```

## API

* [sink()](#sink)
* [once()](#once)
* [consecutive()](#consecutive)

<a id="sink"></a>
### `pinoTest.sink({ destroyOnError = false, emitErrorEvent = false }) => Transform`
Create a Pino destination stream to easily inspect the logs processed by Pino.

```js
const pino = require('pino')
const pinoTest = require('pino-test')

const stream = pinoTest.sink()
const logger = pino(stream)

logger.info('hello world')

stream.once('data', (data) => {
  console.log(chunk.msg) // 'hello world'
  console.log(chunk.level) // 30
})
```
Destroy the stream on error
```js
const pino = require('pino')
const pinoTest = require('pino-test')

const stream = pinoTest.sink({ destroyOnError: true })
stream.write('helloworld')
stream.end()

stream.once('close', () => {
  console.log('close event') // "close event"
})
```
Destroy and send error event on error
```js
const pino = require('pino')
const pinoTest = require('pino-test')

const stream = pinoTest.sink({ destroyOnError = false, emitErrorEvent = false })
stream.write('helloworld')
stream.end()

stream.on('error', (err) => {
  console.log(err) // Unexpected token h in JSON at position 0
})

stream.on('close', () => {
  console.log('close event') // "close event"
})
```
Send error event on error
```js
const pino = require('pino')
const pinoTest = require('pino-test')

const stream = pinoTest.sink({ emitErrorEvent = false })
stream.write('helloworld')
stream.end()

stream.on('error', (err) => {
  console.log(err) // Unexpected token h in JSON at position 0
})
```
<a id="once"></a>
### `once(stream, expected, is) => Promise<void>`
Assert that a single log is expected.
The function internally
- assert log message `time` is less than or equal to the current time
- assert log message `pid` matches the current process id
- assert log message `hostname` matches the current hostname
- uses the default `deepStrictEqual` assert function of the `node:assert` module.

```js
const pino = require('pino')
const pinoTest = require('pino-test')

const stream = pinoTest.sink()
const logger = pino(stream)

logger.info('hello world')

const expected = { msg: 'hello world', level: 30 }
await pinoTest.once(stream, expected) // doesn't throw a diff error
await pinoTest.once(stream, { msg: 'bye world', level: 30 }) // throw a diff error

// OR logging an object
logger.info({ hello: 'world', hi: 'world' })
await pinoTest.once(stream, { hello: 'world', hi: 'world', level: 30 }) // doesn't throw a diff error
await pinoTest.once(stream, { hello: 'world', level: 30 }) // throw a diff error

// OR using a custom assert function
function is (received, expected, msg) {
  if (received.msg !== expected.msg) {
    throw new Error(`expected msg ${expected.msg} doesn't match the received one ${received.msg}`)
  }
}

await pinoTest.once(stream, expected, is) // doesn't throw an error
await pinoTest.once(stream, { msg: 'bye world', level: 30 }, is) // throw an error
```
<a id="consecutive"></a>
### `consecutive(stream, expected, is) => Promise<void>`
Assert that consecutive logs are expected.
The function internally
- assert log message `time` is less than or equal to the current time
- assert log message `pid` matches the current process id
- assert log message `hostname` matches the current hostname
- uses the default `deepStrictEqual` assert function of the `node:assert` module.

```js
const pino = require('pino')
const pinoTest = require('pino-test')

const stream = pinoTest.sink()
const logger = pino(stream)

logger.info('hello world')
logger.info('hi world')

const expected = [
  { msg: 'hello world', level: 30 },
  { msg: 'hi world', level: 30 }
]

await pinoTest.consecutive(stream, expected) // doesn't throw a diff error
await pinoTest.consecutive(stream, [{ msg: 'bye world', level: 30 }]) // throw a diff error

// OR logging an object
logger.info({ hello: 'world' })
logger.info({ hi: 'world' })
await pinoTest.consecutive(stream, [
  { hello: 'world', level: 30 },
  { hi: 'world', level: 30 }
])

// OR using a custom assert function
function is (received, expected, msg) {
  if (received.msg !== expected.msg) {
    throw new Error(`expected msg ${expected.msg} doesn't match the received one ${received.msg}`)
  }
}

await pinoTest.consecutive(stream, expected, is) // doesn't throw an error
await pinoTest.consecutive(stream, [{ msg: 'bye world', level: 30 }], is) // throw an error
```