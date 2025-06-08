document.addEventListener('DOMContentLoaded', () => {
    const timeDisplay = document.getElementById('time-display');
    const startPauseButton = document.getElementById('start-pause-button');
    const resetButton = document.getElementById('reset-button');
    const taskInput = document.getElementById('task-input');
    const currentTaskText = document.getElementById('current-task-text');

    const sessionSummaryModal = document.getElementById('session-summary-modal');
    const aiSummaryText = document.getElementById('ai-summary-text');
    const nextActionText = document.getElementById('next-action-text');
    const startBreakButton = document.getElementById('start-break-button');
    const dismissSummaryButton = document.getElementById('dismiss-summary-button');

    const openSoundscapeButton = document.getElementById('open-soundscape-button');
    const soundscapeModal = document.getElementById('soundscape-modal');
    const closeSoundscapeButton = document.getElementById('close-soundscape-button');
    const soundscapeList = document.getElementById('soundscape-list');

    const progressRing = document.querySelector('.progress-ring__circle');
    const radius = progressRing.r.baseVal.value;
    const circumference = 2 * Math.PI * radius;
    progressRing.style.strokeDasharray = `${circumference} ${circumference}`;
    progressRing.style.strokeDashoffset = circumference;

    let timerInterval;
    let timeLeft = 25 * 60; // 25 minutes in seconds
    let initialTime = 25 * 60;
    let isPaused = true;
    let currentMode = 'pomodoro'; // 'pomodoro', 'shortBreak', 'longBreak'
    let currentTask = '';

    const pomodoroDuration = 25 * 60;
    const shortBreakDuration = 5 * 60;
    // const longBreakDuration = 15 * 60; // For future implementation

    function updateDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        const progress = ((initialTime - timeLeft) / initialTime) * circumference;
        progressRing.style.strokeDashoffset = circumference - progress;
    }

    function startTimer() {
        if (isPaused) {
            isPaused = false;
            startPauseButton.textContent = 'Pause';
            if (taskInput.value && !currentTask) {
                currentTask = taskInput.value;
                currentTaskText.textContent = `Task: ${currentTask}`;
                taskInput.style.display = 'none';
                currentTaskText.style.display = 'block';
            }
            timerInterval = setInterval(() => {
                timeLeft--;
                updateDisplay();
                if (timeLeft <= 0) {
                    clearInterval(timerInterval);
                    handleSessionEnd();
                }
            }, 1000);
        }
    }

    function pauseTimer() {
        if (!isPaused) {
            isPaused = true;
            startPauseButton.textContent = 'Resume';
            clearInterval(timerInterval);
        }
    }

    function resetTimer(duration, mode) {
        clearInterval(timerInterval);
        isPaused = true;
        timeLeft = duration;
        initialTime = duration;
        currentMode = mode;
        startPauseButton.textContent = 'Start';
        if (mode === 'pomodoro') {
            currentTaskText.textContent = '';
            taskInput.value = '';
            taskInput.style.display = 'block';
            currentTaskText.style.display = 'none';
            currentTask = '';
        }
        updateDisplay();
    }

    function handleSessionEnd() {
        // Placeholder AI summaries and actions
        const summaries = [
            `Good focus on ${currentTask || 'your task'}! You've made solid progress.`, 
            `Excellent work completing a session for ${currentTask || 'this goal'}. Keep it up!`, 
            `Session for ${currentTask || 'your objective'} finished. You're doing great!`
        ];
        const actions = [
            "Take a 5-minute break, then review your notes.",
            "Time for a short break. Stretch and hydrate!",
            "Consider a brief walk, then tackle the next sub-task."
        ];

        if (currentMode === 'pomodoro') {
            aiSummaryText.textContent = summaries[Math.floor(Math.random() * summaries.length)];
            nextActionText.textContent = actions[Math.floor(Math.random() * actions.length)];
            sessionSummaryModal.classList.add('active');
        } else {
            // If break ends, switch back to pomodoro
            alert(`${currentMode === 'shortBreak' ? 'Break' : 'Session'} ended! Time for the next focus session.`);
            resetTimer(pomodoroDuration, 'pomodoro');
        }
    }

    startPauseButton.addEventListener('click', () => {
        if (isPaused) {
            startTimer();
        } else {
            pauseTimer();
        }
    });

    resetButton.addEventListener('click', () => {
        resetTimer(pomodoroDuration, 'pomodoro');
    });

    // Session Summary Modal Logic
    startBreakButton.addEventListener('click', () => {
        sessionSummaryModal.classList.remove('active');
        resetTimer(shortBreakDuration, 'shortBreak');
        startTimer(); // Automatically start the break
    });

    dismissSummaryButton.addEventListener('click', () => {
        sessionSummaryModal.classList.remove('active');
        resetTimer(pomodoroDuration, 'pomodoro');
    });

    // Soundscape Modal Logic
    openSoundscapeButton.addEventListener('click', () => {
        soundscapeModal.classList.add('active');
    });

    closeSoundscapeButton.addEventListener('click', () => {
        soundscapeModal.classList.remove('active');
    });

    soundscapeList.addEventListener('click', (e) => {
        const item = e.target.closest('.soundscape-item');
        if (item) {
            // Remove selected from all items
            soundscapeList.querySelectorAll('.soundscape-item').forEach(el => {
                el.removeAttribute('data-selected');
                el.querySelector('.playing-indicator').classList.remove('playing');
            });
            // Add selected to the clicked item
            item.setAttribute('data-selected', 'true');
            item.querySelector('.playing-indicator').classList.add('playing');
            
            const sound = item.dataset.sound;
            console.log(`Selected soundscape: ${sound}`); // Placeholder for actual sound playing
            // soundscapeModal.classList.remove('active'); // Optionally close modal on selection
        }
    });

    // Initialize
    updateDisplay();
    // Set default soundscape selection
    const defaultSound = soundscapeList.querySelector('.soundscape-item[data-sound="none"]');
    if (defaultSound) {
        defaultSound.setAttribute('data-selected', 'true');
        defaultSound.querySelector('.playing-indicator').classList.add('playing');
    }
});
