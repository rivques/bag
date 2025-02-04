import config from './config'
import { prisma } from './lib/db'
import './lib/slack/routes/app'
import './lib/slack/routes/craft'
import './lib/slack/routes/give'
import './lib/slack/routes/inventory'
import './lib/slack/routes/item'
import './lib/slack/routes/trade'
import './lib/slack/routes/use'
import slack from './lib/slack/slack'
import routes from './router'
import { fastifyConnectPlugin } from '@connectrpc/connect-fastify'
import { fastify } from 'fastify';

;(async () => {
  // Shutdown signal - shutdown Prisma client
  process.on('SIGINT', async () => {
    await prisma.$disconnect()
  })

  process.on('SIGQUIT', async () => {
    await prisma.$disconnect()
  })

  process.on('SIGTERM', async () => {
    await prisma.$disconnect()
  })

  if (config.NODE_ENV === 'development' || config.SLACK_BOT) {
    await slack.start(
      config.NODE_ENV === 'development' ? config.SLACK_PORT : config.PORT
    )
    console.log(
      `⚡️ Bolt app is running on port ${
        config.NODE_ENV === 'development' ? config.SLACK_PORT : config.PORT
      }!`
    )
  }

  if (config.NODE_ENV === 'development' || !config.SLACK_BOT) {
    const server = fastify({
      http2: true,
      logger: true
    })
    await server.register(fastifyConnectPlugin, { routes })
    server.get('/', (_, reply) => {
      reply.type('text/plain')
      reply.send('Check out https://bag.hackclub.com!')
    })
    await server.listen({ host: '0.0.0.0', port: config.PORT })
    console.log(`GRPC server running on port ${config.PORT}!`)
  }
})()
