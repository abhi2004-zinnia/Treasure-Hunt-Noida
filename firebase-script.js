// 🔥 Firebase-Enabled Treasure Hunt Game
// This version enables real-time multi-device data sharing

// Initialize Firebase with config from firebase-config.js
const firebaseConfig = {
    apiKey: "AIzaSyBIQOS2BBchpiZK6uCB6rzb5ISxUwgJpVM",
    authDomain: "tresure-hunt--26.firebaseapp.com",
    projectId: "tresure-hunt--26",
    storageBucket: "tresure-hunt--26.firebasestorage.app",
    messagingSenderId: "941895978375",
    appId: "1:941895978375:web:806547f15b54690e1bd722",
    measurementId: "G-S74MJ8F9V2"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

/** Codes shown after each task (stored per team in Firestore as `taskOutputCodes`). */
const LEGACY_TASK_OUTPUT_CODES = {
    '1': 'TC441',
    '2': 'TC242',
    '3': 'TC803',
    '4': 'TC200',
    '5': 'WINNER'
};

const TASK_OUTPUT_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateRandomTaskOutputCode(length = 6) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    let s = '';
    for (let i = 0; i < length; i++) {
        s += TASK_OUTPUT_CODE_CHARS[bytes[i] % TASK_OUTPUT_CODE_CHARS.length];
    }
    return s;
}

/** New teams get unique output codes (browser-generated). Task 5 stays a shared WINNER label. */
function createNewTaskOutputCodes() {
    return {
        '1': generateRandomTaskOutputCode(),
        '2': generateRandomTaskOutputCode(),
        '3': generateRandomTaskOutputCode(),
        '4': generateRandomTaskOutputCode(),
        '5': 'WINNER'
    };
}

/** Max teams that can register for one event (first-come). */
const MAX_REGISTERED_TEAMS = 5;
/** Leader counts as one; up to four additional members (five people total). */
const MAX_TEAM_MEMBERS_INCLUDING_LEADER = 5;

function sanitizeTeamIdForRegistration(raw) {
    if (!raw || typeof raw !== 'string') return '';
    const cleaned = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    return cleaned.slice(0, 15);
}

function buildGameplayTeamDoc(teamId, leaderName, memberNamesArr) {
    return {
        id: teamId,
        leaderName: leaderName.trim(),
        memberNames: memberNamesArr,
        peopleCount: 1 + memberNamesArr.length,
        completedTasks: 0,
        currentTask: 1,
        startTime: firebase.firestore.FieldValue.serverTimestamp(),
        completionTime: null,
        taskHistory: [],
        status: 'active',
        taskOutputCodes: createNewTaskOutputCodes()
    };
}

class FirebaseTreasureHunt {
    constructor() {
        this.clues = {
            1: "गिनती में जो दिखे नहीं, पर उसके बिना कुछ भी चले नहीं। सोचो उस खोज के जनक को, और पहुँचो उसके नाम वाले ठिकाने को।",
            2: "ना कोई ऑफिस बिना इसके चलता है, और ना ही आगंतुक बिना यहाँ रुके निकलता है। वह जगह जहाँ मुस्कान से स्वागत होता है, वहीं अगला इशारा चुपचाप बैठा होता है।",
            3: "जहाँ दीवारें सुनती हैं पर बोलती नहीं, और कुर्सियाँ अक्सर भरी होती हैं। वहाँ फैसले लिखे जाते हैं खामोशी से, सुराग छुपा है उसी जगह की गोपनीयता में।",
            4: "शब्दों की दुनिया से अब बाहर आओ, अब थोड़ा आराम भी तो मनाओ। जहाँ पेट भरता है और मन मुस्काता है, वहीं मेहनत का असली फल तुम्हारा इंतज़ार करता है.",
            5: "🎊 CONGRATULATIONS! YOU WON! 🎊"
        };
        
        this.currentTeamId = null;
    }

    /** How many team slots are already filled (0–MAX_REGISTERED_TEAMS). */
    async getRegistrationSlotCount() {
        try {
            const snap = await db.collection('meta').doc('registrationGate').get();
            if (!snap.exists) return 0;
            return Math.min(MAX_REGISTERED_TEAMS, Math.max(0, snap.data().count || 0));
        } catch (e) {
            console.error('getRegistrationSlotCount:', e);
            return 0;
        }
    }

