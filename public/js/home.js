document.addEventListener('DOMContentLoaded', function() {
    const firebaseConfig = {
        apiKey: "AIzaSyAUfA9FjSkJh6XfgaI0f9x2L2CirKU1KGI",
        authDomain: "prompter-a1bb9.firebaseapp.com",
        projectId: "prompter-a1bb9",
        storageBucket: "prompter-a1bb9.appspot.com",
        messagingSenderId: "270563341236",
        appId: "1:270563341236:web:0d6b7c4873ce709a4378e1",
        measurementId: "G-LK956GDHJN"
    };

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const auth = firebase.auth();
    const db = firebase.firestore();

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
        commonPrompts: document.getElementById('commonPrompts'),
        loginBtn: document.getElementById('loginBtn'),
        logoutBtn: document.getElementById('logoutBtn'),
        authSection: document.getElementById('authSection'),
        userInfo: document.getElementById('userInfo'),
        userEmail: document.getElementById('userEmail'),
        userPlan: document.getElementById('userPlan'),
        promptsUsed: document.getElementById('promptsUsed')
    };

    const FREE_PLAN_LIMIT = 5;
    let currentUser = null;

    const modal = {
        openGenerate: () => {
            if (!currentUser) {
                showNotification('Please log in to generate prompts');
                return;
            }
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

    auth.onAuthStateChanged(user => {
        currentUser = user;
        if (user) {
            elements.loginBtn.classList.add('hidden');
            elements.logoutBtn.classList.remove('hidden');
            elements.userInfo.classList.remove('hidden');
            elements.userEmail.textContent = user.email;
            updateUserPlanInfo(user.uid);
        } else {
            elements.loginBtn.classList.remove('hidden');
            elements.logoutBtn.classList.add('hidden');
            elements.userInfo.classList.add('hidden');
        }
        loadPromptsFromFirestore();
    });

    async function updateUserPlanInfo(uid) {
        const userDoc = await db.collection('users').doc(uid).get();
        const userData = userDoc.data();
        const now = new Date();
        const lastReset = userData.lastReset ? userData.lastReset.toDate() : now;

        if (isNewDay(lastReset, now)) {
            await db.collection('users').doc(uid).update({
                promptsUsedToday: 0,
                lastReset: firebase.firestore.FieldValue.serverTimestamp()
            });
            userData.promptsUsedToday = 0;
        }

        elements.userPlan.textContent = userData.plan;
        elements.promptsUsed.textContent = userData.promptsUsedToday;
    }

    function isNewDay(lastReset, now) {
        return lastReset.toDateString() !== now.toDateString();
    }

    elements.logoutBtn.addEventListener('click', () => {
        auth.signOut();
    });

    elements.newPromptBtn.addEventListener('click', modal.openGenerate);
    elements.closeModalBtn.addEventListener('click', modal.closeGenerate);
    elements.closeResultsModalBtn.addEventListener('click', modal.closeResults);
    elements.modalOverlay.addEventListener('click', () => {
        modal.closeGenerate();
        modal.closeResults();
    });

    elements.form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!currentUser) {
            showNotification('Please log in to generate prompts');
            return;
        }

        const query = elements.modalQuery.value.trim();
        const promptType = elements.modalPromptType.value;
        
        if (!query) {
            showNotification('Please enter a query');
            return;
        }

        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data();
        
        if (userData.plan === 'free' && userData.promptsUsedToday >= FREE_PLAN_LIMIT) {
            showNotification('Free plan limit reached. Upgrade for unlimited prompts!');
            return;
        }

        modal.closeGenerate();
        elements.loadingSection.classList.remove('hidden');
        
        try {
            const response = await fetch('http://localhost:3000/api/generate-prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: query, promptType: promptType, userId: currentUser.uid })
            });

            if (!response.ok) throw new Error(`API request failed with status ${response.status}`);
            const data = await response.json();
            if (!data.success) throw new Error(data.error || 'Failed to generate prompt');

            await db.collection('prompts').add({
                query,
                promptType,
                prompt: data.prompt,
                description: data.description,
                imageUrl: data.imageUrl,
                userId: currentUser.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                usageCount: 0
            });

            await db.collection('users').doc(currentUser.uid).update({
                promptsUsedToday: firebase.firestore.FieldValue.increment(1)
            });

            elements.generatedPromptEl.textContent = data.prompt;
            elements.promptDescriptionEl.textContent = data.description;
            elements.promptImageEl.src = data.imageUrl;
            
            elements.loadingSection.classList.add('hidden');
            modal.openResults();
            updateUserPlanInfo(currentUser.uid);
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
            
            querySnapshot.forEach(doc => addPromptToUI(doc.data()));
        } catch (error) {
            console.error('Error loading prompts:', error);
            elements.commonPrompts.innerHTML = '<p class="text-red-500 text-center py-4">Error loading prompts. Please refresh the page.</p>';
        }
    }

    function addPromptToUI(promptData) {
        const promptCard = document.createElement('div');
        promptCard.className = 'prompt-card border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition';
        
        const imageUrl = promptData.imageUrl || getPlaceholderImage(promptData.promptType);
        const shortDescription = promptData.description.length > 100 
            ? promptData.description.substring(0, 100) + '...' 
            : promptData.description;
        const promptTypeLabel = promptData.promptType.charAt(0).toUpperCase() + promptData.promptType.slice(1);
        
        promptCard.innerHTML = `
            <div class="flex items-start gap-4">
                <img src="${imageUrl}" alt="${promptData.promptType}" class="w-16 h-16 rounded-md object-cover">
                <div class="flex-1">
                    <div class="flex items-center justify-between">
                        <h3 class="text-md font-medium text-gray-900">${promptData.query}</h3>
                        <span class="text-xs bg-teal-100 text-teal-800 px-2 py-1 rounded-full">${promptTypeLabel}</span>
                    </div>
                    <p class="text-sm text-gray-600 mt-1">${shortDescription}</p>
                    <button class="copy-prompt-btn mt-2 text-teal-600 hover:text-teal-700 focus:outline-none" 
                            data-prompt="${escapeHtml(promptData.prompt)}">
                        <i class="far fa-copy mr-1"></i> Copy
                    </button>
                </div>
            </div>
        `;
        
        elements.commonPrompts.appendChild(promptCard);
        
        promptCard.addEventListener('click', function(e) {
            if (e.target.closest('.copy-prompt-btn')) return;
            showPromptDetails(promptData);
        });

        promptCard.querySelector('.copy-prompt-btn').addEventListener('click', function(e) {
            e.stopPropagation();
            const promptText = this.getAttribute('data-prompt');
            navigator.clipboard.writeText(promptText)
                .then(() => showNotification('Prompt copied to clipboard'))
                .catch(err => showNotification('Failed to copy: ' + err));
            incrementPromptUsage(promptData.query);
        });
    }

    function showPromptDetails(promptData) {
        elements.generatedPromptEl.textContent = promptData.prompt;
        elements.promptDescriptionEl.textContent = promptData.description;
        elements.promptImageEl.src = promptData.imageUrl || getPlaceholderImage(promptData.promptType);
        elements.modalQuery.value = promptData.query;
        elements.modalPromptType.value = promptData.promptType;
        modal.openResults();
    }

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
            general: `Explain "${query}" in clear, simple terms with practical examples.`,
            image: `Generate a detailed description for an image about "${query}" suitable for an AI image generator.`,
            video: `Create a script for a video about "${query}" with scene descriptions and dialogue.`,
            voice: `Compose a script for a voice recording about "${query}" with clear narration instructions.`
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
            general: 'General+Prompt',
            image: 'Image+Generation',
            video: 'Video+Content',
            voice: 'Voice+Recording'
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
            .replace(/&/g, "&")
            .replace(/</g, "<")
            .replace(/>/g, ">")
            .replace(/"/g, "")
            .replace(/'/g, "'");
    }

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
});