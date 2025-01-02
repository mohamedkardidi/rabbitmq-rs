const express = require('express');
const bodyParser = require('body-parser');
const { connectToQueue } = require('../shared/rabbitmq');

const app = express();
const PORT = 3001;
const QUEUE = 'messages';
const REPLY_QUEUE = 'responses';

app.use(express.static('public'));
app.use(bodyParser.json());

let channel;
let connection;
let responses = new Map(); // Store responses by correlation ID

// Initialize RabbitMQ connection
async function initializeRabbitMQ() {
  try {
    const result = await connectToQueue(QUEUE);
    connection = result.connection;
    channel = result.channel;
    
    // Set up the queues
    await channel.assertQueue(QUEUE);
    await channel.assertQueue(REPLY_QUEUE);
    
    // Set up response consumer
    channel.consume(
      REPLY_QUEUE,
      (msg) => {
        if (msg) {
          const response = msg.content.toString();
          const correlationId = msg.properties.correlationId;
          console.log(`Response received: ${response}`);
          
          // Store the response
          responses.set(correlationId, response);
          
          channel.ack(msg);
        }
      },
      { noAck: false }
    );
    
    console.log('Connected to RabbitMQ queues');
  } catch (error) {
    console.error('Failed to initialize RabbitMQ:', error);
    throw error;
  }
}

app.post('/send', async (req, res) => {
  const { message } = req.body;
  try {
    if (!channel) {
      throw new Error('RabbitMQ connection not initialized');
    }

    const correlationId = Date.now().toString();
    
    channel.sendToQueue(
      QUEUE,
      Buffer.from(message),
      {
        correlationId: correlationId,
        replyTo: REPLY_QUEUE
      }
    );
    
    console.log(`Message sent: ${message}`);
    
    // Wait for response (with timeout)
    const waitForResponse = new Promise((resolve, reject) => {
      let timeoutId;
      let intervalId;

      // Set a longer timeout (30 seconds)
      timeoutId = setTimeout(() => {
        clearInterval(intervalId);
        reject(new Error('Waiting for response timed out. The receiver might be busy or offline.'));
      }, 30000);

      intervalId = setInterval(() => {
        const response = responses.get(correlationId);
        if (response) {
          clearTimeout(timeoutId);
          clearInterval(intervalId);
          responses.delete(correlationId);
          resolve(response);
        }
      }, 100);
    });

    const response = await waitForResponse;
    res.status(200).json({ 
      status: 'Message sent successfully',
      response: response
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ 
      error: 'Failed to send message',
      details: error.message
    });
  }
});

// Cleanup function to close connections
function cleanup() {
  if (channel) channel.close();
  if (connection) connection.close();
}

// Handle process termination
process.on('SIGINT', () => {
  cleanup();
  process.exit();
});

// Initialize RabbitMQ before starting the server
initializeRabbitMQ()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Sender app listening on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });