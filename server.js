// ESM
import Fastify from 'fastify'
import dbConnector from './db-conn/conn.js'
import firstRoute from './custom-routes/routes.js'
import fastifyBcrypt from "fastify-bcrypt"
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import fastifyCron from 'fastify-cron'

const fastify = Fastify({
  logger: true
})

fastify.register(dbConnector)
fastify.register(firstRoute)
fastify.register(fastifyBcrypt, {
    saltWorkFactor: 12
})
fastify.register(fastifyCookie)
fastify.register(fastifySession, {
    secret: 'TheQuickBrownFoxJumpsOverTheLazyDog', // Replace with a secure secret
    saveUninitialized: false,
    cookie: { secure: false } // Set secure to true if using HTTPS
});

  
const start = async () => {
  try {
    
    fastify.register(fastifyCron, {
        jobs: [
        {
            // Only these two properties are required,
            // the rest is from the node-cron API:
            // https://github.com/kelektiv/node-cron#api
            cronTime: '* * * * *', // Everyday at midnight UTC
    
            // Note: the callbacks (onTick & onComplete) take the server
            // as an argument, as opposed to nothing in the node-cron API:
            onTick: async fastify => {
                try {
                    const response = await fastify.inject('/transaction/schedule/run')
                    console.log(response.json())
                } catch (err) { console.error(err) }
            },
            start:true
        }
        ]
    })
    await fastify.listen({ port: 3000, host: '0.0.0.0' })
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}
start()
