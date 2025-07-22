// 🔥 Firebase-Enabled Treasure Hunt Game
// This version enables real-time multi-device data sharing

// 🚨 YOUR ACTUAL FIREBASE CONFIG (CONVERTED TO COMPAT FORMAT)
const firebaseConfig = {
    apiKey: "AIzaSyCGBdKXReYuNx25H9QzqyLSJxUQCLCtr-c",
    authDomain: "treasure-60c3a.firebaseapp.com",
    projectId: "treasure-60c3a",
    storageBucket: "treasure-60c3a.firebasestorage.app",
    messagingSenderId: "323583642206",
    appId: "1:323583642206:web:e23e84034b576b170f42cf",
    measurementId: "G-FRPXMR0YH6"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

class FirebaseTreasureHunt {
    constructor() {
        this.taskCodes = {
            1: "TC441",
            2: "TC242", 
            3: "TC803",
            4: null
        };
        
        this.clues = {
            1: "गिनती में जो दिखे नहीं, पर उसके बिना कुछ भी चले नहीं। सोचो उस खोज के जनक को, और पहुँचो उसके नाम वाले ठिकाने को।",
            2: "ना कोई ऑफिस बिना इसके चलता है, और ना ही आगंतुक बिना यहाँ रुके निकलता है। वह जगह जहाँ मुस्कान से स्वागत होता है, वहीं अगला इशारा चुपचाप बैठा होता है।",
            3: "जहाँ दीवारें सुनती हैं पर बोलती नहीं, और कुर्सियाँ अक्सर भरी होती हैं। वहाँ फैसले लिखे जाते हैं खामोशी से, सुराग छुपा है उसी जगह की गोपनीयता में।",
            4: "शब्दों की दुनिया से अब बाहर आओ, अब थोड़ा आराम भी तो मनाओ। जहाँ पेट भरता है और मन मुस्काता है, वहीं मेहनत का असली फल तुम्हारा इंतज़ार करता है।"
        };
        
        this.currentTeamId = null;
    }

    // 🔥 Firebase: Set team ID (creates team in Firestore if doesn't exist)
    async setTeamId(teamId) {
        if (!teamId || teamId.trim() === '') return false;
        
        teamId = teamId.trim().toUpperCase();
        this.currentTeamId = teamId;
        
        try {
            // Check if team exists, if not create it
            const teamRef = db.collection('teams').doc(teamId);
            const teamDoc = await teamRef.get();
            
            if (!teamDoc.exists) {
                // Create new team automatically (no pre-registration needed)
                await teamRef.set({
                    id: teamId,
                    completedTasks: 0,
                    currentTask: 1,
                    startTime: firebase.firestore.FieldValue.serverTimestamp(),
                    completionTime: null,
                    taskHistory: [],
                    status: 'active'
                });
                console.log(`🔥 Team ${teamId} created in Firebase`);
            }
            
            // Store current team in localStorage for session
            localStorage.setItem('currentTeamId', teamId);
            return true;
        } catch (error) {
            console.error('Error setting team ID:', error);
            return false;
        }
    }

    // 🔥 Firebase: Get current team ID
    getCurrentTeamId() {
        return this.currentTeamId || localStorage.getItem('currentTeamId');
    }

    // 🔥 Firebase: Verify task code against Firestore data
    async verifyTaskCode(teamId, expectedCode, actualCode) {
        if (!teamId || !actualCode) return false;
        
        try {
            const teamRef = db.collection('teams').doc(teamId);
            const teamDoc = await teamRef.get();
            
            if (!teamDoc.exists) {
                // Auto-create team if it doesn't exist
                await this.setTeamId(teamId);
                return false; // First time, need to complete previous tasks
            }
            
            const teamData = teamDoc.data();
            const currentTask = teamData.currentTask;
            
            // Check if this is the expected sequence
            if (expectedCode !== this.taskCodes[currentTask - 1]) {
                alert('Invalid sequence! Complete tasks in order.');
                return false;
            }
            
            if (actualCode.toUpperCase() !== expectedCode) {
                alert('Incorrect task code! Try again.');
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Error verifying task code:', error);
            return false;
        }
    }

    // 🔥 Firebase: Complete task (updates Firestore)
    async completeTask(taskNumber, teamId = null) {
        teamId = teamId || this.getCurrentTeamId();
        if (!teamId) {
            alert('No team ID set!');
            return false;
        }

        try {
            const teamRef = db.collection('teams').doc(teamId);
            const teamDoc = await teamRef.get();
            
            if (!teamDoc.exists) {
                // Auto-create team if needed
                await this.setTeamId(teamId);
            }

            const now = firebase.firestore.FieldValue.serverTimestamp();
            const regularTimestamp = new Date(); // Use regular Date for arrays
            
            // Update team progress
            const updates = {
                completedTasks: taskNumber,
                currentTask: taskNumber + 1,
                [`task${taskNumber}CompletedAt`]: now
            };
            
            // If this is the final task, mark as completed
            if (taskNumber === 4) {
                updates.completionTime = now;
                updates.status = 'completed';
                updates.currentTask = 'completed';
            }
            
            // Add to task history (use regular Date instead of serverTimestamp)
            const existingData = teamDoc.exists ? teamDoc.data() : {};
            const taskHistory = existingData.taskHistory || [];
            taskHistory.push({
                taskNumber: taskNumber,
                completedAt: regularTimestamp, // Fixed: Use regular Date instead of serverTimestamp
                taskCode: this.taskCodes[taskNumber]
            });
            updates.taskHistory = taskHistory;
            
            await teamRef.set(updates, { merge: true });
            
            // Also log submission (use regular timestamp here too)
            await db.collection('submissions').add({
                teamId: teamId,
                taskNumber: taskNumber,
                taskCode: this.taskCodes[taskNumber],
                timestamp: regularTimestamp // Fixed: Use regular Date
            });

            console.log(`🔥 Task ${taskNumber} completed for team ${teamId}`);
            
            if (taskNumber === 4) {
                alert('🏆 Congratulations! You have completed the treasure hunt!');
            } else {
                alert(`✅ Task ${taskNumber} completed! Move to the next location.`);
            }
            
            return true;
        } catch (error) {
            console.error('Error completing task:', error);
            alert('Error saving progress. Please try again.');
            return false;
        }
    }

    // 🔥 Firebase: Get team progress (real-time)
    async getTeamProgress(teamId) {
        try {
            const teamRef = db.collection('teams').doc(teamId);
            const teamDoc = await teamRef.get();
            
            if (teamDoc.exists) {
                return teamDoc.data();
            }
            return null;
        } catch (error) {
            console.error('Error getting team progress:', error);
            return null;
        }
    }

    // 🔥 Firebase: Get all teams (real-time)
    async getAllTeams() {
        try {
            const teamsSnapshot = await db.collection('teams').orderBy('completedTasks', 'desc').get();
            const teams = [];
            
            teamsSnapshot.forEach(doc => {
                teams.push(doc.data());
            });
            
            return teams;
        } catch (error) {
            console.error('Error getting all teams:', error);
            return [];
        }
    }

    // 🔥 Firebase: Real-time listener for admin dashboard
    listenToTeamUpdates(callback) {
        return db.collection('teams')
            .orderBy('completedTasks', 'desc')
            .onSnapshot(snapshot => {
                const teams = [];
                snapshot.forEach(doc => {
                    teams.push(doc.data());
                });
                callback(teams);
            });
    }

    // 🔥 Firebase: Get all submissions
    async getSubmissions() {
        try {
            const submissionsSnapshot = await db.collection('submissions')
                .orderBy('timestamp', 'desc')
                .get();
            
            const submissions = [];
            submissionsSnapshot.forEach(doc => {
                submissions.push(doc.data());
            });
            
            return submissions;
        } catch (error) {
            console.error('Error getting submissions:', error);
            return [];
        }
    }

    // 🔥 Firebase: Clear all data (admin function)
    async clearAllData() {
        if (!confirm('Are you sure you want to clear ALL game data? This cannot be undone!')) {
            return false;
        }

        try {
            // Delete all teams
            const teamsSnapshot = await db.collection('teams').get();
            const batch = db.batch();
            
            teamsSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            // Delete all submissions
            const submissionsSnapshot = await db.collection('submissions').get();
            submissionsSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            await batch.commit();
            
            // Clear localStorage
            localStorage.clear();
            
            alert('✅ All data cleared successfully!');
            return true;
        } catch (error) {
            console.error('Error clearing data:', error);
            alert('Error clearing data. Please try again.');
            return false;
        }
    }

    // 🔥 Firebase: Export data
    async exportData() {
        try {
            const teams = await this.getAllTeams();
            const submissions = await this.getSubmissions();
            
            const exportData = {
                teams: teams,
                submissions: submissions,
                exportedAt: new Date().toISOString()
            };
            
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `treasure_hunt_data_${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            return true;
        } catch (error) {
            console.error('Error exporting data:', error);
            alert('Error exporting data.');
            return false;
        }
    }
}

// 🔥 Initialize Firebase game instance
const firebaseGame = new FirebaseTreasureHunt();

// 🔥 Real-time admin dashboard functions
function initializeAdminDashboard() {
    if (typeof updateLeaderboard === 'function') {
        // Set up real-time listener
        firebaseGame.listenToTeamUpdates(teams => {
            updateLeaderboard(teams);
            updateStatistics(teams);
        });
    }
}

function updateLeaderboard(teams) {
    const leaderboardBody = document.getElementById('leaderboardBody');
    if (!leaderboardBody) return;
    
    if (teams.length === 0) {
        leaderboardBody.innerHTML = '<tr><td colspan="6" class="no-data">No teams registered yet</td></tr>';
        return;
    }
    
    let html = '';
    teams.forEach((team, index) => {
        const rank = index + 1;
        const progress = `${team.completedTasks}/4`;
        const currentTask = team.currentTask === 'completed' ? 'COMPLETED!' : `Task ${team.currentTask}`;
        const status = team.status === 'completed' ? '🏆 Winner' : '🎮 Playing';
        const completionTime = team.completionTime ? 
            new Date(team.completionTime.toDate()).toLocaleTimeString() : '-';
        
        html += `
            <tr class="${team.status === 'completed' ? 'completed-team' : ''}">
                <td>${rank}</td>
                <td><strong>${team.id}</strong></td>
                <td>${progress}</td>
                <td>${currentTask}</td>
                <td>${completionTime}</td>
                <td>${status}</td>
            </tr>
        `;
    });
    
    leaderboardBody.innerHTML = html;
}

function updateStatistics(teams) {
    const totalTeams = teams.length;
    const completedTeams = teams.filter(team => team.status === 'completed').length;
    const inProgressTeams = totalTeams - completedTeams;
    
    if (document.getElementById('totalTeams')) {
        document.getElementById('totalTeams').textContent = totalTeams;
        document.getElementById('completedTeams').textContent = completedTeams;
        document.getElementById('inProgressTeams').textContent = inProgressTeams;
    }
}

// 🔥 Updated game functions for Firebase
async function setTeamIdTask1() {
    const teamIdInput = document.getElementById('teamIdInput');
    const teamId = teamIdInput.value.trim().toUpperCase();
    
    if (!teamId) {
        alert('Please enter your Team ID');
        return;
    }
    
    if (await firebaseGame.setTeamId(teamId)) {
        showGameContent(teamId);
    }
}

async function verifyTask2() {
    const teamId = document.getElementById('teamId2').value.trim().toUpperCase();
    const previousCode = document.getElementById('previousCode').value.trim().toUpperCase();
    
    if (!teamId || !previousCode) {
        alert('Please fill in all fields');
        return;
    }
    
    if (await firebaseGame.verifyTaskCode(teamId, 'TC441', previousCode)) {
        document.getElementById('clueSection').style.display = 'block';
        document.getElementById('teamDisplayName').textContent = teamId;
        await firebaseGame.setTeamId(teamId); // Update current team
    }
}

async function verifyTask3() {
    const teamId = document.getElementById('teamId3').value.trim().toUpperCase();
    const previousCode = document.getElementById('previousCode3').value.trim().toUpperCase();
    
    if (!teamId || !previousCode) {
        alert('Please fill in all fields');
        return;
    }
    
    if (await firebaseGame.verifyTaskCode(teamId, 'TC242', previousCode)) {
        document.getElementById('clueSection3').style.display = 'block';
        document.getElementById('teamDisplayName').textContent = teamId;
        await firebaseGame.setTeamId(teamId);
    }
}

async function verifyTask4() {
    const teamId = document.getElementById('teamId4').value.trim().toUpperCase();
    const previousCode = document.getElementById('previousCode4').value.trim().toUpperCase();
    
    if (!teamId || !previousCode) {
        alert('Please fill in all fields');
        return;
    }
    
    if (await firebaseGame.verifyTaskCode(teamId, 'TC803', previousCode)) {
        document.getElementById('clueSection4').style.display = 'block';
        document.getElementById('teamDisplayName').textContent = teamId;
        await firebaseGame.setTeamId(teamId);
    }
}

async function completeTask1() {
    await firebaseGame.completeTask(1);
}

async function completeTask2() {
    await firebaseGame.completeTask(2);
}

async function completeTask3() {
    await firebaseGame.completeTask(3);
}

async function completeTask4() {
    await firebaseGame.completeTask(4);
}

// Navigation functions
function goHome() {
    window.location.href = 'index.html';
}

function goToAdmin() {
    window.location.href = 'admin.html';
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize admin dashboard if on admin page
    if (window.location.pathname.includes('admin.html')) {
        initializeAdminDashboard();
    }
});

console.log('🔥 Firebase Treasure Hunt Game Initialized');

// Export for global access
window.firebaseGame = firebaseGame; 