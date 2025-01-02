// Sender-Specific JavaScript

const messageInput = document.getElementById('messageInput');
const sendMessageBtn = document.getElementById('sendMessageBtn');
const chatMessages = document.getElementById('chat-messages');

// Function to add a message to the chat
function addMessage(content, isSender = true) {
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('chat-message', isSender ? 'sender' : 'receiver');
  messageDiv.textContent = content;
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll to the latest message
}

// Event listener for sending messages
sendMessageBtn.addEventListener('click', async () => {
  const message = messageInput.value.trim();
  if (message) {
    try {
      // Display the sent message in the sender UI
      addMessage(message, true); // true indicates the sender
      messageInput.value = '';

      // Send the message to the backend
      const response = await fetch('/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Parse and display the response
      const data = await response.json();
      if (data.response) {
        // Display the receiver's response
        addMessage(data.response, false); // false indicates the receiver
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error: ' + error.message);
    }
  }
});

// Add event listener for Enter key
messageInput.addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    sendMessageBtn.click();
  }
});
