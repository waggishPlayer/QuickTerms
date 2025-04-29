/**
 * QuickTerms - Content Script
 * Detects Terms and Conditions on webpages and presents summaries in a sidebar
 */

// Check if QuickTerms is already initialized
if (!window.quickTermsInitialized) {
    window.quickTermsInitialized = true;

    // Debounce function to limit how often a function can be called
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    class QuickTermsController {
        constructor() {
            this.sidebar = null;
            this.isAnalyzing = false;
            this.observer = null;
        }

        async init() {
            try {
                // Create toggle button
                this.createToggleButton();
                
                // Set up mutation observer for dynamic content
                this.setupMutationObserver();
                
                // Initial page scan
                await this.scanPage();
            } catch (error) {
                console.error('Error initializing QuickTerms:', error);
            }
        }

        createToggleButton() {
            const button = document.createElement('div');
            button.id = 'quickterms-toggle';
            button.className = 'quickterms-toggle';
            button.innerHTML = `
                <div class="quickterms-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                        <path fill="currentColor" d="M14,10H2V12H14V10M14,6H2V8H14V6M2,16H10V14H2V16M21.5,11.5L23,13L16,20L11.5,15.5L13,14L16,17L21.5,11.5Z" />
                    </svg>
                </div>
            `;
            
            button.addEventListener('click', () => {
                if (this.sidebar) {
                    this.closeSidebar();
    } else {
                    this.openSidebar();
                }
            });
            
            document.body.appendChild(button);
        }

        async scanPage() {
            const content = this.extractPotentialTermsContent();
            if (content) {
                const toggleButton = document.getElementById('quickterms-toggle');
                if (toggleButton) {
                    toggleButton.style.display = 'flex';
                }
            }
        }

        extractPotentialTermsContent() {
            // First try to find the main content area with more specific selectors
            const mainContentSelectors = [
                'main', 
                'article', 
                '.content', 
                '#content',
                '.terms-content',
                '.terms-body',
                '.terms-container',
                '.legal-content',
                '.legal-body',
                '.legal-container',
                '[role="main"]',
                '[role="article"]'
            ];

            for (const selector of mainContentSelectors) {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    const candidates = Array.from(elements)
                        .filter(el => {
                            const text = el.textContent.trim();
                            return text.length > 500;
                        })
                        .sort((a, b) => b.textContent.length - a.textContent.length);
                    
                    if (candidates.length > 0) {
                        return candidates[0].textContent.trim();
                    }
                }
            }

            // Then try specific selectors for terms and conditions
            const potentialSelectors = [
                '.terms', 
                '.conditions', 
                '.terms-conditions', 
                '.terms-of-service', 
                '.tos',
                '.privacy-policy', 
                '.legal', 
                '.agreement', 
                '[id*="terms"]', 
                '[id*="conditions"]',
                '[id*="agreement"]', 
                '[id*="legal"]', 
                '[id*="privacy"]',
                'section', 
                'div[role="main"]', 
                'div[role="article"]',
                // Add Google-specific selectors
                '.maia-article',
                '.maia-col',
                '.maia-col-6',
                '.maia-col-8',
                '.maia-col-9',
                '.maia-col-10',
                '.maia-col-12'
            ];
            
            for (const selector of potentialSelectors) {
                try {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        const candidates = Array.from(elements)
                            .filter(el => {
                                const text = el.textContent.trim();
                                return text.length > 500 && 
                                       (text.toLowerCase().includes('terms') || 
                                        text.toLowerCase().includes('conditions') ||
                                        text.toLowerCase().includes('privacy') ||
                                        text.toLowerCase().includes('agreement') ||
                                        text.toLowerCase().includes('google') ||
                                        text.toLowerCase().includes('service'));
                            })
                            .sort((a, b) => b.textContent.length - a.textContent.length);
                        
                        if (candidates.length > 0) {
                            return candidates[0].textContent.trim();
                        }
                    }
                } catch (e) {
                    continue;
                }
            }

            // If no specific content found, try to get all text content
            const allText = document.body.textContent.trim();
            if (allText.length > 1000) {
                return allText;
            }

            return null;
        }

        setupMutationObserver() {
            this.observer = new MutationObserver(debounce(() => {
                if (!this.sidebar) {
                    this.scanPage();
                }
            }, 2000));
            
            this.observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }

        async openSidebar() {
            if (this.sidebar) return;
            
            this.sidebar = document.createElement('div');
            this.sidebar.id = 'quickterms-sidebar';
            this.sidebar.className = 'quickterms-sidebar';
            this.sidebar.innerHTML = `
                <div class="quickterms-header">
                    <h2>QuickTerms</h2>
                    <button class="quickterms-close">&times;</button>
                </div>
                <div class="quickterms-content">
                    <div class="quickterms-loading">Analyzing content...</div>
                </div>
            `;
            
            document.body.appendChild(this.sidebar);
            
            // Add close button handler
            const closeButton = this.sidebar.querySelector('.quickterms-close');
            closeButton.addEventListener('click', () => this.closeSidebar());
            
            // Start analysis
            await this.analyzePage();
        }

        closeSidebar() {
            if (this.sidebar) {
                this.sidebar.remove();
                this.sidebar = null;
            }
        }

        async analyzePage() {
            if (this.isAnalyzing) return;
            this.isAnalyzing = true;

            try {
                const content = this.extractPotentialTermsContent();
                if (!content) {
                    throw new Error('No terms and conditions content found');
                }

                // Simple text analysis
                const summary = this.generateSummary(content);
                const risks = this.identifyRisks(content);
                
                // Update sidebar with results
                this.updateSidebarWithResults(summary, risks);
                
                return { success: true };
            } catch (error) {
                console.error('Error analyzing page:', error);
                this.updateSidebarError(error.message);
                return { success: false, error: error.message };
            } finally {
                this.isAnalyzing = false;
            }
        }

        generateSummary(content) {
            // Keywords for important T&C sections
            const importantKeywords = [
                'privacy', 'data', 'personal information', 'collection', 'use', 'share',
                'liability', 'responsibility', 'warranty', 'guarantee', 'damages',
                'termination', 'cancel', 'suspend', 'account', 'access',
                'intellectual property', 'copyright', 'trademark', 'license',
                'governance', 'law', 'jurisdiction', 'dispute', 'arbitration',
                'modification', 'change', 'update', 'notification',
                'third party', 'partner', 'affiliate', 'service provider'
            ];

            // Split content into sentences
            const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
            
            // Find sentences containing important keywords
            const importantSentences = sentences
                .filter(sentence => {
                    const lowerSentence = sentence.toLowerCase();
                    return importantKeywords.some(keyword => lowerSentence.includes(keyword));
                })
                .map(sentence => {
                    // Clean up the sentence
                    let clean = sentence
                        .replace(/^you\s+/i, '')
                        .replace(/\s+by\s+using\s+this\s+service/i, '')
                        .replace(/\s+when\s+you\s+use\s+this\s+service/i, '')
                        .replace(/\s+in\s+connection\s+with\s+this\s+service/i, '')
                        .trim();

                    // Ensure proper capitalization
                    clean = clean.charAt(0).toUpperCase() + clean.slice(1);

                    // Ensure the sentence ends with a period
                    if (!clean.endsWith('.')) {
                        clean += '.';
                    }

                    return clean;
                })
                .slice(0, 5); // Get top 5 most important points

            // If we don't have enough important sentences, add some general ones
            if (importantSentences.length < 3) {
                const generalSentences = sentences
                    .filter(sentence => {
                        const lowerSentence = sentence.toLowerCase();
                        return lowerSentence.includes('must') || 
                               lowerSentence.includes('shall') || 
                               lowerSentence.includes('required') ||
                               lowerSentence.includes('obligation') ||
                               lowerSentence.includes('agree') ||
                               lowerSentence.includes('accept');
                    })
                    .map(sentence => {
                        let clean = sentence.trim();
                        if (!clean.endsWith('.')) {
                            clean += '.';
                        }
                        return clean;
                    })
                    .slice(0, 5 - importantSentences.length);

                importantSentences.push(...generalSentences);
            }

            return importantSentences;
        }

        identifyRisks(content) {
            // Simple risk identification
            const risks = [];
            const riskKeywords = [
                'liability', 'warranty', 'indemnify', 'arbitration', 'termination',
                'disclaimer', 'limitation', 'exclusion', 'waiver', 'jurisdiction'
            ];
            
            riskKeywords.forEach(keyword => {
                if (content.toLowerCase().includes(keyword)) {
                    risks.push(keyword);
                }
            });
            
            return risks;
        }

        updateSidebarWithResults(summary, risks) {
            if (!this.sidebar) return;
            
            const contentDiv = this.sidebar.querySelector('.quickterms-content');
            if (!contentDiv) return;

            contentDiv.innerHTML = `
                <style>
                    .quickterms-sidebar {
                        position: fixed;
                        right: 0;
                        top: 0;
                        width: 350px; /* Reduced width */
                        height: 100vh;
                        background: #ffffff;
                        box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
                        z-index: 9999;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                        overflow-y: auto;
                        padding: 15px;
                        color: #333333;
                    }

                    .quickterms-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding-bottom: 12px;
                        border-bottom: 2px solid #1a73e8;
                        margin-bottom: 20px;
                        background: #1a73e8;
                        padding: 15px;
                        border-radius: 6px 6px 0 0;
                    }

                    .quickterms-header h2 {
                        margin: 0;
                        font-size: 24px;
                        font-weight: 700;
                        color: #ffffff;
                    }

                    .quickterms-close {
                        background: none;
                        border: none;
                        font-size: 24px;
                        cursor: pointer;
                        color: #ffffff;
                        padding: 5px;
                        line-height: 1;
                        transition: color 0.2s;
                    }

                    .quickterms-close:hover {
                        color: #e0e0e0;
                    }

                    .quickterms-section {
                        margin-bottom: 20px;
                        background: #f8f9fa;
                        padding: 15px;
                        border-radius: 6px;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
                    }

                    .quickterms-section h3 {
                        font-size: 16px;
                        font-weight: 600;
                        color: #1a73e8;
                        margin: 0 0 15px 0;
                        padding-bottom: 8px;
                        border-bottom: 1px solid #e0e0e0;
                    }

                    .quickterms-summary {
                        font-size: 14px;
                        line-height: 1.5;
                        color: #2c3e50;
                    }

                    .quickterms-point {
                        margin-bottom: 12px;
                        padding-left: 25px;
                        position: relative;
                        color: #2c3e50;
                    }

                    .quickterms-point:before {
                        content: "•";
                        position: absolute;
                        left: 0;
                        font-size: 20px;
                        color: #1a73e8;
                        line-height: 1;
                        font-weight: bold;
                    }

                    .quickterms-clauses {
                        list-style: none;
                        padding: 0;
                        margin: 0;
                    }

                    .quickterms-clause {
                        background: #ffffff;
                        padding: 12px;
                        margin-bottom: 10px;
                        border-radius: 6px;
                        font-size: 13px;
                        color: #2c3e50;
                        border-left: 3px solid #1a73e8;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
                        transition: transform 0.2s, box-shadow 0.2s;
                    }

                    .quickterms-clause:hover {
                        transform: translateX(5px);
                        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                    }

                    .quickterms-loading {
                        text-align: center;
                        padding: 20px;
                        color: #666;
                        font-size: 14px;
                        background: #f8f9fa;
                        border-radius: 6px;
                    }

                    .quickterms-error {
                        color: #d32f2f;
                        background: #ffebee;
                        padding: 15px;
                        border-radius: 6px;
                        margin: 10px 0;
                        font-size: 13px;
                        border-left: 3px solid #d32f2f;
                    }

                    /* Scrollbar styling */
                    .quickterms-sidebar::-webkit-scrollbar {
                        width: 6px;
                    }

                    .quickterms-sidebar::-webkit-scrollbar-track {
                        background: #f1f1f1;
                    }

                    .quickterms-sidebar::-webkit-scrollbar-thumb {
                        background: #1a73e8;
                        border-radius: 3px;
                    }

                    .quickterms-sidebar::-webkit-scrollbar-thumb:hover {
                        background: #1557b0;
                    }
                </style>
                <div class="quickterms-section">
                    <h3>Summary</h3>
                    <div class="quickterms-summary">
                        ${summary.map(point => `<div class="quickterms-point">${point}</div>`).join('')}
                    </div>
                </div>
                <div class="quickterms-section">
                    <h3>Key Risks</h3>
                    <ul class="quickterms-clauses">
                        ${risks.map(risk => `<li class="quickterms-clause">${risk}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        updateSidebarError(errorMessage) {
            if (!this.sidebar) return;
            
            const contentDiv = this.sidebar.querySelector('.quickterms-content');
            contentDiv.innerHTML = `
                <div class="quickterms-error">
                    ${errorMessage}
        </div>
    `;
        }
    }

    // Initialize the extension
    const controller = new QuickTermsController();
    controller.init().catch(error => {
        console.error('Failed to initialize QuickTerms:', error);
    });

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'analyze') {
            controller.openSidebar().then(() => {
                sendResponse({ success: true });
            }).catch(error => {
                sendResponse({ success: false, error: error.message });
            });
            return true; // Keep message channel open for async response
        }
    });
}

