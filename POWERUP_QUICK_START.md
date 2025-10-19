# Speed Rivals Power-Up System - Quick Start Guide

## 🚀 Getting Started

### 1. Run the Server
```bash
cd /home/behar/speed-rivals
npm start
```

### 2. Access the Power-Up Game
Open your browser and navigate to:
```
http://localhost:3000/multiplayer-powerups
```

### 3. Controls

#### Basic Racing Controls
- **W/↑** - Accelerate
- **S/↓** - Brake/Reverse
- **A/←** - Turn Left
- **D/→** - Turn Right
- **Space** - Handbrake
- **Enter** - Chat

#### Power-Up Controls
- **1** - Use first power-up in inventory
- **2** - Use second power-up in inventory
- **3** - Use third power-up in inventory
- **M** - Mute/unmute sounds

## 🎯 Power-Up Testing Guide

### Testing Each Power-Up

#### 🚀 Nitro Boost
1. Collect a nitro power-up (orange glow)
2. Press **1** to activate
3. **Expected**: Blue exhaust trail, speed increase, engine sound
4. **Duration**: 3 seconds

#### 🛡️ Shield
1. Collect a shield power-up (blue glow)
2. Press **1** to activate
3. **Expected**: Energy bubble around car, particle effects
4. **Test**: Try colliding with obstacles or other players
5. **Duration**: 5 seconds or 3 hits

#### ⚡ EMP Blast
1. Collect an EMP power-up (yellow glow)
2. Get near other players (within 10 units)
3. Press **1** to activate
4. **Expected**: Charging effect, then electric blast
5. **Effect**: Nearby players temporarily disabled

#### 🎯 Homing Missile
1. Collect a missile power-up (red glow)
2. Get within 8 units of another player
3. Press **1** to activate
4. **Expected**: Lock-on reticle, then missile launch
5. **Watch**: Missile trails and explosion on impact

#### ⭐ Star Power
1. Collect a star power-up (gold glow)
2. Press **1** to activate
3. **Expected**: Golden aura, rainbow trail, invincibility
4. **Test**: Collisions should have no effect
5. **Duration**: 4 seconds

#### 🔄 Time Rewind
1. Drive forward for a few seconds
2. Collect a rewind power-up (purple glow)
3. Press **1** to activate
4. **Expected**: Temporal effects, position resets to 3 seconds ago
5. **Note**: Requires position history

#### 💨 Smoke Screen
1. Collect a smoke power-up (gray glow)
2. Press **1** to activate
3. **Expected**: Smoke clouds behind car
4. **Duration**: 6 seconds of smoke generation
5. **Effect**: Obscures vision for other players

## 🧪 Testing Scenarios

### Single Player Testing
```javascript
// Open browser console and run:
powerUpIntegration.addPowerUpToInventory('nitro');
powerUpIntegration.addPowerUpToInventory('shield');
powerUpIntegration.addPowerUpToInventory('emp');
```

### Multiplayer Testing
1. Open multiple browser tabs/windows
2. All should connect to the same room
3. Test power-up interactions between players
4. Verify visual effects sync across clients

### Performance Testing
```javascript
// Stress test - add many power-ups:
for(let i = 0; i < 10; i++) {
    powerUpIntegration.addPowerUpToInventory('nitro');
    setTimeout(() => powerUpIntegration.usePowerUp(0), i * 100);
}
```

## 🔧 Debug Tools

### Console Commands
```javascript
// Get power-up system reference
const powerUpSystem = powerUpIntegration.getPowerUpSystem();

// Check inventory
console.log(powerUpSystem.playerInventory);

// Check active power-ups
console.log(powerUpSystem.activePowerUps);

// Get sound settings
console.log(powerUpIntegration.getSoundManager().getSettings());

// Force spawn power-up
powerUpSystem.spawnPowerUp();
```

### Visual Debugging
- Power-up inventory shows at bottom center
- Active power-ups display in status panel (top left)
- Chat shows power-up events
- Console logs all power-up activities

