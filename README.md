# 🎯 Office Treasure Hunt Game

A fun and interactive treasure hunt game that uses QR codes to create an engaging office-wide adventure! Perfect for team building events, office parties, or just adding some excitement to the workday.

## 🌟 Features

- QR code-based clue system
- Real-time progress tracking
- Admin dashboard for monitoring teams
- Multi-team support
- Customizable clues and locations
- Firebase-powered for real-time updates

## 🚀 Quick Start

1. Clone this repository
```bash
git clone https://github.com/yourusername/treasure-hunt-game.git
cd treasure-hunt-game
```

2. Set up Firebase
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Enable Firestore Database
   - Copy `firebase-config.sample.js` to `firebase-config.js`
   - Fill in your Firebase configuration values

3. Configure Firebase Security (Important!)
   - In Firebase Console, go to Project Settings
   - Find your Web API Key
   - Under "API Restrictions", restrict the key to your domains
   - Set up Firestore Rules to secure your data

4. Customize Clues
   - Edit the clue text in `task1.html` through `task5.html`
   - Update the clues in `firebase-script.js` if needed
   - Generate new QR codes using `generate_qr_codes.py`

5. Generate QR Codes
```bash
pip install -r requirements.txt
python generate_qr_codes.py
```

6. Deploy & Play!
   - Host the files on your web server
   - Print and place the QR codes
   - Share the start URL with participants
   - Monitor progress at `/admin.html`

## 🔒 Security Considerations

1. **Firebase Configuration**
   - Never commit `firebase-config.js` to version control
   - Use `firebase-config.sample.js` as a template
   - Restrict your Firebase API key to your domains

2. **Firestore Rules**
   - Implement proper authentication if needed
   - Restrict read/write access appropriately
   - Example rules:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null;
         // Or for public access with rate limiting:
         // allow read, write: if true;
       }
     }
   }
   ```

## 🛠️ Customization

### Modifying Clues
1. Edit the HTML files (`task1.html` - `task5.html`)
2. Update clue text in `firebase-script.js`
3. Regenerate QR codes if URLs change

### Adding/Removing Tasks
1. Modify the `taskCodes` object in `firebase-script.js`
2. Create/delete corresponding HTML files
3. Update the QR code generation script

## 📝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Issues

Found a bug or have a suggestion? Please open an issue on GitHub! 