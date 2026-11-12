'use strict'

const nodeAssert = require('assert')
const os = require('os')
const split = require('split2')

const DEFAULT_WAIT_FOR_TIMEOUT = 1_000
const DEFAULT_WAIT_FOR_MAX_MESSAGES = 100

/**
 * Create a Pino destination stream to easily inspect the logs processed by Pino.
 *
 * @param {object} options The options to be used.
 * @param {boolean} [options.destroyOnError=false] If true, the stream will be destroyed on error.
 * @param {boolean} [options.emitErrorEvent=false] If true, the stream eill emit an error event on error.
 *
 * @returns A stream.
 */
function sink ({ destroyOnError = false, emitErrorEvent = false } = {}) {
  const stream = split((data) => {
    try {
      return JSON.parse(data)
    } catch (err) {
      if (emitErrorEvent) stream.emit('error', err)
      if (destroyOnError) stream.destroy()
    }
  })

  return stream
}

/**
 * Check if the chunk is equal to the expected value.
 *
 * @param {object} chunk The chunk to be tested.
 * @param {object | Function} expectedOrCallback The expected value to be tested or a callback function to be used.
 * @param {Function} assert The assert function to be used when the expectedOrCallback parameter is an object.
 *
 * @throws If the expected value is not equal to the chunk value.
 */
function check (chunk, expectedOrCallback, assert) {
  const { time, pid, hostname, ...chunkCopy } = chunk

  nodeAssert.strictEqual(new Date(time) <= new Date(), true, 'time is greater than Date.now()')
  nodeAssert.strictEqual(pid, process.pid)
  nodeAssert.strictEqual(hostname, os.hostname())

  if (typeof expectedOrCallback === 'function') {
    expectedOrCallback(chunkCopy)
  } else {
    assert(chunkCopy, expectedOrCallback)
  }
}

function listen (stream, onData, onError) {
  stream.on('data', onData)
  stream.on('error', onError)
  stream.resume()
}

function unlisten (stream, onData, onError) {
  stream.removeListener('data', onData)
  stream.removeListener('error', onError)
  // A flowing stream with no data listener drops its logs, so keep them for the next call.
  if (stream.listenerCount('data') === 0) stream.pause()
}

/**
 * Assert that a single log is expected.
 *
 * @param {import('node:stream').Transform} stream The stream to be tested.
 * @param {object | Function} expectedOrCallback The expected value to be tested or a callback function to assert the log.
 * @param {Function} [assert=nodeAssert.deepStrictEqual] The assert function to be used when the expectedOrCallback parameter is an object.
 *
 * @returns A promise that resolves when the expected value is equal to the stream value.
 * @throws If the expected value is not equal to the stream value.
 * @throws If the the callback function throws an error.
 *
 * @example
 * const stream = pinoTest.sink()
 * const logger = pino(stream)
 *
 * logger.info('hello world')
 *
 * const expected = { msg: 'hello world', level: 30 }
 * await pinoTest.once(stream, expected)
 *
 * logger.info('hello world 1')
 *
 * await pinoTest.once(stream, (log) => {
 *  assert.strictEqual(log.msg, 'hello world 1')
 * })
 */
async function once (stream, expectedOrCallback, assert = nodeAssert.deepStrictEqual) {
  return new Promise((resolve, reject) => {
    const onError = (err) => {
      unlisten(stream, onData, onError)
      reject(err)
    }
    const onData = (data) => {
      unlisten(stream, onData, onError)
      try {
        check(data, expectedOrCallback, assert)
        resolve()
      } catch (err) {
        reject(err)
      }
    }
    listen(stream, onData, onError)
  })
}

/**
 * Assert that consecutive logs are expected.
 *
 * @param {import('node:stream').Transform} stream The stream to be tested.
 * @param {Array<object | Function>} expectedsOrCallbacks The array of expected values to be tested or callback functions.
 * @param {Function} [assert=nodeAssert.deepStrictEqual] The assert function to be used when the expectedOrCallback parameter is an object.
 *
 * @returns A promise that resolves when the expected value is equal to the stream value.
 * @throws If the expected value is not equal to the stream value.
 * @throws If the callback function throws an error.
 *
 * @example
 * const stream = pinoTest.sink()
 * const logger = pino(stream)
 *
 * logger.info('hello world')
 * logger.info('hi world')
 *
 * const expecteds = [
 *   { msg: 'hello world', level: 30 },
 *   (log) => assert.strictEqual(log.msg, 'hi world')
 * ]
 * await pinoTest.consecutive(stream, expecteds)
 */
async function consecutive (stream, expectedOrCallbacks, assert = nodeAssert.deepStrictEqual) {
  let i = 0
  for await (const chunk of stream) {
    check(chunk, expectedOrCallbacks[i], assert)
    i++
    if (i === expectedOrCallbacks.length) break
  }

  if (i < expectedOrCallbacks.length) {
    throw new Error('Stream ended before all expected logs were received')
  }
}

/** Wait for a log that matches and ignore the others. Concurrent calls each receive every log. */
async function waitFor (stream, expectedOrCallback, assert = nodeAssert.deepStrictEqual, options = {}) {
  if (typeof assert !== 'function') {
    options = assert
    assert = nodeAssert.deepStrictEqual
  }
  const { timeout = DEFAULT_WAIT_FOR_TIMEOUT, maxMessages = DEFAULT_WAIT_FOR_MAX_MESSAGES } = options

  return new Promise((resolve, reject) => {
    let received = 0
    let lastError

    const settle = (err) => {
      clearTimeout(timer)
      unlisten(stream, onData, settle)
      if (err) reject(err)
      else resolve()
    }

    const onData = (data) => {
      received++
      try {
        check(data, expectedOrCallback, assert)
        settle()
        return
      } catch (err) {
        lastError = err
      }
      if (received === maxMessages) {
        settle(new Error(`Max message count reached on waitFor, no match in ${received} logs`, { cause: lastError }))
      }
    }

    const timer = setTimeout(() => {
      settle(new Error(`Timeout on waitFor after ${timeout} ms, no match in ${received} logs`, { cause: lastError }))
    }, timeout)

    listen(stream, onData, settle)
  })
}

module.exports = { sink, once, consecutive, waitFor }
