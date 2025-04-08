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

    const elements = {
        loginBtn: document.getElementById('loginBtn'),
        signupBtn: document.getElementById('signupBtn'),
        email: document.getElementById('email'),
        password: document.getElementById('password'),
        notification: document.getElementById('notification'),
        notificationText: document.getElementById('notificationText')
    };

    elements.loginBtn.addEventListener('click', () => {
        const email = elements.email.value;
        const password = elements.password.value;
        auth.signInWithEmailAndPassword(email, password)
            .then(() => {
                window.location.href = './home.html';
            })
            .catch(err => showNotification('Login failed: ' + err.message));
    });

    elements.signupBtn.addEventListener('click', () => {
        const email = elements.email.value;
        const password = elements.password.value;
        auth.createUserWithEmailAndPassword(email, password)
            .then(userCredential => {
                const user = userCredential.user;
                firebase.firestore().collection('users').doc(user.uid).set({
                    plan: 'free',
                    promptsUsedToday: 0,
                    lastReset: firebase.firestore.FieldValue.serverTimestamp()
                }).then(() => {
                    window.location.href = './home.html';
                });
            })
            .catch(err => showNotification('Signup failed: ' + err.message));
    });

    function showNotification(message) {
        elements.notificationText.textContent = message;
        elements.notification.classList.remove('hidden');
        elements.notification.classList.add('fade-in');
        setTimeout(() => elements.notification.classList.add('hidden'), 3000);
    }
});