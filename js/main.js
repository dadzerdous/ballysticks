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

        // Swipe-to-aim state
        this.pointerStartX = 0;
        this.pointerStartY = 0;
        this.pointerCurrentX = 0;
        this.pointerCurrentY = 0;
        this.isSwiping = false;
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
        e.preventDefault();
        e.stopPropagation(); // This prevents the click from starting the game
        this.inputDown = false;
        shopMenu.style.display = 'block';
        document.getElementById('shop-bits').innerText = `Bits: ${GameState.currency}`;
        this.renderColors(availableColors, colorList);
    };

    closeBtn.onclick = (e) => {
        e.preventDefault();
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

    handleInput(isDown, x, y) {
        // If shop is open, ignore all game inputs
        if (document.getElementById('shop-menu').style.display === 'block') {
            this.inputDown = false;
            return; 
        }

        if (isDown) {
            if (this.state === 2) { this.enterLobby(); return; }
            if (this.state === 0) { 
                this.state = 1; 
                document.getElementById('open-shop-btn').style.display = 'none';
                this.updateUI(); 
            }
            this.inputDown = true;
            this.isSwiping = true;
            this.pointerStartX = x ?? width / 2;
            this.pointerStartY = y ?? height / 2;
            this.pointerCurrentX = this.pointerStartX;
            this.pointerCurrentY = this.pointerStartY;
            // Default aim straight up when first pressing
            if (ball.isStuck) this.aimAngle = -Math.PI / 2;
        } else {
            this.inputDown = false;
            this.isSwiping = false;
            if (this.state === 1 && ball.isStuck) ball.launch(this.aimAngle);
        }
    }

    handleMove(x, y) {
        if (!this.inputDown || !ball.isStuck) return;
        this.pointerCurrentX = x;
        this.pointerCurrentY = y;

        const dx = this.pointerCurrentX - this.pointerStartX;
        const dy = this.pointerCurrentY - this.pointerStartY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Only update aim if moved far enough (deadzone = 12px)
        if (dist > 12) {
            // Aim in the direction of drag — player "pulls back" like a slingshot
            let rawAngle = Math.atan2(dy, dx);

            // Constrain based on wall side
            let min = -Math.PI + 0.05, max = -0.05;
            if (ball.stuckSide === 'left_wall')       { min = -Math.PI / 2 - 0.1; max = 0.1; }
            else if (ball.stuckSide === 'right_wall') { min = -Math.PI - 0.1; max = -Math.PI / 2 + 0.1; }

            this.aimAngle = Utils.clamp(rawAngle, min, max);
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
        // Aim is now driven by swipe in handleMove() — no auto-oscillation
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
        if (this.state === 0) { uiStatus.innerText = "Hold & Swipe to Aim"; uiStatus.style.color = "#00ffcc"; }
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
            // Draw trajectory arc
            ctx.beginPath();
            ctx.moveTo(ball.x, ball.y - this.cameraY);
            let sx = ball.x, sy = ball.y, svx = Math.cos(this.aimAngle)*Config.jumpPower, svy = Math.sin(this.aimAngle)*Config.jumpPower;
            for(let i=0; i<20; i++) {
                svy += Config.gravity; svx *= Config.friction; svy *= Config.friction;
                sx += svx; sy += svy;
                ctx.lineTo(sx, sy - this.cameraY);
            }
            ctx.strokeStyle = 'rgba(255, 0, 85, 0.8)'; ctx.lineWidth = 3; ctx.setLineDash([5, 8]); ctx.stroke(); ctx.setLineDash([]);

            // Draw swipe drag line if moved from start
            const dx = this.pointerCurrentX - this.pointerStartX;
            const dy = this.pointerCurrentY - this.pointerStartY;
            if (Math.sqrt(dx*dx + dy*dy) > 12) {
                ctx.beginPath();
                ctx.moveTo(this.pointerStartX, this.pointerStartY);
                ctx.lineTo(this.pointerCurrentX, this.pointerCurrentY);
                ctx.strokeStyle = 'rgba(255,255,255,0.25)';
                ctx.lineWidth = 2;
                ctx.setLineDash([3, 6]);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // Draw aim direction arrow from ball
            const arrowLen = 40;
            const ax = ball.x + Math.cos(this.aimAngle) * arrowLen;
            const ay = (ball.y - this.cameraY) + Math.sin(this.aimAngle) * arrowLen;
            ctx.beginPath();
            ctx.moveTo(ball.x, ball.y - this.cameraY);
            ctx.lineTo(ax, ay);
            ctx.strokeStyle = '#ff0055';
            ctx.lineWidth = 3;
            ctx.stroke();
            // Arrowhead
            const headAngle = this.aimAngle;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(ax - Math.cos(headAngle - 0.5) * 10, ay - Math.sin(headAngle - 0.5) * 10);
            ctx.lineTo(ax - Math.cos(headAngle + 0.5) * 10, ay - Math.sin(headAngle + 0.5) * 10);
            ctx.closePath();
            ctx.fillStyle = '#ff0055';
            ctx.fill();
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

const onDown = (x, y) => game.handleInput(true, x, y);
const onUp = () => game.handleInput(false);
const onMove = (x, y) => game.handleMove(x, y);

window.addEventListener('mousedown', e => onDown(e.clientX, e.clientY));
window.addEventListener('mouseup', onUp);
window.addEventListener('mousemove', e => onMove(e.clientX, e.clientY));
canvas.addEventListener('touchstart', e => { e.preventDefault(); const t = e.touches[0]; onDown(t.clientX, t.clientY); }, {passive:false});
canvas.addEventListener('touchend', e => { e.preventDefault(); onUp(); }, {passive:false});
canvas.addEventListener('touchmove', e => { e.preventDefault(); const t = e.touches[0]; onMove(t.clientX, t.clientY); }, {passive:false});

function loop() {
    game.update();
    game.draw();
    requestAnimationFrame(loop);
}

game.init();
