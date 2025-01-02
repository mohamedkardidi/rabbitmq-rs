// Receiver-specific JavaScript
const chatMessages = document.getElementById('chat-messages');
const messageInput = document.getElementById('messageInput');
const sendMessageBtn = document.getElementById('sendMessageBtn');

// Function to add a message to the chat
function addMessage(content, isSender = true) {
  const placeholder = document.getElementById('no-messages');
  if (placeholder) placeholder.style.display = 'none'; // Hide placeholder

  const messageDiv = document.createElement('div');
  messageDiv.classList.add('chat-message', isSender ? 'receiver' : 'sender');
  messageDiv.textContent = content;
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll
}

// Keep track of displayed messages
const displayedMessages = new Set();

// Poll the server for new messages
async function fetchMessages() {
  try {
    const response = await fetch('/messages');
    console.log('Fetching messages...');
    if (response.ok) {
      const messages = await response.json();
      console.log('Messages received:', messages);
      messages.forEach(msg => {
        if (!displayedMessages.has(msg.correlationId)) {
          addMessage(msg.message, false);
          displayedMessages.add(msg.correlationId);
          messageInput.dataset.correlationId = msg.correlationId;
        }
      });
    } else {
      console.error('Failed to fetch messages:', response.status);
    }
  } catch (error) {
    console.error('Error fetching messages:', error);
  }
}

// Send a reply to the sender
async function sendReply() {
  const responseMessage = messageInput.value.trim();
  const correlationId = messageInput.dataset.correlationId;

  console.log('Reply message:', responseMessage);
  console.log('Correlation ID:', correlationId);

  if (!responseMessage) {
    alert('Please type a response first');
    return;
  }

  if (!correlationId) {
    alert('No message to reply to. Wait for a message from sender.');
    return;
  }

  try {
    const response = await fetch('/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        response: responseMessage,
        correlationId: correlationId
      })
    });

    if (response.ok) {
      console.log('Reply sent successfully');
      addMessage(responseMessage, true);
      messageInput.value = '';
      messageInput.dataset.correlationId = '';
      displayedMessages.delete(correlationId);
    } else {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to send reply');
    }
  } catch (error) {
    console.error('Error sending reply:', error);
    alert('Error: ' + error.message);
  }
}

// Event listeners
sendMessageBtn.addEventListener('click', sendReply);

messageInput.addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    sendReply();
  }
});

// Start polling for messages
setInterval(fetchMessages, 2000);
fetchMessages(); // Initial fetch
