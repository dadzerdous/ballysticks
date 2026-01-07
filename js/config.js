
export const Config = {
    gravity: 0.45,
    friction: 0.99,       // Air resistance
    wallBounce: 0.7,      // Bounciness of walls
    jumpPower: 21,
    wallSlideSpeed: 1.5,  // Speed of sliding down walls
    aimSpeed: 0.05,       // How fast the laser sweeps
    zones: [
        { h: 0, name: "The City", color: [20, 20, 20] },
        { h: 50, name: "Skyline", color: [20, 20, 50] },
        { h: 150, name: "Atmosphere", color: [40, 20, 60] },
        { h: 300, name: "Stratosphere", color: [60, 10, 30] },
        { h: 500, name: "The Void", color: [0, 0, 0] }
    ]
};

export const Utils = {
    random: (min, max) => Math.random() * (max - min) + min,
    clamp: (val, min, max) => Math.max(min, Math.min(max, val))
};
