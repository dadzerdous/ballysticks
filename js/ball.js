
import { Config } from './config.js';

export class Ball {
    constructor(x, y) {
        this.x = x; 
        this.y = y;
        this.vx = 0; 
        this.vy = 0;
        this.radius = 12;
        this.isStuck = true;
        this.stuckSide = 'floor'; 
        this.stuckObject = null;
        this.color = '#00ffcc';
    }

    launch(angle) {
        this.isStuck = false;
        this.stuckObject = null;
        this.stuckSide = null;
        this.color = '#ffeb3b';
        this.vx = Math.cos(angle) * Config.jumpPower;
        this.vy = Math.sin(angle) * Config.jumpPower;
    }

    bounce(side) {
        if (side === 'left_wall' || side === 'right_wall') {
            this.vx *= -Config.wallBounce;
        } else {
            this.vy *= -Config.wallBounce;
            this.vx *= 0.9; 
        }
    }

    update() {
        if (!this.isStuck) {
            this.vy += Config.gravity;
            this.vx *= Config.friction;
            this.vy *= Config.friction;
            this.x += this.vx;
            this.y += this.vy;
        } else {
            // Wall Slide
            if (this.stuckSide !== 'floor') {
                this.y += Config.wallSlideSpeed;
            }
            // Check if slid off object
            if (this.stuckObject) {
                if (this.y > this.stuckObject.y + this.stuckObject.h + this.radius) {
                    this.isStuck = false;
                    this.stuckObject = null;
                    this.stuckSide = null;
                    this.color = '#ffeb3b';
                }
            }
        }
    }

    draw(ctx, cameraY) {
        ctx.beginPath();
        ctx.arc(this.x, this.y - cameraY, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}
