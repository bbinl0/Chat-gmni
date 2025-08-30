document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const modelDisplay = document.getElementById('model-display');
    const selectedModelName = document.getElementById('selected-model-name');
    const modelDropdown = document.getElementById('model-dropdown');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const clearInputButton = document.getElementById('clear-input-button');
    const chatWindow = document.getElementById('chat-window');
    let chatHistory = [];
    let currentSelectedModelId = 'gemini-2.5-pro'; // Default model

    // Theme Toggle Functionality
    function applyTheme(isDarkMode) {
        document.body.classList.toggle('dark-mode', isDarkMode);
        // Update the icon based on the theme
        const icon = themeToggle.querySelector('i');
        if (isDarkMode) {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        } else {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        }
    }

    // Initialize theme from localStorage or default to light
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        applyTheme(true);
    } else {
        applyTheme(false);
    }

    themeToggle.addEventListener('click', () => {
        const isDarkMode = document.body.classList.contains('dark-mode');
        applyTheme(!isDarkMode);
        localStorage.setItem('theme', !isDarkMode ? 'dark' : 'light');
    });

    // Function to fetch available models from the API and populate the dropdown
    async function fetchModels() {
        try {
            const response = await fetch('/models');
            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }
            const models = await response.json();

            modelDropdown.innerHTML = ''; // Clear existing items
            const categories = {};

            for (const modelId in models) {
                const model = models[modelId];
                if (!categories[model.category]) {
                    categories[model.category] = [];
                }
                categories[model.category].push({ id: modelId, ...model });
            }

            // Define the preferred models
            const preferredModels = [
                { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', speed: 'Faster', category: 'Preferred' },
                { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', speed: 'Fastest', category: 'Preferred' },
                { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', speed: 'Fast', category: 'Preferred' }
            ];

            // Add preferred models to the top
            preferredModels.forEach(model => {
                const item = document.createElement('div');
                item.classList.add('model-dropdown-item');
                item.dataset.modelId = model.id;
                item.textContent = `${model.name} (${model.speed})`;
                modelDropdown.appendChild(item);
            });

            // Add other models, excluding those already added
            for (const category in categories) {
                categories[category].forEach(model => {
                    if (!preferredModels.some(pm => pm.id === model.id)) {
                        const item = document.createElement('div');
                        item.classList.add('model-dropdown-item');
                        item.dataset.modelId = model.id;
                        item.textContent = `${model.name} (${model.speed})`;
                        modelDropdown.appendChild(item);
                    }
                });
            }

            // Set initial selected model display
            if (preferredModels.length > 0) {
                currentSelectedModelId = preferredModels[0].id;
                selectedModelName.textContent = preferredModels[0].name;
                // Mark the initial selected item
                const initialSelectedItem = modelDropdown.querySelector(`[data-model-id="${currentSelectedModelId}"]`);
                if (initialSelectedItem) {
                    initialSelectedItem.classList.add('selected');
                }
            }

            // Add event listeners to dropdown items
            modelDropdown.querySelectorAll('.model-dropdown-item').forEach(item => {
                item.addEventListener('click', () => {
                    // Remove 'selected' class from previously selected item
                    const previouslySelectedItem = modelDropdown.querySelector('.model-dropdown-item.selected');
                    if (previouslySelectedItem) {
                        previouslySelectedItem.classList.remove('selected');
                    }

                    currentSelectedModelId = item.dataset.modelId;
                    selectedModelName.textContent = item.textContent.split(' (')[0]; // Display only name
                    item.classList.add('selected'); // Mark new selected item
                    modelDropdown.classList.remove('show'); // Hide dropdown
                });
            });

        } catch (error) {
            console.error('Error fetching models:', error);
            selectedModelName.textContent = 'Error loading models';
        }
    }

    fetchModels();

    // Toggle model dropdown visibility
    modelDisplay.addEventListener('click', () => {
        modelDropdown.classList.toggle('show');
        const dropdownIcon = modelDisplay.querySelector('.dropdown-icon');
        if (modelDropdown.classList.contains('show')) {
            dropdownIcon.style.transform = 'rotate(180deg)';
        } else {
            dropdownIcon.style.transform = 'rotate(0deg)';
        }
    });

    // Close dropdown if clicked outside
    document.addEventListener('click', (event) => {
        const modelSelectionDiv = document.querySelector('.model-selection'); // Get the parent div
        if (modelSelectionDiv && !modelSelectionDiv.contains(event.target) && modelDropdown.classList.contains('show')) {
            modelDropdown.classList.remove('show');
            modelDisplay.querySelector('.dropdown-icon').style.transform = 'rotate(0deg)';
        }
    });

    // Handle sending message
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // Handle clear input button
    clearInputButton.addEventListener('click', () => {
        messageInput.value = '';
    });

    async function sendMessage() {
        const userMessage = messageInput.value.trim();
        if (userMessage === '') return;

        appendMessage(userMessage, 'user');
        messageInput.value = '';

        const selectedModel = currentSelectedModelId;
        const apiUrl = `/generate/${selectedModel}`;

        const typingMessage = appendTypingAnimation();
        
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: userMessage,
                    history: chatHistory,
                }),
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();

            typingMessage.remove();

            appendFormattedMessage(data.output, 'bot');
            chatHistory.push({ role: 'user', parts: [{ text: userMessage }] });
            chatHistory.push({ role: 'model', parts: [{ text: data.output }] });
        } catch (error) {
            console.error('Error fetching data:', error);
            typingMessage.remove();
            appendMessage('দুঃখিত, কোনো ত্রুটি হয়েছে।', 'bot');
        }
    }

    function appendMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);
        messageDiv.textContent = text;

        const messageActions = document.createElement('div');
        messageActions.classList.add('message-actions');

        // Add copy button for the entire message
        const copyMessageButton = document.createElement('button');
        copyMessageButton.classList.add('message-action-button');
        copyMessageButton.innerHTML = '<i class="fas fa-copy"></i>';
        copyMessageButton.title = 'কপি';
        copyMessageButton.onclick = () => copyMessage(copyMessageButton, text);
        messageActions.appendChild(copyMessageButton);

        // Add edit button for user messages
        if (sender === 'user') {
            const editButton = document.createElement('button');
            editButton.classList.add('message-action-button', 'edit-message-button');
            editButton.innerHTML = '<i class="fas fa-edit"></i>';
            editButton.title = 'এডিট';
            editButton.onclick = () => editMessage(messageDiv, text);
            messageActions.appendChild(editButton);
        }
        messageDiv.appendChild(messageActions);

        chatWindow.appendChild(messageDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;
        return messageDiv;
    }

    let editingMessageElement = null; // To keep track of the message being edited

    // Function to edit a message
    window.editMessage = function(messageElement, originalText) {
        messageInput.value = originalText;
        messageInput.focus();
        editingMessageElement = messageElement;

        // Optionally, visually indicate that this message is being edited
        messageElement.classList.add('editing');
    }

    async function sendMessage() {
        const userMessage = messageInput.value.trim();
        if (userMessage === '') return;

        if (editingMessageElement) {
            // If editing an existing message
            const messageIndex = Array.from(chatWindow.children).indexOf(editingMessageElement);
            if (messageIndex !== -1) {
                // Update the displayed message content
                editingMessageElement.firstChild.nodeValue = userMessage; // Update the text content directly

                // Remove existing message actions and re-add them to ensure they are at the bottom
                const existingActions = editingMessageElement.querySelector('.message-actions');
                if (existingActions) {
                    existingActions.remove();
                }

                const messageActions = document.createElement('div');
                messageActions.classList.add('message-actions');

                const copyMessageButton = document.createElement('button');
                copyMessageButton.classList.add('message-action-button');
                copyMessageButton.innerHTML = '<i class="fas fa-copy"></i>';
                copyMessageButton.title = 'কপি';
                copyMessageButton.onclick = () => copyMessage(copyMessageButton, userMessage);
                messageActions.appendChild(copyMessageButton);

                const editButton = document.createElement('button');
                editButton.classList.add('message-action-button', 'edit-message-button');
                editButton.innerHTML = '<i class="fas fa-edit"></i>';
                editButton.title = 'এডিট';
                editButton.onclick = () => editMessage(editingMessageElement, userMessage);
                messageActions.appendChild(editButton);
                
                editingMessageElement.appendChild(messageActions);

                editingMessageElement.classList.remove('editing');

                // Update chat history
                let historyIndex = -1;
                let currentMessageCount = 0;
                for (let i = 0; i < chatHistory.length; i++) {
                    if (chatHistory[i].role === 'user' && chatWindow.children[currentMessageCount] === editingMessageElement) {
                        historyIndex = i;
                        break;
                    }
                    if (chatWindow.children[currentMessageCount] && chatWindow.children[currentMessageCount].classList.contains('message')) {
                        currentMessageCount++;
                    }
                }

                if (historyIndex !== -1) {
                    chatHistory[historyIndex].parts[0].text = userMessage;
                    chatHistory.splice(historyIndex + 1);
                }

                while (editingMessageElement.nextElementSibling) {
                    chatWindow.removeChild(editingMessageElement.nextElementSibling);
                }
            }
            editingMessageElement = null;
        } else {
            // If sending a new message
            appendMessage(userMessage, 'user');
        }

        messageInput.value = '';

        const selectedModel = currentSelectedModelId;
        const apiUrl = `/generate/${selectedModel}`;

        const typingMessage = appendTypingAnimation();
        
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: userMessage,
                    history: chatHistory,
                }),
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();

            typingMessage.remove();

            appendFormattedMessage(data.output, 'bot');
            chatHistory.push({ role: 'user', parts: [{ text: userMessage }] });
            chatHistory.push({ role: 'model', parts: [{ text: data.output }] });
        } catch (error) {
            console.error('Error fetching data:', error);
            typingMessage.remove();
            appendMessage('দুঃখিত, কোনো ত্রুটি হয়েছে।', 'bot');
        }
    }

    function appendTypingAnimation() {
        const typingDiv = document.createElement('div');
        typingDiv.classList.add('message', 'bot-message', 'typing-dots');
        typingDiv.innerHTML = '<span></span><span></span><span></span>';
        chatWindow.appendChild(typingDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;
        return typingDiv;
    }

    function appendFormattedMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);

        let processedText = text;

        // First, escape all HTML characters in the raw text to prevent any unintended rendering
        // This ensures that any < or > in the original text are displayed as < or >
        processedText = processedText.replace(/&/g, '&')
                                     .replace(/</g, '<')
                                     .replace(/>/g, '>')
                                     .replace(/"/g, '"')
                                     .replace(/'/g, '&#039;');

        // Process multi-line code blocks (```...```)
        // The content inside `code` is already HTML-escaped from the previous step.
        // We need to un-escape the backticks and the language hint if present.
        processedText = processedText.replace(/```(\w*\n)?([\s\S]*?)```/g, (match, lang, code) => {
            const copyButton = `<button class="copy-button" onclick="copyCode(this)">কপি</button>`;
            // The `code` variable here already contains HTML-escaped content.
            // We just need to wrap it in <pre><code>.
            return `<pre style="background-color: white; padding-top: 40px;">${copyButton}<div class="code-content"><code>${code.trim()}</code></div></pre>`;
        });

        // Process inline code (`...`)
        // This needs to be done carefully to ensure it doesn't interfere with already processed code blocks
        // And also to ensure the backticks themselves are not escaped.
        // The content inside `code` is already HTML-escaped.
        processedText = processedText.replace(/`([^`]+)`/g, (match, inlineCode) => {
            // The inlineCode is already HTML-escaped.
            return `<code>${inlineCode}</code>`;
        });

        // Process bold text (**)
        processedText = processedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Process italic text (*) or (_)
        processedText = processedText.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
        processedText = processedText.replace(/_([^_]+)_/g, '<em>$1</em>');

        // Process lists (simple markdown list items)
        // This is a very basic list processor. For more complex lists, a dedicated markdown parser would be better.
        // This will convert lines starting with * or - into list items.
        // It will also wrap consecutive list items in <ul> tags.
        const lines = processedText.split('\n');
        let inList = false;
        let finalLines = [];

        lines.forEach(line => {
            if (line.match(/^\s*(\*|-)\s/)) { // Simple bullet points
                if (!inList) {
                    finalLines.push('<ul>');
                    inList = true;
                }
                finalLines.push(`<li>${line.replace(/^\s*(\*|-)\s/, '').trim()}</li>`);
            } else {
                if (inList) {
                    finalLines.push('</ul>');
                    inList = false;
                }
                finalLines.push(line);
            }
        });
        if (inList) {
            finalLines.push('</ul>');
        }
        processedText = finalLines.join('\n');


        // Replace remaining newlines with <br> tags for regular text
        // This should be done after all other block-level processing
        processedText = processedText.replace(/\n/g, '<br>');

        messageDiv.innerHTML = processedText;

        const messageActions = document.createElement('div');
        messageActions.classList.add('message-actions');

        // Add copy button for the entire message
        const copyMessageButton = document.createElement('button');
        copyMessageButton.classList.add('message-action-button');
        copyMessageButton.innerHTML = '<i class="fas fa-copy"></i>';
        copyMessageButton.title = 'কপি';
        copyMessageButton.onclick = () => copyMessage(copyMessageButton, text); // Copy original raw text
        messageActions.appendChild(copyMessageButton);

        messageDiv.appendChild(messageActions);
        chatWindow.appendChild(messageDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    // Function to copy the entire message content
    window.copyMessage = function(button, textToCopy) {
        navigator.clipboard.writeText(textToCopy).then(() => {
            button.textContent = 'কপি হয়েছে!';
            setTimeout(() => {
                button.textContent = 'কপি';
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    }

    // This function is fine as is
    window.copyCode = function(button) {
        const codeElement = button.nextElementSibling;
        const codeToCopy = codeElement.textContent;
        navigator.clipboard.writeText(codeToCopy).then(() => {
            button.textContent = 'কপি হয়েছে!';
            setTimeout(() => {
                button.textContent = 'কপি';
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    }
});
