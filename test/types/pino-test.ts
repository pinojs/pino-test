/* eslint-disable */

import pino from 'pino'
import pinoTest from '../../pino-test'

const stream = pinoTest.sink()
const logger = pino(stream)

logger.info('hello world')
logger.info('by world')

async function onceType() {
  const expected = { msg: 'hello world', level: 30 }
  await pinoTest.once(stream, expected)
  await pinoTest.once(stream, (received: any) => received.msg === 'hello world')
}

async function consecutiveType() {
  const expected = [
    { msg: 'hello world', level: 30 },
    (received: any) => received.msg === 'hi world'
  ]
  await pinoTest.consecutive(stream, expected)
}

const stream1 = pinoTest.sink({ emitErrorEvent: true })
const stream2 = pinoTest.sink({ destroyOnError: true })
const stream3 = pinoTest.sink({ emitErrorEvent: true, destroyOnError: true })


