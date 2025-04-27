document.addEventListener('DOMContentLoaded', () => {
    const analyzeButton = document.getElementById('analyzeButton');
    const statusMessage = document.getElementById('status');

    function showStatus(message, isError = false) {
        statusMessage.textContent = message;
        statusMessage.className = isError ? 'error' : 'success';
        statusMessage.style.display = 'block';
        setTimeout(() => {
            statusMessage.style.display = 'none';
        }, 3000);
    }

    function isRestrictedUrl(url) {
        return url.startsWith('chrome://') || 
               url.startsWith('edge://') || 
               url.startsWith('about:') || 
               url.startsWith('file://');
    }

    analyzeButton.addEventListener('click', async () => {
        try {
            // Get the active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) {
                throw new Error('No active tab found');
            }

            // Check if the URL is restricted
            if (isRestrictedUrl(tab.url)) {
                showStatus('Cannot analyze Chrome internal pages or local files', true);
                return;
            }

            // First, inject the content script
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content.js']
                });
            } catch (error) {
                // If the script is already injected, that's fine
                if (!error.message.includes('already been injected')) {
                    throw error;
                }
            }

            // Send message to content script
            try {
                const response = await chrome.tabs.sendMessage(tab.id, { action: 'analyze' });
                
                if (response && response.success) {
                    showStatus('Analysis completed successfully');
                    // Close the popup after successful analysis
                    setTimeout(() => window.close(), 1000);
                } else {
                    showStatus(response?.error || 'No terms and conditions found on this page', true);
                }
            } catch (error) {
                if (error.message.includes('Receiving end does not exist')) {
                    showStatus('Please refresh the page and try again', true);
                } else {
                    showStatus(error.message, true);
                }
            }
        } catch (error) {
            console.error('Error:', error);
            showStatus(error.message, true);
        }
    });
}); 