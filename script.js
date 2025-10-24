// SafeVoice Global JavaScript
class SafeVoiceApp {
    constructor() {
        this.currentUser = null;
        this.walletConnected = false;
        this.tokenBalance = 0;
        this.provider = null;

        if (typeof window.ethereum !== 'undefined') {
            this.provider = new ethers.providers.Web3Provider(window.ethereum);
            console.log('Ethers.js provider initialized.');
        } else {
            console.warn('MetaMask is not installed.');
        }

        // --- Initialize AFTER properties are set ---
        this.init();
    }

    init() {
        console.log('SafeVoice App Initialized');
        // Load state first
        this.loadUserState();
        // Then set up listeners that might rely on the state
        this.setupEventListeners();
        // --- NEW: Trigger initial UI update based on loaded state ---
        this.updateProfileUI();
    }

    loadUserState() {
        const savedUser = localStorage.getItem('safeVoiceUser');
        if (savedUser) {
            try {
                this.currentUser = JSON.parse(savedUser);
                this.walletConnected = !!this.currentUser?.walletAddress; // More robust check
                this.tokenBalance = this.currentUser?.tokenBalance || 0;
                console.log('User state loaded:', this.currentUser);
            } catch (error) {
                console.error('Error parsing saved user state:', error);
                localStorage.removeItem('safeVoiceUser'); // Clear corrupted data
                this.currentUser = null;
                this.walletConnected = false;
                this.tokenBalance = 0;
            }
        } else {
             console.log('No saved user state found.');
        }
        // Dispatch update AFTER loading is complete
        this.dispatchUserUpdate();
        this.dispatchTokenUpdate();
    }

    setupEventListeners() {
        // Global click handlers
        document.addEventListener('click', this.handleGlobalClicks.bind(this));

        // --- NEW: Centralized Button Listeners ---
        // Wait for DOM content to ensure buttons exist
        document.addEventListener('DOMContentLoaded', () => {
            console.log("DOM loaded, setting up button listeners.");

            // Index Page Buttons
            const connectBtnIndex = document.getElementById('connectWalletBtnIndex');
            const anonymousBtnIndex = document.getElementById('anonymousModeBtnIndex');
            if (connectBtnIndex) {
                 console.log("Found index connect button");
                connectBtnIndex.addEventListener('click', () => this.connectWallet());
            }
             if (anonymousBtnIndex) {
                 console.log("Found index anonymous button");
                anonymousBtnIndex.addEventListener('click', () => {
                    this.enterAnonymousMode();
                    window.location.href = './feed.html'; // Redirect after entering mode
                });
            }

            // Profile Page Button
            const connectBtnProfile = document.getElementById('connectWalletBtnProfile');
            if (connectBtnProfile) {
                 console.log("Found profile connect button");
                connectBtnProfile.addEventListener('click', () => this.connectWallet());
            }

            // Ensure Feather icons are replaced after potential dynamic changes
            if (typeof feather !== 'undefined') {
                feather.replace();
            }

            // --- Trigger initial profile UI update AFTER listeners are set ---
            this.updateProfileUI(); // Ensure profile shows correct state on load
        });
        // --- END NEW ---

        this.initTooltips();
    }

