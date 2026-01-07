
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

        return { hit: distance <= ball.radius };
    }

    static resolve(ball, rect) {
        // Determine side of collision and push ball out (Anti-Tunneling)
        const distLeft = Math.abs(ball.x - rect.x);
        const distRight = Math.abs(ball.x - (rect.x + rect.w));
        const distTop = Math.abs(ball.y - rect.y);
        const distBottom = Math.abs(ball.y - (rect.y + rect.h));
        
        const minDist = Math.min(distLeft, distRight, distTop, distBottom);
        let collisionSide = '';

        if (minDist === distTop) {
            ball.y = rect.y - ball.radius;
            collisionSide = 'floor';
        } else if (minDist === distBottom) {
            ball.y = rect.y + rect.h + ball.radius;
            collisionSide = 'ceiling';
        } else if (minDist === distLeft) {
            ball.x = rect.x - ball.radius;
            collisionSide = 'right_wall'; // Ball is on right, wall is on left
        } else if (minDist === distRight) {
            ball.x = rect.x + rect.w + ball.radius;
            collisionSide = 'left_wall'; // Ball is on left, wall is on right
        }

        return collisionSide;
    }
}
