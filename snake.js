document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. INITIALIZE SUPABASE ---
    // PASTE YOUR PROJECT URL RIGHT HERE:
    const supabaseUrl = 'YOUR_PROJECT_URL_HERE'; 
    const supabaseKey = 'sb_publishable_CJPxknccOv31U-so1seu4A_nFLcnHwI';
    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

    let highScores = [];

    async function fetchGlobalScores() {
        const { data, error } = await supabase
            .from('snake_scores')
            .select('player_name, score')
            .order('score', { ascending: false })
            .limit(5);

        if (error) {
            console.error("Error fetching scores:", error);
            return;
        }
        
        highScores = data;
        updateLeaderboardUI();
    }

    fetchGlobalScores();

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
            sClickCount = 0;
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
    const leaderboardList = document.getElementById('leaderboard-list');

    nameInput.value = localStorage.getItem('joshwuff_snakeCurrentName') || '';

    nameInput.addEventListener('input', () => {
        nameInput.value = nameInput.value.toUpperCase(); 
        localStorage.setItem('joshwuff_snakeCurrentName', nameInput.value);
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
            
            const { error } = await supabase
                .from('snake_scores')
                .insert([
                    { player_name: currentName, score: score }
                ]);

            if (error) {
                console.error("Error saving score:", error);
            } else {
                fetchGlobalScores(); 
            }
        }
    }

    function updateLeaderboardUI() {
        leaderboardList.innerHTML = '';
        if (highScores.length === 0) {
            leaderboardList.innerHTML = '<li style="justify-content:center; color: var(--text-secondary);">No Scores Yet!</li>';
        } else {
            highScores.forEach((entry, index) => {
                leaderboardList.innerHTML += `
                    <li>
                        <span style="color: var(--text-secondary); width: 25px;">#${index + 1}</span>
                        <span style="flex-grow: 1; color: var(--text-primary);">${entry.player_name}</span>
                        <span style="color: var(--accent);">${entry.score}</span>
                    </li>
                `;
            });
        }
    }

    startBtn.addEventListener('click', setupSnake);

    snakeClose.addEventListener('click', () => {
        snakeModal.classList.remove('active');
        clearInterval(gameLoop);
        checkHighScore();
    });

    snakeModal.addEventListener('click', (e) => {
        if (e.target === snakeModal) {
            snakeModal.classList.remove('active');
            clearInterval(gameLoop);
            checkHighScore();
        }
    });

    // --- 5. CONTROLS ---
    window.addEventListener('keydown', (e) => {
        if (!snakeModal.classList.contains('active')) return;
        if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].indexOf(e.key) > -1) { e.preventDefault(); }
        const direction = e.key.replace('Arrow', '');
        triggerDirection(direction);
    });

    let touchStartX = 0; let touchStartY = 0;
    canvas.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].screenX; touchStartY = e.changedTouches[0].screenY; }, {passive: true});
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); }, {passive: false});
    canvas.addEventListener('touchend', (e) => {
        let touchEndX = e.changedTouches[0].screenX; let touchEndY = e.changedTouches[0].screenY;
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

    const dpadBtns = document.querySelectorAll('.d-btn');
    dpadBtns.forEach(btn => {
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); triggerDirection(btn.getAttribute('data-dir')); }, {passive: false});
        btn.addEventListener('mousedown', (e) => { e.preventDefault(); triggerDirection(btn.getAttribute('data-dir')); });
    });
});
