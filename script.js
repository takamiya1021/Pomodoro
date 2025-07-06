document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const timeLeftDisplay = document.getElementById('time-left');
    const timerLabelDisplay = document.getElementById('timer-label');
    const startPauseBtn = document.getElementById('start-pause-btn');
    const resetBtn = document.getElementById('reset-btn');
    const skipBtn = document.getElementById('skip-btn');
    const quoteDisplay = document.getElementById('motivational-quote').querySelector('p');
    const progressCircle = document.querySelector('.progress-ring__circle');
    const radius = progressCircle.r.baseVal.value;
    const circumference = 2 * Math.PI * radius;
    progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
    progressCircle.style.strokeDashoffset = circumference;

    const tabs = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');

    // Settings Elements
    const soundAlertToggle = document.getElementById('sound-alert-toggle');
    const alarmSoundSelect = document.getElementById('alarm-sound-select');
    const workDurationInput = document.getElementById('work-duration');
    const shortBreakDurationInput = document.getElementById('short-break-duration');
    const longBreakDurationInput = document.getElementById('long-break-duration');
    const focusMusicToggle = document.getElementById('focus-music-toggle');
    const focusMusicSelect = document.getElementById('focus-music-select');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const notificationsToggle = document.getElementById('notifications-toggle');
    const autoStartToggle = document.getElementById('auto-start-toggle');

    // Audio Elements
    const alarmSound = document.getElementById('alarm-sound');
    const focusMusic = document.getElementById('focus-music');

    // History Elements
    const chartContainer = document.querySelector('#history .chart-container');
    const todayCountElement = document.getElementById('today-count');
    const weekTotalElement = document.getElementById('week-total');
    const bestDayElement = document.getElementById('best-day');

    // Feedback Popup Elements
    const feedbackPopup = document.getElementById('feedback-popup');
    const taskCompletedYesBtn = document.getElementById('task-completed-yes');
    const taskCompletedNoBtn = document.getElementById('task-completed-no');

    // Timer State
    let timerInterval;
    let currentMode = 'work'; // 'work', 'shortBreak', 'longBreak'
    let pomodorosCompleted = 0;
    let pomodorosInCycle = 0;
    let isPaused = true;
    let totalSeconds = 0;
    let secondsRemaining = 0;

    // Default Durations (in minutes)
    let durations = {
        work: 25,
        shortBreak: 5,
        longBreak: 15
    };

    const motivationalQuotes = [
        "Stay hungry, stay foolish.",
        "The only way to do great work is to love what you do.",
        "Believe you can and you're halfway there.",
        "The future belongs to those who believe in the beauty of their dreams.",
        "It does not matter how slowly you go as long as you do not stop.",
        "Act as if what you do makes a difference. It does.",
        "Success is not final, failure is not fatal: It is the courage to continue that counts.",
        "The secret of getting ahead is getting started.",
        "Don't watch the clock; do what it does. Keep going.",
        "Well done is better than well said."
    ];

    // --- Initialization ---
    loadSettings();
    resetTimer();
    updateDisplay();
    loadHistory();
    displayRandomQuote();

    // --- Event Listeners ---
    startPauseBtn.addEventListener('click', toggleTimer);
    resetBtn.addEventListener('click', () => {
        resetTimer();
        updateDisplay();
        displayRandomQuote();
    });
    skipBtn.addEventListener('click', skipMode);

    // Tab navigation
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
            if (tab.dataset.tab === 'history') {
                loadHistory(); // Refresh history when tab is clicked
            }
        });
    });

    // Settings listeners
    soundAlertToggle.addEventListener('change', saveSettings);
    alarmSoundSelect.addEventListener('change', () => {
        alarmSound.src = `assets/sounds/${alarmSoundSelect.value}`;
        saveSettings();
    });
    workDurationInput.addEventListener('change', () => { durations.work = parseInt(workDurationInput.value); saveSettings(); resetTimer(); updateDisplay(); });
    shortBreakDurationInput.addEventListener('change', () => { durations.shortBreak = parseInt(shortBreakDurationInput.value); saveSettings(); resetTimer(); updateDisplay(); });
    longBreakDurationInput.addEventListener('change', () => { durations.longBreak = parseInt(longBreakDurationInput.value); saveSettings(); resetTimer(); updateDisplay(); });
    focusMusicToggle.addEventListener('change', toggleFocusMusic);
    focusMusicSelect.addEventListener('change', () => {
        focusMusic.src = `assets/music/${focusMusicSelect.value}`;
        if (focusMusicToggle.checked && !isPaused && currentMode === 'work') {
            focusMusic.play().catch(e => console.error("Error playing focus music:", e));
        }
        saveSettings();
    });
    
    // New settings listeners
    darkModeToggle.addEventListener('change', toggleDarkMode);
    notificationsToggle.addEventListener('change', () => {
        if (notificationsToggle.checked) {
            requestNotificationPermission();
        }
        saveSettings();
    });
    autoStartToggle.addEventListener('change', saveSettings);

    // Feedback Popup Listeners
    taskCompletedYesBtn.addEventListener('click', () => handleFeedback(true));
    taskCompletedNoBtn.addEventListener('click', () => handleFeedback(false));

    // --- Timer Logic ---
    function toggleTimer() {
        isPaused = !isPaused;
        startPauseBtn.textContent = isPaused ? 'Start' : 'Pause';
        if (!isPaused) {
            startCountdown();
            if (currentMode === 'work' && focusMusicToggle.checked) {
                focusMusic.play().catch(e => console.error("Error playing focus music:", e));
            }
        } else {
            clearInterval(timerInterval);
            focusMusic.pause();
        }
    }

    function startCountdown() {
        if (secondsRemaining <= 0) {
            switchMode(); // Should not happen if reset correctly, but as a safeguard
        }
        timerInterval = setInterval(() => {
            secondsRemaining--;
            updateDisplay();
            if (secondsRemaining <= 0) {
                clearInterval(timerInterval);
                playAlarm();
                if (currentMode === 'work') {
                    pomodorosInCycle++;
                    pomodorosCompleted++;
                    savePomodoroToHistory();
                    showNotification('Work session completed!', 'Time for a break.');
                    showFeedbackPopup(); // Show feedback popup before switching mode
                } else {
                    showNotification('Break finished!', 'Ready to get back to work?');
                    if (autoStartToggle.checked) {
                        setTimeout(() => switchMode(), 2000); // Auto-start after 2 seconds
                    } else {
                        switchMode(); // For breaks, switch immediately
                    }
                }
            }
        }, 1000);
    }

    function switchMode() {
        focusMusic.pause();
        if (currentMode === 'work') {
            if (pomodorosInCycle >= 4) {
                currentMode = 'longBreak';
                pomodorosInCycle = 0;
            } else {
                currentMode = 'shortBreak';
            }
        } else { // 'shortBreak' or 'longBreak'
            currentMode = 'work';
        }
        resetTimer(false); // false to not reset pomodorosInCycle if it's a break starting
        updateDisplay();
        displayRandomQuote();
        if (!isPaused || autoStartToggle.checked) { // If timer was running or auto-start enabled
            if (autoStartToggle.checked) {
                isPaused = false;
                startPauseBtn.textContent = 'Pause';
            }
            startCountdown();
            if (currentMode === 'work' && focusMusicToggle.checked) {
                focusMusic.play().catch(e => console.error("Error playing focus music:", e));
            }
        }
    }

    function skipMode() {
        clearInterval(timerInterval);
        playAlarm(true); // Play a softer sound or no sound for skip
        if (currentMode === 'work' && !isPaused) {
            // If skipping a work session that was running, ask for feedback
            showFeedbackPopup(); 
        } else {
            switchMode();
        }
    }

    function resetTimer(fullReset = true) {
        clearInterval(timerInterval);
        isPaused = true;
        startPauseBtn.textContent = 'Start';
        if (fullReset) {
            currentMode = 'work';
            pomodorosInCycle = 0; // Reset cycle count on full reset
        }
        secondsRemaining = durations[currentMode] * 60;
        totalSeconds = durations[currentMode] * 60;
        focusMusic.pause();
        focusMusic.currentTime = 0;
        updateDisplay();
    }

    // --- Display Updates ---
    function updateDisplay() {
        const minutes = Math.floor(secondsRemaining / 60);
        const seconds = secondsRemaining % 60;
        timeLeftDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        let labelText = '';
        let bodyClass = '';
        let progressClass = '';

        switch (currentMode) {
            case 'work':
                labelText = 'Work';
                bodyClass = 'work-active';
                progressClass = 'work';
                break;
            case 'shortBreak':
                labelText = 'Short Break';
                bodyClass = 'break-active';
                progressClass = 'break';
                break;
            case 'longBreak':
                labelText = 'Long Break';
                bodyClass = 'break-active';
                progressClass = 'break';
                break;
        }
        timerLabelDisplay.textContent = labelText;
        document.title = `${timeLeftDisplay.textContent} - ${labelText}`;
        document.body.className = bodyClass; // Change body background
        progressCircle.className.baseVal = `progress-ring__circle ${progressClass}`;

        const progress = ((totalSeconds - secondsRemaining) / totalSeconds) * circumference;
        progressCircle.style.strokeDashoffset = circumference - progress;
    }

    function displayRandomQuote() {
        const randomIndex = Math.floor(Math.random() * motivationalQuotes.length);
        quoteDisplay.textContent = `"${motivationalQuotes[randomIndex]}"`;
    }

    // --- Sound --- 
    function playAlarm(isSkip = false) {
        if (soundAlertToggle.checked && !isSkip) {
            alarmSound.currentTime = 0;
            alarmSound.play().catch(e => console.error("Error playing alarm:", e));
        }
    }

    function toggleFocusMusic() {
        focusMusicSelect.disabled = !focusMusicToggle.checked;
        if (focusMusicToggle.checked && currentMode === 'work' && !isPaused) {
            focusMusic.play().catch(e => console.error("Error playing focus music:", e));
        } else {
            focusMusic.pause();
        }
        saveSettings();
    }

    // --- Settings Persistence (localStorage) ---
    function saveSettings() {
        const settings = {
            soundAlerts: soundAlertToggle.checked,
            alarmSound: alarmSoundSelect.value,
            workDuration: parseInt(workDurationInput.value),
            shortBreakDuration: parseInt(shortBreakDurationInput.value),
            longBreakDuration: parseInt(longBreakDurationInput.value),
            focusMusicEnabled: focusMusicToggle.checked,
            focusMusicTrack: focusMusicSelect.value,
            darkMode: darkModeToggle.checked,
            notifications: notificationsToggle.checked,
            autoStart: autoStartToggle.checked
        };
        localStorage.setItem('pomodoroSettings', JSON.stringify(settings));
    }

    function loadSettings() {
        const savedSettings = JSON.parse(localStorage.getItem('pomodoroSettings'));
        if (savedSettings) {
            soundAlertToggle.checked = savedSettings.soundAlerts !== undefined ? savedSettings.soundAlerts : true;
            alarmSoundSelect.value = savedSettings.alarmSound || 'default_alarm.mp3';
            alarmSound.src = `assets/sounds/${alarmSoundSelect.value}`;
            
            durations.work = savedSettings.workDuration || 25;
            durations.shortBreak = savedSettings.shortBreakDuration || 5;
            durations.longBreak = savedSettings.longBreakDuration || 15;
            workDurationInput.value = durations.work;
            shortBreakDurationInput.value = durations.shortBreak;
            longBreakDurationInput.value = durations.longBreak;

            focusMusicToggle.checked = savedSettings.focusMusicEnabled || false;
            focusMusicSelect.value = savedSettings.focusMusicTrack || 'lofi_1.mp3';
            focusMusic.src = `assets/music/${focusMusicSelect.value}`;
            focusMusicSelect.disabled = !focusMusicToggle.checked;
            
            darkModeToggle.checked = savedSettings.darkMode || false;
            if (darkModeToggle.checked) {
                document.body.classList.add('dark-mode');
            }
            
            notificationsToggle.checked = savedSettings.notifications || false;
            autoStartToggle.checked = savedSettings.autoStart || false;
        }
        resetTimer(); // Apply loaded durations
        updateDisplay();
    }

    // --- History Tracking ---
    function savePomodoroToHistory() {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        let history = JSON.parse(localStorage.getItem('pomodoroHistory')) || {};
        history[today] = (history[today] || 0) + 1;
        localStorage.setItem('pomodoroHistory', JSON.stringify(history));
        loadHistory(); // Update chart immediately
    }

    function loadHistory() {
        const history = JSON.parse(localStorage.getItem('pomodoroHistory')) || {};
        chartContainer.innerHTML = ''; // Clear previous bars
        let maxCount = 0;
        let weekTotal = 0;
        let bestDay = 0;
        const today = new Date().toISOString().split('T')[0];

        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dayKey = d.toISOString().split('T')[0];
            const dayShortName = d.toLocaleDateString('en-US', { weekday: 'short' });
            const count = history[dayKey] || 0;
            last7Days.push({ date: dayKey, shortName: dayShortName, count: count });
            if (count > maxCount) maxCount = count;
            if (count > bestDay) bestDay = count;
            weekTotal += count;
        }
        
        // Update stats
        todayCountElement.textContent = history[today] || 0;
        weekTotalElement.textContent = weekTotal;
        bestDayElement.textContent = bestDay;
        
        if (maxCount === 0) maxCount = 5; // Default max height if no history

        last7Days.forEach(dayData => {
            const bar = document.createElement('div');
            bar.classList.add('bar');
            const barHeight = (dayData.count / maxCount) * 100; // Percentage height
            bar.style.height = `${barHeight}%`;
            
            const countDisplay = document.createElement('span');
            countDisplay.classList.add('bar-count');
            countDisplay.textContent = dayData.count;
            bar.appendChild(countDisplay);

            const label = document.createElement('span');
            label.classList.add('bar-label');
            label.textContent = dayData.shortName;
            bar.appendChild(label);

            chartContainer.appendChild(bar);
        });
    }

    // --- Feedback Popup ---
    function showFeedbackPopup() {
        feedbackPopup.style.display = 'flex';
    }

    function hideFeedbackPopup() {
        feedbackPopup.style.display = 'none';
    }

    function handleFeedback(completed) {
        // Here you could potentially log this feedback if needed
        console.log(`Task completed: ${completed}`);
        hideFeedbackPopup();
        switchMode(); // Proceed to next mode after feedback
    }
    
    // --- New Features ---
    function toggleDarkMode() {
        if (darkModeToggle.checked) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        saveSettings();
    }
    
    function requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }
    
    function showNotification(title, body) {
        if (notificationsToggle.checked && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body: body,
                icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDNi40NzcgMiAyIDYuNDc3IDIgMTJzNC40NzcgMTAgMTAgMTAgMTAtNC40NzcgMTAtMTBTMTcuNTIzIDIgMTIgMnoiIGZpbGw9IiMwMDdiZmYiLz4KPHBhdGggZD0iTTEwIDhIMTRWMTJIMTBWOFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo='
            });
        }
    }

});
