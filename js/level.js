import { Utils, Config } from './config.js';

export class LevelMaker {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.buildings = [];
        this.coins = []; // Array to store currency
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
        const genThreshold = cameraY - this.height; 
        
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
            // Only start moving walls if we are high up (Height < -600 roughly)
            let moveSpeed = 0;
            if (Math.abs(this.spawnerY) > 1000) { // Start moving at height 100
                moveSpeed = Utils.random(0.5, 2.0); 
                if (Math.random() > 0.5) moveSpeed *= -1;
            }

            this.spawnerY -= verticalGap;

            const leftW = centerX - (gapWidth / 2);
            const rightX = centerX + (gapWidth / 2);
            const rightW = this.width - rightX;

            // Add Buildings with velocity (vx)
            if (leftW > 0) this.buildings.push({ 
                x: 0, y: this.spawnerY - blockHeight, w: leftW, h: blockHeight, 
                vx: moveSpeed, originX: 0, maxMove: 50 
            });
            
            if (rightW > 0) this.buildings.push({ 
                x: rightX, y: this.spawnerY - blockHeight, w: rightW, h: blockHeight, 
                vx: moveSpeed, originX: rightX, maxMove: 50 
            });

            // COIN GENERATION
            // 30% chance to spawn a coin in the gap
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

        // Cleanup
        this.buildings = this.buildings.filter(b => b.y - cameraY < this.height + 600);
        this.coins = this.coins.filter(c => c.y - cameraY < this.height + 600);
    }

    update() {
        // Update Moving Walls
        for (let b of this.buildings) {
            if (b.vx !== 0) {
                b.x += b.vx;
                b.w += b.vx; // Keep attached to screen edge if needed, or just shift
                
                // For simplicity in this engine: 
                // Left walls expand/contract. Right walls shift left/right.
                
                // Left Wall Logic (Anchored at 0)
                if (b.x === 0) {
                    if (b.w > b.originX + 100 || b.w < b.originX - 50) b.vx *= -1;
                } 
                // Right Wall Logic
                else {
                    // Reset bounds check for right wall
                    // Simple oscillation: bounce back and forth
                    // Actually, simpler logic: Just oscillate width
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
        ctx.fillStyle = '#FFD700'; // Gold
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#FFD700';
        for (let c of this.coins) {
            if (c.collected) continue;
            const drawY = c.y - cameraY;
            
            // Bobbing animation
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
