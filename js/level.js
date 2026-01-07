import { Utils, Config } from './config.js';

export class LevelMaker {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.buildings = [];
        this.coins = []; 
        this.spawnerY = height;
    }

    reset() {
        this.buildings = [];
        this.coins = [];
        this.spawnerY = this.height;
        // Floor
        this.buildings.push({ x: -50, y: this.height - 10, w: this.width + 100, h: 200, vx: 0 });
        this.generate(this.height - 100);
    }

    generate(cameraY) {
        // Generate continuously ahead of the camera
        // We want to generate screens ahead (e.g., 2 screens worth)
        const genThreshold = cameraY - (this.height * 2); 
        
        while (this.spawnerY > genThreshold) {
            let centerX;
            if (this.spawnerY > this.height - 600) {
                centerX = this.width / 2;
            } else {
                centerX = (this.width / 2) + Math.sin(this.spawnerY * 0.002) * (this.width * 0.3);
            }

            const gapWidth = Utils.random(140, 200);
            const blockHeight = Utils.random(150, 350);
            const verticalGap = Utils.random(40, 80);

            // MOVING WALL LOGIC
            // Start moving walls earlier (at height 500 aka "Skyline")
            let moveSpeed = 0;
            if (Math.abs(this.spawnerY) > 500) { 
                // Speed increases slightly as you go higher
                let difficultyMult = Math.min(2.0, 1 + (Math.abs(this.spawnerY) / 10000));
                moveSpeed = Utils.random(0.5, 1.5) * difficultyMult; 
                if (Math.random() > 0.5) moveSpeed *= -1;
            }

            this.spawnerY -= verticalGap;

            const leftW = centerX - (gapWidth / 2);
            const rightX = centerX + (gapWidth / 2);
            const rightW = this.width - rightX;

            // Add Buildings
            // originX is used to keep the building tethered to its starting spot
            if (leftW > 0) this.buildings.push({ 
                x: 0, y: this.spawnerY - blockHeight, w: leftW, h: blockHeight, 
                vx: moveSpeed, originW: leftW, maxMove: 60, type: 'left'
            });
            
            if (rightW > 0) this.buildings.push({ 
                x: rightX, y: this.spawnerY - blockHeight, w: rightW, h: blockHeight, 
                vx: moveSpeed, originX: rightX, maxMove: 60, type: 'right'
            });

            // COIN GENERATION
            if (Math.random() < 0.3) {
                this.coins.push({
                    x: centerX,
                    y: this.spawnerY - (blockHeight / 2),
                    radius: 8,
                    collected: false
                });
            }

            this.spawnerY -= blockHeight;
        }

        // Cleanup objects far below the camera
        const cleanupThreshold = cameraY + this.height + 200;
        this.buildings = this.buildings.filter(b => b.y < cleanupThreshold);
        this.coins = this.coins.filter(c => c.y < cleanupThreshold);
    }

    update() {
        // Update Moving Walls
        for (let b of this.buildings) {
            if (b.vx !== 0) {
                if (b.type === 'left') {
                    // Left walls expand and contract their WIDTH
                    b.w += b.vx;
                    // Bounce logic
                    if (b.w > b.originW + b.maxMove || b.w < b.originW - b.maxMove) b.vx *= -1;
                    // Safety Clamp (Don't let it disappear)
                    if (b.w < 10) { b.w = 10; b.vx = Math.abs(b.vx); }
                } 
                else if (b.type === 'right') {
                    // Right walls shift their X position and adjust WIDTH to fill screen
                    b.x += b.vx;
                    b.w = this.width - b.x;
                    // Bounce logic
                    if (b.x > b.originX + b.maxMove || b.x < b.originX - b.maxMove) b.vx *= -1;
                    // Safety Clamp
                    if (b.w < 10) { b.x = this.width - 10; b.vx = -Math.abs(b.vx); }
                }
            }
        }
    }

    draw(ctx, cameraY, score) {
        let opacity = Math.max(0.3, 1 - (score / 800));
        
        // Draw Buildings
        ctx.lineWidth = 2;
        for (let b of this.buildings) {
            const drawY = b.y - cameraY;
            if (drawY > this.height || drawY + b.h < 0) continue;

            ctx.fillStyle = `rgba(100, 100, 100, ${opacity})`;
            ctx.strokeStyle = `rgba(200, 200, 200, ${opacity})`;

            ctx.fillRect(b.x, drawY, b.w, b.h);
            ctx.strokeRect(b.x, drawY, b.w, b.h);
        }

        // Draw Coins
        ctx.fillStyle = '#FFD700';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#FFD700';
        for (let c of this.coins) {
            if (c.collected) continue;
            const drawY = c.y - cameraY;
            
            const float = Math.sin(Date.now() / 200) * 3;
            
            ctx.beginPath();
            ctx.moveTo(c.x, drawY - c.radius + float);
            ctx.lineTo(c.x + c.radius, drawY + float);
            ctx.lineTo(c.x, drawY + c.radius + float);
            ctx.lineTo(c.x - c.radius, drawY + float);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
    }
}
