/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-misused-promises */
import dotenv from 'dotenv'
import log4js from 'log4js'
import { deployCommands } from './deploy.js'
import { GamerbotClient } from './GamerbotClient.js'
import { prisma } from './prisma.js'

dotenv.config()
const client = new GamerbotClient()

client.on('ready', async () => {
  client.getLogger('ready').info(`${client.user.tag} ready`)
  void client.refreshPresence()
  void deployCommands(client)
})

void client.login(process.env.DISCORD_TOKEN)

let isExiting = false
const exit = (): void => {
  if (isExiting) return
  isExiting = true
  const logger = client.getLogger('exit')
  logger.info('Flushing analytics')
  client.analytics.flushAll().then(() => {
    logger.info('Closing database connection')
    prisma.$disconnect().then(() => {
      logger.info('Destroying client')
      client.destroy()
      logger.info('Shutting down log4js')
      log4js.shutdown()
      logger.info('Exiting')
      process.exit(0)
    })
  })
}

process.on('SIGINT', exit)
process.on('SIGTERM', exit)
process.on('SIGUSR2', exit)
