// login.js

// import { signUp } from "supertokens-web-js/recipe/emailpassword/index.js"

/**
 * Encapsulates the routes
 * @param {FastifyInstance} fastify  Encapsulated Fastify Instance
 * @param {Object} options plugin options, refer to https://fastify.dev/docs/latest/Reference/Plugins/#plugin-options
 */

function processTransaction(transaction) {
  return new Promise((resolve, reject) => {
      console.log('Transaction processing started for:', transaction);

      // Simulate long running process
      setTimeout(() => {
          // After 30 seconds, we assume the transaction is processed successfully
          console.log('transaction processed for:', transaction);
          resolve(transaction);
      }, 20000); // 20 seconds
  });
}

async function routes (fastify, options) {
  
  fastify.get('/', async (request, reply) => {
    return { hello: 'world' }
  })
  fastify.post('/login', async (req, reply) => {
    
    if (!req.session.user) {
      try {
        const { email, password } = req.body
    
        const query = 'SELECT * FROM m_user WHERE user_email = $1'
        const { rows } = await fastify.pg.query(query, [email])

        if (rows.length === 0) {
          return reply.status(400).send({ success: false, message: 'User not found' })
        }
    
        const hashedPassword = rows[0].user_password
    
        const compared = await fastify.bcrypt.compare(password, hashedPassword)
    
        if (!compared) {
          return reply.status(400).send({ success: false, message: 'Incorrect password' })
        }

        req.session.user = email
        req.session.user_id = rows[0].user_id
        
        reply.send({ success: true, message: 'Login successful!',user:req.session.user, user_id:req.session.user_id })
      } catch (err) {
        reply.status(500).send({ success: false, message: 'Error logging in' })
      }
    } else {
      reply.send({ success: false, message: 'You are already logged in!' })
    }

  })
  fastify.get('/logout', function(req, reply){
    req.session.destroy(err => {
      if (err) {
        return reply.status(500).send({ success: false, message: 'Error logging out' })
      }
      reply.send({ success: true, message: 'Logged out successfully!' })
    })
  })
  
  fastify.get('/checkSession', function(req, reply){
    if (req.session.user) {
      reply.send({ success: true, message: `You are logged in!`, user:req.session.user, user_id:req.session.user_id });
    } else {
      reply.send({ success: false, message: 'Please login first!' });
    }
  })

  // m_user table
  fastify.get('/user/get', function (req, reply) {
    fastify.pg.query('SELECT * FROM m_user', function onResult(err, result) {
      if (err) {
        reply.send(err)
      } else {
        reply.send(result.rows)
      }
    })
  })
  
  fastify.post('/user/insert', async (req, reply) => {

    try {
      const { email, password } = req.body

      const hashedPassword = await fastify.bcrypt.hash(password)

      // return hashedPassword
      const query = 'INSERT INTO m_user (user_email, user_password) VALUES ($1, $2)'
      await fastify.pg.query(query, [email, hashedPassword])
      reply.send({ success: true, message: 'User registered successfully!' })

    } catch (err) {

      reply.status(500).send({ success: false, message: err.message })
    }
  })
  // m_user table
  
  // m_account table
  fastify.get('/account/get', async (req, reply) => {
    
    if (req.session.user) {
      try {
        const queryAccount = 'SELECT * FROM m_account WHERE user_id = $1'
        const { rows: rowsAccount } = await fastify.pg.query(queryAccount, [req.session.user_id])

        reply.send({ success: true, message: 'Getting All Accounts', accounts:rowsAccount })
      } catch (err) {
        reply.status(500).send({ success: false, message: err.message })
      }
    } else {
      reply.send({ success: false, message: 'Please login first!' })
    }
  })
  
  fastify.post('/account/insert', async (req, reply) => {

    if (req.session.user) {
      try {
        const { name, type } = req.body
        const email = req.session.user

        if(type.toLowerCase() == 'credit' || type.toLowerCase() == 'debit' || type.toLowerCase() == 'giro' || type.toLowerCase() == 'loan') {
          const queryAccount = 'INSERT INTO m_account (user_id, account_name, account_type) VALUES ($1, $2, $3)'
          await fastify.pg.query(queryAccount, [req.session.user_id, name, type])
          reply.send({ success: true, message: 'Account registered successfully!', email:email, name:name, type:type})
        } else {
          reply.send({ success: false, message: 'Allowed Type : credit/debit/giro/loan !!' })
        }

      } catch (err) {

        reply.status(500).send({ success: false, message: err.message })
      }
    } else {
      reply.send({ success: false, message: 'Please login first!' })
    }
  })
  // m_account table

  // t_transaction table
  fastify.get('/transaction/testTimeout', async (req, reply) => {
    let transaction = { amount: 100, currency: 'USD' }; // Sample transaction input
    processTransaction(transaction)
        .then((processedTransaction) => {
          console.log('transaction processing completed for:', processedTransaction);
        })
        .catch((error) => {
          console.error('transaction processing failed:', error);
        });
  })

  fastify.post('/transaction/send', async (req, reply) => {
    
    if (req.session.user) {
      const { account_id, amount, currency } = req.body
      const send_to = req.body.send_to || null;
      const type = "send"
      const transaction = { type: type, amount: amount, currency: currency, send_to:send_to }
      
      const query = 'SELECT account_id FROM m_account WHERE user_id = $1 AND account_id = $2'
      const { rows } = await fastify.pg.query(query, [req.session.user_id, account_id])
      
      if (rows.length === 0) {
        return ({ success: false, message: 'Wrong Account, Please Enter the correct account id!',rows:rows })
      }
      
      const queryTransaction = "INSERT INTO t_transaction (account_id, transaction_type, transaction_amount, transaction_currency, transaction_status, transaction_send_to) VALUES ($1,$2,$3,$4,$5,$6) RETURNING transaction_id"
      const { rows:rowsTransaction } = await fastify.pg.query(queryTransaction, [account_id, type, amount, currency, false, send_to])
      const transaction_id = rowsTransaction[0].transaction_id
      // return transaction_id

      reply.send({ success: true, message: 'Sending is being proccessed!'})
      processTransaction(transaction)
          .then((processedTransaction) => {
            const queryUpdate = "UPDATE t_transaction SET transaction_status = $1 WHERE transaction_id = $2"
            fastify.pg.query(queryUpdate, [true, transaction_id])
            console.log('Sending processing completed for:', processedTransaction);
          })
          .catch((error) => {
            console.error('Sending processing failed:', error);
          });
    } else {
      reply.send({ success: false, message: 'Please login first!' })
    }
  })
  
  fastify.post('/transaction/withdraw', async (req, reply) => {  
    if (req.session.user) {
      const { account_id, amount, currency } = req.body
      const type = "withdraw"
      const transaction = { type: type, amount: amount, currency: currency }
      
      const query = 'SELECT account_id FROM m_account WHERE user_id = $1 AND account_id = $2'
      const { rows } = await fastify.pg.query(query, [req.session.user_id, account_id])
      
      if (rows.length === 0) {
        return ({ success: false, message: 'Wrong Account, Please Enter the correct account id!',rows:rows })
      }
      
      const queryTransaction = "INSERT INTO t_transaction (account_id, transaction_type, transaction_amount, transaction_currency, transaction_status) VALUES ($1,$2,$3,$4,$5) RETURNING transaction_id"
      const { rows:rowsTransaction } = await fastify.pg.query(queryTransaction, [account_id, type, amount, currency, false])
      const transaction_id = rowsTransaction[0].transaction_id
      // return transaction_id

      reply.send({ success: true, message: 'Withdrawal is being proccessed!'})
      processTransaction(transaction)
          .then((processedTransaction) => {
            const queryUpdate = "UPDATE t_transaction SET transaction_status = $1 WHERE transaction_id = $2"
            fastify.pg.query(queryUpdate, [true, transaction_id])
            console.log('Withdrawal processing completed for:', processedTransaction);
          })
          .catch((error) => {
            console.error('Withdrawal processing failed:', error);
          });
    } else {
      reply.send({ success: false, message: 'Please login first!' })
    }
  })

  
  fastify.post('/transaction/get', async (req, reply) => {  
    if (req.session.user) {
      const { account_id } = req.body
      const type = req.body.type || '%%';
      const currency = req.body.currency || '%%';
      
      const query = 'SELECT account_id FROM m_account WHERE user_id = $1 AND account_id = $2'
      const { rows } = await fastify.pg.query(query, [req.session.user_id, account_id])
      
      if (rows.length === 0) {
        return ({ success: false, message: 'Wrong Account, Please Enter the correct account id!',rows:rows })
      }
      
      const queryTransaction = 'SELECT * FROM t_transaction WHERE account_id = $1 AND transaction_type LIKE $2 AND transaction_currency LIKE $3'
      const { rows:rowsTransaction } = await fastify.pg.query(queryTransaction, [account_id, type, currency])
      
      reply.send({ success: true, message: 'Here is all your transaction!',transaction:rowsTransaction })
    } else {
      reply.send({ success: false, message: 'Please login first!' })
    }
  })
  // t_transaction table

  // t_transaction_schedule table
  fastify.get('/transaction/schedule/run', async (req, reply) =>{
    // fastify.pg.query('BEGIN')
    try {
      await fastify.pg.query('SELECT *, CURRENT_TIMESTAMP AS "timestamp" FROM t_transaction_schedule WHERE transaction_schedule_status', function onResult(err, result) {
        if (err) {
          reply.send(err)
        } else {
          result.rows.forEach(async (row) => {
            const queryUpdate = "UPDATE t_transaction_schedule SET repeated_at = CURRENT_TIMESTAMP WHERE transaction_schedule_id = $1"
            if(row.repeated_at){
               // Get last repeated time
              const repeated_at = new Date(row.repeated_at);

              // Add last repeated time + minutes
              const new_repeated = new Date(repeated_at);
              new_repeated.setMinutes(new_repeated.getMinutes() + row.repeat_interval_minutes)

              // Get database current timestamp
              const db_timestamp = new Date(row.timestamp)

              if(db_timestamp >= new_repeated) {
                await fastify.pg.query(queryUpdate, [row.transaction_schedule_id])
  
                const queryTransaction = "INSERT INTO t_transaction (account_id, transaction_type, transaction_amount, transaction_currency, transaction_status, transaction_send_to) VALUES ($1,$2,$3,$4,$5,$6) RETURNING transaction_id"
                const { rows:rowsTransaction } = await fastify.pg.query(queryTransaction, [row.account_id, row.transaction_schedule_type, row.transaction_schedule_amount, row.transaction_schedule_currency, false, row.transaction_schedule_send_to])
                const transaction_id = rowsTransaction[0].transaction_id
          
                console.log({ success: true, message:rowsTransaction, row:row})
                processTransaction(row)
                    .then((processedTransaction) => {
                      const queryUpdate = "UPDATE t_transaction SET transaction_status = $1 WHERE transaction_id = $2"
                      fastify.pg.query(queryUpdate, [true, transaction_id])
                      console.log('Transaction processing completed for:', processedTransaction);
                    })
                    .catch((error) => {
                      console.error('Transaction processing failed:', error);
                    });
              }
              
            } else {
              // Get last created time
              const created_at = new Date(row.created_at);

              // Add last repeated time + minutes
              const new_repeated = new Date(created_at);
              new_repeated.setMinutes(new_repeated.getMinutes() + row.repeat_interval_minutes)

              // Get database current timestamp
              const db_timestamp = new Date(row.timestamp)

              console.log(new_repeated)
              console.log(db_timestamp)
              if(db_timestamp >= new_repeated) {
                await fastify.pg.query(queryUpdate, [row.transaction_schedule_id])

                const queryTransaction = "INSERT INTO t_transaction (account_id, transaction_type, transaction_amount, transaction_currency, transaction_status, transaction_send_to) VALUES ($1,$2,$3,$4,$5,$6) RETURNING transaction_id"
                const { rows:rowsTransaction } = await fastify.pg.query(queryTransaction, [row.account_id, row.transaction_schedule_type, row.transaction_schedule_amount, row.transaction_schedule_currency, false, row.transaction_schedule_send_to])
                const transaction_id = rowsTransaction[0].transaction_id
        
                console.log({ success: true, message: 'Transaction is being proccessed!'})
                processTransaction(row)
                    .then((processedTransaction) => {
                      const queryUpdate = "UPDATE t_transaction SET transaction_status = $1 WHERE transaction_id = $2"
                      fastify.pg.query(queryUpdate, [true, transaction_id])
                      console.log('Transaction processing completed for:', processedTransaction);
                    })
                    .catch((error) => {
                      console.error('Transaction processing failed:', error);
                    });
              }
            }
          })
        }
      })
      // fastify.pg.query('COMMIT')
      reply.send({ success: true, message: 'Sucess Schedule Transaction' })
    } catch (err) {
      // fastify.pg.query('ROLLBACK')
      reply.status(500).send({ success: false, message: err.message })
    }
  })
  
  fastify.post('/transaction/schedule/get', async (req, reply) => {  
    if (req.session.user) {
      const { account_id } = req.body
      const type = req.body.type || '%%';
      const currency = req.body.currency || '%%';
      
      const query = 'SELECT account_id FROM m_account WHERE user_id = $1 AND account_id = $2'
      const { rows } = await fastify.pg.query(query, [req.session.user_id, account_id])
      
      if (rows.length === 0) {
        return ({ success: false, message: 'Wrong Account, Please Enter the correct account id!',rows:rows })
      }
      
      const queryTransaction = 'SELECT * FROM t_transaction_schedule WHERE account_id = $1 AND transaction_schedule_type LIKE $2 AND transaction_schedule_currency LIKE $3'
      const { rows:rowsTransaction } = await fastify.pg.query(queryTransaction, [account_id, type, currency])
      
      reply.send({ success: true, message: 'Here is all your transaction schedules!',transaction:rowsTransaction })
    } else {
      reply.send({ success: false, message: 'Please login first!' })
    }
  })
  
  fastify.post('/transaction/schedule/register', async (req, reply) =>{
    if (req.session.user) {
      const { account_id, amount, currency, repeat_interval_minutes, type } = req.body
      const send_to = req.body.send_to || null;
      
      const query = 'SELECT account_id FROM m_account WHERE user_id = $1 AND account_id = $2'
      const { rows } = await fastify.pg.query(query, [req.session.user_id, account_id])
      
      if (rows.length === 0) {
        return ({ success: false, message: 'Wrong Account, Please Enter the correct account id!',rows:rows })
      }
      
      const queryTransaction = "INSERT INTO t_transaction_schedule (account_id, transaction_schedule_type, transaction_schedule_amount, transaction_schedule_currency, transaction_schedule_status, transaction_schedule_send_to, repeat_interval_minutes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING transaction_schedule_id"
      const { rows:rowsTransaction } = await fastify.pg.query(queryTransaction, [account_id, type, amount, currency, true, send_to, repeat_interval_minutes])
      const transaction_schedule_id = rowsTransaction[0].transaction_schedule_id

      reply.send({ success: true, message: 'Transaction Schedule is being registered!', body:req.body, transaction_schedule_id:transaction_schedule_id})
    } else {
      reply.send({ success: false, message: 'Please login first!' })
    }
  })
  
  fastify.post('/transaction/schedule/unregister', async (req, reply) =>{
    if (req.session.user) {
      const { account_id, transaction_schedule_id } = req.body
      
      const query = 'SELECT account_id FROM m_account WHERE user_id = $1 AND account_id = $2'
      const { rows } = await fastify.pg.query(query, [req.session.user_id, account_id])
      
      if (rows.length === 0) {
        return ({ success: false, message: 'Wrong Account, Please Enter the correct account id!',rows:rows })
      }
      
      const queryUpdate = "UPDATE t_transaction_schedule SET transaction_schedule_status = $1 WHERE transaction_schedule_id = $2"
      fastify.pg.query(queryUpdate, [false, transaction_schedule_id])

      reply.send({ success: true, message: 'Transaction Schedule has been unregistered!'})
    } else {
      reply.send({ success: false, message: 'Please login first!' })
    }
  })
  // t_transaction_schedule table
}
//ESM
export default routes;