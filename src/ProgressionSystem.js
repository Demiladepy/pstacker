export class ProgressionSystem {
    constructor() {
        this.data = this.load();

        this.unlockDefinitions = {
            'default': { name: 'Standard Issue', req: 0, type: 'skin', desc: 'Regulation materials.' },
            'neon': { name: 'Cyber Neon', req: 2000, type: 'skin', desc: 'Glow in the dark.' },
            'gold': { name: 'Midas Touch', req: 10000, type: 'skin', desc: 'Solid gold everything.' },
            'matrix': { name: 'The Code', req: 25000, type: 'skin', desc: 'See the simulation.' }
        };

        // Ensure default is unlocked
        if (!this.data.unlocked.includes('default')) {
            this.data.unlocked.push('default');
            this.save();
        }
    }

    load() {
        const output = localStorage.getItem('pstacker_progression');
        if (output) {
            return JSON.parse(output);
        } else {
            return {
                totalScore: 0,
                highScore: 0,
                unlocked: [],
                activeSkin: 'default'
            };
        }
    }

    save() {
        localStorage.setItem('pstacker_progression', JSON.stringify(this.data));
    }

    registerGameEnd(score) {
        this.data.totalScore += score;
        if (score > this.data.highScore) {
            this.data.highScore = score;
        }

        const newUnlocks = this.checkUnlocks();
        this.save();

        return newUnlocks;
    }

    checkUnlocks() {
        const newItems = [];
        Object.entries(this.unlockDefinitions).forEach(([id, def]) => {
            if (!this.data.unlocked.includes(id)) {
                if (this.data.totalScore >= def.req) {
                    this.data.unlocked.push(id);
                    newItems.push(def);
                }
            }
        });
        return newItems;
    }

    setActiveSkin(skinId) {
        if (this.data.unlocked.includes(skinId)) {
            this.data.activeSkin = skinId;
            this.save();
            return true;
        }
        return false;
    }

    getActiveSkin() {
        return this.data.activeSkin;
    }
}
