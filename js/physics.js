export class Physics {
    static checkCollision(ball, rect) {
        // Find closest point on rect to circle center
        let testX = ball.x;
        let testY = ball.y;

        if (ball.x < rect.x) testX = rect.x;
        else if (ball.x > rect.x + rect.w) testX = rect.x + rect.w;
        
        if (ball.y < rect.y) testY = rect.y;
        else if (ball.y > rect.y + rect.h) testY = rect.y + rect.h;

        let distX = ball.x - testX;
        let distY = ball.y - testY;
        let distance = Math.sqrt((distX*distX) + (distY*distY));

        // THE FIX: Use ball.hitbox (5px) instead of ball.radius (10px)
        // This requires the ninja to "deeply" hit the wall to register.
        return { hit: distance <= ball.hitbox };
    }

    static resolve(ball, rect) {
        // We still resolve using RADIUS so the ninja sits ON the wall, not inside it
        const distLeft = Math.abs(ball.x - rect.x);
        const distRight = Math.abs(ball.x - (rect.x + rect.w));
        const distTop = Math.abs(ball.y - rect.y);
        const distBottom = Math.abs(ball.y - (rect.y + rect.h));
        
        const minDist = Math.min(distLeft, distRight, distTop, distBottom);
        let collisionSide = '';

        // Added Logic: If we hit a corner from a diagonal, prioritize the side 
        // if we are horizontally deep into the block.
        
        if (minDist === distTop) {
            ball.y = rect.y - ball.radius; // Snap to surface
            collisionSide = 'floor';
        } else if (minDist === distBottom) {
            ball.y = rect.y + rect.h + ball.radius;
            collisionSide = 'ceiling';
        } else if (minDist === distLeft) {
            ball.x = rect.x - ball.radius;
            collisionSide = 'right_wall'; 
        } else if (minDist === distRight) {
            ball.x = rect.x + rect.w + ball.radius;
            collisionSide = 'left_wall'; 
        }

        return collisionSide;
    }
}
