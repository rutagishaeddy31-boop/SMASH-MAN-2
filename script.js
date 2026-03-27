const firebaseConfig = {
  apiKey: "AIzaSyDiv4wVhq4dS0j_nOjzWo1LN8nmGBUvoxc",
  authDomain: "smash-man-2-0.firebaseapp.com",
  projectId: "smash-man-2-0",
  storageBucket: "smash-man-2-0.firebasestorage.app",
  messagingSenderId: "726364748683",
  appId: "1:726364748683:web:33bc76e138241256ee0d8e"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

const loginBtn = document.getElementById('login-btn');
const statusText = document.getElementById('status-text');

loginBtn.onclick = () => {
  statusText.innerText = "Connecting...";
  auth.signInWithPopup(provider)
    .then((result) => {
      statusText.innerText = "Welcome " + result.user.displayName;
      loginBtn.style.display = 'none';
    })
    .catch((error) => {
      alert("Error: " + error.message);
      statusText.innerText = "Arena Status: Offline";
    });
};
