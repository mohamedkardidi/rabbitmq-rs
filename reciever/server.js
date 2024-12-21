const amqp = require('amqplib'); // RabbitMQ library

const RABBITMQ_URL = 'amqp://localhost'; // RabbitMQ server URL
const QUEUE = 'messages'; // Queue name

// Function to connect to RabbitMQ and consume messages
async function receiveMessages() {
  try {
    // Step 1: Connect to RabbitMQ
    console.log('Connecting to RabbitMQ...');
    const connection = await amqp.connect(RABBITMQ_URL);
    console.log('Connected to RabbitMQ!');

    // Step 2: Create a channel
    const channel = await connection.createChannel();
    console.log('Channel created.');

    // Step 3: Assert that the queue exists
    await channel.assertQueue(QUEUE);
    console.log(`Waiting for messages in queue: ${QUEUE}`);

    // Step 4: Consume messages from the queue
    channel.consume(
      QUEUE,
      (msg) => {
        if (msg !== null) {
          console.log(`Received: ${msg.content.toString()}`); // Log the message
          channel.ack(msg); // Acknowledge the message
        }
      },
      { noAck: false } // Ensure messages are acknowledged
    );
  } catch (error) {
    console.error('Error connecting to RabbitMQ:', error);
  }
}

// Start consuming messages
receiveMessages();
