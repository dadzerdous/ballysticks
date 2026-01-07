import { Utils } from './config.js';

class Particle {
    constructor(x, y, color, speed, life) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.life = life;
        this.maxLife = life;
        this.vx = (Math.random() - 0.5) * speed;
        this.vy = (Math.random() - 0.5) * speed;
        this.size = Utils.random(2, 6);
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
        this.size *= 0.96; // Shrink over time
    }

    draw(ctx, cameraY) {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
        ctx.fillRect(this.x, this.y - cameraY, this.size, this.size);
        ctx.restore();
    }
}

export class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    // Spawn an explosion
    emit(x, y, color, count, speed = 3) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, color, speed, Utils.random(20, 40)));
        }
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.update();
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    draw(ctx, cameraY) {
        for (let p of this.particles) {
            p.draw(ctx, cameraY);
        }
    }
    
    clear() {
        this.particles = [];
    }
}