### Audio Debugging
- Press **M** to toggle sound on/off
- Check browser console for audio context warnings
- Ensure browser allows audio autoplay

## 🎮 Gameplay Tips

### For Testing
1. **Start with Nitro** - Easy to see and feel the effect
2. **Test Shield** - Deliberately hit obstacles to verify protection
3. **Use EMP in Groups** - More effective with multiple players nearby
4. **Time Rewind** - Drive in circles, then rewind to see effect
5. **Smoke Screen** - Follow your own trail to test visibility

### Strategy Tips
1. **Collect Aggressively** - Only 3 inventory slots, use them
2. **Save Defensive** - Keep shield/star for dangerous sections
3. **Offensive Combos** - EMP then missile for maximum effect
4. **Positioning** - Some power-ups require proximity to be effective

## 🐛 Troubleshooting

### Common Issues

#### No Sound
- Check if browser allows autoplay
- Verify Web Audio API support
- Press **M** to toggle sound
- Check browser console for audio errors

#### Power-ups Not Spawning
- Check console for spawn errors
- Verify Three.js scripts loaded correctly
- Ensure power-up classes are registered

#### Visual Effects Missing
- Check WebGL support in browser
- Verify Three.js version compatibility
- Check for JavaScript errors in console

#### Multiplayer Sync Issues
- Verify socket.io connection (green status)
- Check network tab for failed requests
- Ensure all players are in same room

### Performance Issues
- Reduce particle count in settings
- Close other browser tabs
- Check system resources (RAM/GPU)
- Lower graphics quality if needed

## 📊 Expected Performance

### Frame Rate
- **Smooth**: 60 FPS with power-ups active
- **Acceptable**: 30 FPS under heavy load
- **Warning**: Below 20 FPS indicates issues

### Memory Usage
- **Normal**: 50-100 MB
- **High**: 150-200 MB with many effects
- **Critical**: Over 300 MB (memory leak)

### Network Traffic
- **Idle**: <1 KB/s
- **Active**: 5-10 KB/s during power-up usage
- **Peak**: 20-30 KB/s with multiple simultaneous effects

## 📝 Logging and Analytics

### What Gets Logged
- Power-up spawn events
- Collection events
- Usage events
- Effect duration and impact
- Performance metrics

### Server Console
Watch for:
```
🎯 Power-up nitro spawned by Player_abc123
🎯 Player_abc123 collected shield power-up
⚡ Player_abc123 used EMP blast affecting 2 players
```

### Client Console
Enable detailed logging:
```javascript
// Set debug mode
window.powerUpDebug = true;
```

## 🎯 Success Criteria

### Visual Confirmation
- ✅ Power-ups spawn around track
- ✅ Collection shows UI updates
- ✅ Each power-up has distinct visual effects
- ✅ Effects sync across multiplayer clients

### Audio Confirmation
- ✅ Each power-up has unique sound
- ✅ Sounds play at correct times
- ✅ Volume controls work
- ✅ No audio artifacts or glitches

### Gameplay Confirmation
- ✅ Power-ups affect car performance
- ✅ Defensive power-ups block damage
- ✅ Offensive power-ups affect other players
- ✅ Cooldowns prevent spam usage

### Technical Confirmation
- ✅ No JavaScript errors in console
- ✅ Stable frame rate during effects
- ✅ Memory usage remains reasonable
- ✅ Network events properly synchronized

## 🚀 Next Steps

After successful testing:
1. **Balance Tuning** - Adjust power-up strengths/durations
2. **Visual Polish** - Enhance particle effects and materials
3. **Audio Enhancement** - Add more realistic sound effects
4. **Performance Optimization** - Reduce resource usage
5. **Additional Features** - Power-up combinations, upgrades

---

**Happy Racing! 🏁**

For issues or questions, check the console logs first, then refer to the full documentation in `POWER_UP_SYSTEM.md`.