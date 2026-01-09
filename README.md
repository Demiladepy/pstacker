# pstacker - The Unlicensed Civil Engineer 🏗️💥

> *"I skipped my Statics class, but I have a hard hat. Trust me."*

**P-Stacker** (The Unlicensed Civil Engineer) is a chaotic 3D physics stacking game built for the browser. It combines satisfying tower building with unpredictable "Disaster Events" to test your ability to build under pressure.

## 🎮 Play Now
(If you have a live demo link, add it here. Otherwise: Clone and run locally!)

## ✨ Features

### 🏗️ Physics-Based Stacking
Build your skyscraper using a variety of materials, each with unique physical properties powered by **Cannon.js**:
- **Wood**: Reliable, standard friction.
- **Ice ❄️**: Slippery! Blocks slide off easily.
- **Rubber 🎾**: High bounciness—watch out for rebounds.
- **Steel 🔩**: Heavy and solid, but creates massive impact forces.

### 🌪️ Chaos System (The "Wheel of Misfortune")
Every 5th block, a random disaster strikes:
- **Wind**: A strong gust pushes your tower sideways.
- **Earthquake**: The ground shakes, destabilizing weak structures.
- **High Gravity**: Suddenly, everything falls twice as fast.
- **The Glitch**: The camera feeds invert. Left is Right. Up is... who knows?
- **Sudden Death**: The base platform shrinks.

### 🥤 "Game Juice" & Polish
- **Dynamic Audio**: Synthesized sound effects that pitch-shift upwards as you build a combo streak.
- **Satisfying Visuals**: Neon "Toy/Premium" aesthetic with particle explosions on collision.
- **Screen Shake**: Feel the impact of heavy blocks.

### 🏆 Social Engineering
- **Certification System**: Get graded on your performance!
    - **F**: Absolute Hazard
    - **C**: Barely Standing
    - **A**: Master Architect
- **Local High Scores**: Compete against yourself (and your friends).

## 🛠️ Tech Stack

- **Engine**: [Three.js](https://threejs.org/) (3D Rendering)
- **Physics**: [Cannon-es](https://github.com/pmndrs/cannon-es) (Rigid Body Physics)
- **Animation**: [GSAP](https://greensock.com/gsap/) (UI & Camera Tweens)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Audio**: Web Audio API (Synthesized procedurally)

## 🚀 How to Run Locally

1. **Clone the repository**
   ```bash
   git clone https://github.com/Demiladepy/pstacker.git
   cd pstacker
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` (or the port shown in terminal).

## 🕹️ Controls

- **Mouse/Tap**: Click anytime to **DROP** the block.
- **Goal**: Stack as high as possible without toppling the tower.

## 📝 License

Unlicensed (Just like the Engineer). 
*Actually, MIT.*

---
*Built with ❤️ (and questionable safety standards) for the Hackathon.*
