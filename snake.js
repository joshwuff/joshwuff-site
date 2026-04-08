document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. INITIALIZE SUPABASE ---
    const supabaseUrl = 'https://uxajnyzyjzmlxooybbxi.supabase.co'; 
    const supabaseKey = 'sb_publishable_CJPxknccOv31U-so1seu4A_nFLcnHwI';
    let supabase = null;

    try {
        if (window.supabase) {
            supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
        }
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
    
    const btnStart = document.getElementById('btn-start');
    const btnSubmit = document.getElementById('btn-submit');
    const btnMenu = document.getElementById('btn-menu');
    const snakeClose = document.getElementById('snake-close');
    const snakeModal = document.getElementById('snake-modal');

    function switchScreen(screenElement) {
        screenLeaderboard.style.display = 'none';
        screenGame.style.display = 'none';
        screenGameover.style.display = 'none';
        screenElement.style.display = (screenElement === screenGame) ? 'block' : 'flex';
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
            
            leaderboardList.innerHTML = '';
            if (!data || data.length === 0) {
                leaderboardList.innerHTML = '<li style="justify-content:center; color: var(--text-secondary);">No Scores Yet!</li>';
            } else {
                data.forEach((entry, index) => {
                    leaderboardList.innerHTML += `
                        <li>
                            <span style="color: var(--text-secondary); width: 25px;">#${index + 1}</span>
                            <span style="flex-grow: 1; color: var(--text-primary); text-align: left;">${entry.player_name}</span>
                            <span style="color: var(--accent); font-weight: bold;">${entry.score}</span>
                        </li>`;
                });
            }
        } catch (e) {
            console.error(e);
            leaderboardList.innerHTML = '<li style="justify-content:center; color: var(--text-secondary);">Error loading scores</li>';
        }
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
    let food;
    let gameLoop;
    let score = 0;

    function setupSnake() {
        snake = [{ x: 5 * scale, y: 5 * scale }];
        snakeDirection = 'Right';
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
        let headX = snake[0].x;
        let headY = snake[0].y;
        if (snakeDirection === 'Right') headX += scale;
        else if (snakeDirection === 'Left') headX -= scale;
        else if (snakeDirection === 'Up') headY -= scale;
        else if (snakeDirection === 'Down') headY += scale;

        if (headX >= gameSize || headX < 0 || headY >= gameSize || headY < 0) return handleGameOver();
        for (let i = 0; i < snake.length; i++) {
            if (snake[i].x === headX && snake[i].y === headY) return handleGameOver();
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

    // --- 4. INPUT CONTROLS ---
    
    function changeDirection(newDir) {
        if (newDir === 'Up' && snakeDirection !== 'Down') snakeDirection = 'Up';
        else if (newDir === 'Down' && snakeDirection !== 'Up') snakeDirection = 'Down';
        else if (newDir === 'Left' && snakeDirection !== 'Right') snakeDirection = 'Left';
        else if (newDir === 'Right' && snakeDirection !== 'Left') snakeDirection = 'Right';
    }

    // Desktop Keyboard
    window.addEventListener('keydown', (e) => {
        if (screenGame.style.display === 'none') return;
        if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].indexOf(e.key) > -1) e.preventDefault();
        changeDirection(e.key.replace('Arrow', ''));
    });

    // Mobile Buttons (Using pointerdown for better touch response)
    const buttonMap = { 'ctrl-up': 'Up', 'ctrl-down': 'Down', 'ctrl-left': 'Left', 'ctrl-right': 'Right' };
    Object.keys(buttonMap).forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                changeDirection(buttonMap[id]);
            }, { passive: false });
        }
    });

    // Mobile Swiping on Canvas
    let touchStartX = 0;
    let touchStartY = 0;
    screenGame.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    screenGame.addEventListener('touchend', (e) => {
        if (screenGame.style.display === 'none') return;
        let dx = e.changedTouches[0].screenX - touchStartX;
        let dy = e.changedTouches[0].screenY - touchStartY;
        if (Math.abs(dx) > 30 || Math.abs(dy) > 30) {
            if (Math.abs(dx) > Math.abs(dy)) changeDirection(dx > 0 ? 'Right' : 'Left');
            else changeDirection(dy > 0 ? 'Down' : 'Up');
        }
    });

    // --- 5. SYSTEM HANDLERS ---
    btnSubmit.addEventListener('click', async () => {
        let currentName = nameInput.value.trim().toUpperCase() || 'ANON';
        if (score > 0 && supabase) {
            btnSubmit.innerText = "Saving...";
            try {
                await supabase.from('snake_scores').insert([{ player_name: currentName, score: score }]);
            } catch (e) { console.error(e); }
            btnSubmit.innerText = "Submit Score";
        }
        switchScreen(screenLeaderboard);
        fetchGlobalScores();
    });

    btnMenu.addEventListener('click', () => { switchScreen(screenLeaderboard); fetchGlobalScores(); });
    btnStart.addEventListener('click', setupSnake);
    
    function closeModal() { 
        snakeModal.classList.remove('active'); 
        clearInterval(gameLoop); 
    }
    
    snakeClose.addEventListener('click', closeModal);
    snakeModal.addEventListener('click', (e) => { if (e.target === snakeModal) closeModal(); });
});
