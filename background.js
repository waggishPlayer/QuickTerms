// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'analyze') {
        // Handle analysis request
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    files: ['content.js']
                }).catch(error => {
                    console.error('Error injecting content script:', error);
                });
            }
        });
    }
});

// Handle tab updates for auto-scanning
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab && tab.url) {
        const url = tab.url.toLowerCase();
        // Check if the page might contain terms and conditions
        if (url.includes('terms') || 
            url.includes('privacy') || 
            url.includes('conditions') ||
            url.includes('legal')) {
            try {
                // Inject content script
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ['content.js']
                }).catch(error => {
                    console.error('Error injecting content script:', error);
                });
            } catch (error) {
                console.error('Error in tab update handler:', error);
            }
        }
    }
}); 