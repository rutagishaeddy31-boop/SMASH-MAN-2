// 1. CONFIGURATION
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
const db = firebase.database();

// 3. GLOBALS
let myId = null;
let allBullets = {}; 
const loginBtn = document.getElementById('login-btn');
const statusText = document.getElementById('status-text');

// 4. GUEST LOGIN (Bypasses Unauthorized Domain Error)
loginBtn.onclick = () => {
  statusText.innerText = "Entering Arena...";
  myId = "guest-" + Math.floor(Math.random() * 10000);
  
  const user = {
    uid: myId,
    displayName: "Pilot_" + myId.split('-')[1]
  };

  document.getElementById('auth-box').style.display = 'none';
  document.getElementById('hud').style.display = 'block';
  document.getElementById('player-name-ui').innerText = user.displayName;
  
  // Coin Listener
  db.ref('players/' + myId + '/coins').on('value', (snap) => {
    document.getElementById('coin-count').innerText = snap.val() || 0;
  });

  startPlayerSync(user);
};

// 5. MULTIPLAYER SYNC
function startPlayerSync(user) {
  const myRef = db.ref('players/' + myId);
  
  myRef.set({
    name: user.displayName,
    x: Math.random() * (window.innerWidth - 60),
    y: Math.random() * (window.innerHeight - 60),
    color: `hsl(${Math.random() * 360}, 70%, 60%)`,
    coins: 0
  });

  myRef.onDisconnect().remove();

  // Listen for Players
  db.ref('players').on('value', (snap) => {
    const players = snap.val() || {};
    drawArena(players);
    // CRITICAL: Only check collisions if we have data
    if (allBullets) checkCollisions(allBullets, players);
  });

  // Listen for Bullets
  db.ref('bullets').on('value', (snap) => {
    allBullets = snap.val() || {};
    renderProjectiles(allBullets);
  });
}

// 6. DRAWING FUNCTIONS
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
    el.style.left = (players[id].x || 0) + 'px';
    el.style.top = (players[id].y || 0) + 'px';
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
    bEl.style.left = (bullets[id].x || 0) + 'px';
    bEl.style.top = (bullets[id].y || 0) + 'px';
  });

  document.querySelectorAll('.bullet').forEach(el => {
    if (!bullets[el.id]) el.remove();
  });
}

// 7. CONTROLS
window.addEventListener('keydown', (e) => {
  if (!myId) return;
  const myRef = db.ref('players/' + myId);

  myRef.once('value').then(snap => {
    let data = snap.val();
    if (!data) return;
    const speed = 25;

    if (e.key === 'ArrowUp') data.y -= speed;
    if (e.key === 'ArrowDown') data.y += speed;
    if (e.key === 'ArrowLeft') data.x -= speed;
    if (e.key === 'ArrowRight') data.x += speed;
    
    if (e.code === 'Space') {
      const bId = 'b-' + Date.now();
      db.ref('bullets/' + bId).set({
        owner: myId,
        x: data.x + 15,
        y: data.y + 15
      });
      setTimeout(() => db.ref('bullets/' + bId).remove(), 1000);
    }
    myRef.update({ x: data.x, y: data.y });
  });
});

// 8. COLLISION LOGIC (PERMANENT FIX FOR LINE 56)
function checkCollisions(bullets, players) {
  Object.keys(bullets).forEach(bId => {
    const b = bullets[bId];
    // Guard Clause: Skip if bullet data is incomplete
    if (!b || b.x === undefined || b.y === undefined) return;

    Object.keys(players).forEach(pId => {
      if (b.owner === pId) return;
      const p = players[pId];
      // Guard Clause: Skip if player data is incomplete
      if (!p || p.x === undefined || p.y === undefined) return;

      const dist = Math.sqrt(Math.pow(b.x - p.x, 2) + Math.pow(b.y - p.y, 2));
      if (dist < 35) {
        handleHit(pId, bId);
      }
    });
  });
}

function handleHit(victimId, bulletId) {
  db.ref('bullets/' + bulletId).remove();
  db.ref('players/' + victimId).update({
    x: Math.random() * (window.innerWidth - 60),
    y: Math.random() * (window.innerHeight - 60)
  });
  // Reward the shooter
  db.ref('players/' + myId + '/coins').transaction(c => (c || 0) + 1);
}

// 9. BULLET MOVEMENT LOOP (Visual Only)
setInterval(() => {
  if (allBullets) {
    Object.keys(allBullets).forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        let curX = parseFloat(el.style.left) || 0;
        el.style.left = (curX + 12) + 'px';
      }
    });
  }
}, 30);
