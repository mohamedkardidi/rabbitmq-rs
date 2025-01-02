const amqp = require('amqplib');

async function connectToQueue(queueName) {
  const { rabbitmq } = require('./config');
  const connection = await amqp.connect({
    protocol: 'amqp',
    hostname: rabbitmq.host,
    port: rabbitmq.port,
    username: rabbitmq.username,
    password: rabbitmq.password,
  });
  const channel = await connection.createChannel();
  await channel.assertQueue(queueName);
  console.log(`Connected to RabbitMQ queue: ${queueName}`);
  return { connection, channel };
}

module.exports = { connectToQueue };
