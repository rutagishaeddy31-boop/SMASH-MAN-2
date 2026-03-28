/** * SMASH MAN 2.0 - CORE ENGINE
 * Features: Pilot Selection, 3D Physics, Live Sync
 */

// 1. CONFIG & DB
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

// 2. STATE VARIABLES
let myId = null;
let selectedColor = "#00f2ff";
let myData = { x: 2500, y: 2500, angle: 0, kills: 0, hp: 100, name: "" };
let players = {};
const keys = {};

// 3. SELECTION LOGIC
document.querySelectorAll('.pilot-option').forEach(opt => {
    opt.onclick = () => {
        document.querySelectorAll('.pilot-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        selectedColor = opt.dataset.color;
    };
});

document.getElementById('btn-join').onclick = () => {
    const name = document.getElementById('username').value;
    if(!name) return alert("Please enter a Pilot Name!");
    
    myId = "pilot_" + Math.random().toString(36).substr(2, 5);
    myData.name = name;
    
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('ui-name').innerText = name;
    
    startArena();
};

// 4. ARENA ENGINE
function startArena() {
    const myRef = db.ref('players/' + myId);
    myRef.set({ ...myData, color: selectedColor });
    myRef.onDisconnect().remove();

    // Listen for All Players
    db.ref('players').on('value', snap => {
        players = snap.val() || {};
        renderFrame();
    });

    // Listen for Combat
    db.ref('bullets').on('value', snap => {
        const bullets = snap.val() || {};
        renderBullets(bullets);
        checkCollisions(bullets);
    });

    requestAnimationFrame(gameLoop);
}

// 5. PHYSICS LOOP
function gameLoop() {
    if(!myId) return;
    
    let moved = false;
    const rotSpeed = 4;
    const moveSpeed = 8;

    if(keys['ArrowLeft']) { myData.angle -= rotSpeed; moved = true; }
    if(keys['ArrowRight']) { myData.angle += rotSpeed; moved = true; }
    
    if(keys['ArrowUp']) {
        const rad = (myData.angle - 90) * (Math.PI / 180);
        myData.x += Math.cos(rad) * moveSpeed;
        myData.y += Math.sin(rad) * moveSpeed;
        moved = true;
    }

    if(moved) {
        // Boundary Guard
        myData.x = Math.max(0, Math.min(5000, myData.x));
        myData.y = Math.max(0, Math.min(5000, myData.y));
        
        db.ref('players/' + myId).update({
            x: myData.x, y: myData.y, angle: myData.angle
        });
        
        // Dynamic Camera: Center the arena around the player
        const viewport = document.getElementById('floor-layer');
        viewport.style.left = (-myData.x + (window.innerWidth/2)) + 'px';
        viewport.style.top = (-myData.y + (window.innerHeight/2)) + 'px';
    }
    
    requestAnimationFrame(gameLoop);
}

// 6. RENDERING
function renderFrame() {
    const container = document.getElementById('entities-layer');
    Object.keys(players).forEach(id => {
        // Fix for "Line 56" crash: check if data exists before rendering
        if(!players[id]) return;

        let el = document.getElementById(id);
        if(!el) {
            el = document.createElement('div'); el.id = id; el.className = 'kart';
            el.innerHTML = `
                <div class="kart-body" style="background:${players[id].color}">
                    <div class="kart-cabin"></div>
                    <div class="kart-exhaust"></div>
                </div>
                <div class="player-tag">${players[id].name}</div>
            `;
            container.appendChild(el);
        }
        el.style.left = players[id].x + 'px';
        el.style.top = players[id].y + 'px';
        el.style.transform = `rotateZ(${players[id].angle}deg)`;
    });
    
    // Cleanup removed players
    document.querySelectorAll('.kart').forEach(node => {
        if(!players[node.id]) node.remove();
    });
}

// 7. INPUTS & SHOOTING
window.onkeydown = (e) => { 
    keys[e.key] = true;
    if(e.code === 'Space' && myId) {
        fireCannon();
    }
};
window.onkeyup = (e) => { keys[e.key] = false; };

function fireCannon() {
    const bId = "b_" + Date.now();
    const rad = (myData.angle - 90) * (Math.PI / 180);
    db.ref('bullets/' + bId).set({
        owner: myId,
        x: myData.x + 25,
        y: myData.y + 25,
        vx: Math.cos(rad) * 20,
        vy: Math.sin(rad) * 20
    });
    document.getElementById('sfx-fire').play();
    setTimeout(() => db.ref('bullets/' + bId).remove(), 1000);
}
