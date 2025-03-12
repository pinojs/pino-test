'use strict'

const nodeAssert = require('assert')
const os = require('os')
const split = require('split2')

const DEFAULT_WAIT_FOR_TIMEOUT = 1_000
const DEFAULT_MAX_MESSAGES = 100
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
    const dataHandler = (data) => {
      stream.removeListener('error', reject)
      stream.removeListener('data', dataHandler)
      try {
        check(data, expectedOrCallback, assert)
        resolve()
      } catch (err) {
        reject(err)
      }
    }
    stream.once('error', reject)
    stream.once('data', dataHandler)
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

/**
 * Assert a specific log is expected, ignoring the rest.
 *
 * @param {import('node:stream').Transform} stream The stream to be tested.
 * @param {Array<object | Function>} expectedsOrCallbacks The array of expected values to be tested or callback functions.
 * @param {Function} [assert=nodeAssert.deepStrictEqual] The assert function to be used when the expectedOrCallback parameter is an object.
 * @param {Object} [options] Additional options when assert is a function.
 * @param {Number} [options.timeout=1000] The time in milliseconds to wait for the expected value.
 * @param {Number} [options.maxMessages=100] The maximum number of messages to wait for.
 * @param {Boolean} [options.debug=false] If true, the stream will be logged to the console.
 * @returns A promise that resolves when the expected value is equal to the stream value.
 * @throws If the expected value is not equal to the stream value.
 * @throws If the callback function throws an error.
 * @throws If timeout is reached.
 *
 * @example
 * const stream = pinoTest.sink()
 * const logger = pino(stream)
 *
 * logger.debug('setting up server')
 * logger.info('server started')
 * logger.error('server crashed')
 *
 * await pinoTest.waitFor(stream, { msg: 'server started', level: 30 })
 */
async function waitFor (stream, expectedOrCallbacks, assert = nodeAssert.deepStrictEqual, options = {}) {
  return new Promise((resolve, reject) => {
    let assertFn = assert
    let { maxMessages = DEFAULT_MAX_MESSAGES, timeout = DEFAULT_WAIT_FOR_TIMEOUT, debug = false } = options

    // Handle case where assertOrOptions is actually options
    if (typeof assert === 'object') {
      assertFn = nodeAssert.deepStrictEqual
      maxMessages = assert.maxMessages || DEFAULT_MAX_MESSAGES
      timeout = assert.timeout || DEFAULT_WAIT_FOR_TIMEOUT
      debug = assert.debug || false
    }

    let count = 0
    const timeoutId = setTimeout(() => {
      stream.off('data', fn)
      stream.off('error', reject)
      const identifier = typeof expectedOrCallbacks !== 'function' ? expectedOrCallbacks.msg : '[function]'
      reject(new Error(`Timeout on waitFor: ${identifier}`))
    }, timeout)

    const fn = (message) => {
      if (debug) {
        console.log('waitFor received', message)
      }

      try {
        check(message, expectedOrCallbacks, assertFn)
        stream.off('data', fn)
        stream.off('error', reject)
        clearTimeout(timeoutId)
        resolve()
        return
      } catch { }

      count++
      if (count > maxMessages) {
        stream.off('data', fn)
        stream.off('error', reject)
        clearTimeout(timeoutId)
        const identifier = typeof expectedOrCallbacks !== 'function' ? expectedOrCallbacks.msg : '[function]'
        reject(new Error(`Max message count reached on waitFor: ${identifier}`))
      }
    }
    stream.on('data', fn)
    stream.on('error', reject)
  })
}

module.exports = { sink, once, consecutive, waitFor }
