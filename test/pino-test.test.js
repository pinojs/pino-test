'use strict'

const { describe, mock, test } = require('node:test')
const assert = require('node:assert')
const { once } = require('node:events')
const pino = require('pino')
const pinoTest = require('../pino-test.js')

function is (received, expected, msg) {
  if (received.msg !== expected.msg) {
    throw new Error(`expected msg ${expected.msg} doesn't match the received one ${received.msg}`)
  }
}

describe('sink', () => {
  test('sink should pass', async () => {
    const stream = pinoTest.sink()
    stream.write('{"hello":"world"}\n')
    stream.write('{"hi":"world"}\n')
    stream.end()

    const expected = [
      { hello: 'world' },
      { hi: 'world' }
    ]

    let i = 0
    for await (const chunk of stream) {
      assert.deepEqual(chunk, expected[i])
      i++
    }
  })

  test('sink should pass with invalid json', async () => {
    const stream = pinoTest.sink()
    stream.write('helloworld')
    stream.end()
  })

  test('sink should destroy stream with invalid json', async () => {
    const stream = pinoTest.sink({ destroyOnError: true })
    stream.write('helloworld')
    stream.end()

    await once(stream, 'close')
  })

  test('sink should emit a stream error event with invalid json', async () => {
    const stream = pinoTest.sink({ emitErrorEvent: true })
    stream.write('helloworld')

    stream.on('error', (err) => {
      assert.match(err.message, /Unexpected token/)
    })

    stream.end()
  })

  test('sink should emit a stream error event and destroy the stream with invalid json', async () => {
    const stream = pinoTest.sink({ destroyOnError: true, emitErrorEvent: true })
    stream.write('helloworld')

    stream.on('error', (err) => {
      assert.match(err.message, /Unexpected token/)
    })

    stream.end()

    await once(stream, 'close')
  })
})

describe('once', () => {
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

    await assert.rejects(
      pinoTest.once(stream, expected),
      /Expected values to be strictly deep-equal:/
    )
  })

  test('once should pass with own assert function', async () => {
    const stream = pinoTest.sink()
    const instance = pino(stream)

    instance.info('hello world')

    const expected = { msg: 'hello world', level: 30 }
    await pinoTest.once(stream, expected, is)
  })

  test('once should calls own assert function once', async () => {
    const stream = pinoTest.sink()
    const instance = pino(stream)
    const customAssertFunction = mock.fn(is)

    instance.info('hello world')

    const expected = { msg: 'hello world', level: 30 }
    await pinoTest.once(stream, expected, customAssertFunction)
    assert.strictEqual(customAssertFunction.mock.calls.length, 1)
  })

  test('once should rejects with assert diff error', async () => {
    const stream = pinoTest.sink()
    const instance = pino(stream)

    instance.info('hello world')

    const expected = { msg: 'by world', level: 30 }

    await assert.rejects(
      pinoTest.once(stream, expected),
      /Expected values to be strictly deep-equal:/
    )
  })

  test('once should rejects with assert diff error and own assert function', async () => {
    const stream = pinoTest.sink()
    const instance = pino(stream)

    instance.info('hello world')

    const expected = { msg: 'by world', level: 30 }

    await assert.rejects(
      pinoTest.once(stream, expected, is),
      new Error('expected msg by world doesn\'t match the received one hello world')
    )
  })

  test('once should pass with a callback', async () => {
    const stream = pinoTest.sink()
    const instance = pino(stream)

    instance.info('hello world')

    await pinoTest.once(stream, (received) => {
      assert.strictEqual(received.msg, 'hello world')
    })
  })

  test('once should reject with a callback', async () => {
    const stream = pinoTest.sink()
    const instance = pino(stream)

    instance.info('hello world')

    await assert.rejects(
      pinoTest.once(stream, (received) => {
        assert.strictEqual(received.msg, 'hi world')
      }),
      /Expected values to be strictly equal:/
    )
  })

  test('once should ignore the passed custom assert function', async () => {
    const stream = pinoTest.sink()
    const instance = pino(stream)

    instance.info('hello world')

    await pinoTest.once(stream, (received) => {
      assert.strictEqual(received.msg, 'hello world')
    }, is)
  })

  test('once should ignore the passed custom assert function with a callback assert error', async () => {
    const stream = pinoTest.sink()
    const instance = pino(stream)

    instance.info('hello world')

    await assert.rejects(
      pinoTest.once(stream, (received) => {
        assert.strictEqual(received.msg, 'hi world')
      }, is),
      /Expected values to be strictly equal:/
    )
  })
})

describe('consecutive', () => {
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

    await assert.rejects(
      pinoTest.consecutive(stream, expected),
      /Expected values to be strictly deep-equal:/
    )
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

  test('consecutive should calls the own assert function twice', async () => {
    const stream = pinoTest.sink()
    const instance = pino(stream)
    const customAssertFunction = mock.fn(is)

    instance.info('hello world')
    instance.info('hi world')

    const expected = [
      { msg: 'hello world', level: 30 },
      { msg: 'hi world', level: 30 }
    ]
    await pinoTest.consecutive(stream, expected, customAssertFunction)
    assert.strictEqual(customAssertFunction.mock.calls.length, 2)
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

    await assert.rejects(
      pinoTest.consecutive(stream, expected),
      /Expected values to be strictly deep-equal:/
    )
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

    await assert.rejects(
      pinoTest.consecutive(stream, expected, is),
      new Error('expected msg by world doesn\'t match the received one hi world')
    )
  })

  test('consecutive should reject if the stream ended before matching all logs', async () => {
    const stream = pinoTest.sink()
    const instance = pino(stream)

    instance.info('hello world')

    const expected = [
      { msg: 'hello world', level: 30 },
      { msg: 'hi world', level: 30 }
    ]
    stream.end()
    await assert.rejects(pinoTest.consecutive(stream, expected), new Error('Stream ended before all expected logs were received'))
  })

  test('consecutive should pass with a callback', async () => {
    const stream = pinoTest.sink()
    const instance = pino(stream)

    instance.info('hello world')
    instance.info('hi world')

    await pinoTest.consecutive(stream, [
      { msg: 'hello world', level: 30 },
      (received) => {
        assert.strictEqual(received.msg, 'hi world')
      }
    ])
  })

  test('consecutive should reject with a callback', async () => {
    const stream = pinoTest.sink()
    const instance = pino(stream)

    instance.info('hello world')
    instance.info('hi world')

    await assert.rejects(
      pinoTest.consecutive(stream, [
        { msg: 'hello world', level: 30 },
        (received) => {
          assert.strictEqual(received.msg, 'hello world')
        }
      ]),
      /Expected values to be strictly equal:/
    )
  })

  test('consecutive should ignore the passed custom assert function', async () => {
    const stream = pinoTest.sink()
    const instance = pino(stream)

    instance.info('hello world')
    instance.info('hi world')

    await pinoTest.consecutive(stream, [
      { msg: 'hello world', level: 30 },
      (received) => {
        assert.strictEqual(received.msg, 'hi world')
      }
    ], is)
  })

  test('consecutive should ignore the passed custom assert function with a callback assert error', async () => {
    const stream = pinoTest.sink()
    const instance = pino(stream)

    instance.info('hello world')
    instance.info('hi world')

    await assert.rejects(
      pinoTest.consecutive(stream, [
        { msg: 'hello world', level: 30 },
        (received) => {
          assert.strictEqual(received.msg, 'hello world')
        }
      ], is),
      /Expected values to be strictly equal:/
    )
  })
})
