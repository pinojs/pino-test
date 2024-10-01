import type { deepStrictEqual } from "assert";
import type { Transform } from "stream";

/**
 * Create a Pino destination stream to easily inspect the logs processed by Pino.
 *
 * @param {object} options The options to be used.
 * @param {boolean} [options.destroyOnError=false] If true, the stream will be destroyed on error.
 * @param {boolean} [options.emitErrorEvent=false] If true, the stream eill emit an error event on error.
 *
 * @returns A stream.
 */
declare function sink({ destroyOnError, emitErrorEvent }?: { destroyOnError?: boolean, emitErrorEvent?: boolean }): Transform

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
declare function once(stream: Transform, expectedOrCallback: object | Function, assert?: typeof deepStrictEqual): Promise<void>

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
declare function consecutive(stream: Transform, expectedsOrCallbacks: Array<object | Function>, assert?: typeof deepStrictEqual): Promise<void>

export { consecutive, once, sink };