    // --- NEW: Function to update profile page elements ---
    updateProfileUI() {
        // Only run if we are on the profile page
        if (!document.getElementById('profileUsername')) {
            return;
        }
        console.log('Updating profile UI...');


        const usernameEl = document.getElementById('profileUsername');
        const walletEl = document.getElementById('profileWallet');
        const tokenEl = document.getElementById('profileTokenBalance');
        const connectBtn = document.getElementById('connectWalletBtnProfile');
        const postsContainer = document.getElementById('myPostsContainer'); // Added

        if (!usernameEl || !walletEl || !tokenEl || !connectBtn || !postsContainer) {
             console.error("Profile UI elements missing!");
             return;
        }


        if (this.currentUser) {
            tokenEl.textContent = this.tokenBalance.toLocaleString() || '0';

            if (this.currentUser.isAnonymous) {
                usernameEl.textContent = this.currentUser.anonymousId || 'Anonymous User';
                walletEl.textContent = 'Anonymous Mode';
                connectBtn.textContent = 'Connect Wallet';
                connectBtn.style.display = 'inline-block'; // Show connect button
                postsContainer.innerHTML = '<p class="text-center text-gray-500">Connect wallet to see your posts.</p>'; // Prompt to connect
            } else if (this.currentUser.walletAddress) {
                usernameEl.textContent = 'Wallet Connected';
                const shortAddress = `${this.currentUser.walletAddress.substring(0, 6)}...${this.currentUser.walletAddress.substring(this.currentUser.walletAddress.length - 4)}`;
                walletEl.textContent = shortAddress;
                connectBtn.style.display = 'none'; // Hide button if already connected
                 // Placeholder for actual post loading
                 postsContainer.innerHTML = `
                    <div class="bg-gray-100 p-6 rounded-2xl text-center text-gray-500">
                        <i data-feather="loader" class="w-8 h-8 mx-auto mb-2 animate-spin"></i>
                        <p>Loading posts for ${shortAddress}...</p>
                        <p class="text-sm">(Requires Supabase integration)</p>
                    </div>`;
                 if (typeof feather !== 'undefined') feather.replace(); // Render loader icon
            }
        } else {
            // Default state if no user data (e.g., first visit)
            usernameEl.textContent = 'Anonymous User';
            walletEl.textContent = 'Wallet not connected';
            tokenEl.textContent = '0';
            connectBtn.textContent = 'Connect Wallet';
            connectBtn.style.display = 'inline-block';
            postsContainer.innerHTML = '<p class="text-center text-gray-500">Connect wallet or enter anonymously to get started.</p>';
        }

         // Update placeholder stats (replace with real data later)
         document.getElementById('profileTotalPosts').textContent = '0'; // Placeholder
         document.getElementById('profileReactionsGiven').textContent = '0'; // Placeholder
    }
    // --- END NEW ---


    handleGlobalClicks(event) {
        if (event.target.closest('.reaction-btn')) {
            this.handleReaction(event.target.closest('.reaction-btn'));
        }
        // Removed connect wallet handlers from here, now centralized
    }

