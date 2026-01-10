
export const Materials = {
    WOOD: {
        name: 'wood',
        density: 0.6,
        friction: 0.8,
        restitution: 0.3,
        color: 0xD4A574,
        particles: "sawdust",
        soundPitch: 1.0,
        special: null,
        visualEffect: null
    },
    ICE: {
        name: 'ice',
        density: 0.9,
        friction: 0.05,
        restitution: 0.1,
        color: 0xA8E6FF,
        particles: "frost",
        soundPitch: 1.4,
        special: "melts_over_time",
        visualEffect: "shimmer"
    },
    RUBBER: {
        name: 'rubber',
        density: 1.1,
        friction: 1.0,
        restitution: 0.9,
        color: 0xFF4466,
        particles: "bounce_rings",
        soundPitch: 0.8,
        special: "absorbs_impact",
        visualEffect: "squash_stretch"
    },
    STEEL: {
        name: 'steel',
        density: 7.8,
        friction: 0.6,
        restitution: 0.4,
        color: 0xC0C0C0,
        particles: "sparks",
        soundPitch: 1.2,
        special: "heavy_impact",
        visualEffect: "metallic_shine"
    },
    GLASS: {
        name: 'glass',
        density: 2.5,
        friction: 0.3,
        restitution: 0.2,
        color: 0x88CCFF,
        particles: "shatter",
        soundPitch: 1.8,
        special: "fragile",
        visualEffect: "transparent_refraction"
    },
    FOAM: {
        name: 'foam',
        density: 0.2,
        friction: 0.9,
        restitution: 0.6,
        color: 0xFFEE88,
        particles: "bubbles",
        soundPitch: 0.6,
        special: "compressible",
        visualEffect: "wobble"
    }
};
