// ESM
import fastifyPlugin from 'fastify-plugin'
import fastifyPostgre from '@fastify/postgres'

async function dbConnector (fastify, options) {
  fastify.register(fastifyPostgre, {
    // connectionString: 'postgres://postgres:admin@localhost/be-assignment'
    connectionString: 'postgresql://supertokens_user:somePassword@db:5432/supertokens'
  })
}

// Wrapping a plugin function with fastify-plugin exposes the decorators
// and hooks, declared inside the plugin to the parent scope.
export default fastifyPlugin(dbConnector)