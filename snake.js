document.addEventListener('DOMContentLoaded', () => {
    
    // --- SAFE STORAGE WRAPPER ---
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
        if (window.supabase) supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
    } catch (err) {
        console.warn("Supabase failed to load:", err);
    }

    // UI Elements
    const screenLeaderboard = document.getElementById('screen-leaderboard');
    const screenGame = document.getElementById('snake-game');
    const screenGameover = document.getElementById('screen-gameover');
    const leaderboardList = document.getElementById('leaderboard-list');
    const scoreElem = document.getElementById('snake-score');
    const finalScoreElem = document.getElementById('final-score');
    const nameInput = document.getElementById('snake-player-name');
    const mobileDpad = document.getElementById('mobile-dpad');
    
    // Buttons
    const btnStart = document.getElementById('btn-start');
    const btnSubmit = document.getElementById('btn-submit');
    const btnMenu = document.getElementById('btn-menu');
    const snakeClose = document.getElementById('snake-close');
    const snakeModal = document.getElementById('snake-modal');

    // Display Management
    function switchScreen(screenElement) {
        screenLeaderboard.style.display = 'none';
        screenGame.style.display = 'none';
        screenGameover.style.display = 'none';
        
        // Use CSS grid display instead of flex for the new symmetrical D-pad
        mobileDpad.style.display = 'none';
        
        screenElement.style.display = (screenElement === screenGame) ? 'block' : 'flex';
        
        // Only show D-pad if game is active AND we are on a small screen
        if (screenElement === screenGame && window.innerWidth <= 600) {
            mobileDpad.style.display = 'grid'; // ACTIVATES THE GRID HITBOXES
        }
    }

    async function fetchGlobalScores() {
        if (!supabase) {
            leaderboardList.innerHTML = '<li style="justify-content:center; color: var(--text-secondary);">Database Offline</li>';
            return;
        }
        
        leaderboardList.innerHTML = '<li style="justify-content:center; color: var(--text-secondary);">Loading...</li>';
        
        try {
            const { data, error } = await supabase
                .from('snake_scores')
                .select('player_name, score')
                .order('score', { ascending: false })
                .limit(5);

            if (error) throw error;
            highScores = data || [];
            
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
        } catch (e) {
            console.error("Fetch failed:", e);
            leaderboardList.innerHTML = '<li style="justify-content:center; color: var(--text-secondary);">Failed to load scores</li>';
        }
    }

    // THE IOS SCROLL LOCK FIX
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

    // --- 2. EASTER EGG TRIGGER ---
    const sTrigger = document.getElementById('snake-trigger');
    let sClickCount = 0;
    let sClickTimer;

    sTrigger.addEventListener('click', () => {
        sClickCount++;
        clearTimeout(sClickTimer);
        sClickTimer = setTimeout(() => { sClickCount = 0; }, 2000);

        if (sClickCount === 5) {
            snakeModal.classList.add('active');
            lockScroll();
            sClickCount = 0;
            switchScreen(screenLeaderboard);
            fetchGlobalScores();
        }
    });

    // --- 3. SNAKE ENGINE ---
    const canvas = screenGame;
    const ctx = canvas.getContext('2d');
    const gameSize = 400;
    const scale = 20;
    const rows = gameSize / scale;
    const columns = gameSize / scale;
    
    let snake = [];
    let snakeDirection = 'Right';
    let directionQueue = [];
    let food;
    let gameLoop;
    let score = 0;

    nameInput.value = safeStorage.get('joshwuff_snakeCurrentName') || '';
    nameInput.addEventListener('input', () => {
        nameInput.value = nameInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        safeStorage.set('joshwuff_snakeCurrentName', nameInput.value);
    });
    nameInput.addEventListener('blur', () => window.scrollTo(0, 0));

    function setupSnake() {
        snake = [{ x: 5 * scale, y: 5 * scale }];
        snakeDirection = 'Right';
        directionQueue = [];
        score = 0;
        scoreElem.innerText = score;
        switchScreen(screenGame);
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

    function handleGameOver() {
        clearInterval(gameLoop);
        finalScoreElem.innerText = score;
        switchScreen(screenGameover);
    }

    function updateSnake() {
        if (directionQueue.length > 0) {
            snakeDirection = directionQueue.shift();
        }

        let headX = snake[0].x;
        let headY = snake[0].y;

        if (snakeDirection === 'Right') headX += scale;
        if (snakeDirection === 'Left') headX -= scale;
        if (snakeDirection === 'Up') headY -= scale;
        if (snakeDirection === 'Down') headY += scale;

        // WALL COLLISION
        if (headX >= gameSize || headX < 0 || headY >= gameSize || headY < 0) {
            handleGameOver();
            return;
        }

        // SELF COLLISION
        for (let i = 0; i < snake.length; i++) {
            if (snake[i].x === headX && snake[i].y === headY) {
                handleGameOver();
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

    // --- 4. SUBMIT SCORE LOGIC ---
    btnSubmit.addEventListener('click', async () => {
        let currentName = nameInput.value.trim() || 'ANON';
        if (score > 0 && supabase) {
            btnSubmit.innerText = "Saving...";
            try {
                const { error } = await supabase.from('snake_scores').insert([{ player_name: currentName, score: score }]);
                if (error) throw error;
            } catch (e) {
                console.error("Cloud save failed:", e);
            }
            btnSubmit.innerText = "Submit Score";
        }
        switchScreen(screenLeaderboard);
        fetchGlobalScores();
    });

    btnMenu.addEventListener('click', () => {
        switchScreen(screenLeaderboard);
        fetchGlobalScores();
    });

    btnStart.addEventListener('click', setupSnake);

    // --- 5. CLEAN UI CONTROLS & QUEUEING ---
    function closeModal() {
        snakeModal.classList.remove('active');
        unlockScroll();
        clearInterval(gameLoop);
    }

    snakeClose.onclick = closeModal;
    snakeModal.addEventListener('click', (e) => { if (e.target === snakeModal) closeModal(); });

    // The Input Queue Manager
    function triggerDirection(dir) {
        let lastDir = directionQueue.length > 0 ? directionQueue[directionQueue.length - 1] : snakeDirection;
        
        if (dir === 'Up' && lastDir !== 'Down') directionQueue.push('Up');
        else if (dir === 'Down' && lastDir !== 'Up') directionQueue.push('Down');
        else if (dir === 'Left' && lastDir !== 'Right') directionQueue.push('Left');
        else if (dir === 'Right' && lastDir !== 'Left') directionQueue.push('Right');
    }

    // Desktop Keyboard
    window.addEventListener('keydown', (e) => {
        if (screenGame.style.display === 'none') return;
        if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].indexOf(e.key) > -1) e.preventDefault();
        triggerDirection(e.key.replace('Arrow', ''));
    });

    // Mobile D-Pad (The Hitbox Fix)
    const dpadCells = document.querySelectorAll('.d-cell');
    dpadCells.forEach(cell => {
        const visualBtn = cell.querySelector('.d-btn');
        
        cell.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Kills scrolling
            visualBtn.style.background = 'var(--accent)'; // Manual color feedback
            triggerDirection(cell.getAttribute('data-dir'));
        }, {passive: false});
        
        cell.addEventListener('touchend', (e) => {
            e.preventDefault();
            visualBtn.style.background = ''; // Clears the color
        });
    });
});
