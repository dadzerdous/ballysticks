
import { Config, Utils } from './config.js';
import { Physics } from './physics.js';
import { LevelMaker } from './level.js';
import { Ball } from './ball.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const uiScore = document.getElementById('score');
const uiStatus = document.getElementById('status');
const uiZone = document.getElementById('zone-name');
const uiBest = document.getElementById('best-score');

let width, height;
let ball, level;

class Game {
    constructor() {
        this.state = 0; // 0:Lobby, 1:Playing, 2:GameOver
        this.cameraY = 0;
        this.score = 0;
        this.bestScore = localStorage.getItem('canyon_best') || 0;
        this.aimAngle = -Math.PI / 2;
        this.aimDir = 1;
        this.shake = 0;
        this.inputDown = false;
    }

    init() {
        resize();
        ball = new Ball(width/2, height - 50);
        level = new LevelMaker(width, height);
        level.reset();
        this.enterLobby();
        loop();
    }

    enterLobby() {
        this.state = 0;
        this.cameraY = 0;
        this.score = 0;
        
        ball.x = width/2; ball.y = height-50;
        ball.vx = 0; ball.vy = 0;
        ball.isStuck = true; 
        ball.stuckSide = 'floor'; 
        ball.color = '#00ffcc';
        
        level.reset();
        this.updateUI();
    }

    handleInput(isDown) {
        if (isDown) {
            if (this.state === 2) { this.enterLobby(); return; }
            if (this.state === 0) { this.state = 1; this.updateUI(); }
            this.inputDown = true;
        } else {
            this.inputDown = false;
            if (this.state === 1 && ball.isStuck) ball.launch(this.aimAngle);
        }
    }

    update() {
        if (this.state !== 1) return;

        // 1. Aim Logic
        if (this.inputDown) this.updateAim();

        // 2. Physics & Collision
        ball.update();

        // Screen Walls
        if (ball.x < ball.radius) { ball.x = ball.radius; ball.vx *= -0.5; }
        if (ball.x > width - ball.radius) { ball.x = width - ball.radius; ball.vx *= -0.5; }

        // Building Collisions
        for (let b of level.buildings) {
            let col = Physics.checkCollision(ball, b);
            if (col.hit) {
                let side = Physics.resolve(ball, b); // Pushes ball out
                
                if (this.inputDown) {
                    // STICK
                    ball.isStuck = true;
                    ball.vx = 0; ball.vy = 0;
                    ball.stuckObject = b;
                    ball.stuckSide = side;
                    ball.color = '#00ffcc';
                    this.shake = 5;
                } else {
                    // BOUNCE
                    ball.bounce(side);
                }
                break;
            }
        }

        // 3. Camera
        const targetY = ball.y - height * 0.6;
        if (targetY < this.cameraY) this.cameraY += (targetY - this.cameraY) * 0.1;
        
        level.generate(this.cameraY);

        // 4. Score
        let currentH = Math.floor(Math.abs(ball.y - (height - 50)) / 10);
        if (currentH > this.score) this.score = currentH;
        this.updateZone();

        // 5. Death
        if (ball.y - this.cameraY > height + 100) this.gameOver();
        
        // Shake Decay
        if (this.shake > 0) this.shake *= 0.9;
        if (this.shake < 0.5) this.shake = 0;
    }

    updateAim() {
        this.aimAngle += Config.aimSpeed * this.aimDir;
        let min = -Math.PI + 0.2, max = -0.2;
        
        // Smart Aiming Limits
        if (ball.stuckSide === 'left_wall') min = -Math.PI/2 + 0.2; 
        else if (ball.stuckSide === 'right_wall') max = -Math.PI/2 - 0.2; 
        
        if (this.aimAngle > max) { this.aimAngle = max; this.aimDir = -1; }
        if (this.aimAngle < min) { this.aimAngle = min; this.aimDir = 1; }
        
        if (this.aimAngle > max + 0.5 || this.aimAngle < min - 0.5) this.aimAngle = (min+max)/2;
    }

    updateZone() {
        let active = Config.zones[0];
        for(let z of Config.zones) if (this.score >= z.h) active = z;
        uiZone.innerText = active.name;
        uiZone.style.textShadow = `0 0 10px rgb(${active.color.join(',')})`;
    }

    gameOver() {
        this.state = 2;
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('canyon_best', this.bestScore);
        }
        this.updateUI();
    }

    updateUI() {
        uiBest.innerText = `Best: ${this.bestScore}`;
        uiScore.innerText = `Height: ${this.score}`;
        if (this.state === 0) { uiStatus.innerText = "HOLD to Aim"; uiStatus.style.color = "#00ffcc"; }
        else if (this.state === 1) uiStatus.innerText = "";
        else if (this.state === 2) { uiStatus.innerText = "Tap to Restart"; uiStatus.style.color = "#ff3333"; }
    }

    draw() {
        // Background Color Logic
        let active = Config.zones[0];
        for(let z of Config.zones) if (this.score >= z.h) active = z;
        ctx.fillStyle = `rgb(${active.color.join(',')})`;
        ctx.fillRect(0, 0, width, height);

        ctx.save();
        
        // Screen Shake
        if (this.shake > 0) ctx.translate((Math.random()-0.5)*this.shake, (Math.random()-0.5)*this.shake);
        
        level.draw(ctx, this.cameraY, this.score);

        // Predictive Trajectory
        if (this.state === 1 && this.inputDown && ball.isStuck) {
            ctx.beginPath();
            ctx.moveTo(ball.x, ball.y - this.cameraY);
            let sx = ball.x, sy = ball.y, svx = Math.cos(this.aimAngle)*Config.jumpPower, svy = Math.sin(this.aimAngle)*Config.jumpPower;
            for(let i=0; i<15; i++) {
                svy += Config.gravity; svx *= Config.friction; svy *= Config.friction;
                sx += svx; sy += svy;
                ctx.lineTo(sx, sy - this.cameraY);
            }
            ctx.strokeStyle = '#ff0055'; ctx.lineWidth = 3; ctx.stroke();
        }

        ball.draw(ctx, this.cameraY);
        ctx.restore();

        // Game Over Screen
        if (this.state === 2) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0,0,width,height);
            ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '30px Courier';
            ctx.fillText("FALLEN", width/2, height/2);
        }
    }
}

// --- BOOTSTRAP ---
const game = new Game();

function resize() { 
    width = canvas.width = window.innerWidth; 
    height = canvas.height = window.innerHeight; 
}
window.addEventListener('resize', () => { resize(); game.enterLobby(); });

// Input Handling
const onDown = () => game.handleInput(true);
const onUp = () => game.handleInput(false);

window.addEventListener('mousedown', onDown);
window.addEventListener('mouseup', onUp);
canvas.addEventListener('touchstart', e => { e.preventDefault(); onDown(); }, {passive:false});
canvas.addEventListener('touchend', e => { e.preventDefault(); onUp(); }, {passive:false});

function loop() {
    game.update();
    game.draw();
    requestAnimationFrame(loop);
}

// Start
game.init();
