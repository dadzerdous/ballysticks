import { Config } from './config.js';

export class Ball {
    constructor(x, y) {
        this.x = x; 
        this.y = y;
        this.vx = 0; 
        this.vy = 0;
        this.radius = 10; // Slightly smaller for a "nimble" feel
        
        // Physics State
        this.isStuck = true;
        this.stuckSide = 'floor'; 
        this.stuckObject = null;
        this.color = '#00ffcc'; // Neon Cyan
        
        // Ninja Mechanics
        this.gripTimer = 0;
        this.angle = 0;         // Current rotation
        this.spinSpeed = 0;     // How fast we are spinning
        this.trail = [];        // For the "Ghost" effect
    }

    launch(angle) {
        this.isStuck = false;
        this.stuckObject = null;
        this.stuckSide = null;
        this.color = '#ffeb3b'; // Turn Yellow when flying
        
        this.vx = Math.cos(angle) * Config.jumpPower;
        this.vy = Math.sin(angle) * Config.jumpPower;
        
        this.gripTimer = 0;
        
        // Add Spin! (Direction depends on where we aim)
        // If we shoot right, spin clockwise. Left, counter-clockwise.
        this.spinSpeed = (this.vx > 0) ? 0.3 : -0.3;
    }

    bounce(side) {
        if (side === 'left_wall' || side === 'right_wall') {
            this.vx *= -Config.wallBounce;
            this.spinSpeed *= -0.5; // Reverse spin on bounce
        } else {
            this.vy *= -Config.wallBounce;
            this.vx *= 0.9; 
        }
    }

    update() {
        // 1. Update Position
        if (!this.isStuck) {
            // Air Physics
            this.vy += Config.gravity;
            this.vx *= Config.friction;
            this.vy *= Config.friction;
            this.x += this.vx;
            this.y += this.vy;
            
            // Spin the Ninja
            this.angle += this.spinSpeed;
            
            // Record Trail
            this.trail.push({ x: this.x, y: this.y, angle: this.angle });
            if (this.trail.length > 5) this.trail.shift(); // Keep last 5 frames
            
        } else {
            // Wall Stick Logic
            this.trail = []; // Clear trail when stuck
            this.spinSpeed = 0;
            
            // Align rotation to the surface
            if (this.stuckSide === 'floor') this.angle = 0;
            else if (this.stuckSide === 'left_wall') this.angle = Math.PI / 2;
            else if (this.stuckSide === 'right_wall') this.angle = -Math.PI / 2;
            else if (this.stuckSide === 'ceiling') this.angle = Math.PI;

            // Grip / Slip Logic
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
                if (this.y > this.stuckObject.y + this.stuckObject.h + this.radius) {
                    this.isStuck = false;
                    this.stuckObject = null;
                    this.stuckSide = null;
                    this.color = '#ffeb3b';
                    this.spinSpeed = 0.1; // Mild spin when falling
                }
            }
        }
    }

    draw(ctx, cameraY) {
        // 1. Draw Ghost Trail
        for (let i = 0; i < this.trail.length; i++) {
            let t = this.trail[i];
            let alpha = (i / this.trail.length) * 0.4; // Fade out
            
            ctx.save();
            ctx.translate(t.x, t.y - cameraY);
            ctx.rotate(t.angle);
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.fillRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
            ctx.restore();
        }

        // 2. Draw Ninja (Main Body)
        ctx.save();
        ctx.translate(this.x, this.y - cameraY);
        ctx.rotate(this.angle);

        // Grip Warning (Shake/Color)
        if (this.isStuck && this.gripTimer > Config.gripDuration) {
            // Jitter effect
            ctx.translate((Math.random()-0.5)*2, (Math.random()-0.5)*2);
            ctx.fillStyle = '#ff3333'; // Red warning
        } else {
            ctx.fillStyle = this.color;
        }

        // Draw Square
        const s = this.radius * 2;
        ctx.fillRect(-this.radius, -this.radius, s, s);
        
        // Draw "Headband" (Visual flair)
        // A little rectangle on the back of the head
        ctx.fillStyle = '#ff0055';
        ctx.fillRect(-this.radius - 4, -this.radius + 4, 6, 4); // Knot
        
        // If moving fast, draw fluttering tails
        if (!this.isStuck && (Math.abs(this.vx) > 1 || Math.abs(this.vy) > 1)) {
            ctx.beginPath();
            ctx.moveTo(-this.radius, -this.radius + 6);
            ctx.lineTo(-this.radius - 15, -this.radius - 5); // Tail 1
            ctx.lineTo(-this.radius - 15, -this.radius + 15); // Tail 2
            ctx.closePath();
            ctx.fill();
        }

        // Eyes (to show direction)
        ctx.fillStyle = '#111';
        // Left Eye
        ctx.fillRect(2, -4, 4, 4);
        // Right Eye
        ctx.fillRect(8, -4, 4, 4);

        ctx.restore();
    }
}
