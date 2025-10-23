// SafeVoice Global JavaScript

// --- NEW: Supabase Client Initialization ---
const SUPABASE_URL = 'https://jjfkwkmdvpxzjzbblodz.supabase.co';
// Use the Anon Key (safe to expose in browser)
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqZmt3a21kdnB4emp6YmJsb2R6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk0NzAwOTQsImV4cCI6MjA0NTA0NjA5NH0.rN8oDm5T_JXOG8KN_wBKiBdVTsE7OUOmBBkKJ4VF9TI';
let supabase = null; // Initialize as null

try {
    if (window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('Supabase client initialized successfully.');
    } else {
        console.error('Supabase library not found. Make sure it is included.');
        // Optionally, load it dynamically if needed, though it should be included via CDN.
    }
} catch (error) {
    console.error('Error initializing Supabase client:', error);
}
// --- END NEW ---


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
        // Dispatch event indicating user state is loaded (useful for other scripts)
        window.dispatchEvent(new CustomEvent('safeVoiceUserUpdate', { detail: { currentUser: this.currentUser } }));
    }

    loadUserState() {
        // ... existing loadUserState logic ...
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
        // ... existing setupEventListeners logic ...
        document.addEventListener('click', this.handleGlobalClicks.bind(this));
        this.initTooltips();

    }

    handleGlobalClicks(event) {
        // ... existing handleGlobalClicks logic ...
         // Handle dynamic reaction buttons
        const reactionButton = event.target.closest('.reaction-btn');
        if (reactionButton) {
            // Prevent handling if it's within a specific non-clickable area later
            this.handleReaction(reactionButton);
        }

        // --- NEW: Handle Image Modal Clicks Globally ---
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
        // --- END NEW ---
    }


    async handleReaction(button) {
        // --- UPDATED: Add Supabase Logic (Placeholder for now) ---
        const postId = button.dataset.postId;
        const reactionType = button.dataset.reaction;

        if (!postId || !reactionType) {
            console.error('Missing post ID or reaction type on button:', button);
            return;
        }

        // Prevent double-clicking
        if (button.classList.contains('processing')) return;
        button.classList.add('processing');

        console.log(`Attempting reaction: Post ${postId}, Type ${reactionType}`);

        try {
            // ** Placeholder for Supabase reaction logic **
            // 1. Check if user already reacted (using localStorage for anon, or DB query for logged in)
            // 2. If not reacted:
            //    a. Increment count in 'posts' table (or use an RPC function)
            //    b. Add a record to 'reactions' table (for tracking who reacted)
            // 3. If already reacted:
            //    a. Decrement count in 'posts' table (optional, depends on desired behavior)
            //    b. Remove record from 'reactions' table (optional)

            await this.simulateAPICall(500); // Simulate network delay

            // Update UI optimistically (assuming success)
            const countElement = button.querySelector('.reaction-count');
            if (countElement) {
                // For now, just increment visually. Real logic will depend on Supabase response.
                const currentCount = parseInt(countElement.textContent) || 0;
                countElement.textContent = currentCount + 1;
                button.classList.add('text-blue-600'); // Example: Mark as reacted visually
            }

            this.awardTokens(2, 'reaction_given'); // Keep token simulation

        } catch (error) {
            console.error('Reaction failed:', error);
            this.showNotification('Failed to add reaction. Please try again.', 'error');
            // TODO: Revert optimistic UI update if needed
        } finally {
            button.classList.remove('processing');
        }
        // --- END UPDATE ---
    }


    async connectWallet() {
        // ... existing connectWallet logic ...
        try {
            // Simulate MetaMask connection
            const accounts = await this.simulateWalletConnection();

            if (accounts && accounts.length > 0) {
                this.walletConnected = true;
                const newBalance = (this.currentUser?.tokenBalance || 0) + 100; // Calculate new balance
                this.currentUser = {
                    walletAddress: accounts[0],
                    isAnonymous: false,
                    tokenBalance: newBalance // Welcome bonus applied
                };

                localStorage.setItem('safeVoiceUser', JSON.stringify(this.currentUser));
                this.tokenBalance = this.currentUser.tokenBalance;

                // Dispatch events to update UI elsewhere
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
        // ... existing enterAnonymousMode logic ...
         const newBalance = 50; // Smaller welcome bonus for anonymous
        this.currentUser = {
            anonymousId: this.generateAnonymousId(),
            isAnonymous: true,
            tokenBalance: newBalance
        };

        localStorage.setItem('safeVoiceUser', JSON.stringify(this.currentUser));
        this.tokenBalance = this.currentUser.tokenBalance;

         // Dispatch events to update UI elsewhere
        window.dispatchEvent(new CustomEvent('safeVoiceTokenUpdate', { detail: { newBalance: this.tokenBalance } }));
        window.dispatchEvent(new CustomEvent('safeVoiceUserUpdate', { detail: { currentUser: this.currentUser } }));


        this.showNotification('Entering in anonymous mode. Your privacy is protected!', 'info');
        return true; // Indicate success for navigation
    }

    generateAnonymousId() {
        // ... existing generateAnonymousId logic ...
         const adjectives = ['Brave', 'Calm', 'Wise', 'Kind', 'Strong', 'Gentle', 'Bright', 'True', 'Silent', 'Free'];
        const nouns = ['Owl', 'Phoenix', 'Lion', 'Dolphin', 'Eagle', 'Wolf', 'Tiger', 'Bear', 'Fox', 'Hawk'];
        const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
        const number = Math.floor(Math.random() * 900) + 100; // Ensure 3 digits

        return `${randomAdj}${randomNoun}${number}`;
    }

    awardTokens(amount, reason) {
        // ... existing awardTokens logic ...
        if (this.currentUser) {
            this.currentUser.tokenBalance = (this.currentUser.tokenBalance || 0) + amount; // Ensure balance exists
            this.tokenBalance = this.currentUser.tokenBalance;

            localStorage.setItem('safeVoiceUser', JSON.stringify(this.currentUser));

             // Dispatch event instead of direct DOM manipulation
            window.dispatchEvent(new CustomEvent('safeVoiceTokenUpdate', { detail: { newBalance: this.tokenBalance, reason: reason } }));

            console.log(`Awarded ${amount} tokens for: ${reason}. New balance: ${this.tokenBalance}`);
        } else {
             console.log(`Cannot award tokens: No current user.`);
        }
    }

    simulateWalletConnection() {
        // ... existing simulateWalletConnection logic ...
        return new Promise((resolve) => {
            console.log("Simulating wallet connection...");
            setTimeout(() => {
                 // Simulate user approving connection
                const success = Math.random() > 0.1; // 90% chance of success
                if (success) {
                    const randomAddress = '0x' + [...Array(40)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
                    console.log("Wallet connection simulation successful:", randomAddress);
                    resolve([randomAddress]);
                } else {
                    console.log("Wallet connection simulation rejected by user.");
                    resolve([]); // Simulate user rejection
                }
            }, 1500); // Simulate delay
        });
    }

    simulateAPICall(duration = 500) { // Added duration parameter
        // ... existing simulateAPICall logic ...
        return new Promise((resolve) => {
             console.log(`Simulating API call (duration: ${duration}ms)...`);
            setTimeout(() => {
                 console.log("API call simulation complete.");
                resolve();
            }, duration + Math.random() * 300); // Add slight randomness
        });
    }

    showNotification(message, type = 'info', duration = 3000) { // Added duration
        // ... existing showNotification logic ...
         // Remove existing notifications first
        document.querySelectorAll('.safevoice-notification').forEach(n => n.remove());

        const notification = document.createElement('div');
         // Add a specific class for easier removal
        notification.className = `safevoice-notification fixed top-20 right-4 p-4 rounded-lg text-white z-[2100] shadow-lg ${ // Increased z-index
            type === 'success' ? 'bg-green-500' :
            type === 'error' ? 'bg-red-500' :
            'bg-blue-500'
        }`;
        notification.textContent = message;
        // Add fade-in animation (optional, requires CSS)
        // notification.style.animation = 'fadeIn 0.3s ease-out';

        document.body.appendChild(notification);

        setTimeout(() => {
             // Add fade-out animation (optional, requires CSS)
             // notification.style.animation = 'fadeOut 0.3s ease-in forwards';
             // setTimeout(() => notification.remove(), 300); // Remove after fade out
             notification.remove(); // Simple remove for now
        }, duration);
    }


    initTooltips() {
        // ... existing initTooltips logic ... (placeholder)
        // Basic implementation concept:
        document.querySelectorAll('[data-tooltip]').forEach(element => {
            let tooltipElement = null;
            element.addEventListener('mouseenter', (e) => {
                const text = element.getAttribute('data-tooltip');
                if (!text) return;
                tooltipElement = document.createElement('div');
                tooltipElement.className = 'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded shadow-lg whitespace-nowrap z-10';
                tooltipElement.textContent = text;
                element.style.position = 'relative'; // Ensure parent is relative
                element.appendChild(tooltipElement);
            });
            element.addEventListener('mouseleave', () => {
                if (tooltipElement) {
                    tooltipElement.remove();
                    tooltipElement = null;
                }
            });
        });
    }


} // End SafeVoiceApp Class

// --- NEW: Global Utility Functions (Moved from script.js inline) ---
const SafeVoiceUtils = {
    formatNumber: (num) => {
        // ... existing formatNumber logic ...
         if (num == null || isNaN(num)) return '0'; // Handle null/NaN
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'; // Remove trailing .0
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        }
        return num.toLocaleString();
    },

    formatDate: (dateString) => {
         // ... existing formatDate logic ...
         if (!dateString) return '';
        try {
            const date = new Date(dateString);
             // Check if date is valid
            if (isNaN(date.getTime())) {
                console.warn("Invalid date string provided:", dateString);
                return '';
            }

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
             // Format older dates nicely
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch (e) {
             console.error("Error formatting date:", dateString, e);
             return '';
        }
    },


    debounce: (func, wait) => {
        // ... existing debounce logic ...
         let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func.apply(this, args); // Use apply to preserve context
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // PGP encryption simulation
    simulatePGPEncryption: async (content) => {
        // ... existing simulatePGPEncryption logic ...
        return new Promise((resolve) => {
            console.log("Simulating PGP encryption...");
            setTimeout(() => {
                // Simulate a PGP-like structure (very basic)
                const encrypted = `-----BEGIN PGP MESSAGE-----\nVersion: SafeVoice Simulation\n\n${btoa(content).substring(0, 50)}...\n-----END PGP MESSAGE-----`;
                 console.log("PGP encryption simulation complete.");
                resolve(encrypted);
            }, 800);
        });
    },

    // Token economy helper
    calculateTokenReward: (action, metadata = {}) => {
        // ... existing calculateTokenReward logic ...
         const rewards = {
            post_created: 10,
            reaction_given: 1, // Reduced reaction reward slightly
            reaction_received: 1,
            comment_posted: 5,
            comment_reaction_given: 1,
            comment_reaction_received: 1,
            crisis_support_tagged: 50, // More specific
            content_moderated_helpful: 15,
            first_post: 25,
            first_reaction: 5, // Reduced slightly
            wallet_connected: 100,
            anonymous_entry: 50
        };
        return rewards[action] || 0;
    },

     // --- NEW: HTML Sanitizer (Basic) ---
     escapeHTML: (str) => {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
     },
     // --- END NEW ---

};

// Export globally if not using modules
window.SafeVoiceUtils = SafeVoiceUtils;

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Ensure Feather Icons are available before initializing app that might use them
    if (typeof feather !== 'undefined') {
        feather.replace(); // Initial replacement
    } else {
        console.warn('Feather icons library not loaded yet.');
        // Optionally try again after a delay
        setTimeout(() => {
             if (typeof feather !== 'undefined') feather.replace();
        }, 500);
    }

    // Initialize the main app class
    if (!window.safeVoiceApp) { // Prevent double initialization
        window.safeVoiceApp = new SafeVoiceApp();
    }

     // Global listener for Escape key to close modals
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('imageModal');
            if (modal && modal.classList.contains('show')) {
                modal.classList.remove('show');
            }
             // Add similar logic for other modals if created
        }
    });

});
