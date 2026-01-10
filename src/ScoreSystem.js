export class ScoreSystem {
    constructor() {
        this.score = 0;
        this.comboMultipliers = [1, 2, 3, 5, 10]; // Multipliers for streak levels
        this.currentCombo = 0;
        this.placementZones = {
            PERFECT: { threshold: 0.2, multiplier: 3, text: "PERFECT!", color: "#FFD700", bonus: 50 },
            GREAT: { threshold: 0.5, multiplier: 2, text: "GREAT!", color: "#00FF88", bonus: 25 },
            GOOD: { threshold: 1.0, multiplier: 1.5, text: "Good", color: "#4A9EFF", bonus: 10 },
            OKAY: { threshold: 999, multiplier: 1, text: "okay...", color: "#999999", bonus: 5 }
        };
    }

    reset() {
        this.score = 0;
        this.currentCombo = 0;
    }

    calculatePlacement(offsetDelta) {
        // abs offset between centers
        const dist = Math.abs(offsetDelta);

        for (const [zoneName, zone] of Object.entries(this.placementZones)) {
            if (dist <= zone.threshold) {
                return { name: zoneName, ...zone, dist };
            }
        }
        return this.placementZones.OKAY;
    }

    registerDrop(offsetDelta) {
        const placement = this.calculatePlacement(offsetDelta);

        if (placement.name === 'PERFECT') {
            this.currentCombo++;
        } else {
            this.currentCombo = 0;
        }

        // Calculate points
        // Base score per block = 10? + bonuses
        const comboMult = this.getComboMultiplier();
        const points = Math.floor((10 + placement.bonus) * placement.multiplier * comboMult);

        this.score += points;

        return {
            placement,
            points,
            combo: this.currentCombo,
            comboMult,
            totalScore: this.score
        };
    }

    getComboMultiplier() {
        // Cap multiplier at max defined
        const idx = Math.min(this.currentCombo, this.comboMultipliers.length - 1);
        return this.comboMultipliers[idx];
    }
}
