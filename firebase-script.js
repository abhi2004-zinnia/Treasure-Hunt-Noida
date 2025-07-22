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
            4: "TC1201"
        };
        
        this.clues = {
            1: "गिनती में जो दिखे नहीं, पर उसके बिना कुछ भी चले नहीं। सोचो उस खोज के जनक को, और पहुँचो उसके नाम वाले ठिकाने को।",
            2: "ना कोई ऑफिस बिना इसके चलता है, और ना ही आगंतुक बिना यहाँ रुके निकलता है। वह जगह जहाँ मुस्कान से स्वागत होता है, वहीं अगला इशारा चुपचाप बैठा होता है।",
            3: "जहाँ दीवारें सुनती हैं पर बोलती नहीं, और कुर्सियाँ अक्सर भरी होती हैं। वहाँ फैसले लिखे जाते हैं खामोशी से, सुराग छुपा है उसी जगह की गोपनीयता में।",
            4: "शब्दों की दुनिया से अब बाहर आओ, अब थोड़ा आराम भी तो मनाओ। जहाँ पेट भरता है और मन मुस्काता है, वहीं मेहनत का असली फल तुम्हारा इंतज़ार करता है.",
            5: "🎊 CONGRATULATIONS! YOU WON! 🎊"
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
            if (taskNumber === 5) {
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
            
            if (taskNumber === 5) {
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
        const progress = `${team.completedTasks}/5`;
        
        let currentTask, status;
        if (team.completedTasks === 5) {
            currentTask = '🏆 WINNER!';
            status = '🏆 CHAMPION!';
        } else if (team.status === 'completed' && team.completedTasks === 4) {
            currentTask = 'Task 5 - Final Challenge';
            status = '🎯 At Final Task';
        } else if (team.currentTask === 'completed') {
            currentTask = 'COMPLETED!';
            status = '🏆 Winner';
        } else {
            currentTask = `Task ${team.currentTask}`;
            status = '🎮 Playing';
        }
        
        const completionTime = team.completionTime ? 
            new Date(team.completionTime.toDate()).toLocaleTimeString() : '-';
        
        // Highlight winners (Task 5 completed)
        const rowClass = team.completedTasks === 5 ? 'winner-team' : 
                        (team.status === 'completed' ? 'completed-team' : '');
        
        html += `
            <tr class="${rowClass}">
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
    const completedTeams = teams.filter(team => team.completedTasks === 5).length;
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
    const code = document.getElementById('previousCode').value.trim().toUpperCase();
    
    if (!teamId || !code) {
        alert('Please fill in all fields');
        return;
    }
    
    // 🔒 SECURITY: Validate access
    if (!validateTaskAccess(2, teamId, code)) {
        alert('❌ Invalid code! Please complete Task 1 first to get the correct code.');
        return;
    }
    
    // 🔒 SECURITY: Check Firebase for task completion
    if (!(await hasCompletedPreviousTask(teamId, 2))) {
        alert('❌ You must complete Task 1 first!');
        return;
    }
    
    if (await firebaseGame.setTeamId(teamId)) {
        document.getElementById('clueSection').style.display = 'block';
        document.getElementById('teamDisplayName').textContent = teamId;
        document.querySelector('.verification-section').style.display = 'none';
        setValidAccess(2); // 🔒 Allow access to Task 3
    }
}

async function verifyTask3() {
    const teamId = document.getElementById('teamId3').value.trim().toUpperCase();
    const code = document.getElementById('previousCode3').value.trim().toUpperCase();
    
    if (!teamId || !code) {
        alert('Please fill in all fields');
        return;
    }
    
    // 🔒 SECURITY: Validate access
    if (!validateTaskAccess(3, teamId, code)) {
        alert('❌ Invalid code! Please complete Task 2 first to get the correct code.');
        return;
    }
    
    // 🔒 SECURITY: Check Firebase for task completion
    if (!(await hasCompletedPreviousTask(teamId, 3))) {
        alert('❌ You must complete Task 2 first!');
        return;
    }
    
    if (await firebaseGame.setTeamId(teamId)) {
        document.getElementById('clueSection3').style.display = 'block';
        document.getElementById('teamDisplayName').textContent = teamId;
        document.querySelector('.verification-section').style.display = 'none';
        setValidAccess(3); // 🔒 Allow access to Task 4
    }
}

async function verifyTask4() {
    const teamId = document.getElementById('teamId4').value.trim().toUpperCase();
    const code = document.getElementById('previousCode4').value.trim().toUpperCase();
    
    if (!teamId || !code) {
        alert('Please fill in all fields');
        return;
    }
    
    // 🔒 SECURITY: Validate access
    if (!validateTaskAccess(4, teamId, code)) {
        alert('❌ Invalid code! Please complete Task 3 first to get the correct code.');
        return;
    }
    
    // 🔒 SECURITY: Check Firebase for task completion
    if (!(await hasCompletedPreviousTask(teamId, 4))) {
        alert('❌ You must complete Task 3 first!');
        return;
    }
    
    if (await firebaseGame.setTeamId(teamId)) {
        document.getElementById('clueSection4').style.display = 'block';
        document.getElementById('teamDisplayName').textContent = teamId;
        document.querySelector('.verification-section').style.display = 'none';
        setValidAccess(4); // 🔒 Allow access to Task 5
    }
}

async function completeTask1() {
    const teamId = firebaseGame.getCurrentTeamId();
    if (!teamId) {
        alert('Please set your team ID first');
        return;
    }
    
    const success = await firebaseGame.completeTask(1, teamId);
    if (success) {
        document.getElementById('completeBtn').textContent = '✅ Task 1 Completed!';
        document.getElementById('completeBtn').disabled = true;
        document.getElementById('completeBtn').style.opacity = '0.7';
        setValidAccess(1); // 🔒 Allow access to Task 2
        alert('🎉 Great! You have completed Task 1. Now find the QR code for Task 2!');
    }
}

async function completeTask2() {
    const teamId = firebaseGame.getCurrentTeamId();
    if (!teamId) {
        alert('Please verify your team ID first');
        return;
    }
    
    const success = await firebaseGame.completeTask(2, teamId);
    if (success) {
        document.getElementById('completeBtn2').textContent = '✅ Task 2 Completed!';
        document.getElementById('completeBtn2').disabled = true;
        document.getElementById('completeBtn2').style.opacity = '0.7';
        setValidAccess(2); // 🔒 Allow access to Task 3
        alert('🎉 Excellent! Task 2 completed. Find the QR code for Task 3!');
    }
}

async function completeTask3() {
    const teamId = firebaseGame.getCurrentTeamId();
    if (!teamId) {
        alert('Please verify your team ID first');
        return;
    }
    
    const success = await firebaseGame.completeTask(3, teamId);
    if (success) {
        document.getElementById('completeBtn3').textContent = '✅ Task 3 Completed!';
        document.getElementById('completeBtn3').disabled = true;
        document.getElementById('completeBtn3').style.opacity = '0.7';
        setValidAccess(3); // 🔒 Allow access to Task 4
        alert('🎉 Outstanding! Task 3 completed. Find the final QR code for Task 4!');
    }
}

async function completeTask4() {
    const teamId = firebaseGame.getCurrentTeamId();
    if (!teamId) {
        alert('Please verify your team ID first');
        return;
    }
    
    const success = await firebaseGame.completeTask(4, teamId);
    if (success) {
        document.getElementById('completeBtn4').textContent = '✅ Task 4 Completed!';
        document.getElementById('completeBtn4').disabled = true;
        document.getElementById('completeBtn4').style.opacity = '0.7';
        setValidAccess(4); // 🔒 Allow access to Task 5
        alert('🎉 Amazing! Task 4 completed. Find the final QR code for the WINNER challenge!');
    }
}

async function verifyTask5() {
    const teamId = document.getElementById('teamId5').value.trim().toUpperCase();
    const code = document.getElementById('previousCode5').value.trim().toUpperCase();
    
    if (!teamId || !code) {
        alert('Please fill in all fields');
        return;
    }
    
    // 🔒 SECURITY: Validate access
    if (!validateTaskAccess(5, teamId, code)) {
        alert('❌ Invalid code! Please complete Task 4 first to get the correct code.');
        return;
    }
    
    // 🔒 SECURITY: Check Firebase for task completion
    if (!(await hasCompletedPreviousTask(teamId, 5))) {
        alert('❌ You must complete Task 4 first!');
        return;
    }
    
    if (await firebaseGame.setTeamId(teamId)) {
        document.getElementById('clueSection5').style.display = 'block';
        document.getElementById('teamDisplayName').textContent = teamId;
        document.querySelector('.verification-section').style.display = 'none';
        // Final winner task - start celebration!
        celebrateWinner();
    }
}

async function completeTask5() {
    const teamId = firebaseGame.getCurrentTeamId();
    if (!teamId) {
        alert('Please verify your team ID first');
        return;
    }
    
    const success = await firebaseGame.completeTask(5, teamId);
    if (success) {
        document.getElementById('completeBtn5').textContent = '🎉 VICTORY CLAIMED!';
        document.getElementById('completeBtn5').disabled = true;
        document.getElementById('completeBtn5').style.opacity = '0.7';
        
        // 🏆 WINNER CELEBRATION!
        alert('🏆 CONGRATULATIONS! You are the OFFICIAL WINNER of the treasure hunt!');
        
        // 🎊 Show celebration
        setTimeout(() => {
            if (confirm('🎉 Would you like to see the final results and leaderboard?')) {
                goToAdmin();
            }
        }, 2000);
        
        // 🎯 Final celebration effects
        celebrateWinner();
    }
}

// 🎊 Winner celebration function
function celebrateWinner() {
    // Add confetti effect to body
    document.body.style.background = 'linear-gradient(45deg, #FFD700, #FFA500, #FF6B6B, #4ECDC4)';
    document.body.style.backgroundSize = '400% 400%';
    document.body.style.animation = 'gradient 3s ease infinite';
    
    // Add winner sound effect (optional)
    try {
        // You can add sound here if needed
        console.log('🎉 WINNER CELEBRATION!');
    } catch (e) {
        // Silent fail for sound
    }
}

// Navigation functions
function goHome() {
    window.location.href = 'index.html';
}

function goToAdmin() {
    window.location.href = 'admin.html';
}

// 🔒 SECURITY: Validate task access
function validateTaskAccess(taskNumber, teamId, providedCode) {
    const expectedCodes = {
        2: 'TC441', // Task 2 requires completing Task 1
        3: 'TC242', // Task 3 requires completing Task 2  
        4: 'TC803', // Task 4 requires completing Task 3
        5: 'TC1201' // Task 5 requires completing Task 4
    };
    
    // Task 1 is always accessible
    if (taskNumber === 1) return true;
    
    // Check if provided code matches expected
    if (providedCode !== expectedCodes[taskNumber]) {
        return false;
    }
    
    return true;
}

// 🔒 SECURITY: Check if team has completed required previous tasks
async function hasCompletedPreviousTask(teamId, taskNumber) {
    if (taskNumber === 1) return true; // Task 1 has no prerequisites
    
    try {
        const progress = await firebaseGame.getTeamProgress(teamId);
        if (!progress) return false;
        
        // Must have completed (taskNumber - 1) tasks to access taskNumber
        return progress.completedTasks >= (taskNumber - 1);
    } catch (error) {
        console.error('Error checking task prerequisites:', error);
        return false;
    }
}

// 🔒 SECURITY: Block direct URL access
function blockDirectAccess(taskNumber) {
    // Allow access only if coming from previous task or home page
    const referrer = document.referrer;
    const isValidReferrer = referrer.includes('task' + (taskNumber - 1)) || 
                           referrer.includes('index.html') || 
                           referrer.includes(window.location.origin);
    
    if (!isValidReferrer && !sessionStorage.getItem('validAccess_' + taskNumber)) {
        alert('🚫 Access Denied: Please follow the proper sequence by scanning QR codes!');
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// 🔒 SECURITY: Set valid access token when task is properly completed
function setValidAccess(taskNumber) {
    sessionStorage.setItem('validAccess_' + (taskNumber + 1), 'true');
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