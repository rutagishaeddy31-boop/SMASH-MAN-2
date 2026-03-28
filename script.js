// 1. CONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyDiv4wVhq4dS0j_nOjzWo1LN8nmGBUvoxc",
  authDomain: "smash-man-2-0.firebaseapp.com",
  projectId: "smash-man-2-0",
  databaseURL: "https://smash-man-2-0-default-rtdb.firebaseio.com",
  storageBucket: "smash-man-2-0.firebasestorage.app",
  messagingSenderId: "726364748683",
  appId: "1:726364748683:web:33bc76e138241256ee0d8e"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// 2. GLOBALS
let myId = null;
let allBullets = {};
const loginBtn = document.getElementById('login-btn');

// 3. GUEST LOGIN FLOW
loginBtn.onclick = () => {
  myId = "guest-" + Math.floor(Math.random() * 10000);
  const myName = "Pilot_" + myId.split('-')[1];

  document.getElementById('auth-box').style.display = 'none';
  document.getElementById('hud').style.display = 'block';
  document.getElementById('player-name-ui').innerText = myName;

  startSync(myName);
};

// 4. MULTIPLAYER SYNC
function startSync(name) {
  const myRef = db.ref('players/' + myId);
  myRef.set({
    name: name, x: window.innerWidth/2, y: window.innerHeight/2,
    color: `hsl(${Math.random() * 360}, 70%, 60%)`, coins: 0
  });
  myRef.onDisconnect().remove();

  db.ref('players').on('value', snap => {
    const players = snap.val() || {};
    updateArena(players);
    if (allBullets) checkHits(allBullets, players);
  });

  db.ref('bullets').on('value', snap => {
    allBullets = snap.val() || {};
    updateBullets(allBullets);
  });
}

// 5. DRAWING
function updateArena(players) {
  const arena = document.getElementById('game-arena');
  Object.keys(players).forEach(id => {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id; el.className = 'kart';
      el.innerHTML = `<span class="player-name">${players[id].name}</span>`;
      arena.appendChild(el);
    }
    el.style.left = (players[id].x || 0) + 'px';
    el.style.top = (players[id].y || 0) + 'px';
    el.style.backgroundColor = players[id].color;
  });
  document.querySelectorAll('.kart').forEach(el => { if(!players[el.id]) el.remove(); });
}

function updateBullets(bullets) {
  const arena = document.getElementById('game-arena');
  Object.keys(bullets).forEach(id => {
    let bEl = document.getElementById(id);
    if (!bEl) {
      bEl = document.createElement('div');
      bEl.id = id; bEl.className = 'bullet';
      arena.appendChild(bEl);
    }
    bEl.style.left = (bullets[id].x || 0) + 'px';
    bEl.style.top = (bullets[id].y || 0) + 'px';
  });
  document.querySelectorAll('.bullet').forEach(el => { if(!bullets[el.id]) el.remove(); });
}

// 6. CONTROLS
window.addEventListener('keydown', e => {
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
      db.ref('bullets/' + bId).set({ owner: myId, x: data.x + 15, y: data.y + 15 });
      setTimeout(() => db.ref('bullets/' + bId).remove(), 1000);
    }
    myRef.update({ x: data.x, y: data.y });
  });
});

// 7. COLLISION (THE FIX FOR LINE 56)
function checkHits(bullets, players) {
  Object.keys(bullets).forEach(bId => {
    const b = bullets[bId];
    if (!b || b.x === undefined) return; // Guard clause

    Object.keys(players).forEach(pId => {
      if (b.owner === pId) return;
      const p = players[pId];
      if (!p || p.x === undefined) return; // Guard clause

      const dist = Math.sqrt(Math.pow(b.x - p.x, 2) + Math.pow(b.y - p.y, 2));
      if (dist < 35) {
        db.ref('bullets/' + bId).remove();
        db.ref('players/' + pId).update({ x: Math.random()*500, y: Math.random()*500 });
        db.ref('players/' + myId + '/coins').transaction(c => (c || 0) + 1);
      }
    });
  });
}

// 8. ANIMATION LOOP
setInterval(() => {
  if (allBullets) {
    Object.keys(allBullets).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.left = (parseFloat(el.style.left) + 15) + 'px';
    });
  }
}, 30);
