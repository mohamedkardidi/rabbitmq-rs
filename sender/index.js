const amqp = require('amqplib');

const RABBITMQ_URL = 'amqp://localhost'; // RabbitMQ URL
const QUEUE = 'messages'; // Queue name

// Function to send a message to RabbitMQ
async function sendMessage() {
  const message = 'hello abdelkayou'; // Message to send
  try {
    const connection = await amqp.connect(RABBITMQ_URL); // Connect to RabbitMQ
    const channel = await connection.createChannel();    // Create a channel
    await channel.assertQueue(QUEUE);                    // Ensure the queue exists
    channel.sendToQueue(QUEUE, Buffer.from(message));    // Send the message
    console.log(`Message sent: ${message}`);
  } catch (error) {
    console.error('Error sending message to RabbitMQ:', error);
  }
}

// Call the function to send a message
sendMessage();
