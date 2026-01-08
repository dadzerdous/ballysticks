import { Config } from './config.js';

export class Ball {
    constructor(x, y) {
        this.x = x; 
        this.y = y;
        this.vx = 0; 
        this.vy = 0;
        this.radius = 10;   // VISUAL size (drawing)
        this.hitbox = 5;    // PHYSICS size (smaller = less sticky corners)
        
        this.isStuck = true;
        this.stuckSide = 'floor'; 
        this.stuckObject = null;
        this.color = '#00ffcc'; 
        
        this.gripTimer = 0;
        this.angle = 0;         
        this.spinSpeed = 0;     
        this.trail = [];        
    }

    launch(angle) {
        this.isStuck = false;
        this.stuckObject = null;
        this.stuckSide = null;
        this.color = '#ffeb3b'; 
        
        this.vx = Math.cos(angle) * Config.jumpPower;
        this.vy = Math.sin(angle) * Config.jumpPower;
        
        this.gripTimer = 0;
        this.spinSpeed = (this.vx > 0) ? 0.3 : -0.3;
    }

    bounce(side) {
        if (side === 'left_wall' || side === 'right_wall') {
            this.vx *= -Config.wallBounce;
            this.spinSpeed *= -0.5; 
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
            
            this.angle += this.spinSpeed;
            
            this.trail.push({ x: this.x, y: this.y, angle: this.angle });
            if (this.trail.length > 5) this.trail.shift(); 
            
        } else {
            this.trail = []; 
            this.spinSpeed = 0;
            
            if (this.stuckSide === 'floor') this.angle = 0;
            else if (this.stuckSide === 'left_wall') this.angle = Math.PI / 2;
            else if (this.stuckSide === 'right_wall') this.angle = -Math.PI / 2;
            else if (this.stuckSide === 'ceiling') this.angle = Math.PI;

            if (this.stuckSide === 'left_wall' || this.stuckSide === 'right_wall') {
                this.gripTimer++;
                
                if (this.gripTimer >= Config.gripDuration) {
                    let slipTime = this.gripTimer - Config.gripDuration;
                    let currentSlipSpeed = slipTime * Config.slipAcceleration;
                    if (currentSlipSpeed > Config.maxSlipSpeed) currentSlipSpeed = Config.maxSlipSpeed;
                    this.y += currentSlipSpeed;
                }
            } else {
                this.vx *= 0.5;
            }

            // Ride Moving Walls
            if (this.stuckObject && this.stuckObject.vx) {
                if (this.y < this.stuckObject.y + this.stuckObject.h) {
                     this.x += this.stuckObject.vx;
                }
            }
            
            // Slid off check
            if (this.stuckObject) {
                // Use RADIUS here (Visual) so we don't pop off prematurely when sliding
                if (this.y > this.stuckObject.y + this.stuckObject.h + this.radius) {
                    this.isStuck = false;
                    this.stuckObject = null;
                    this.stuckSide = null;
                    this.color = '#ffeb3b';
                    this.spinSpeed = 0.1; 
                }
            }
        }
    }

    draw(ctx, cameraY) {
        for (let i = 0; i < this.trail.length; i++) {
            let t = this.trail[i];
            let alpha = (i / this.trail.length) * 0.4; 
            
            ctx.save();
            ctx.translate(t.x, t.y - cameraY);
            ctx.rotate(t.angle);
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.fillRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
            ctx.restore();
        }

        ctx.save();
        ctx.translate(this.x, this.y - cameraY);
        ctx.rotate(this.angle);

        if (this.isStuck && this.gripTimer > Config.gripDuration) {
            ctx.translate((Math.random()-0.5)*2, (Math.random()-0.5)*2);
            ctx.fillStyle = '#ff3333'; 
        } else {
            ctx.fillStyle = this.color;
        }

        const s = this.radius * 2;
        ctx.fillRect(-this.radius, -this.radius, s, s);
        
        ctx.fillStyle = '#ff0055';
        ctx.fillRect(-this.radius - 4, -this.radius + 4, 6, 4); 
        
        if (!this.isStuck && (Math.abs(this.vx) > 1 || Math.abs(this.vy) > 1)) {
            ctx.beginPath();
            ctx.moveTo(-this.radius, -this.radius + 6);
            ctx.lineTo(-this.radius - 15, -this.radius - 5); 
            ctx.lineTo(-this.radius - 15, -this.radius + 15); 
            ctx.closePath();
            ctx.fill();
        }

        ctx.fillStyle = '#111';
        ctx.fillRect(2, -4, 4, 4);
        ctx.fillRect(8, -4, 4, 4);

        ctx.restore();
        
        // DEBUG: Uncomment this to see the tiny hitbox vs the big visual
        /*
        ctx.beginPath();
        ctx.arc(this.x, this.y - cameraY, this.hitbox, 0, Math.PI*2);
        ctx.strokeStyle = "red";
        ctx.stroke();
        */
    }
}
