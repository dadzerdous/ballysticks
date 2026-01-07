export const Config = {
    gravity: 0.38,        // LOWERED from 0.45 (Easier to aim)
    friction: 0.99,
    wallBounce: 0.7,
    jumpPower: 21,
    wallSlideSpeed: 1.5,
    aimSpeed: 0.05,
    zones: [
        { h: 0, name: "The City", color: [20, 20, 20] },
        { h: 50, name: "Skyline", color: [20, 20, 50] },     // Moving walls start here
        { h: 150, name: "Atmosphere", color: [40, 20, 60] },
        { h: 300, name: "Stratosphere", color: [60, 10, 30] },
        { h: 500, name: "The Void", color: [0, 0, 0] }
    ]
};

export const GameState = {
    currency: parseInt(localStorage.getItem('canyon_currency')) || 0,
    save: function() {
        localStorage.setItem('canyon_currency', this.currency);
    }
};

export const Utils = {
    random: (min, max) => Math.random() * (max - min) + min,
    clamp: (val, min, max) => Math.max(min, Math.min(max, val))
};
