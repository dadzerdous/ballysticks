import { Config, GameState, Utils } from './config.js'; 
import { Physics } from './physics.js';
import { LevelMaker } from './level.js';
import { Ball } from './ball.js';
import { ParticleSystem } from './particles.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const uiScore = document.getElementById('score');
const uiStatus = document.getElementById('status');
const uiZone = document.getElementById('zone-name');
const uiBest = document.getElementById('best-score');
const uiBits = document.getElementById('bits');

let width, height;
let ball, level, particles;

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
        particles = new ParticleSystem();
        level.reset();
        
        this.setupShop(); // Initialize Shop Listeners
        this.updateCoinUI();
        this.enterLobby();
        
        loop();
    }

    enterLobby() {
        this.state = 0;
        this.cameraY = 0;
        this.score = 0;
        
        // Apply persistent skin color
        ball.color = GameState.activeColor;
        
        ball.x = width/2; ball.y = height-50;
        ball.vx = 0; ball.vy = 0;
        ball.isStuck = true; 
        ball.stuckSide = 'floor'; 
        
        level.reset();
        particles.clear();
        this.updateUI();
        
        // Show Shop Button
        document.getElementById('open-shop-btn').style.display = 'block';
    }

    setupShop() {
        const shopMenu = document.getElementById('shop-menu');
        const openBtn = document.getElementById('open-shop-btn');
        const closeBtn = document.getElementById('close-shop');
        const colorList = document.getElementById('color-list');

        const availableColors = [
            { hex: '#00ffcc', price: 0 },
            { hex: '#ff0055', price: 50 },
            { hex: '#ffeb3b', price: 100 },
            { hex: '#bf00ff', price: 200 },
            { hex: '#ffffff', price: 500 }
        ];

        openBtn.onclick = (e) => {
            e.stopPropagation(); // Stop click from starting game
            this.inputDown = false;
            shopMenu.style.display = 'block';
            document.getElementById('shop-bits').innerText = `Bits: ${GameState.currency}`;
            this.renderColors(availableColors, colorList);
        };

        closeBtn.onclick = (e) => {
            e.stopPropagation();
            shopMenu.style.display = 'none';
        };
    }

    renderColors(colors, container) {
        container.innerHTML = '';
        colors.forEach(c => {
            const btn = document.createElement('div');
            const isUnlocked = GameState.unlockedColors.includes(c.hex);
            const isActive = GameState.activeColor === c.hex;

            btn.style.width = '45px';
            btn.style.height = '45px';
            btn.style.background = c.hex;
            btn.style.border = isActive ? '3px solid white' : '1px solid #444';
            btn.style.cursor = 'pointer';
            btn.style.display = 'flex';
            btn.style.alignItems = 'center';
            btn.style.justifyContent = 'center';
            btn.style.fontSize = '12px';
            btn.style.color = 'black';
            btn.style.fontWeight = 'bold';
            
            btn.innerText = isUnlocked ? '' : c.price;

            btn.onclick = (e) => {
                e.stopPropagation();
                if (isUnlocked) {
                    GameState.activeColor = c.hex;
                    ball.color = c.hex;
                } else if (GameState.currency >= c.price) {
                    GameState.currency -= c.price;
                    GameState.unlockedColors.push(c.hex);
                    GameState.activeColor = c.hex;
                    ball.color = c.hex;
                }
                GameState.save();
                this.updateCoinUI();
                document.getElementById('shop-bits').innerText = `Bits: ${GameState.currency}`;
                this.renderColors(colors, container);
            };
            container.appendChild(btn);
        });
    }

    handleInput(isDown) {
        if (isDown) {
            // Block game start if clicking inside shop
            if (document.getElementById('shop-menu').style.display === 'block') return;
            
            if (this.state === 2) { this.enterLobby(); return; }
            if (this.state === 0) { 
                this.state = 1; 
                document.getElementById('open-shop-btn').style.display = 'none';
                this.updateUI(); 
            }
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
        particles.update();
        level.update();

        // Screen Walls
        if (ball.x < ball.radius) { ball.x = ball.radius; ball.vx *= -0.5; }
        if (ball.x > width - ball.radius) { ball.x = width - ball.radius; ball.vx *= -0.5; }

        // Building Collisions
        for (let b of level.buildings) {
            let col = Physics.checkCollision(ball, b);
            if (col.hit) {
                let side = Physics.resolve(ball, b);
                
                if (this.inputDown) {
                    if (!ball.isStuck) particles.emit(ball.x, ball.y, '#ffffff', 8, 4);
                    ball.isStuck = true;
                    ball.gripTimer = 0; 
                    ball.vx = 0; ball.vy = 0;
                    ball.stuckObject = b;
                    ball.stuckSide = side;
                    ball.color = GameState.activeColor;
                } else {
                    ball.bounce(side);
                    particles.emit(ball.x, ball.y, '#aaaaaa', 5, 2);
                }
                break;
            }
        }

        // Stick to Moving Wall Logic - FIX for "Ghost" sliding
        if (ball.isStuck && ball.stuckObject && ball.stuckObject.vx) {
             if (ball.stuckObject.type === 'left') {
                 ball.x = ball.stuckObject.w + ball.radius; 
             }
             else if (ball.stuckObject.type === 'right') {
                 ball.x = ball.stuckObject.x - ball.radius;
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
                    particles.emit(c.x, c.y, '#FFD700', 12, 5);
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
        let min = -Math.PI + 0.1, max = -0.1;
        if (ball.stuckSide === 'left_wall') { min = -Math.PI / 2; max = 0; } 
        else if (ball.stuckSide === 'right_wall') { min = -Math.PI; max = -Math.PI / 2; }
        
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
        particles.emit(ball.x, ball.y, ball.color, 35, 10);
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
        particles.draw(ctx, this.cameraY);

        if (this.state === 1 && this.inputDown && ball.isStuck) {
            ctx.beginPath();
            ctx.moveTo(ball.x, ball.y - this.cameraY);
            let sx = ball.x, sy = ball.y, svx = Math.cos(this.aimAngle)*Config.jumpPower, svy = Math.sin(this.aimAngle)*Config.jumpPower;
            for(let i=0; i<15; i++) {
                svy += Config.gravity; svx *= Config.friction; svy *= Config.friction;
                sx += svx; sy += svy;
                ctx.lineTo(sx, sy - this.cameraY);
            }
            ctx.strokeStyle = '#ff0055'; ctx.lineWidth = 3; ctx.setLineDash([5, 8]); ctx.stroke(); ctx.setLineDash([]);
        }

        if (this.state !== 2) ball.draw(ctx, this.cameraY);
        ctx.restore();

        if (this.state === 2) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0,0,width,height);
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
