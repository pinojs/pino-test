/* global test */
const pino = require('pino')
const pinoTest = require('../../pino-test.js')

function is (received, expected, msg) {
  // eslint-disable-next-line no-undef
  expect(received).toStrictEqual(expected)
}

test('once should pass', async () => {
  const stream = pinoTest.sink()
  const instance = pino(stream)

  instance.info('hello world')

  const expected = { msg: 'hello world', level: 30 }
  await pinoTest.once(stream, expected)
})

test('once should pass with object', async () => {
  const stream = pinoTest.sink()
  const instance = pino(stream)

  instance.info({ hello: 'world' })

  const expected = { hello: 'world', level: 30 }
  await pinoTest.once(stream, expected)
})

test('once should rejects with object', async () => {
  const stream = pinoTest.sink()
  const instance = pino(stream)

  instance.info({ hello: 'world', hi: 'world' })

  const expected = { hello: 'world', level: 30 }

  // eslint-disable-next-line no-undef
  expect(() => pinoTest.once(stream, expected)).rejects.toThrow()
})

test('once should pass with own assert function', async () => {
  const stream = pinoTest.sink()
  const instance = pino(stream)

  instance.info('hello world')

  const expected = { msg: 'hello world', level: 30 }
  await pinoTest.once(stream, expected, is)
})

test('once should rejects with assert diff error', async () => {
  const stream = pinoTest.sink()
  const instance = pino(stream)

  instance.info('hello world')

  const expected = { msg: 'by world', level: 30 }

  // eslint-disable-next-line no-undef
  expect(() => pinoTest.once(stream, expected)).rejects.toThrow()
})

test('once should rejects with assert diff error and own assert function', async () => {
  const stream = pinoTest.sink()
  const instance = pino(stream)

  instance.info('hello world')

  const expected = { msg: 'by world', level: 30 }

  // eslint-disable-next-line no-undef
  expect(() => pinoTest.once(stream, expected, is)).rejects.toThrow()
})

test('consecutive should pass', async () => {
  const stream = pinoTest.sink()
  const instance = pino(stream)

  instance.info('hello world')
  instance.info('hi world')

  const expected = [
    { msg: 'hello world', level: 30 },
    { msg: 'hi world', level: 30 }
  ]
  await pinoTest.consecutive(stream, expected)
})

test('consecutive should pass with object', async () => {
  const stream = pinoTest.sink()
  const instance = pino(stream)

  instance.info({ hello: 'world' })
  instance.info({ hi: 'world' })

  const expected = [
    { hello: 'world', level: 30 },
    { hi: 'world', level: 30 }
  ]
  await pinoTest.consecutive(stream, expected)
})

test('consecutive should rejects with object', async () => {
  const stream = pinoTest.sink()
  const instance = pino(stream)

  instance.info({ hello: 'world' })
  instance.info({ hello: 'world', hi: 'world' })

  const expected = [
    { hello: 'world', level: 30 },
    { hi: 'world', level: 30 }
  ]

  // eslint-disable-next-line no-undef
  expect(() => pinoTest.consecutive(stream, expected)).rejects.toThrow()
})

test('consecutive should pass with own assert function', async () => {
  const stream = pinoTest.sink()
  const instance = pino(stream)

  instance.info('hello world')
  instance.info('hi world')

  const expected = [
    { msg: 'hello world', level: 30 },
    { msg: 'hi world', level: 30 }
  ]
  await pinoTest.consecutive(stream, expected, is)
})

test('consecutive should rejects with assert diff error', async () => {
  const stream = pinoTest.sink()
  const instance = pino(stream)

  instance.info('hello world')
  instance.info('hi world')

  const expected = [
    { msg: 'hello world', level: 30 },
    { msg: 'by world', level: 30 }
  ]

  // eslint-disable-next-line no-undef
  expect(() => pinoTest.consecutive(stream, expected)).rejects.toThrow()
})

test('consecutive should rejects with assert diff error and own assert function', async () => {
  const stream = pinoTest.sink()
  const instance = pino(stream)

  instance.info('hello world')
  instance.info('hi world')

  const expected = [
    { msg: 'hello world', level: 30 },
    { msg: 'by world', level: 30 }
  ]

  // eslint-disable-next-line no-undef
  expect(() => pinoTest.consecutive(stream, expected, is)).rejects.toThrow()
})
