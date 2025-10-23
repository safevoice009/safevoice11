// SafeVoice Global JavaScript
class SafeVoiceApp {
    constructor() {
        this.currentUser = null;
        this.walletConnected = false;
        this.tokenBalance = 0;
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
        const postId = button.dataset.postId;
        const reactionType = button.dataset.reaction;
        
        // Add loading state
        button.classList.add('opacity-50');
        
        try {
            // Simulate API call
            await this.simulateAPICall();
            
            // Update UI optimistically
            const countElement = button.querySelector('.reaction-count');
            if (countElement) {
                countElement.textContent = parseInt(countElement.textContent) + 1;
            
            // Award tokens for reaction
            this.awardTokens(2, 'reaction_given');
            
        } catch (error) {
            console.error('Reaction failed:', error);
            // Revert optimistic update
        } finally {
            button.classList.remove('opacity-50');
        }
    }

    async connectWallet() {
        try {
            // Simulate MetaMask connection
            const accounts = await this.simulateWalletConnection();
            
            if (accounts && accounts.length > 0) {
                this.walletConnected = true;
                this.currentUser = {
                    walletAddress: accounts[0],
                    isAnonymous: false,
                    tokenBalance: this.tokenBalance + 100 // Welcome bonus
            };
            
            localStorage.setItem('safeVoiceUser', JSON.stringify(this.currentUser));
            this.tokenBalance = this.currentUser.tokenBalance;
            
            // Show success message
            this.showNotification(`Wallet connected! +100 tokens`, 'success');
            
            return true;
        } catch (error) {
            console.error('Wallet connection failed:', error);
            this.showNotification('Wallet connection failed. Please try again.', 'error');
            return false;
        }
    }

    enterAnonymousMode() {
        this.currentUser = {
            anonymousId: this.generateAnonymousId(),
            isAnonymous: true,
            tokenBalance: 50 // Smaller welcome bonus for anonymous
        };
        
        localStorage.setItem('safeVoiceUser', JSON.stringify(this.currentUser));
        this.tokenBalance = this.currentUser.tokenBalance;
        
        this.showNotification('Entering in anonymous mode. Your privacy is protected!', 'info');
        
        return true;
    }

    generateAnonymousId() {
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
            
            // Update token display if exists
            const tokenDisplay = document.querySelector('.token-balance');
        if (tokenDisplay) {
            tokenDisplay.textContent = this.tokenBalance.toLocaleString();
        }
        
        console.log(`Awarded ${amount} tokens for: ${reason}`);
    }

    simulateWalletConnection() {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(['0x742d35Cc6634C0532925a3b842B');

        });
    }

    simulateAPICall() {
        return new Promise((resolve) => {
            setTimeout(resolve, 500 + Math.random() * 1000);
        });
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg text-white z-50 ${
            type === 'success' ? 'bg-green-500' :
            type === 'error' ? 'bg-red-500' :
            'bg-blue-500'
        }`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Remove after delay
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    initTooltips() {
        // Initialize any tooltip functionality
        const tooltipElements = document.querySelectorAll('[data-tooltip]');
        tooltipElements.forEach(element => {
            element.addEventListener('mouseenter', this.showTooltip.bind(this));
            element.addEventListener('mouseleave', this.hideTooltip.bind(this));
        });
    }

    showTooltip(event) {
        // Tooltip implementation
        const tooltipText = event.target.dataset.tooltip;
        // Tooltip logic here
    }

    hideTooltip(event) {
        // Tooltip removal logic
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.safeVoiceApp = new SafeVoiceApp();
});

// Utility functions
const SafeVoiceUtils = {
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
        const diffMins = Math.floor(diffMs / (1000 * 60)));
        
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

    // PGP encryption simulation
    simulatePGPEncryption: async (content) => {
        // This would integrate with OpenPGP.js in production
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(`🔒 PGP_ENCRYPTED_${btoa(content).substring(0, 20)}...`;
        });
    },

    // Token economy helper
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
