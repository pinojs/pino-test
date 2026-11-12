import { deepStrictEqual } from 'node:assert'
import { Transform } from 'node:stream'
import { expectError, expectType } from 'tsd'
import pinoTest from '../../pino-test'

const stream = pinoTest.sink()

expectType<Transform>(pinoTest.sink())
expectType<Transform>(pinoTest.sink({ emitErrorEvent: true }))
expectType<Transform>(pinoTest.sink({ destroyOnError: true }))

expectError(pinoTest.sink({ emitErrorEvent: 'true' }))
expectError(pinoTest.sink({ destroyOnError: 'true' }))
expectError(pinoTest.sink({ emitErrorEvent: 'true', destroyOnError: 'true' }))

expectError(pinoTest.consecutive('', []))
expectError(pinoTest.once('', {}))

expectError(pinoTest.consecutive(stream, { msg: '', level: 30 }))
expectError(pinoTest.once(stream, ''))

expectType<Promise<void>>(pinoTest.once(stream, { msg: '', level: 30 }))
expectType<Promise<void>>(pinoTest.once(stream, (received: any) => received.msg === 'hello world'))

expectType<Promise<void>>(pinoTest.consecutive(stream, [{ msg: '', level: 30 }]))
expectType<Promise<void>>(pinoTest.consecutive(stream, [{ msg: '', level: 30 }, (received: any) => received.msg === 'hi world']))

expectError(pinoTest.waitFor('', {}))
expectError(pinoTest.waitFor(stream, ''))
expectError(pinoTest.waitFor(stream, {}, { timeout: '50' }))
expectError(pinoTest.waitFor(stream, {}, deepStrictEqual, { maxMessages: '2' }))

expectType<Promise<void>>(pinoTest.waitFor(stream, { msg: '', level: 30 }))
expectType<Promise<void>>(pinoTest.waitFor(stream, (received: any) => received.msg === 'hello world'))
expectType<Promise<void>>(pinoTest.waitFor(stream, { msg: '', level: 30 }, { timeout: 50, maxMessages: 2 }))
expectType<Promise<void>>(pinoTest.waitFor(stream, { msg: '', level: 30 }, deepStrictEqual))
expectType<Promise<void>>(pinoTest.waitFor(stream, { msg: '', level: 30 }, deepStrictEqual, { timeout: 50 }))
