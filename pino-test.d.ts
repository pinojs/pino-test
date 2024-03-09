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
 * @param {Transform} stream The stream to be tested.
 * @param {object} expected The expected value to be tested.
 * @param {function} [assert=deepStrictEqual] The assert function to be used.
 *
 * @returns A promise that resolves when the expected value is equal to the stream value.
 * @throws If the expected value is not equal to the stream value.
 *
 * @example
 * const stream = pino.test.sink()
 * const logger = pino(stream)
 * logger.info('hello world')
 * const expected = { msg: 'hello world', level: 30 }
 * await pino.test.once(stream, expected)
 */
declare function once(stream: Transform, expected: object, assert?: typeof deepStrictEqual): Promise<void>

/**
 * Assert that consecutive logs are expected.
 *
 * @param {Transform} stream The stream to be tested.
 * @param {object} expected The expected value to be tested.
 * @param {function} [assert=deepStrictEqual] The assert function to be used.
 *
 * @returns A promise that resolves when the expected value is equal to the stream value.
 * @throws If the expected value is not equal to the stream value.
 *
 * @example
 * const stream = pino.test.sink()
 * const logger = pino(stream)
 * logger.info('hello world')
 * logger.info('hi world')
 * const expected = [
 *   { msg: 'hello world', level: 30 },
 *   { msg: 'hi world', level: 30 }
 * ]
 * await pino.test.consecutive(stream, expected)
 */
declare function consecutive(stream: Transform, expected: object[], assert?: typeof deepStrictEqual): Promise<void>

export { consecutive, once, sink };
