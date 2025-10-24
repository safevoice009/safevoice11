// SafeVoice Global JavaScript
class SafeVoiceApp {
    constructor() {
        this.currentUser = null;
        this.walletConnected = false;
        this.tokenBalance = 0;

        // --- NEW: Ethers.js Provider ---
        this.provider = null;
        // Check if MetaMask (window.ethereum) is available
        if (typeof window.ethereum !== 'undefined') {
            // Initialize the provider
            this.provider = new ethers.providers.Web3Provider(window.ethereum);
            console.log('Ethers.js provider initialized.');
        } else {
            console.warn('MetaMask is not installed.');
        }
        // --- END NEW ---

        this.init();
    }

    init() {
        console.log('SafeVoice App Initialized');
        this.loadUserState();
        this.setupEventListeners();
    }

    loadUserState() {
        // Check for existing session
        const savedUser = localStorage.getItem('safeVoiceUser');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            this.walletConnected = this.currentUser?.walletAddress ? true : false;
            this.tokenBalance = this.currentUser?.tokenBalance || 0;
        }
        // --- NEW: Dispatch user update on load for navbar ---
        this.dispatchUserUpdate();
    }

    setupEventListeners() {
        // Global click handlers for dynamic content
        document.addEventListener('click', this.handleGlobalClicks.bind(this));

        // Initialize tooltips if any
        this.initTooltips();
    }

    handleGlobalClicks(event) {
        // Handle dynamic reaction buttons
        if (event.target.closest('.reaction-btn')) {
            this.handleReaction(event.target.closest('.reaction-btn'));
        }
    }

    async handleReaction(button) {
        // This function is preserved from your original file
        const postId = button.dataset.postId;
        const reactionType = button.dataset.reaction;

        button.classList.add('opacity-50');

        try {
            await this.simulateAPICall();

            const countElement = button.querySelector('.reaction-count');
            if (countElement) {
                // Fixed logic error from original file
                const newCount = parseInt(countElement.textContent) + 1;
                countElement.textContent = newCount;
            }

            this.awardTokens(2, 'reaction_given');

        } catch (error) {
            console.error('Reaction failed:', error);
        } finally {
            button.classList.remove('opacity-50');
        }
    }

    // --- UPDATED: Real Wallet Connection ---
    async connectWallet() {
        // Check if provider was successfully initialized
        if (!this.provider) {
            this.showNotification('MetaMask is not installed. Please install it to connect.', 'error');
            // Suggest installing MetaMask
            window.open('https://metamask.io/download/', '_blank');
            return false;
        }

        try {
            // Request account access from MetaMask
            const accounts = await this.provider.send("eth_requestAccounts", []);

            if (accounts && accounts.length > 0) {
                const walletAddress = accounts[0];
                this.walletConnected = true;

                // Check if user was anonymous before, preserve tokens if so
                const existingBalance = (this.currentUser && this.currentUser.isAnonymous) ? this.currentUser.tokenBalance : 0;
                const welcomeBonus = 100; // As per roadmap

                this.currentUser = {
                    walletAddress: walletAddress,
                    isAnonymous: false,
                    tokenBalance: existingBalance + welcomeBonus
                };

                localStorage.setItem('safeVoiceUser', JSON.stringify(this.currentUser));
                this.tokenBalance = this.currentUser.tokenBalance;

                // Show success message
                const shortAddress = `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`;
                this.showNotification(`Wallet ${shortAddress} connected! +${welcomeBonus} tokens`, 'success');

                // --- NEW: Dispatch events to update UI (navbar, profile, etc.) ---
                this.dispatchTokenUpdate();
                this.dispatchUserUpdate();

                // Redirect to feed after connection
                setTimeout(() => {
                    window.location.href = './feed.html';
                }, 1000);

                return true;
            }
        } catch (error) {
            console.error('Wallet connection failed:', error);
            if (error.code === 4001) { // User rejected the request
                this.showNotification('Wallet connection rejected.', 'error');
            } else {
                this.showNotification('Wallet connection failed. Please try again.', 'error');
            }
            return false;
        }
    }
    // --- END UPDATED ---

    enterAnonymousMode() {
        // Only set anonymous if not already wallet-connected
        if (this.walletConnected) {
             window.location.href = './feed.html';
             return true;
        }

        const anonymousBonus = 50; // As per roadmap
        this.currentUser = {
            anonymousId: this.generateAnonymousId(),
            isAnonymous: true,
            tokenBalance: 50 // Smaller welcome bonus for anonymous
        };

        localStorage.setItem('safeVoiceUser', JSON.stringify(this.currentUser));
        this.tokenBalance = this.currentUser.tokenBalance;

        this.showNotification(`Entering in anonymous mode. +${anonymousBonus} tokens`, 'info');

        // --- NEW: Dispatch events to update UI ---
        this.dispatchTokenUpdate();
        this.dispatchUserUpdate();

        return true;
    }

    // --- NEW: Custom Event Dispatchers ---
    // These functions broadcast changes to other parts of the app (like navbar.js)
    dispatchTokenUpdate() {
        window.dispatchEvent(new CustomEvent('safeVoiceTokenUpdate', {
            detail: { newBalance: this.tokenBalance }
        }));
    }

    dispatchUserUpdate() {
         window.dispatchEvent(new CustomEvent('safeVoiceUserUpdate', {
            detail: { currentUser: this.currentUser }
        }));
    }
    // --- END NEW ---

    generateAnonymousId() {
        // Preserved from your original file
        const adjectives = ['Brave', 'Calm', 'Wise', 'Kind', 'Strong', 'Gentle', 'Bright', 'True'];
        const nouns = ['Owl', 'Phoenix', 'Lion', 'Dolphin', 'Eagle', 'Wolf', 'Tiger', 'Bear'];
        const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
        const number = Math.floor(Math.random() * 999) + 1;

        return `${randomAdj}${randomNoun}${number}`;
    }

    awardTokens(amount, reason) {
        if (this.currentUser) {
            this.currentUser.tokenBalance += amount;
            this.tokenBalance = this.currentUser.tokenBalance;

            localStorage.setItem('safeVoiceUser', JSON.stringify(this.currentUser));

            // --- NEW: Dispatch event for UI update ---
            this.dispatchTokenUpdate();

            console.log(`Awarded ${amount} tokens for: ${reason}`);
            // Show a success notification for rewards
            this.showNotification(`+${amount} tokens for ${reason.replace('_', ' ')}!`, 'success');
        }
    }

    // This function is no longer used, it has been replaced by the real connectWallet
    /*
    simulateWalletConnection() {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(['0x742d35Cc6634C0532925a3b842B']);
            }, 1000);
        });
    }
    */

    simulateAPICall() {
        // Preserved from your original file
        return new Promise((resolve) => {
            setTimeout(resolve, 500 + Math.random() * 1000);
        });
    }

    showNotification(message, type = 'info') {
        // Preserved from your original file
        // --- UPDATED: position to be below navbar ---
        const notification = document.createElement('div');
        notification.className = `fixed top-20 right-4 p-4 rounded-lg text-white z-2000 shadow-lg ${
            type === 'success' ? 'bg-green-500' :
            type === 'error' ? 'bg-red-500' :
            'bg-blue-500'
        }`;
        notification.textContent = message;

        document.body.appendChild(notification);

        // --- NEW: Add fade out animation ---
        setTimeout(() => {
            notification.style.transition = 'opacity 0.5s ease';
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }

    initTooltips() {
        // Preserved from your original file
        const tooltipElements = document.querySelectorAll('[data-tooltip]');
        tooltipElements.forEach(element => {
            element.addEventListener('mouseenter', this.showTooltip.bind(this));
            element.addEventListener('mouseleave', this.hideTooltip.bind(this));
        });
    }

    showTooltip(event) {
        // Preserved from your original file
        const tooltipText = event.target.dataset.tooltip;
    }

    hideTooltip(event) {
        // Preserved from your original file
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // This ensures SafeVoiceApp is only created once
    if (!window.safeVoiceApp) {
        window.safeVoiceApp = new SafeVoiceApp();
    }
});

// Utility functions
const SafeVoiceUtils = {
    // Preserved from your original file
    formatNumber: (num) => {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toLocaleString();
    },

    formatDate: (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / (1000 * 60));

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
        return date.toLocaleDateString();
    },

    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    simulatePGPEncryption: async (content) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(`🔒 PGP_ENCRYPTED_${btoa(content).substring(0, 20)}...`);
            }, 500);
        });
    },

    calculateTokenReward: (action, metadata = {}) => {
        const rewards = {
            post_created: 10,
            reaction_given: 2,
            reaction_received: 2,
            comment_posted: 5,
            crisis_support: 50,
            content_moderated: 15,
            first_post: 25,
            first_reaction: 10,
            wallet_connected: 100,
            anonymous_entry: 50
        };

        return rewards[action] || 0;
    }
};

// Export for use in other modules
window.SafeVoiceUtils = SafeVoiceUtils;

