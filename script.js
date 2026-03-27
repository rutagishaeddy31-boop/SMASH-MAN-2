// 1. CONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyDiv4wVhq4dS0j_nOjzWo1LN8nmGBUvoxc",
  authDomain: "smash-man-2-0.firebaseapp.com",
  projectId: "smash-man-2-0",
  storageBucket: "smash-man-2-0.firebasestorage.app",
  messagingSenderId: "726364748683",
  appId: "1:726364748683:web:33bc76e138241256ee0d8e"
};

// 2. INITIALIZE FIREBASE
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();
const provider = new firebase.auth.GoogleAuthProvider();

// 3. GLOBALS
let myId = null;
const loginBtn = document.getElementById('login-btn');
const statusText = document.getElementById('status-text');
let allBullets = {}; // Keep track of bullets for collision detection

// 4. LOGIN LOGIC
loginBtn.onclick = () => {
  statusText.innerText = "Connecting to Google...";
  
  auth.signInWithPopup(provider)
    .then((result) => {
      const user = result.user;
      myId = user.uid;

      // Update UI
      document.getElementById('auth-box').style.display = 'none';
      document.getElementById('hud').style.display = 'block';
      document.getElementById('player-name-ui').innerText = user.displayName;
      
      // Listen for my own coin updates
      db.ref('players/' + myId + '/coins').on('value', (snap) => {
        document.getElementById('coin-count').innerText = snap.val() || 0;
      });

      startPlayerSync(user);
    })
    .catch((err) => {
      console.error("Login Error:", err);
      statusText.innerText = "Login Failed: " + err.code;
    });
};

// 5. MULTIPLAYER SYNC
function startPlayerSync(user) {
  const myRef = db.ref('players/' + myId);
  
  // Set initial player data
  myRef.set({
    name: user.displayName,
    x: Math.random() * (window.innerWidth - 50),
    y: Math.random() * (window.innerHeight - 50),
    color: `hsl(${Math.random() * 360}, 70%, 60%)`,
    coins: 0
  });

  myRef.onDisconnect().remove();

  // Listen for all players
  db.ref('players').on('value', (snapshot) => {
    const players = snapshot.val() || {};
    drawArena(players);
    if (allBullets) checkCollisions(allBullets, players);
  });

  // Listen for all bullets
  db.ref('bullets').on('value', (snapshot) => {
    allBullets = snapshot.val() || {};
    renderProjectiles(allBullets);
  });
}

// 6. DRAWING THE WORLD
function drawArena(players) {
  const canvas = document.getElementById('game-canvas');
  
  Object.keys(players).forEach(id => {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.className = 'kart';
      el.innerHTML = `<span class="player-name">${players[id].name}</span>`;
      canvas.appendChild(el);
    }
    el.style.left = players[id].x + 'px';
    el.style.top = players[id].y + 'px';
    el.style.background = players[id].color;
  });

  document.querySelectorAll('.kart').forEach(el => {
    if (!players[el.id]) el.remove();
  });
}

function renderProjectiles(bullets) {
  const canvas = document.getElementById('game-canvas');
  Object.keys(bullets).forEach(id => {
    let bEl = document.getElementById(id);
    if (!bEl) {
      bEl = document.createElement('div');
      bEl.id = id;
      bEl.className = 'bullet';
      canvas.appendChild(bEl);
    }
    bEl.style.left = bullets[id].x + 'px';
    bEl.style.top = bullets[id].y + 'px';
  });

  document.querySelectorAll('.bullet').forEach(el => {
    if (!bullets[el.id]) el.remove();
  });
}

// 7. CONTROLS (Movement & Shooting)
window.addEventListener('keydown', (e) => {
  if (!myId) return;
  const myRef = db.ref('players/' + myId);

  myRef.once('value').then(snap => {
    let data = snap.val();
    if (!data) return;
    const speed = 20;

    // Movement
    if (e.key === 'ArrowUp') data.y -= speed;
    if (e.key === 'ArrowDown') data.y += speed;
    if (e.key === 'ArrowLeft') data.x -= speed;
    if (e.key === 'ArrowRight') data.x += speed;
    
    // Shooting (Spacebar)
    if (e.code === 'Space') {
      const bulletId = 'b-' + Date.now();
      db.ref('bullets/' + bulletId).set({
        owner: myId,
        x: data.x + 20,
        y: data.y + 20,
        velocityX: 20
      });
      setTimeout(() => db.ref('bullets/' + bulletId).remove(), 2000);
    }

    myRef.update({ x: data.x, y: data.y });
  });
});

// 8. COMBAT LOGIC
function checkCollisions(bullets, players) {
  Object.keys(bullets).forEach(bId => {
    const b = bullets[bId];
    Object.keys(players).forEach(pId => {
      if (b.owner === pId) return;
      const p = players[pId];
      const dist = Math.sqrt(Math.pow(b.x - p.x, 2) + Math.pow(b.y - p.y, 2));
      if (dist < 35) handleHit(pId, bId);
    });
  });
}

function handleHit(victimId, bulletId) {
  db.ref('bullets/' + bulletId).remove();
  db.ref('players/' + victimId).update({
    x: Math.random() * (window.innerWidth - 50),
    y: Math.random() * (window.innerHeight - 50)
  });
  if (myId) {
    db.ref('players/' + myId + '/coins').transaction(c => (c || 0) + 2);
  }
}
