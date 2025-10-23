// SafeVoice Global JavaScript
// GOLDEN CODE VERSION - NO SUPABASE YET

class SafeVoiceApp {
    constructor() {
        this.currentUser = null;
        this.walletConnected = false;
        this.tokenBalance = 0;
        this.init();
    }

    init() {
        console.log('SafeVoice App Initialized (Golden Code)');
        this.loadUserState();
        this.setupEventListeners();
        // Dispatch event indicating user state is loaded
        window.dispatchEvent(new CustomEvent('safeVoiceUserUpdate', { detail: { currentUser: this.currentUser } }));
    }

    loadUserState() {
        // Check for existing session
        const savedUser = localStorage.getItem('safeVoiceUser');
        if (savedUser) {
            try {
                this.currentUser = JSON.parse(savedUser);
                this.walletConnected = this.currentUser?.walletAddress ? true : false;
                this.tokenBalance = this.currentUser?.tokenBalance || 0;
                console.log('User state loaded:', this.currentUser);
            } catch (e) {
                console.error("Failed to parse user state from localStorage", e);
                localStorage.removeItem('safeVoiceUser'); // Clear corrupted data
                this.currentUser = null;
                this.walletConnected = false;
                this.tokenBalance = 0;
            }
        } else {
            console.log('No saved user state found.');
            this.currentUser = null;
            this.walletConnected = false;
            this.tokenBalance = 0;
        }
        // Dispatch token update event separately
        window.dispatchEvent(new CustomEvent('safeVoiceTokenUpdate', { detail: { newBalance: this.tokenBalance } }));
    }


    setupEventListeners() {
        // Global click handlers for dynamic content
        document.addEventListener('click', this.handleGlobalClicks.bind(this));
        // Initialize tooltips if any (basic implementation)
        this.initTooltips();
    }

    handleGlobalClicks(event) {
        // Handle dynamic reaction buttons
        const reactionButton = event.target.closest('.reaction-btn');
        if (reactionButton) {
            this.handleReaction(reactionButton);
        }

        // Handle Image Modal Clicks Globally
        const imageElement = event.target.closest('.post-image, .memorial-image');
        const modal = document.getElementById('imageModal');
        const modalImg = document.getElementById('modalImage');

        if (imageElement && modal && modalImg) {
            modalImg.src = imageElement.src;
            modal.classList.add('show');
            if (typeof feather !== 'undefined') feather.replace({ parent: modal }); // Render close icon
        }

        // Handle modal close clicks
        const closeModalBtn = event.target.closest('#imageModalClose');
        const isModalBackdrop = event.target === modal;
        if ((closeModalBtn || isModalBackdrop) && modal) {
            modal.classList.remove('show');
        }
    }


    async handleReaction(button) {
        // --- SIMULATED REACTION LOGIC ---
        const postId = button.dataset.postId;
        const reactionType = button.dataset.reaction;

        if (!postId || !reactionType) {
            console.error('Missing post ID or reaction type on button:', button);
            return;
        }

        if (button.classList.contains('processing')) return;
        button.classList.add('processing', 'opacity-50'); // Add opacity while processing

        console.log(`Simulating reaction: Post ${postId}, Type ${reactionType}`);

        try {
            await this.simulateAPICall(500); // Simulate network delay

            // Update UI optimistically
            const countElement = button.querySelector('.reaction-count');
            if (countElement) {
                const currentCount = parseInt(countElement.textContent) || 0;
                countElement.textContent = currentCount + 1;
                // Add a visual cue that it was reacted to (can be improved)
                 button.classList.add('text-blue-600'); // Example: make icon blue
                 // You might want a more sophisticated way to track reacted state per user later
            }

            this.awardTokens(1, 'reaction_given'); // Award token

        } catch (error) {
            console.error('Simulated reaction failed:', error);
            this.showNotification('Failed to add reaction. Please try again.', 'error');
            // TODO: Revert optimistic UI update if needed (e.g., decrement count, remove class)
        } finally {
            button.classList.remove('processing', 'opacity-50'); // Remove processing state and opacity
        }
        // --- END SIMULATION ---
    }


    async connectWallet() {
        try {
            // Simulate MetaMask connection
            const accounts = await this.simulateWalletConnection();

            if (accounts && accounts.length > 0) {
                this.walletConnected = true;
                const newBalance = (this.currentUser?.tokenBalance || 0) + 100;
                this.currentUser = {
                    walletAddress: accounts[0],
                    isAnonymous: false,
                    tokenBalance: newBalance
                };

                localStorage.setItem('safeVoiceUser', JSON.stringify(this.currentUser));
                this.tokenBalance = this.currentUser.tokenBalance;

                window.dispatchEvent(new CustomEvent('safeVoiceTokenUpdate', { detail: { newBalance: this.tokenBalance } }));
                window.dispatchEvent(new CustomEvent('safeVoiceUserUpdate', { detail: { currentUser: this.currentUser } }));

                this.showNotification(`Wallet connected! +100 tokens`, 'success');
                return true;
            } else {
                 throw new Error("No accounts returned from wallet simulation.");
            }
        } catch (error) {
            console.error('Wallet connection failed:', error);
            this.showNotification('Wallet connection failed. Please try again.', 'error');
            return false;
        }
    }


