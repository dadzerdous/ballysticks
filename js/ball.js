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
        
        // NEW: Timer to track how long we hold a wall
        this.gripTimer = 0;
    }

    launch(angle) {
        this.isStuck = false;
        this.stuckObject = null;
        this.stuckSide = null;
        this.color = '#ffeb3b';
        this.vx = Math.cos(angle) * Config.jumpPower;
        this.vy = Math.sin(angle) * Config.jumpPower;
        
        // Reset grip timer on launch
        this.gripTimer = 0;
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
            // Air Physics
            this.vy += Config.gravity;
            this.vx *= Config.friction;
            this.vy *= Config.friction;
            this.x += this.vx;
            this.y += this.vy;
        } else {
            // WALL STICK LOGIC
            if (this.stuckSide === 'left_wall' || this.stuckSide === 'right_wall') {
                
                this.gripTimer++; // Count up frames
                
                // Phase 1: Firm Grip
                if (this.gripTimer < Config.gripDuration) {
                    // Do nothing, velocity is 0
                } 
                // Phase 2: Start Slipping
                else {
                    // Calculate slip speed based on how long past the duration we are
                    let slipTime = this.gripTimer - Config.gripDuration;
                    let currentSlipSpeed = slipTime * Config.slipAcceleration;
                    
                    // Cap the speed
                    if (currentSlipSpeed > Config.maxSlipSpeed) currentSlipSpeed = Config.maxSlipSpeed;
                    
                    this.y += currentSlipSpeed;
                }
            }
            
            // Stuck to Floor/Ceiling (No slip needed)
            else {
                this.vx *= 0.5;
            }

            // Moving Wall Physics (Ride the wall)
            if (this.stuckObject && this.stuckObject.vx) {
                // If sliding down fast, maybe detach? (Optional, kept simple for now)
                if (this.y < this.stuckObject.y + this.stuckObject.h) {
                     this.x += this.stuckObject.vx;
                }
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
        
        // Visual indicator of Grip!
        // Blink red when slipping
        if (this.isStuck && this.gripTimer > Config.gripDuration) {
            ctx.fillStyle = (Math.floor(Date.now() / 100) % 2 === 0) ? '#ff0000' : this.color;
        } else {
            ctx.fillStyle = this.color;
        }
        
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}
