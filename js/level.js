
import { Utils } from './config.js';

export class LevelMaker {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.buildings = [];
        this.spawnerY = height;
    }

    reset() {
        this.buildings = [];
        this.spawnerY = this.height;
        // The Floor
        this.buildings.push({ x: -50, y: this.height - 10, w: this.width + 100, h: 200 });
        // Initial Generation
        this.generate(this.height - 100);
    }

    generate(cameraY) {
        const genThreshold = cameraY - this.height; 
        
        while (this.spawnerY > genThreshold) {
            let centerX;
            
            // Safe Start: Force center path for first 600px
            if (this.spawnerY > this.height - 600) {
                centerX = this.width / 2;
            } else {
                // Natural Drift
                centerX = (this.width / 2) + Math.sin(this.spawnerY * 0.002) * (this.width * 0.3);
            }

            const gapWidth = Utils.random(140, 200);
            const blockHeight = Utils.random(150, 350);
            const verticalGap = Utils.random(40, 80);

            this.spawnerY -= verticalGap;

            const leftW = centerX - (gapWidth / 2);
            const rightX = centerX + (gapWidth / 2);
            const rightW = this.width - rightX;

            if (leftW > 0) this.buildings.push({ x: 0, y: this.spawnerY - blockHeight, w: leftW, h: blockHeight });
            if (rightW > 0) this.buildings.push({ x: rightX, y: this.spawnerY - blockHeight, w: rightW, h: blockHeight });

            this.spawnerY -= blockHeight;
        }

        // Cleanup old buildings
        this.buildings = this.buildings.filter(b => b.y - cameraY < this.height + 600);
    }

    draw(ctx, cameraY, score) {
        let opacity = Math.max(0.3, 1 - (score / 800));
        ctx.fillStyle = `rgba(100, 100, 100, ${opacity})`;
        ctx.strokeStyle = `rgba(200, 200, 200, ${opacity})`;
        ctx.lineWidth = 2;

        for (let b of this.buildings) {
            const drawY = b.y - cameraY;
            if (drawY > this.height || drawY + b.h < 0) continue; // Culling

            ctx.fillRect(b.x, drawY, b.w, b.h);
            ctx.strokeRect(b.x, drawY, b.w, b.h);
            
            // Detail Lines
            ctx.beginPath();
            ctx.moveTo(b.x + b.w/2, drawY);
            ctx.lineTo(b.x + b.w/2, drawY + b.h);
            ctx.strokeStyle = `rgba(0,0,0,0.2)`;
            ctx.stroke();
        }
    }
}
