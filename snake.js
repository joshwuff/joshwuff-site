document.addEventListener('DOMContentLoaded', () => {
    // --- SNAKE MINIGAME TRIGGER ---
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

    // --- SNAKE ENGINE & SCOREBOARD ---
    const canvas = document.getElementById('snake-game');
    const ctx = canvas.getContext('2d');
    const scale = 20;
    const rows = canvas.height / scale;
    const columns = canvas.width / scale;
    
    let snake = [];
    let snakeDirection = 'Right';
    let food;
    let gameLoop;
    let score = 0;
    
    // Load High Score from Local Storage
    let highScore = localStorage.getItem('joshwuff_snakeHighScore') || 0;
    
    const scoreElem = document.getElementById('snake-score');
    const highScoreElem = document.getElementById('snake-highscore');
    const startBtn = document.getElementById('snake-start');

    // Display initial high score
    highScoreElem.innerText = highScore;

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

        // Screen wrapping
        if (headX >= canvas.width) headX = 0;
        if (headX < 0) headX = canvas.width - scale;
        if (headY >= canvas.height) headY = 0;
        if (headY < 0) headY = canvas.height - scale;

        // Collision with self
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

        // Eating food
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
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#ef4444'; 
        ctx.fillRect(food.x, food.y, scale, scale);

        for (let i = 0; i < snake.length; i++) {
            ctx.fillStyle = (i === 0) ? '#f8fafc' : '#94a3b8'; 
            ctx.fillRect(snake[i].x, snake[i].y, scale, scale);
            ctx.strokeStyle = '#0d0d12';
            ctx.strokeRect(snake[i].x, snake[i].y, scale, scale);
        }
    }

    function checkHighScore() {
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('joshwuff_snakeHighScore', highScore);
            highScoreElem.innerText = highScore;
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

    window.addEventListener('keydown', (e) => {
        if (!snakeModal.classList.contains('active')) return;
        
        if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].indexOf(e.key) > -1) {
            e.preventDefault();
        }

        const direction = e.key.replace('Arrow', '');
        
        if (direction === 'Up' && snakeDirection !== 'Down') snakeDirection = 'Up';
        else if (direction === 'Down' && snakeDirection !== 'Up') snakeDirection = 'Down';
        else if (direction === 'Left' && snakeDirection !== 'Right') snakeDirection = 'Left';
        else if (direction === 'Right' && snakeDirection !== 'Left') snakeDirection = 'Right';
    });
});
