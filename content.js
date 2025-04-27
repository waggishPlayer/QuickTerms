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
            // Simple summary generation
            const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
            const importantSentences = sentences
                .filter(s => {
                    const lower = s.toLowerCase();
                    return lower.includes('must') || 
                           lower.includes('shall') || 
                           lower.includes('required') ||
                           lower.includes('obligation') ||
                           lower.includes('responsibility');
                })
                .slice(0, 5);
            
            return importantSentences.join('. ') + '.';
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
            contentDiv.innerHTML = `
                <div class="quickterms-section">
                    <h3>Summary</h3>
                    <p>${summary}</p>
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