    async isRegistrationFull() {
        const n = await this.getRegistrationSlotCount();
        return n >= MAX_REGISTERED_TEAMS;
    }

    async getAllRegisteredTeams() {
        try {
            const snap = await db.collection('registeredTeams').orderBy('registrationSlot', 'asc').get();
            const rows = [];
            snap.forEach(doc => rows.push({ ...doc.data(), _docId: doc.id }));
            return rows;
        } catch (e) {
            console.error('getAllRegisteredTeams:', e);
            return [];
        }
    }

    listenToRegisteredTeams(callback) {
        return db.collection('registeredTeams')
            .orderBy('registrationSlot', 'asc')
            .onSnapshot(snap => {
                const rows = [];
                snap.forEach(doc => rows.push({ ...doc.data(), _docId: doc.id }));
                callback(rows);
            });
    }

    /**
     * Atomic registration: first MAX_REGISTERED_TEAMS teams win a slot.
     * @returns {{ ok: true, slot: number } | { ok: false, code: string, message: string }}
     */
    async registerTeamWithRoster(teamIdRaw, leaderNameRaw, memberNameInputs) {
        const teamId = sanitizeTeamIdForRegistration(teamIdRaw);
        const leaderName = (leaderNameRaw || '').trim();

        if (teamId.length < 2) {
            return { ok: false, code: 'INVALID_TEAM', message: 'Please choose a team name with at least 2 letters or numbers.' };
        }
        if (!leaderName) {
            return { ok: false, code: 'INVALID_LEADER', message: 'Please enter the team leader’s name.' };
        }

        const memberNames = (memberNameInputs || [])
            .map(s => (s || '').trim())
            .filter(Boolean);
        if (memberNames.length > MAX_TEAM_MEMBERS_INCLUDING_LEADER - 1) {
            return {
                ok: false,
                code: 'TOO_MANY_MEMBERS',
                message: `A team can have at most ${MAX_TEAM_MEMBERS_INCLUDING_LEADER} people including the leader (leader plus up to four other members).`
            };
        }

        const gateRef = db.collection('meta').doc('registrationGate');
        const regRef = db.collection('registeredTeams').doc(teamId);
        const teamRef = db.collection('teams').doc(teamId);

        let assignedSlot = 0;
        try {
            await db.runTransaction(async (tx) => {
                const gateSnap = await tx.get(gateRef);
                const count = gateSnap.exists ? Math.max(0, gateSnap.data().count || 0) : 0;
                if (count >= MAX_REGISTERED_TEAMS) {
                    throw Object.assign(new Error('REGISTRATION_FULL'), { code: 'REGISTRATION_FULL' });
                }

                const existingReg = await tx.get(regRef);
                if (existingReg.exists) {
                    throw Object.assign(new Error('DUPLICATE_TEAM'), { code: 'DUPLICATE_TEAM' });
                }

                const slot = count + 1;
                assignedSlot = slot;
                tx.set(
                    gateRef,
                    { count: count + 1, maxSlots: MAX_REGISTERED_TEAMS },
                    { merge: true }
                );

                tx.set(regRef, {
                    id: teamId,
                    leaderName,
                    memberNames,
                    peopleCount: 1 + memberNames.length,
                    registrationSlot: slot,
                    registeredAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                tx.set(teamRef, buildGameplayTeamDoc(teamId, leaderName, memberNames));
            });

            return { ok: true, slot: assignedSlot };
        } catch (err) {
            if (err && err.code === 'REGISTRATION_FULL') {
                return {
                    ok: false,
                    code: 'REGISTRATION_FULL',
                    message: 'All team slots for this hunt are already filled. Thank you for your interest.'
                };
            }
            if (err && err.code === 'DUPLICATE_TEAM') {
                return {
                    ok: false,
                    code: 'DUPLICATE_TEAM',
                    message: 'That team name is already registered. Please pick a different team name.'
                };
            }
            console.error('registerTeamWithRoster:', err);
            return {
                ok: false,
                code: 'UNKNOWN',
                message: 'Something went wrong while saving your registration. Please try again in a moment.'
            };
        }
    }

    /** True if this team id has completed the registration flow. */
    async isTeamRegistered(teamId) {
        if (!teamId) return false;
        const id = sanitizeTeamIdForRegistration(teamId);
        try {
            const snap = await db.collection('registeredTeams').doc(id).get();
            return snap.exists;
        } catch (e) {
            console.error('isTeamRegistered:', e);
            return false;
        }
    }

    /**
     * Ensures `taskOutputCodes` exists on the team doc.
     * New hunts: random unique codes. Teams that already started under the old global codes: LEGACY_* migration.
     */
    async ensureTaskOutputCodes(teamId) {
        const teamRef = db.collection('teams').doc(teamId);
        const teamDoc = await teamRef.get();
        if (!teamDoc.exists) return null;

        const data = teamDoc.data();
        const existing = data.taskOutputCodes;
        if (existing && existing['1'] && existing['2'] && existing['3'] && existing['4']) {
            return existing;
        }

        const completed = typeof data.completedTasks === 'number' ? data.completedTasks : 0;
        const newCodes =
            completed >= 1 ? { ...LEGACY_TASK_OUTPUT_CODES } : createNewTaskOutputCodes();

        await teamRef.set({ taskOutputCodes: newCodes }, { merge: true });
        return newCodes;
    }

    /** Code revealed after completing `completedTaskNumber` (used to unlock the next task page). */
    async getCodeAfterCompletedTask(teamId, completedTaskNumber) {
        await this.ensureTaskOutputCodes(teamId);
        const progress = await this.getTeamProgress(teamId);
        if (!progress || !progress.taskOutputCodes) return null;
        const raw = progress.taskOutputCodes[String(completedTaskNumber)];
        return raw != null ? String(raw).trim().toUpperCase() : null;
    }

    async populateTaskOutputCodeDisplay(teamId, completedTaskNumber) {
        const el = document.getElementById('taskOutputCodeDisplay');
        if (!el || !teamId) return;
        const code = await this.getCodeAfterCompletedTask(teamId, completedTaskNumber);
        el.textContent = code || '…';
    }

    // 🔥 Firebase: Set team ID (creates team in Firestore if doesn't exist)
    async setTeamId(teamId) {
        if (!teamId || teamId.trim() === '') return false;
        
        teamId = sanitizeTeamIdForRegistration(teamId);
        if (teamId.length < 2) {
            alert('Please enter a valid team name (at least 2 letters or numbers, same as when you registered).');
            return false;
        }
        this.currentTeamId = teamId;
        
        try {
            // Check if team exists, if not create it
            const teamRef = db.collection('teams').doc(teamId);
            const teamDoc = await teamRef.get();

            if (!teamDoc.exists) {
                const regSnap = await db.collection('registeredTeams').doc(teamId).get();
                if (!regSnap.exists) {
                    alert(
                        `Team "${teamId}" is not registered for this hunt.\n\n` +
                            'Please use the registration link from your organizer to sign up your team first. ' +
                            'If your team already registered, check that you are using the exact same team name.'
                    );
                    this.currentTeamId = null;
                    return false;
                }
                const r = regSnap.data();
                const memberNames = Array.isArray(r.memberNames) ? r.memberNames : [];
                const leaderName = (r.leaderName || '').trim() || 'Team lead';
                await teamRef.set(buildGameplayTeamDoc(teamId, leaderName, memberNames));
                console.log(`🔥 Team ${teamId} gameplay doc created from registration`);
            }

            await this.ensureTaskOutputCodes(teamId);
            
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

    /**
     * @param {string} teamId
     * @param {number} completedTaskNumber — task whose output code the player is entering (e.g. 1 for code after Task 1)
     * @param {string} actualCode
     */
    async verifyTaskCode(teamId, completedTaskNumber, actualCode) {
        if (!teamId || !actualCode) return false;
        const expected = await this.getCodeAfterCompletedTask(teamId, completedTaskNumber);
        return Boolean(expected && actualCode.trim().toUpperCase() === expected);
    }

    // 🔥 Firebase: Complete task (updates Firestore)
    async completeTask(taskNumber, teamId = null) {
        teamId = sanitizeTeamIdForRegistration(teamId || this.getCurrentTeamId() || '');
        if (!teamId || teamId.length < 2) {
            alert('No team ID set!');
            return false;
        }

        try {
            const teamRef = db.collection('teams').doc(teamId);
            let teamDoc = await teamRef.get();
            
            if (!teamDoc.exists) {
                // Auto-create team if needed
                await this.setTeamId(teamId);
                teamDoc = await teamRef.get();
            }

            await this.ensureTaskOutputCodes(teamId);
            teamDoc = await teamRef.get();
            const teamData = teamDoc.exists ? teamDoc.data() : {};
            const outputCode =
                teamData.taskOutputCodes && teamData.taskOutputCodes[String(taskNumber)]
                    ? String(teamData.taskOutputCodes[String(taskNumber)]).toUpperCase()
                    : taskNumber === 5
                      ? 'WINNER'
                      : '';

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
            const taskHistory = teamData.taskHistory || [];
            taskHistory.push({
                taskNumber: taskNumber,
                completedAt: regularTimestamp, // Fixed: Use regular Date instead of serverTimestamp
                taskCode: outputCode
            });
            updates.taskHistory = taskHistory;
            
            await teamRef.set(updates, { merge: true });
            
            // Also log submission (use regular timestamp here too)
            await db.collection('submissions').add({
                teamId: teamId,
                taskNumber: taskNumber,
                taskCode: outputCode,
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
            const batch = db.batch();

            const teamsSnapshot = await db.collection('teams').get();
            teamsSnapshot.forEach(doc => batch.delete(doc.ref));

            const submissionsSnapshot = await db.collection('submissions').get();
            submissionsSnapshot.forEach(doc => batch.delete(doc.ref));

            const regSnap = await db.collection('registeredTeams').get();
            regSnap.forEach(doc => batch.delete(doc.ref));

            await batch.commit();

            await db.collection('meta').doc('registrationGate').set(
                { count: 0, maxSlots: MAX_REGISTERED_TEAMS },
                { merge: true }
            );
            
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
            const registeredTeams = await this.getAllRegisteredTeams();
            
            const exportData = {
                teams: teams,
                submissions: submissions,
                registeredTeams: registeredTeams,
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
        leaderboardBody.innerHTML = '<tr><td colspan="6" class="no-data">No gameplay progress yet (teams appear here once registered and active)</td></tr>';
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
async function verifyTask2() {
    const teamId = sanitizeTeamIdForRegistration(document.getElementById('teamId2').value);
    const code = document.getElementById('previousCode').value.trim().toUpperCase();
    
    if (!teamId || !code) {
        alert('Please fill in all fields');
        return;
    }
    
    // 🔒 SEQUENCE LOCK: Check if team can access Task 2
    if (!(await canAccessTask(teamId, 2))) {
        showSequenceError(2);
        return;
    }
    
    const ok = await firebaseGame.verifyTaskCode(teamId, 1, code);
    if (!ok) {
        alert('❌ Incorrect code! You need the code from Task 1.');
        return;
    }
    
    if (await firebaseGame.setTeamId(teamId)) {
        document.getElementById('clueSection').style.display = 'block';
        document.getElementById('teamDisplayName').textContent = teamId;
        document.querySelector('.verification-section').style.display = 'none';
        await firebaseGame.populateTaskOutputCodeDisplay(teamId, 2);
    }
}

async function verifyTask3() {
    const teamId = sanitizeTeamIdForRegistration(document.getElementById('teamId3').value);
    const code = document.getElementById('previousCode3').value.trim().toUpperCase();
    
    if (!teamId || !code) {
        alert('Please fill in all fields');
        return;
    }
    
    // 🔒 SEQUENCE LOCK: Check if team can access Task 3
    if (!(await canAccessTask(teamId, 3))) {
        showSequenceError(3);
        return;
    }
    
    const ok = await firebaseGame.verifyTaskCode(teamId, 2, code);
    if (!ok) {
        alert('❌ Incorrect code! You need the code from Task 2.');
        return;
    }
    
    if (await firebaseGame.setTeamId(teamId)) {
        document.getElementById('clueSection3').style.display = 'block';
        document.getElementById('teamDisplayName').textContent = teamId;
        document.querySelector('.verification-section').style.display = 'none';
        await firebaseGame.populateTaskOutputCodeDisplay(teamId, 3);
    }
}

async function verifyTask4() {
    const teamId = sanitizeTeamIdForRegistration(document.getElementById('teamId4').value);
    const code = document.getElementById('previousCode4').value.trim().toUpperCase();
    
    if (!teamId || !code) {
        alert('Please fill in all fields');
        return;
    }
    
    // 🔒 SEQUENCE LOCK: Check if team can access Task 4
    if (!(await canAccessTask(teamId, 4))) {
        showSequenceError(4);
        return;
    }
    
    const ok = await firebaseGame.verifyTaskCode(teamId, 3, code);
    if (!ok) {
        alert('❌ Incorrect code! You need the code from Task 3.');
        return;
    }
    
    if (await firebaseGame.setTeamId(teamId)) {
        document.getElementById('clueSection4').style.display = 'block';
        document.getElementById('teamDisplayName').textContent = teamId;
        document.querySelector('.verification-section').style.display = 'none';
        await firebaseGame.populateTaskOutputCodeDisplay(teamId, 4);
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
        alert('🎉 Outstanding! Task 3 completed. Find the QR code for Task 4!');
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
        alert('🎉 Amazing! Task 4 completed. Find the final QR code for the WINNER challenge!');
    }
}

async function verifyTask5() {
    const teamId = sanitizeTeamIdForRegistration(document.getElementById('teamId5').value);
    const code = document.getElementById('previousCode5').value.trim().toUpperCase();
    
    if (!teamId || !code) {
        alert('Please fill in all fields');
        return;
    }
    
    // 🔒 SEQUENCE LOCK: Check if team can access Task 5
    if (!(await canAccessTask(teamId, 5))) {
        showSequenceError(5);
        return;
    }
    
    const ok = await firebaseGame.verifyTaskCode(teamId, 4, code);
    if (!ok) {
        alert('❌ Incorrect code! You need the code from Task 4.');
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

/**
 * When a team id is in the URL or localStorage, block opening Task N if prior tasks are not complete.
 */
async function blockDirectAccess(taskNumber) {
    try {
        const params = new URLSearchParams(window.location.search);
        const fromUrl = (params.get('team') || '').trim();
        const fromStorage = (localStorage.getItem('currentTeamId') || '').trim();
        const teamId = sanitizeTeamIdForRegistration(fromUrl || fromStorage);
        if (!teamId) return true;
        const allowed = await canAccessTask(teamId, taskNumber);
        if (!allowed) {
            showSequenceError(taskNumber);
        }
        return allowed;
    } catch (e) {
        console.error('blockDirectAccess:', e);
        return true;
    }
}

// 🔒 SIMPLE SEQUENCE LOCK: Check if team can access this task
async function canAccessTask(teamId, taskNumber) {
    // Task 1 is always accessible
    if (taskNumber === 1) return true;
    
    teamId = sanitizeTeamIdForRegistration(teamId || '');
    // For other tasks, check if previous task is completed
    try {
        const progress = await firebaseGame.getTeamProgress(teamId);
        if (!progress) {
            return false; // Team doesn't exist yet
        }
        
        const requiredCompletedTasks = taskNumber - 1;
        const hasCompleted = progress.completedTasks >= requiredCompletedTasks;
        
        console.log(`🔒 Team ${teamId} - Task ${taskNumber}: Completed=${progress.completedTasks}, Required=${requiredCompletedTasks}, Access=${hasCompleted}`);
        
        return hasCompleted;
    } catch (error) {
        console.error('Error checking task access:', error);
        return false;
    }
}

// 🔒 SEQUENCE LOCK: Show sequence error
function showSequenceError(taskNumber) {
    const previousTask = taskNumber - 1;
    alert(`🚫 SEQUENCE ERROR!\n\nYou must complete Task ${previousTask} first before accessing Task ${taskNumber}.\n\nPlease follow the proper order!`);
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
window.TREASURE_HUNT_MAX_REGISTERED_TEAMS = MAX_REGISTERED_TEAMS;
window.sanitizeTeamIdForRegistration = sanitizeTeamIdForRegistration; 
