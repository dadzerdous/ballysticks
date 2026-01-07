import { Config, GameState, Utils } from './config.js'; 
import { Physics } from './physics.js';
import { LevelMaker } from './level.js';
import { Ball } from './ball.js';
import { ParticleSystem } from './particles.js'; // NEW IMPORT

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const uiScore = document.getElementById('score');
const uiStatus = document.getElementById('status');
const uiZone = document.getElementById('zone-name');
const uiBest = document.getElementById('best-score');
const uiBits = document.getElementById('bits');

let width, height;
let ball, level, particles; // Added particles

class Game {
    constructor() {
        this.state = 0; 
        this.cameraY = 0;
        this.score = 0;
        this.bestScore = localStorage.getItem('canyon_best') || 0;
        this.aimAngle = -Math.PI / 2;
        this.aimDir = 1;
        this.inputDown = false;
    }

    init() {
        resize();
        ball = new Ball(width/2, height - 50);
        level = new LevelMaker(width, height);
        particles = new ParticleSystem(); // Initialize
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
        particles.clear();
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
        particles.update(); // Update particles

        // Screen Walls
        if (ball.x < ball.radius) { ball.x = ball.radius; ball.vx *= -0.5; }
        if (ball.x > width - ball.radius) { ball.x = width - ball.radius; ball.vx *= -0.5; }

        level.update();

        // Building Collisions
        for (let b of level.buildings) {
            let col = Physics.checkCollision(ball, b);
            if (col.hit) {
                let side = Physics.resolve(ball, b);
                
                if (this.inputDown) {
                    // STICK
                    if (!ball.isStuck) {
                        // Impact Dust!
                        particles.emit(ball.x, ball.y, '#ffffff', 8, 4);
                    }
                    ball.isStuck = true;
                    ball.gripTimer = 0; 
                    ball.vx = 0; ball.vy = 0;
                    ball.stuckObject = b;
                    ball.stuckSide = side;
                    ball.color = '#00ffcc';
                } else {
                    ball.bounce(side);
                    // Bounce Dust!
                    particles.emit(ball.x, ball.y, '#aaaaaa', 5, 2);
                }
                break;
            }
        }

        // Stick to Moving Wall Logic
        if (ball.isStuck && ball.stuckObject && ball.stuckObject.vx) {
             if (ball.stuckObject.type === 'left') {
                 if (ball.stuckSide === 'right_wall') ball.x += ball.stuckObject.vx;
             }
             else if (ball.stuckObject.type === 'right') {
                 ball.x += ball.stuckObject.vx;
             }
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
                    // Gold Sparkles!
                    particles.emit(c.x, c.y, '#FFD700', 10, 5);
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
    }

    updateAim() {
        this.aimAngle += Config.aimSpeed * this.aimDir;
        
        let min = -Math.PI + 0.1; 
        let max = -0.1;
        
        if (ball.stuckSide === 'left_wall') {
            min = -Math.PI / 2; 
            max = 0;
        } 
        else if (ball.stuckSide === 'right_wall') {
            min = -Math.PI;
            max = -Math.PI / 2;
        }
        
        if (this.aimAngle > max) { this.aimAngle = max; this.aimDir = -1; }
        if (this.aimAngle < min) { this.aimAngle = min; this.aimDir = 1; }
        if (this.aimAngle > max + 0.5 || this.aimAngle < min - 0.5) this.aimAngle = (min + max) / 2;
    }

    updateZone() {
        let active = Config.zones[0];
        for(let z of Config.zones) if (this.score >= z.h) active = z;
        uiZone.innerText = active.name;
        uiZone.style.textShadow = `0 0 10px rgb(${active.color.join(',')})`;
    }
    
    updateCoinUI() {
        uiBits.innerText = `Bits: ${GameState.currency}`;
    }

    gameOver() {
        // Death Explosion!
        particles.emit(ball.x, ball.y, ball.color, 30, 8);
        
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
        
        level.draw(ctx, this.cameraY, this.score);
        particles.draw(ctx, this.cameraY); // Draw particles

        // Draw Aim Line (Dashed Laser)
        if (this.state === 1 && this.inputDown && ball.isStuck) {
            ctx.beginPath();
            ctx.moveTo(ball.x, ball.y - this.cameraY);
            let sx = ball.x, sy = ball.y, svx = Math.cos(this.aimAngle)*Config.jumpPower, svy = Math.sin(this.aimAngle)*Config.jumpPower;
            for(let i=0; i<15; i++) {
                svy += Config.gravity; svx *= Config.friction; svy *= Config.friction;
                sx += svx; sy += svy;
                ctx.lineTo(sx, sy - this.cameraY);
            }
            ctx.strokeStyle = '#ff0055'; 
            ctx.lineWidth = 3; 
            ctx.setLineDash([5, 5]); // Dashed line
            ctx.stroke();
            ctx.setLineDash([]); // Reset
        }

        // Only draw player if alive (or allow particles to show death)
        if (this.state !== 2) {
            ball.draw(ctx, this.cameraY);
        }

        ctx.restore();

        if (this.state === 2) {
            // Delay the Game Over screen slightly so we see the explosion?
            // For now, just transparent overlay
            ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(0,0,width,height);
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
