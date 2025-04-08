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
    const stripe = Stripe('your-stripe-publishable-key');

    const elements = {
        checkoutBtn: document.getElementById('checkoutBtn'),
        loginBtn: document.getElementById('loginBtn'),
        logoutBtn: document.getElementById('logoutBtn'),
        notification: document.getElementById('notification'),
        notificationText: document.getElementById('notificationText')
    };

    auth.onAuthStateChanged(user => {
        if (user) {
            elements.loginBtn.classList.add('hidden');
            elements.logoutBtn.classList.remove('hidden');
        } else {
            elements.loginBtn.classList.remove('hidden');
            elements.logoutBtn.classList.add('hidden');
        }
    });

    elements.logoutBtn.addEventListener('click', () => {
        auth.signOut();
    });

    elements.checkoutBtn.addEventListener('click', async () => {
        if (!auth.currentUser) {
            showNotification('Please log in to proceed with payment');
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/api/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const { id } = await response.json();
            stripe.redirectToCheckout({ sessionId: id });
        } catch (error) {
            showNotification('Error initiating checkout: ' + error.message);
        }
    });

    function showNotification(message) {
        elements.notificationText.textContent = message;
        elements.notification.classList.remove('hidden');
        elements.notification.classList.add('fade-in');
        setTimeout(() => elements.notification.classList.add('hidden'), 3000);
    }
});