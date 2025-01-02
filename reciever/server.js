const express = require('express');
const bodyParser = require('body-parser');
const { connectToQueue } = require('../shared/rabbitmq');

const app = express();
const PORT = 3002;
const QUEUE = 'messages';
const REPLY_QUEUE = 'responses';

let channel;
let pendingMessages = new Map(); // Store messages with their correlationIds

// Initialize RabbitMQ connection
async function initializeRabbitMQ() {
  try {
    console.log('Connecting to RabbitMQ...');
    const connection = await connectToQueue(QUEUE);
    channel = connection.channel;

    // Set up the queues
    await channel.assertQueue(QUEUE);
    await channel.assertQueue(REPLY_QUEUE);

    // Consume messages from the QUEUE
    channel.consume(
      QUEUE,
      async (msg) => {
        if (msg) {
          const message = msg.content.toString();
          const correlationId = msg.properties.correlationId;

          console.log(`Message received from sender: ${message} (Correlation ID: ${correlationId})`);

          // Store the message with its correlationId
          pendingMessages.set(correlationId, {
            message,
            timestamp: new Date().toISOString()
          });

          // Acknowledge the message
          channel.ack(msg);
        }
      },
      { noAck: false }
    );

    console.log('RabbitMQ connection established and queues are ready.');
  } catch (error) {
    console.error('Failed to initialize RabbitMQ:', error);
    process.exit(1); // Exit if RabbitMQ fails to connect
  }
}

// Middleware
app.use(express.static('public'));
app.use(bodyParser.json());

// API to get all pending messages
app.get('/messages', (req, res) => {
  try {
    const messages = Array.from(pendingMessages.entries()).map(([correlationId, data]) => ({
      correlationId,
      ...data
    }));
    console.log('Returning pending messages:', messages);
    res.status(200).json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// API to send a reply to the sender
app.post('/reply', (req, res) => {
  const { response, correlationId } = req.body;

  if (!channel) {
    return res.status(500).json({ error: 'RabbitMQ connection not initialized' });
  }

  try {
    if (!pendingMessages.has(correlationId)) {
      console.warn(`Message with Correlation ID: ${correlationId} not found`);
      return res.status(404).json({ error: 'Message not found' });
    }

    channel.sendToQueue(
      REPLY_QUEUE,
      Buffer.from(response),
      {
        correlationId: correlationId,
      }
    );

    // Remove the message from pending messages after sending the reply
    pendingMessages.delete(correlationId);

    console.log(`Reply sent to sender: ${response} (Correlation ID: ${correlationId})`);
    res.status(200).json({ message: 'Reply sent successfully' });
  } catch (error) {
    console.error('Error sending reply:', error);
    res.status(500).json({ error: 'Failed to send reply' });
  }
});

// Start RabbitMQ and server
initializeRabbitMQ()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Receiver app listening on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
