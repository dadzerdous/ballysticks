import { Config, GameState, Utils } from './config.js'; // Import GameState
import { Physics } from './physics.js';
import { LevelMaker } from './level.js';
import { Ball } from './ball.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const uiScore = document.getElementById('score');
const uiStatus = document.getElementById('status');
const uiZone = document.getElementById('zone-name');
const uiBest = document.getElementById('best-score');

// Add Coin UI
const coinUI = document.createElement('div');
coinUI.style.position = 'absolute';
coinUI.style.top = '50px';
coinUI.style.left = '20px';
coinUI.style.color = '#FFD700';
coinUI.style.fontFamily = 'Courier New';
coinUI.style.fontWeight = 'bold';
document.body.appendChild(coinUI);

let width, height;
let ball, level;

class Game {
    constructor() {
        this.state = 0; 
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
        this.updateCoinUI();
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

        if (this.inputDown) this.updateAim();

        ball.update();

        // Screen Walls
        if (ball.x < ball.radius) { ball.x = ball.radius; ball.vx *= -0.5; }
        if (ball.x > width - ball.radius) { ball.x = width - ball.radius; ball.vx *= -0.5; }

        // Update Level (Moving walls)
        level.update();

        // Building Collisions
        for (let b of level.buildings) {
            let col = Physics.checkCollision(ball, b);
            if (col.hit) {
                let side = Physics.resolve(ball, b);
                
                if (this.inputDown) {
                    ball.isStuck = true;
                    ball.vx = 0; ball.vy = 0;
                    ball.stuckObject = b;
                    ball.stuckSide = side;
                    ball.color = '#00ffcc';
                    this.shake = 5;
                } else {
                    ball.bounce(side);
                }
                break;
            }
        }

        // Stick to Moving Wall Logic
        if (ball.isStuck && ball.stuckObject && ball.stuckObject.vx) {
             // If the wall moves, the ball moves with it
             ball.x += ball.stuckObject.vx;
        }

        // Coin Collection
        for (let c of level.coins) {
            if (!c.collected) {
                let dx = ball.x - c.x;
                let dy = ball.y - c.y;
                let dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < ball.radius + c.radius) {
                    c.collected = true;
                    GameState.currency++;
                    GameState.save();
                    this.updateCoinUI();
                    // Optional: Play sound or particle here
                }
            }
        }

        const targetY = ball.y - height * 0.6;
        if (targetY < this.cameraY) this.cameraY += (targetY - this.cameraY) * 0.1;
        
        level.generate(this.cameraY);

        let currentH = Math.floor(Math.abs(ball.y - (height - 50)) / 10);
        if (currentH > this.score) this.score = currentH;
        this.updateZone();

        if (ball.y - this.cameraY > height + 100) this.gameOver();
        
        if (this.shake > 0) this.shake *= 0.9;
        if (this.shake < 0.5) this.shake = 0;
    }

updateAim() {
        this.aimAngle += Config.aimSpeed * this.aimDir;
        
        // Default Range (Air/Floor/Ceiling): Almost full circle (-170 to -10 degrees)
        let min = -Math.PI + 0.1; 
        let max = -0.1;
        
        // WIDENED RANGES FOR WALLS
        if (ball.stuckSide === 'left_wall') {
            // Stuck on Left Wall: Allow shooting Right, Up, and slightly Back-Left
            // Range: -2.8 (Up-Left) to 0.5 (Down-Right)
            min = -2.8; 
            max = 0.5;
        } 
        else if (ball.stuckSide === 'right_wall') {
            // Stuck on Right Wall: Allow shooting Left, Up, and slightly Back-Right
            // Range: -3.6 (Down-Left) to -0.3 (Up-Right)
            // Note: In radians, -PI is Left. We need to handle the wrap-around logic slightly differently
            // But for simple clamping, we keep it within the negative PI space.
            min = -Math.PI - 0.5; // Down-Left
            max = -0.3;           // Up-Right
        }
        
        // Standard Ping-Pong Logic
        if (this.aimAngle > max) { 
            this.aimAngle = max; 
            this.aimDir = -1; 
        }
        if (this.aimAngle < min) { 
            this.aimAngle = min; 
            this.aimDir = 1; 
        }
        
        // Safety Reset if angle gets stuck outside valid range
        if (this.aimAngle > max + 1.0 || this.aimAngle < min - 1.0) {
            this.aimAngle = (min + max) / 2;
        }
    }

    updateZone() {
        let active = Config.zones[0];
        for(let z of Config.zones) if (this.score >= z.h) active = z;
        uiZone.innerText = active.name;
        uiZone.style.textShadow = `0 0 10px rgb(${active.color.join(',')})`;
    }
    
    updateCoinUI() {
        coinUI.innerText = `Bits: ${GameState.currency}`;
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
        let active = Config.zones[0];
        for(let z of Config.zones) if (this.score >= z.h) active = z;
        ctx.fillStyle = `rgb(${active.color.join(',')})`;
        ctx.fillRect(0, 0, width, height);

        ctx.save();
        if (this.shake > 0) ctx.translate((Math.random()-0.5)*this.shake, (Math.random()-0.5)*this.shake);
        
        level.draw(ctx, this.cameraY, this.score);

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

        if (this.state === 2) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0,0,width,height);
            ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '30px Courier';
            ctx.fillText("FALLEN", width/2, height/2);
        }
    }
}

const game = new Game();
function resize() { 
    width = canvas.width = window.innerWidth; 
    height = canvas.height = window.innerHeight; 
}
window.addEventListener('resize', () => { resize(); game.enterLobby(); });

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

game.init();
