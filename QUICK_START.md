# 🏁 Speed Rivals - Quick Start Guide

## ⚡ 5-Minute Setup

### Prerequisites Check
- ✅ Node.js 16+ installed
- ✅ MongoDB running (local or Atlas)
- ✅ Terminal/command line access

### Step-by-Step Setup

#### 1. Navigate to Project
```bash
cd speed-rivals
```

#### 2. Install Dependencies
```bash
npm install
```
*This takes 1-2 minutes*

#### 3. Configure Environment
The `.env` file is already created! Just update if needed:
```bash
# Edit .env if you want to use MongoDB Atlas or change settings
nano .env  # or use your preferred editor
```

Default settings work for local development.

#### 4. Start MongoDB (if using local)
```bash
# In a new terminal
mongod
```
*Skip this if using MongoDB Atlas*

#### 5. Initialize Database
```bash
npm run init-data
```
*This seeds the database with default products and tournaments*

#### 6. Start the Server
```bash
npm start
```

✅ **You're done!** Server is running at http://localhost:3000

---

## 🎮 Try It Out

### 1. Main Game Hub
Visit: http://localhost:3000/hub

Choose from:
- 3D Racing
- Multiplayer
- Mobile Racing
- AI Demo

### 2. Health Check
```bash
curl http://localhost:3000/health
```

### 3. Run Tests
```bash
npm test
```

---

## 🔍 Common Issues

### Issue: "Cannot connect to MongoDB"
**Solution:** 
```bash
# Check if MongoDB is running
mongod --version

# Or update .env to use MongoDB Atlas:
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/speed-rivals
```

### Issue: "Port 3000 already in use"
**Solution:**
```bash
# Find what's using port 3000
lsof -i :3000

# Kill the process or change PORT in .env
PORT=3001
```

### Issue: "Module not found"
**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

---

## 📱 Mobile Testing

### Test on Your Phone
1. Find your computer's IP address:
   ```bash
   # Mac/Linux
   ifconfig | grep "inet "
   
   # Windows
   ipconfig
   ```

2. Update `.env`:
   ```bash
   BASE_URL=http://YOUR_IP:3000
   ```

3. Restart server:
   ```bash
   npm start
   ```

4. On your phone, visit:
   ```
   http://YOUR_IP:3000/mobile-racing
   ```

---

## 🚀 Development Mode

### Auto-Reload on Changes
```bash
npm run dev
```

### Watch Tests
```bash
npm run test:watch
```

### View Logs
```bash
# Logs are in the logs/ directory
tail -f logs/speed-rivals-2025-10-19.log
```

---

## 🎯 Next Steps

### 1. Explore the Game
- Try different game modes
- Test AI racing
- Play multiplayer with friends

### 2. Check the Dashboard
Visit: http://localhost:3000/monetization

### 3. Read Documentation
- [Main README](../README.md)
- [AI System](AI_SYSTEM_DOCUMENTATION.md)
- [Power-ups](POWER_UP_SYSTEM.md)
- [Mobile Features](MOBILE_FEATURES.md)

### 4. Configure Monetization (Optional)
To enable payments:
1. Create a Stripe account
2. Get your API keys
3. Add to `.env`:
   ```bash
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

---

## 📞 Need Help?

1. **Check Health Endpoint**
   ```bash
   curl http://localhost:3000/health
   ```

2. **Run Verification Script**
   ```bash
   ./verify-setup.sh
   ```

3. **View Logs**
   ```bash
   ls -la logs/
   cat logs/speed-rivals-*.log
   ```

4. **Test Page**
   Visit: http://localhost:3000/test

---

## ✅ Verification Checklist

- [ ] Dependencies installed (`node_modules/` exists)
- [ ] MongoDB is running
- [ ] `.env` file configured
- [ ] Database initialized (`npm run init-data`)
- [ ] Server starts without errors
- [ ] Health check returns "ok"
- [ ] Game hub loads in browser
- [ ] Tests pass (`npm test`)

---

## 🎉 Success!

If you can:
1. ✅ Start the server
2. ✅ Visit http://localhost:3000/hub
3. ✅ See the game interface

**You're all set! Start racing! 🏎️💨**

---

**Pro Tip:** Keep this guide open in a browser tab while developing!
