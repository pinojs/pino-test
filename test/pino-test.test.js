'use strict'

const { describe, mock, test } = require('node:test')
const assert = require('node:assert')
const { once } = require('node:events')
const { setImmediate: nextImmediate } = require('node:timers/promises')
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

  test('once should keep the next logs for the next call', async () => {
    const stream = pinoTest.sink()
    const instance = pino(stream)

    instance.info('hello world')
    instance.info('hi world')

    await pinoTest.once(stream, { msg: 'hello world', level: 30 })
    await pinoTest.once(stream, { msg: 'hi world', level: 30 })
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

describe('waitFor', () => {
  test('waitFor should pass and ignore the logs that do not match', async () => {
    const stream = pinoTest.sink()
    const instance = pino(stream)

    instance.info('hello world')
    instance.info('hi world')

    await pinoTest.waitFor(stream, { msg: 'hi world', level: 30 })
  })

  test('waitFor should pass with a log written after the call', async () => {
    const stream = pinoTest.sink()
    const instance = pino(stream)

    setImmediate(() => instance.info('hello world'))

    await pinoTest.waitFor(stream, { msg: 'hello world', level: 30 })
  })

  test('waitFor should calls own assert function until a log matches', async () => {
    const stream = pinoTest.sink()
    const instance = pino(stream)
    const customAssertFunction = mock.fn(is)

    instance.info('hello world')
    instance.info('hi world')

    await pinoTest.waitFor(stream, { msg: 'hi world' }, customAssertFunction)
    assert.strictEqual(customAssertFunction.mock.calls.length, 2)
  })

  test('waitFor should pass with own assert function and options', async () => {
    const stream = pinoTest.sink()
    const instance = pino(stream)

    instance.info('hello world')
    instance.info('hi world')

    await pinoTest.waitFor(stream, { msg: 'hi world' }, is, { maxMessages: 2 })
  })

  test('waitFor should pass with a callback', async () => {
    const stream = pinoTest.sink()
    const instance = pino(stream)

    instance.info('hello world')
    instance.info('hi world')

    await pinoTest.waitFor(stream, (received) => {
      assert.strictEqual(received.msg, 'hi world')
    })
  })

  test('waitFor should reject on timeout with the last assert error as cause', async () => {
    const stream = pinoTest.sink()
    const instance = pino(stream)

    instance.info('hello world')

    await assert.rejects(
      pinoTest.waitFor(stream, { msg: 'hi world', level: 30 }, { timeout: 50 }),
      (err) => {
        assert.strictEqual(err.message, 'Timeout on waitFor after 50 ms, no match in 1 logs')
        assert.match(err.cause.message, /Expected values to be strictly deep-equal:/)
        return true
      }
    )
  })

  test('waitFor should reject when maxMessages logs do not match', async () => {
    const stream = pinoTest.sink()
    const instance = pino(stream)

    instance.info('hello world')
    instance.info('hi world')
    instance.info('bye world')

    await assert.rejects(
      pinoTest.waitFor(stream, { msg: 'bye world', level: 30 }, { maxMessages: 2 }),
      new Error('Max message count reached on waitFor, no match in 2 logs')
    )
  })

  test('waitFor should reject on a stream error', async () => {
    const stream = pinoTest.sink({ emitErrorEvent: true })

    setImmediate(() => stream.write('helloworld\n'))

    await assert.rejects(
      pinoTest.waitFor(stream, { msg: 'hello world', level: 30 }),
      /Unexpected token/
    )
  })

  test('waitFor should keep the next logs for the next call', async () => {
    const stream = pinoTest.sink()
    const instance = pino(stream)

    instance.info('hello world')
    instance.info('hi world')
    instance.info('bye world')

    await pinoTest.waitFor(stream, { msg: 'hello world', level: 30 })
    await pinoTest.waitFor(stream, { msg: 'hi world', level: 30 })
    await pinoTest.waitFor(stream, { msg: 'bye world', level: 30 })
  })

  test('once should pass after waitFor', async () => {
    const stream = pinoTest.sink()
    const instance = pino(stream)

    instance.info('hello world')
    instance.info('hi world')

    await pinoTest.waitFor(stream, { msg: 'hello world', level: 30 })
    await pinoTest.once(stream, { msg: 'hi world', level: 30 })
  })
})

describe('waitFor with concurrent calls', () => {
  test('concurrent calls should each receive every log', async () => {
    const stream = pinoTest.sink()
    const instance = pino(stream)

    instance.info('hello world')
    instance.info('hi world')

    await Promise.all([
      pinoTest.waitFor(stream, { msg: 'hi world', level: 30 }),
      pinoTest.waitFor(stream, { msg: 'hello world', level: 30 })
    ])
  })

  test('concurrent calls should resolve on the same log', async () => {
    const stream = pinoTest.sink()
    const instance = pino(stream)

    instance.info('hello world')

    await Promise.all([
      pinoTest.waitFor(stream, { msg: 'hello world', level: 30 }),
      pinoTest.waitFor(stream, { msg: 'hello world' }, is),
      pinoTest.waitFor(stream, (received) => {
        assert.strictEqual(received.msg, 'hello world')
      })
    ])
  })

  test('concurrent calls should keep the next same log for the next call', async () => {
    const stream = pinoTest.sink()
    const instance = pino(stream)

    instance.info('hello world')
    instance.info('hello world')

    await Promise.all([
      pinoTest.waitFor(stream, { msg: 'hello world', level: 30 }),
      pinoTest.waitFor(stream, { msg: 'hello world', level: 30 })
    ])
    await pinoTest.waitFor(stream, { msg: 'hello world', level: 30 })
  })

  test('concurrent calls should keep the logs after the last match for the next calls', async () => {
    const stream = pinoTest.sink()
    const instance = pino(stream)

    instance.info('hello world')
    instance.info('hi world')
    instance.info('bye world')
    instance.info('ciao world')

    await Promise.all([
      pinoTest.waitFor(stream, { msg: 'hi world', level: 30 }),
      pinoTest.waitFor(stream, { msg: 'hello world', level: 30 })
    ])
    await Promise.all([
      pinoTest.waitFor(stream, { msg: 'ciao world', level: 30 }),
      pinoTest.waitFor(stream, { msg: 'bye world', level: 30 })
    ])
  })

  test('a call added while another call is pending should receive the next logs', async () => {
    const stream = pinoTest.sink()
    const instance = pino(stream)

    const bye = pinoTest.waitFor(stream, { msg: 'bye world', level: 30 })
    instance.info('hello world')
    await nextImmediate()

    const hi = pinoTest.waitFor(stream, { msg: 'hi world', level: 30 })
    instance.info('hi world')
    instance.info('bye world')

    await Promise.all([bye, hi])
  })

  test('concurrent calls should keep the logs written between and after them', async () => {
    const stream = pinoTest.sink()
    const instance = pino(stream)

    const hello = pinoTest.waitFor(stream, { msg: 'hello world', level: 30 })
    const bye = pinoTest.waitFor(stream, { msg: 'bye world', level: 30 })
    instance.info('hello world')
    await hello

    instance.info('hi world')
    instance.info('bye world')
    await bye

    instance.info('ciao world')
    await nextImmediate()
    await pinoTest.waitFor(stream, { msg: 'ciao world', level: 30 })
  })

  test('a call that times out should not drop the logs of the next calls', async () => {
    const stream = pinoTest.sink()
    const instance = pino(stream)

    instance.info('hello world')

    const [timedOut, hello] = await Promise.allSettled([
      pinoTest.waitFor(stream, { msg: 'missing', level: 30 }, { timeout: 50 }),
      pinoTest.waitFor(stream, { msg: 'hello world', level: 30 })
    ])
    assert.match(timedOut.reason.message, /^Timeout on waitFor/)
    assert.strictEqual(hello.status, 'fulfilled')

    instance.info('hi world')
    await nextImmediate()
    await pinoTest.waitFor(stream, { msg: 'hi world', level: 30 })
  })

  test('a call that reaches maxMessages should not drop the logs of the next calls', async () => {
    const stream = pinoTest.sink()
    const instance = pino(stream)

    instance.info('hello world')
    instance.info('hi world')
    instance.info('bye world')

    const [maxReached, hi] = await Promise.allSettled([
      pinoTest.waitFor(stream, { msg: 'missing', level: 30 }, { maxMessages: 2 }),
      pinoTest.waitFor(stream, { msg: 'hi world', level: 30 })
    ])
    assert.match(maxReached.reason.message, /^Max message count reached on waitFor/)
    assert.strictEqual(hi.status, 'fulfilled')

    await pinoTest.waitFor(stream, { msg: 'bye world', level: 30 })
  })

  test('a stream error should reject every pending call and remove its listeners', async () => {
    const stream = pinoTest.sink({ emitErrorEvent: true })
    const instance = pino(stream)

    const calls = Promise.allSettled([
      pinoTest.waitFor(stream, { msg: 'hello world', level: 30 }),
      pinoTest.waitFor(stream, { msg: 'hi world' }, is),
      pinoTest.waitFor(stream, (received) => {
        assert.strictEqual(received.msg, 'bye world')
      })
    ])
    stream.write('helloworld\n')

    for (const call of await calls) {
      assert.match(call.reason.message, /Unexpected token/)
    }
    assert.strictEqual(stream.listenerCount('data'), 0)
    assert.strictEqual(stream.listenerCount('error'), 0)

    instance.info('hello world')
    await pinoTest.waitFor(stream, { msg: 'hello world', level: 30 })
  })

  test('concurrent calls should remove their listeners when they settle', async () => {
    const stream = pinoTest.sink()
    const instance = pino(stream)

    instance.info('hello world')
    instance.info('hi world')

    await Promise.allSettled([
      pinoTest.waitFor(stream, { msg: 'hello world', level: 30 }),
      pinoTest.waitFor(stream, { msg: 'missing', level: 30 }, { timeout: 50 }),
      pinoTest.waitFor(stream, { msg: 'missing', level: 30 }, { maxMessages: 2 })
    ])

    assert.strictEqual(stream.listenerCount('data'), 0)
    assert.strictEqual(stream.listenerCount('error'), 0)
  })

  test('concurrent once and waitFor should share the logs', async () => {
    const stream = pinoTest.sink()
    const instance = pino(stream)

    instance.info('hello world')
    instance.info('hi world')
    instance.info('bye world')

    await Promise.all([
      pinoTest.once(stream, { msg: 'hello world', level: 30 }),
      pinoTest.waitFor(stream, { msg: 'hi world', level: 30 })
    ])
    await pinoTest.waitFor(stream, { msg: 'bye world', level: 30 })
  })

  test('many concurrent calls should each resolve on their log', async () => {
    const stream = pinoTest.sink()
    const instance = pino(stream)
    const messages = Array.from({ length: stream.getMaxListeners() }, (_, i) => `log ${i}`)

    for (const msg of messages) instance.info(msg)
    instance.info('last log')

    await Promise.all([...messages].reverse().map((msg) => pinoTest.waitFor(stream, { msg, level: 30 })))
    await pinoTest.waitFor(stream, { msg: 'last log', level: 30 })
  })
})
