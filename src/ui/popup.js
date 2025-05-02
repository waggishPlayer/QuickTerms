document.addEventListener('DOMContentLoaded', function() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const pauseToggle = document.getElementById('pauseToggle');
    const statusDiv = document.getElementById('status');

    // Load saved pause state
    chrome.storage.local.get(['isPaused'], function(result) {
        pauseToggle.checked = result.isPaused || false;
        updateButtonState();
    });

    // Handle pause toggle
    pauseToggle.addEventListener('change', function() {
        const isPaused = this.checked;
        chrome.storage.local.set({ isPaused: isPaused }, function() {
            updateButtonState();
            showStatus(isPaused ? 'Extension paused' : 'Extension active', isPaused ? 'error' : 'success');
        });
    });

    // Update analyze button state based on pause status
    function updateButtonState() {
        analyzeBtn.disabled = pauseToggle.checked;
        if (pauseToggle.checked) {
            analyzeBtn.style.opacity = '0.5';
        } else {
            analyzeBtn.style.opacity = '1';
        }
    }

    // Show status message
    function showStatus(message, type) {
        statusDiv.textContent = message;
        statusDiv.className = 'status ' + type;
        setTimeout(() => {
            statusDiv.className = 'status';
        }, 3000);
    }

    // Handle analyze button click
    analyzeBtn.addEventListener('click', function() {
        if (pauseToggle.checked) return;

        // Get current tab
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
                // Send message to content script
                chrome.tabs.sendMessage(tabs[0].id, {action: 'analyze'}, function(response) {
                    if (chrome.runtime.lastError) {
                        showStatus('Error: ' + chrome.runtime.lastError.message, 'error');
                    } else if (response && response.success) {
                        showStatus('Analysis started', 'success');
                    } else {
                        showStatus('Error analyzing page', 'error');
                    }
                });
            }
        });
    });
}); 