    enterAnonymousMode() {
         const newBalance = 50;
        this.currentUser = {
            anonymousId: this.generateAnonymousId(),
            isAnonymous: true,
            tokenBalance: newBalance
        };

        localStorage.setItem('safeVoiceUser', JSON.stringify(this.currentUser));
        this.tokenBalance = this.currentUser.tokenBalance;

        window.dispatchEvent(new CustomEvent('safeVoiceTokenUpdate', { detail: { newBalance: this.tokenBalance } }));
        window.dispatchEvent(new CustomEvent('safeVoiceUserUpdate', { detail: { currentUser: this.currentUser } }));

        this.showNotification('Entering in anonymous mode. Your privacy is protected!', 'info');
        return true;
    }

    generateAnonymousId() {
         const adjectives = ['Brave', 'Calm', 'Wise', 'Kind', 'Strong', 'Gentle', 'Bright', 'True', 'Silent', 'Free'];
        const nouns = ['Owl', 'Phoenix', 'Lion', 'Dolphin', 'Eagle', 'Wolf', 'Tiger', 'Bear', 'Fox', 'Hawk'];
        const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
        const number = Math.floor(Math.random() * 900) + 100;

        return `${randomAdj}${randomNoun}${number}`;
    }

    awardTokens(amount, reason) {
        if (this.currentUser) {
            this.currentUser.tokenBalance = (this.currentUser.tokenBalance || 0) + amount;
            this.tokenBalance = this.currentUser.tokenBalance;

            localStorage.setItem('safeVoiceUser', JSON.stringify(this.currentUser));

            window.dispatchEvent(new CustomEvent('safeVoiceTokenUpdate', { detail: { newBalance: this.tokenBalance, reason: reason } }));

            console.log(`Awarded ${amount} tokens for: ${reason}. New balance: ${this.tokenBalance}`);
        } else {
             console.log(`Cannot award tokens: No current user.`);
        }
    }

    simulateWalletConnection() {
        return new Promise((resolve) => {
            console.log("Simulating wallet connection...");
            setTimeout(() => {
                const success = Math.random() > 0.1;
                if (success) {
                    const randomAddress = '0x' + [...Array(40)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
                    console.log("Wallet connection simulation successful:", randomAddress);
                    resolve([randomAddress]);
                } else {
                    console.log("Wallet connection simulation rejected by user.");
                    resolve([]);
                }
            }, 1500);
        });
    }

    simulateAPICall(duration = 500) {
        return new Promise((resolve) => {
             console.log(`Simulating API call (duration: ${duration}ms)...`);
            setTimeout(() => {
                 console.log("API call simulation complete.");
                resolve();
            }, duration + Math.random() * 300);
        });
    }

    showNotification(message, type = 'info', duration = 3000) {
        document.querySelectorAll('.safevoice-notification').forEach(n => n.remove());

        const notification = document.createElement('div');
        notification.className = `safevoice-notification fixed top-20 right-4 p-4 rounded-lg text-white z-[2100] shadow-lg ${
            type === 'success' ? 'bg-green-500' :
            type === 'error' ? 'bg-red-500' :
            'bg-blue-500'
        }`;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), duration);
    }

    initTooltips() {
        // Basic placeholder - implementation can be expanded
         document.querySelectorAll('[data-tooltip]').forEach(element => {
            // Simple title attribute fallback for basic tooltips
            if (!element.title && element.dataset.tooltip) {
                 element.title = element.dataset.tooltip;
            }
        });
    }

} // End SafeVoiceApp Class


const SafeVoiceUtils = {
    formatNumber: (num) => {
         if (num == null || isNaN(num)) return '0';
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        }
        return num.toLocaleString();
    },

    formatDate: (dateString) => {
         if (!dateString) return '';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '';
            const now = new Date();
            const diffMs = now - date;
            const diffSeconds = Math.floor(diffMs / 1000);
            const diffMins = Math.floor(diffSeconds / 60);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);

            if (diffSeconds < 60) return 'Just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;
            if (diffDays === 1) return `Yesterday`;
            if (diffDays < 7) return `${diffDays}d ago`;
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch (e) {
             console.error("Error formatting date:", dateString, e);
             return '';
        }
    },

    debounce: (func, wait) => {
         let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func.apply(this, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    simulatePGPEncryption: async (content) => {
        return new Promise((resolve) => {
            console.log("Simulating PGP encryption...");
            setTimeout(() => {
                const encrypted = `-----BEGIN PGP MESSAGE-----\nVersion: SafeVoice Simulation\n\n${btoa(content).substring(0, 50)}...\n-----END PGP MESSAGE-----`;
                 console.log("PGP encryption simulation complete.");
                resolve(encrypted);
            }, 800);
        });
    },

    calculateTokenReward: (action, metadata = {}) => {
         const rewards = {
            post_created: 10,
            reaction_given: 1,
            reaction_received: 1,
            comment_posted: 5,
            comment_reaction_given: 1,
            comment_reaction_received: 1,
            crisis_support_tagged: 50,
            content_moderated_helpful: 15,
            first_post: 25,
            first_reaction: 5,
            wallet_connected: 100,
            anonymous_entry: 50
        };
        return rewards[action] || 0;
    },

     escapeHTML: (str) => {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
     },
};

window.SafeVoiceUtils = SafeVoiceUtils;

document.addEventListener('DOMContentLoaded', () => {
    if (typeof feather !== 'undefined') {
        feather.replace();
    } else {
        console.warn('Feather icons library not loaded yet.');
        setTimeout(() => {
             if (typeof feather !== 'undefined') feather.replace();
        }, 500);
    }

    if (!window.safeVoiceApp) {
        window.safeVoiceApp = new SafeVoiceApp();
    }

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('imageModal');
            if (modal && modal.classList.contains('show')) {
                modal.classList.remove('show');
            }
        }
    });
});

