document.addEventListener('DOMContentLoaded', function() {
    // Firebase configuration
    const firebaseConfig = {
        apiKey: "AIzaSyAUfA9FjSkJh6XfgaI0f9x2L2CirKU1KGI",
        authDomain: "prompter-a1bb9.firebaseapp.com",
        projectId: "prompter-a1bb9",
        storageBucket: "prompter-a1bb9.appspot.com",
        messagingSenderId: "270563341236",
        appId: "1:270563341236:web:0d6b7c4873ce709a4378e1",
        measurementId: "G-LK956GDHJN"
    };

    // Initialize Firebase
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const db = firebase.firestore();

    // DOM elements
    const elements = {
        newPromptBtn: document.getElementById('newPromptBtn'),
        modalOverlay: document.getElementById('modalOverlay'),
        generatePromptModal: document.getElementById('generatePromptModal'),
        closeModalBtn: document.getElementById('closeModalBtn'),
        resultsModal: document.getElementById('resultsModal'),
        closeResultsModalBtn: document.getElementById('closeResultsModalBtn'),
        form: document.getElementById('promptForm'),
        modalQuery: document.getElementById('modalQuery'),
        modalPromptType: document.getElementById('modalPromptType'),
        generatedPromptEl: document.getElementById('generatedPrompt'),
        promptDescriptionEl: document.getElementById('promptDescription'),
        promptImageEl: document.getElementById('promptImage'),
        copyButton: document.getElementById('copyButton'),
        shareButton: document.getElementById('shareButton'),
        loadingSection: document.getElementById('loadingSection'),
        notification: document.getElementById('notification'),
        notificationText: document.getElementById('notificationText'),
        promptSearch: document.getElementById('promptSearch'),
        commonPrompts: document.getElementById('commonPrompts')
    };

    // Modal control functions
    const modal = {
        openGenerate: () => {
            elements.modalOverlay.classList.remove('hidden');
            elements.generatePromptModal.classList.remove('hidden');
            setTimeout(() => {
                elements.modalOverlay.classList.add('fade-in');
                elements.generatePromptModal.classList.add('fade-in');
            }, 10);
        },
        closeGenerate: () => {
            elements.modalOverlay.classList.remove('fade-in');
            elements.generatePromptModal.classList.remove('fade-in');
            setTimeout(() => {
                elements.modalOverlay.classList.add('hidden');
                elements.generatePromptModal.classList.add('hidden');
            }, 300);
        },
        openResults: () => {
            elements.modalOverlay.classList.remove('hidden');
            elements.resultsModal.classList.remove('hidden');
            setTimeout(() => {
                elements.modalOverlay.classList.add('fade-in');
                elements.resultsModal.classList.add('fade-in');
            }, 10);
        },
        closeResults: () => {
            elements.modalOverlay.classList.remove('fade-in');
            elements.resultsModal.classList.remove('fade-in');
            setTimeout(() => {
                elements.modalOverlay.classList.add('hidden');
                elements.resultsModal.classList.add('hidden');
            }, 300);
        }
    };

    // Event listeners
    elements.newPromptBtn.addEventListener('click', modal.openGenerate);
    elements.closeModalBtn.addEventListener('click', modal.closeGenerate);
    elements.closeResultsModalBtn.addEventListener('click', modal.closeResults);
    elements.modalOverlay.addEventListener('click', () => {
        modal.closeGenerate();
        modal.closeResults();
    });

    // Form submission with API call
    elements.form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const query = elements.modalQuery.value.trim();
        const promptType = elements.modalPromptType.value;
        
        if (!query) {
            showNotification('Please enter a query');
            return;
        }
        
        modal.closeGenerate();
        elements.loadingSection.classList.remove('hidden');
        
        try {
            const response = await fetch('/api/generate-prompt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    query: query,
                    promptType: promptType
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to generate prompt');
            }

            await db.collection('prompts').add({
                query,
                promptType,
                prompt: data.prompt,
                description: data.description,
                imageUrl: data.imageUrl,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                usageCount: 0
            });

            elements.generatedPromptEl.textContent = data.prompt;
            elements.promptDescriptionEl.textContent = data.description;
            elements.promptImageEl.src = data.imageUrl;
            
            elements.loadingSection.classList.add('hidden');
            modal.openResults();
            
            loadPromptsFromFirestore();

        } catch (error) {
            console.error('Error:', error);
            showNotification('Error generating prompt. Using fallback...');
            
            const fallback = generateFallbackPrompt(query, promptType);
            elements.generatedPromptEl.textContent = fallback.prompt;
            elements.promptDescriptionEl.textContent = fallback.description;
            elements.promptImageEl.src = getPlaceholderImage(promptType);
            
            elements.loadingSection.classList.add('hidden');
            modal.openResults();
        }
    });

    // Load prompts from Firestore
    async function loadPromptsFromFirestore() {
        try {
            const querySnapshot = await db.collection('prompts')
                .orderBy('createdAt', 'desc')
                .limit(20)
                .get();
            
            elements.commonPrompts.innerHTML = '';
            
            if (querySnapshot.empty) {
                elements.commonPrompts.innerHTML = '<p class="text-gray-500 text-center py-4">No prompts found. Generate some to see them here!</p>';
                return;
            }
            
            querySnapshot.forEach(doc => {
                const promptData = doc.data();
                addPromptToUI(promptData);
            });
        } catch (error) {
            console.error('Error loading prompts:', error);
            elements.commonPrompts.innerHTML = '<p class="text-red-500 text-center py-4">Error loading prompts. Please refresh the page.</p>';
        }
    }

    // Add prompt card to UI
    function addPromptToUI(promptData) {
        const promptCard = document.createElement('div');
        promptCard.className = 'prompt-card border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition';
        
        const imageUrl = promptData.imageUrl || getPlaceholderImage(promptData.promptType);
        const shortDescription = promptData.description.length > 100 
            ? promptData.description.substring(0, 100) + '...' 
            : promptData.description;
        
        promptCard.innerHTML = `
            <div class="flex items-start gap-4">
                <img src="${imageUrl}" alt="${promptData.promptType}" class="w-16 h-16 rounded-md object-cover">
                <div class="flex-1">
                    <h3 class="text-md font-medium text-gray-900">${promptData.query}</h3>
                    <p class="text-sm text-gray-600 mt-1">${shortDescription}</p>
                    <button class="copy-prompt-btn mt-2 text-teal-600 hover:text-teal-700 focus:outline-none" 
                            data-prompt="${escapeHtml(promptData.prompt)}">
                        <i class="far fa-copy mr-1"></i> Copy
                    </button>
                </div>
            </div>
        `;
        
        elements.commonPrompts.appendChild(promptCard);
        
        // Add click event to open details
        promptCard.addEventListener('click', function(e) {
            // Prevent opening details if clicking the copy button
            if (e.target.closest('.copy-prompt-btn')) return;
            
            showPromptDetails(promptData);
        });

        // Add copy functionality
        promptCard.querySelector('.copy-prompt-btn').addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent card click event from firing
            const promptText = this.getAttribute('data-prompt');
            navigator.clipboard.writeText(promptText)
                .then(() => showNotification('Prompt copied to clipboard'))
                .catch(err => showNotification('Failed to copy: ' + err));
            
            incrementPromptUsage(promptData.query);
        });
    }

    // Show prompt details in results modal
    function showPromptDetails(promptData) {
        elements.generatedPromptEl.textContent = promptData.prompt;
        elements.promptDescriptionEl.textContent = promptData.description;
        elements.promptImageEl.src = promptData.imageUrl || getPlaceholderImage(promptData.promptType);
        elements.modalQuery.value = promptData.query; // For sharing purposes
        elements.modalPromptType.value = promptData.promptType; // For sharing purposes
        
        modal.openResults();
    }

    // Helper functions
    async function incrementPromptUsage(query) {
        try {
            const querySnapshot = await db.collection('prompts')
                .where('query', '==', query)
                .limit(1)
                .get();
            
            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                await doc.ref.update({
                    usageCount: firebase.firestore.FieldValue.increment(1)
                });
            }
        } catch (error) {
            console.error('Error incrementing usage count:', error);
        }
    }

    function generateFallbackPrompt(query, type) {
        const prompts = {
            creative: `Write a detailed creative piece about "${query}". Include vivid descriptions and engaging characters.`,
            coding: `Develop a complete solution for "${query}" with proper syntax and error handling.`,
            research: `Conduct thorough research about "${query}" with credible sources.`,
            general: `Explain "${query}" in clear, simple terms with practical examples.`
        };
        
        return {
            prompt: prompts[type] || prompts.general,
            description: `This ${type} prompt helps generate content about "${query}"`
        };
    }

    function getPlaceholderImage(type) {
        const types = {
            creative: 'Creative+Writing',
            coding: 'Code+Generation',
            research: 'Research+Analysis',
            general: 'General+Prompt'
        };
        return `https://via.placeholder.com/400x400/cccccc/969696?text=${types[type] || types.general}`;
    }

    function showNotification(message) {
        elements.notificationText.textContent = message;
        elements.notification.classList.remove('hidden');
        elements.notification.classList.add('fade-in');
        setTimeout(() => elements.notification.classList.add('hidden'), 3000);
    }

    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Search functionality
    elements.promptSearch.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const promptCards = document.querySelectorAll('.prompt-card');
        
        promptCards.forEach(card => {
            const title = card.querySelector('h3').textContent.toLowerCase();
            const desc = card.querySelector('p').textContent.toLowerCase();
            if (title.includes(searchTerm) || desc.includes(searchTerm)) {
                card.classList.remove('hidden');
            } else {
                card.classList.add('hidden');
            }
        });
    });

    // Copy and share functionality for results modal
    elements.copyButton.addEventListener('click', function() {
        const promptText = elements.generatedPromptEl.textContent;
        navigator.clipboard.writeText(promptText)
            .then(() => showNotification('Prompt copied to clipboard'))
            .catch(err => showNotification('Failed to copy: ' + err));
    });

    elements.shareButton.addEventListener('click', function() {
        const query = elements.modalQuery.value;
        const promptType = elements.modalPromptType.value;
        const prompt = encodeURIComponent(elements.generatedPromptEl.textContent);
        const description = encodeURIComponent(elements.promptDescriptionEl.textContent);
        
        const shareUrl = `${window.location.origin}${window.location.pathname}?query=${encodeURIComponent(query)}&type=${promptType}&prompt=${prompt}&description=${description}`;
        
        navigator.clipboard.writeText(shareUrl)
            .then(() => showNotification('Share link copied to clipboard'))
            .catch(err => showNotification('Failed to copy share link: ' + err));
    });

    // Initial load
    loadPromptsFromFirestore();
});