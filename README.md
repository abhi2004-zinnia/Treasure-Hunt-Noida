# 🏆 Office Treasure Hunt Web Game

A complete web-based treasure hunt game with QR codes, sequential task verification, and real-time admin dashboard. Perfect for office team building activities!

## 🎮 Game Overview

This treasure hunt game guides teams through 4 sequential tasks using QR codes. Each task requires the previous task code to ensure teams follow the correct sequence.

### Game Flow:
1. **Task 1** → Shows first clue → Gives code `TC441`
2. **Task 2** → Requires `TC441` → Shows second clue → Gives code `TC242`  
3. **Task 3** → Requires `TC242` → Shows third clue → Gives code `TC803`
4. **Task 4** → Requires `TC803` → Shows final clue → Completion!

## 🎯 Features

- ✅ **Sequential Task Verification** - Teams must complete tasks in order
- ✅ **QR Code Integration** - Easy scanning to access tasks
- ✅ **Real-time Admin Dashboard** - Monitor all team progress
- ✅ **Team Progress Tracking** - Tracks completion times and status
- ✅ **Mobile Responsive** - Works on all devices
- ✅ **No Backend Required** - Runs entirely on GitHub Pages
- ✅ **Beautiful UI** - Modern, engaging design

## 🚀 Quick Setup

### 1. Deploy to GitHub Pages

1. **Fork/Download** this repository
2. **Upload to GitHub** and enable GitHub Pages in repository settings
3. **Get your GitHub Pages URL** (e.g., `https://yourusername.github.io/treasure-hunt-deploy`)

### 2. Generate QR Codes

1. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Update the base URL** in `generate_qr_codes.py`:
   ```python
   base_url = "https://yourusername.github.io/treasure-hunt-deploy"  # Your actual URL
   ```

3. **Generate QR codes:**
   ```bash
   python generate_qr_codes.py
   ```

4. **Print the QR codes** from the `qr_codes/` folder

### 3. Set Up Your Hunt

1. **Place QR codes** at different locations in your office
2. **Access admin dashboard** at `yourgithuburl/admin.html`
3. **Teams start** by scanning the first QR code!

## 📱 How to Play

### For Teams:
1. Scan QR Code 1 to start
2. Read the clue and remember the task code
3. Find the location and scan QR Code 2
4. Enter your Team ID and the previous task code
5. Continue until all 4 tasks are complete!

### For Admin:
- Visit `/admin.html` to see real-time progress
- Monitor team completion status
- Export data for analysis
- Clear data between games

## 🧩 The Clues

**Task 1 Clue (TC441):**
> "गिनती में जो दिखे नहीं, पर उसके बिना कुछ भी चले नहीं। सोचो उस खोज के जनक को, और पहुँचो उसके नाम वाले ठिकाने को।"

**Task 2 Clue (TC242):**
> "ना कोई ऑफिस बिना इसके चलता है, और ना ही आगंतुक बिना यहाँ रुके निकलता है। वह जगह जहाँ मुस्कान से स्वागत होता है, वहीं अगला इशारा चुपचाप बैठा होता है।"

**Task 3 Clue (TC803):**
> "जहाँ दीवारें सुनती हैं पर बोलती नहीं, और कुर्सियाँ अक्सर भरी होती हैं। वहाँ फैसले लिखे जाते हैं खामोशी से, सुराग छुपा है उसी जगह की गोपनीयता में।"

**Task 4 Clue (Final):**
> "शब्दों की दुनिया से अब बाहर आओ, अब थोड़ा आराम भी तो मनाओ। जहाँ पेट भरता है और मन मुस्काता है, वहीं मेहनत का असली फल तुम्हारा इंतज़ार करता है।"

## 🔧 Technical Details

### File Structure:
```
treasure-hunt-deploy/
├── index.html          # Main landing page
├── task1.html          # First task page
├── task2.html          # Second task page  
├── task3.html          # Third task page
├── task4.html          # Final task page
├── admin.html          # Admin dashboard
├── style.css           # Styling
├── script.js           # Game logic
├── generate_qr_codes.py # QR code generator
├── requirements.txt    # Python dependencies
├── qr_codes/           # Generated QR code images
└── README.md           # This file
```

### Data Storage:
- Uses browser localStorage for team progress
- No backend server required
- Data persists until manually cleared
- Admin can export data as JSON

### Security Features:
- Task code verification prevents cheating
- Sequential task completion enforced
- Team ID validation
- Cannot skip tasks or submit wrong codes

## 🎨 Customization

### Modify Clues:
Edit the clues in `script.js`:
```javascript
this.clues = {
    1: "Your first clue here...",
    2: "Your second clue here...",
    // etc.
};
```

### Change Task Codes:
Update task codes in `script.js`:
```javascript
this.taskCodes = {
    1: 'YOUR_CODE_1',
    2: 'YOUR_CODE_2', 
    3: 'YOUR_CODE_3',
    4: 'FINAL'
};
```

### Styling:
- Modify `style.css` for custom colors/fonts
- Responsive design works on all devices
- Modern gradient background and card layouts

## 📊 Admin Dashboard Features

- **Real-time Statistics**: Total teams, completed, in progress
- **Leaderboard**: Ranked by completion time
- **Detailed Progress**: Individual team task history
- **Data Export**: Download team data as JSON
- **Auto-refresh**: Updates every 30 seconds
- **Clear Data**: Reset between games

## ❓ Troubleshooting

**QR codes not working?**
- Check that GitHub Pages is enabled
- Verify the base URL in `generate_qr_codes.py` is correct
- Ensure files are uploaded to the root directory

**Teams can't proceed?**
- Verify they're entering the correct task code
- Check that Team ID matches exactly
- Ensure they completed the previous task

**Admin dashboard empty?**
- Teams must visit at least one task page first
- Check browser localStorage hasn't been cleared
- Try refreshing the dashboard

## 🔄 Running Multiple Games

1. Use "Clear All Data" in admin dashboard
2. Teams can reuse the same QR codes
3. Generate new QR codes if you change URLs

## 📞 Support

If you need help:
1. Check this README first
2. Verify your GitHub Pages URL is correct
3. Test one team flow before the actual event
4. Have backup task codes ready

## 🎉 Enjoy Your Treasure Hunt!

Perfect for team building, office parties, conferences, or any group activity. Teams will love the interactive challenge and admins will appreciate the real-time monitoring capabilities.

---

**Happy Hunting! 🏆** 