    async handleReaction(button) {
        const postId = button.dataset.postId;
        const reactionType = button.dataset.reaction;

        button.classList.add('opacity-50');

        try {
            await this.simulateAPICall();
            const countElement = button.querySelector('.reaction-count');
            if (countElement) {
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

    async connectWallet() {
        console.log("Connect wallet button clicked"); // Debug log
        if (!this.provider) {
            this.showNotification('MetaMask is not installed. Please install it to connect.', 'error');
            window.open('https://metamask.io/download/', '_blank');
            return false;
        }

        try {
            const accounts = await this.provider.send("eth_requestAccounts", []);
            if (accounts && accounts.length > 0) {
                const walletAddress = accounts[0];
                this.walletConnected = true;
                const existingBalance = (this.currentUser && this.currentUser.isAnonymous) ? this.currentUser.tokenBalance : 0;
                const welcomeBonus = 100;

                this.currentUser = {
                    walletAddress: walletAddress,
                    isAnonymous: false,
                    tokenBalance: existingBalance + welcomeBonus
                };

                localStorage.setItem('safeVoiceUser', JSON.stringify(this.currentUser));
                this.tokenBalance = this.currentUser.tokenBalance;

                const shortAddress = `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`;
                this.showNotification(`Wallet ${shortAddress} connected! +${welcomeBonus} tokens`, 'success');

                this.dispatchTokenUpdate();
                this.dispatchUserUpdate();
                 // --- NEW: Update Profile UI immediately after connect ---
                 this.updateProfileUI();

                // Redirect only if connecting from index page, otherwise stay on profile
                 if (document.getElementById('hero')) { // Check if hero section exists (means we are on index.html)
                     console.log("Redirecting to feed from index...");
                    setTimeout(() => {
                        window.location.href = './feed.html';
                    }, 1000);
                 } else {
                     console.log("Staying on profile page after connect.");
                      // Force re-render of profile elements if needed
                     setTimeout(() => this.updateProfileUI(), 50); // Small delay to ensure state updated
                 }

                return true;
            } else {
                 console.log("No accounts returned from MetaMask.");
                 return false; // Added else case
            }
        } catch (error) {
            console.error('Wallet connection failed:', error);
            if (error.code === 4001) {
                this.showNotification('Wallet connection rejected.', 'error');
            } else {
                this.showNotification(`Wallet connection failed: ${error.message || 'Unknown error'}`, 'error');
            }
            return false;
        }
    }


    enterAnonymousMode() {
        console.log("Enter anonymous mode clicked"); // Debug log
        if (this.walletConnected) {
             // If already connected, just go to feed
             window.location.href = './feed.html';
             return true;
        }

        const anonymousBonus = 50;
        this.currentUser = {
            anonymousId: this.generateAnonymousId(),
            isAnonymous: true,
            tokenBalance: anonymousBonus
        };

        localStorage.setItem('safeVoiceUser', JSON.stringify(this.currentUser));
        this.tokenBalance = this.currentUser.tokenBalance;

        this.showNotification(`Entering in anonymous mode. +${anonymousBonus} tokens`, 'info');

        this.dispatchTokenUpdate();
        this.dispatchUserUpdate();
        // --- NEW: Update profile UI if on profile page ---
        this.updateProfileUI();

        // Redirect happens in the button listener on index.html now

        return true;
    }

    dispatchTokenUpdate() {
        console.log("Dispatching token update:", this.tokenBalance); // Debug log
        window.dispatchEvent(new CustomEvent('safeVoiceTokenUpdate', {
            detail: { newBalance: this.tokenBalance }
        }));
    }

    dispatchUserUpdate() {
        console.log("Dispatching user update:", this.currentUser); // Debug log
         window.dispatchEvent(new CustomEvent('safeVoiceUserUpdate', {
            detail: { currentUser: this.currentUser }
        }));
         // --- NEW: Call profile UI update whenever user state changes ---
         this.updateProfileUI();
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
            this.dispatchTokenUpdate();
            console.log(`Awarded ${amount} tokens for: ${reason}`);
            this.showNotification(`+${amount} tokens for ${reason.replace(/_/g, ' ')}!`, 'success');
        } else {
            console.warn("Cannot award tokens: No current user.");
        }
    }

    simulateAPICall() {
        return new Promise((resolve) => {
            // Shorter delay for simulation
            setTimeout(resolve, 300 + Math.random() * 400);
        });
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        // z-index increased to ensure visibility over potential modals
        notification.className = `fixed top-20 right-4 p-4 rounded-lg text-white z-[2000] shadow-lg ${
            type === 'success' ? 'bg-green-500' :
            type === 'error' ? 'bg-red-500' :
            'bg-blue-500'
        }`;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.transition = 'opacity 0.5s ease';
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }

    initTooltips() {
        // Placeholder
    }
    showTooltip(event) {
        // Placeholder
    }
    hideTooltip(event) {
        // Placeholder
    }
}

// --- Global App Initialization ---
// Initialize ASAP, but listeners wait for DOMContentLoaded
if (!window.safeVoiceApp) {
    window.safeVoiceApp = new SafeVoiceApp();
    console.log("SafeVoiceApp instance created.");
} else {
     console.log("SafeVoiceApp instance already exists.");
}
// --- END ---


// Utility functions (preserved)
const SafeVoiceUtils = {
    formatNumber: (num) => { /* ... */ },
    formatDate: (dateString) => { /* ... */ },
    debounce: (func, wait) => { /* ... */ },
    simulatePGPEncryption: async (content) => { /* ... */ },
    calculateTokenReward: (action, metadata = {}) => { /* ... */ }
};
// --- Copy the full SafeVoiceUtils object content here from previous version ---
SafeVoiceUtils.formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num?.toLocaleString() ?? '0'; // Added nullish coalescing
};
SafeVoiceUtils.formatDate = (dateString) => {
     try {
         const date = new Date(dateString);
         if (isNaN(date)) return 'Invalid date'; // Handle invalid date strings
         const now = new Date();
         const diffMs = now - date;
         const diffMins = Math.floor(diffMs / (1000 * 60));
         if (diffMins < 1) return 'Just now';
         if (diffMins < 60) return `${diffMins}m ago`;
         if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
         // More detailed date for older posts
         return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return 'Date error';
    }
};
SafeVoiceUtils.debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args); // Use apply to preserve context
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};
SafeVoiceUtils.simulatePGPEncryption = async (content) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            try {
                // Ensure content is a string before encoding
                const stringContent = String(content || '');
                resolve(`🔒 PGP_ENCRYPTED_${btoa(stringContent).substring(0, 20)}...`);
            } catch (e) {
                 console.error("Error during PGP simulation:", e);
                 resolve(`🔒 PGP_ERROR...`);
            }
        }, 500);
    });
};
SafeVoiceUtils.calculateTokenReward = (action, metadata = {}) => {
    const rewards = { post_created: 10, reaction_given: 2, reaction_received: 2, comment_posted: 5, crisis_support: 50, content_moderated: 15, first_post: 25, first_reaction: 10, wallet_connected: 100, anonymous_entry: 50 };
    return rewards[action] || 0;
};
// --- END ---

window.SafeVoiceUtils = SafeVoiceUtils;

