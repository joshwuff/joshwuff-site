document.addEventListener('DOMContentLoaded', () => {
    
    // --- SAFE STORAGE WRAPPER (Prevents Mobile Crashes) ---
    const safeStorage = {
        get: (key) => { try { return localStorage.getItem(key); } catch(e) { return null; } },
        set: (key, val) => { try { localStorage.setItem(key, val); } catch(e) { console.warn("Storage blocked"); } }
    };

    // --- 1. INITIALIZE SUPABASE ---
    const supabaseUrl = 'https://uxajnyzyjzmlxooybbxi.supabase.co'; 
    const supabaseKey = 'sb_publishable_CJPxknccOv31U-so1seu4A_nFLcnHwI';
    
    let supabase = null;
    let highScores = [];

    try {
        if (window.supabase) {
            supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
        }
    } catch (err) {
        console.warn("Supabase failed to load:", err);
    }

    function updateLeaderboardUI() {
        const leaderboardList = document.getElementById('leaderboard-list');
        if (!leaderboardList) return;
        
        leaderboardList.innerHTML = '';
        if (highScores.length === 0) {
            leaderboardList.innerHTML = '<li style="justify-content:center; color: var(--text-secondary);">No Scores Yet!</li>';
        } else {
            highScores.forEach((entry, index) => {
                leaderboardList.innerHTML += `
                    <li>
                        <span style="color: var(--text-secondary); width: 25px;">#${index + 1}</span>
                        <span style="flex-grow: 1; color: var(--text-primary); text-align: left;">${entry.player_name}</span>
                        <span style="color: var(--accent); font-weight: bold;">${entry.score}</span>
                    </li>
                `;
            });
        }
    }

    async function fetchGlobalScores() {
        if (!supabase) {
            updateLeaderboardUI();
            return; 
        }
        try {
            const { data, error } = await supabase
                .from('snake_scores')
                .select('player_name, score')
                .order('score', { ascending: false })
                .limit(5);

            if (error) throw error;
            highScores = data || [];
        } catch (e) {
            console.error("Fetch failed:", e);
        }
        updateLeaderboardUI();
    }

    // --- THE IOS SCROLL LOCK FIX ---
    let scrollPosition = 0;
    function lockScroll() {
        scrollPosition = window.scrollY;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollPosition}px`;
        document.body.style.width = '100%';
    }
    
    function unlockScroll() {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollPosition);
    }

    // --- 2. SNAKE MINIGAME TRIGGER ---
    const sTrigger = document.getElementById('snake-trigger');
    const snakeModal = document.getElementById('snake-modal');
    const snakeClose = document.getElementById('snake-close');
    let sClickCount = 0;
    let sClickTimer;

    sTrigger.addEventListener('click', () => {
        sClickCount++;
        clearTimeout(sClickTimer);
        sClickTimer = setTimeout(() => { sClickCount = 0; }, 2000);

        if (sClickCount === 5) {
            snakeModal.classList.add('active');
            lockScroll(); // This completely neutralizes the Apple scroll bug
            sClickCount = 0;
            fetchGlobalScores();
        }
    });

    // --- 3. SNAKE ENGINE ---
    const canvas = document.getElementById('snake-game');
    const ctx = canvas.getContext('2d');
    
    const gameSize = 400;
    const scale = 20;
    const rows = gameSize / scale;
    const columns = gameSize / scale;
    
    let snake = [];
    let snakeDirection = 'Right';
    let food;
    let gameLoop;
    let score = 0;
    
    const scoreElem = document.getElementById('snake-score');
    const nameInput = document.getElementById('snake-player-name');
    const startBtn = document.getElementById('snake-start');

    nameInput.value = safeStorage.get('joshwuff_snakeCurrentName') || '';

    nameInput.addEventListener('input', () => {
        nameInput.value = nameInput.value.toUpperCase(); 
        safeStorage.set('joshwuff_snakeCurrentName', nameInput.value);
    });
    
    // Fix iOS Hitbox Bug on Keyboard Close
    nameInput.addEventListener('blur', () => {
        window.scrollTo(0, 0); 
    });

    function setupSnake() {
        snake = [{ x: 5 * scale, y: 5 * scale }];
        snakeDirection = 'Right';
        score = 0;
        scoreElem.innerText = score;
        startBtn.innerText = "Restart Game";
        spawnFood();
        
        if (gameLoop) clearInterval(gameLoop);
        gameLoop = setInterval(updateSnake, 100);
    }

    function spawnFood() {
        food = {
            x: Math.floor(Math.random() * columns) * scale,
            y: Math.floor(Math.random() * rows) * scale
        };
    }

    function updateSnake() {
        let headX = snake[0].x;
        let headY = snake[0].y;

        if (snakeDirection === 'Right') headX += scale;
        if (snakeDirection === 'Left') headX -= scale;
        if (snakeDirection === 'Up') headY -= scale;
        if (snakeDirection === 'Down') headY += scale;

        if (headX >= gameSize) headX = 0;
        if (headX < 0) headX = gameSize - scale;
        if (headY >= gameSize) headY = 0;
        if (headY < 0) headY = gameSize - scale;

        for (let i = 0; i < snake.length; i++) {
            if (snake[i].x === headX && snake[i].y === headY) {
                clearInterval(gameLoop);
                startBtn.innerText = "Game Over! Play Again?";
                checkHighScore();
                return;
            }
        }

        let newHead = { x: headX, y: headY };
        snake.unshift(newHead);

        if (headX === food.x && headY === food.y) {
            score += 10;
            scoreElem.innerText = score;
            spawnFood();
        } else {
            snake.pop(); 
        }

        drawSnake();
    }

    function drawSnake() {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#ef4444'; 
        ctx.fillRect(food.x, food.y, scale, scale);

        for (let i = 0; i < snake.length; i++) {
            ctx.fillStyle = (i === 0) ? '#f8fafc' : '#94a3b8'; 
            ctx.fillRect(snake[i].x, snake[i].y, scale, scale);
            ctx.strokeStyle = '#0d0d12';
            ctx.strokeRect(snake[i].x, snake[i].y, scale, scale);
        }
    }

    // --- 4. CLOUD SAVE LOGIC ---
    async function checkHighScore() {
        if (score > 0) {
            let currentName = nameInput.value.trim().substring(0, 6) || 'ANON';
            
            if (supabase) {
                try {
                    const { error } = await supabase
                        .from('snake_scores')
                        .insert([{ player_name: currentName, score: score }]);

                    if (error) throw error;
                    fetchGlobalScores(); 
                } catch (e) {
                    console.error("Cloud save failed:", e);
                    fallbackLocalSave(currentName, score);
                }
            } else {
                fallbackLocalSave(currentName, score);
            }
        }
    }

    function fallbackLocalSave(name, scr) {
        highScores.push({ player_name: name, score: scr });
        highScores.sort((a, b) => b.score - a.score);
        highScores = highScores.slice(0, 5);
        updateLeaderboardUI();
    }

    // --- 5. NATIVE UI CONTROLS ---
    function closeGame() {
        snakeModal.classList.remove('active');
        unlockScroll(); // Give control back to the website
        clearInterval(gameLoop);
        checkHighScore();
    }

    // Hard-bind native clicks
    snakeClose.onclick = closeGame;
    startBtn.onclick = setupSnake;
    
    snakeModal.addEventListener('click', (e) => { 
        if (e.target === snakeModal) closeGame(); 
    });

    window.addEventListener('keydown', (e) => {
        if (!snakeModal.classList.contains('active')) return;
        if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].indexOf(e.key) > -1) { e.preventDefault(); }
        const direction = e.key.replace('Arrow', '');
        triggerDirection(direction);
    });

    // Swipe controls
    let touchStartX = 0; let touchStartY = 0;
    canvas.addEventListener('touchstart', (e) => { 
        touchStartX = e.touches[0].clientX; 
        touchStartY = e.touches[0].clientY; 
    }, {passive: true});
    
    canvas.addEventListener('touchend', (e) => {
        let touchEndX = e.changedTouches[0].clientX; 
        let touchEndY = e.changedTouches[0].clientY;
        handleSwipe(touchStartX, touchStartY, touchEndX, touchEndY);
    }, {passive: true});

    function handleSwipe(startX, startY, endX, endY) {
        let dx = endX - startX; let dy = endY - startY;
        if (Math.max(Math.abs(dx), Math.abs(dy)) > 30) {
            if (Math.abs(dx) > Math.abs(dy)) { triggerDirection(dx > 0 ? 'Right' : 'Left'); } 
            else { triggerDirection(dy > 0 ? 'Down' : 'Up'); }
        }
    }

    function triggerDirection(dir) {
        if (dir === 'Up' && snakeDirection !== 'Down') snakeDirection = 'Up';
        else if (dir === 'Down' && snakeDirection !== 'Up') snakeDirection = 'Down';
        else if (dir === 'Left' && snakeDirection !== 'Right') snakeDirection = 'Left';
        else if (dir === 'Right' && snakeDirection !== 'Left') snakeDirection = 'Right';
    }

    // D-Pad controls
    const dpadBtns = document.querySelectorAll('.d-btn');
    dpadBtns.forEach(btn => {
        btn.onpointerdown = (e) => { 
            e.preventDefault(); 
            triggerDirection(btn.getAttribute('data-dir')); 
        };
    });
});
