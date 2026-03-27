// 1. YOUR CONFIG (Verify these match your Firebase Console)
const firebaseConfig = {
  apiKey: "AIzaSyDiv4wVhq4dS0j_nOjzWo1LN8nmGBUvoxc",
  authDomain: "smash-man-2-0.firebaseapp.com",
  projectId: "smash-man-2-0",
  storageBucket: "smash-man-2-0.firebasestorage.app",
  messagingSenderId: "726364748683",
  appId: "1:726364748683:web:33bc76e138241256ee0d8e"
};

// 2. INITIALIZE
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();
const provider = new firebase.auth.GoogleAuthProvider();

// 3. ELEMENTS
const loginBtn = document.getElementById('login-btn');
const statusText = document.getElementById('status-text');

// 4. LOGIN ACTION
loginBtn.onclick = () => {
  statusText.innerText = "Connecting to Google...";
  
  auth.signInWithPopup(provider)
    .then((result) => {
      const user = result.user;
      statusText.innerText = `Welcome, Pilot ${user.displayName}!`;
      loginBtn.style.display = 'none'; // Clear the UI for the game
      
      // Start syncing to Realtime Database
      startPlayerSync(user);
    })
    .catch((err) => {
      console.error(err);
      statusText.innerText = "Login Failed. Check Console.";
    });
};

function startPlayerSync(user) {
  // This tells the database: "I am here at this position"
  db.ref('players/' + user.uid).set({
    name: user.displayName,
    x: 400,
    y: 300,
    angle: 0,
    lastSeen: Date.now()
  });
}
// 1. GLOBALS FOR TRACKING
let myId = null;
const otherPlayers = {}; // Stores the visual elements of other karts

// 2. UPDATED SYNC LOGIC
function startPlayerSync(user) {
  myId = user.uid;
  
  // Set initial position in DB
  const myRef = db.ref('players/' + myId);
  myRef.set({
    name: user.displayName,
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    color: `hsl(${Math.random() * 360}, 70%, 60%)`
  });

  // REMOVE ME WHEN I DISCONNECT (Important!)
  myRef.onDisconnect().remove();

  // 3. LISTEN FOR ALL PLAYERS (The Multiplayer Secret)
  db.ref('players').on('value', (snapshot) => {
    const players = snapshot.val() || {};
    drawArena(players);
  });
}

// 4. THE ARENA RENDERER
function drawArena(players) {
  const canvas = document.getElementById('game-canvas');
  
  Object.keys(players).forEach(id => {
    let el = document.getElementById(id);
    
    // If player doesn't have a "Kart" on screen yet, create it
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.className = 'kart';
      el.innerHTML = `<span class="player-name">${players[id].name}</span>`;
      canvas.appendChild(el);
    }
    
    // Update position and color
    el.style.left = players[id].x + 'px';
    el.style.top = players[id].y + 'px';
    el.style.background = players[id].color || '#f39c12';
  });
  
  // Clean up karts of players who left
  document.querySelectorAll('.kart').forEach(el => {
    if (!players[el.id]) el.remove();
  });
}

// 5. KEYBOARD CONTROLS (Movement)
window.addEventListener('keydown', (e) => {
  if (!myId) return;
  const myRef = db.ref('players/' + myId);
  
  myRef.once('value').then(snap => {
    let data = snap.val();
    const speed = 15;
    
    if (e.key === 'ArrowUp') data.y -= speed;
    if (e.key === 'ArrowDown') data.y += speed;
    if (e.key === 'ArrowLeft') data.x -= speed;
    if (e.key === 'ArrowRight') data.x += speed;
    
    myRef.update({ x: data.x, y: data.y });
  });
});
