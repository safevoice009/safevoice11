// SafeVoice Global JavaScript V3 (Fixing Initialization and UI Updates)

class SafeVoiceApp {
    constructor() {
        console.log("SafeVoiceApp constructing...");
        this.currentUser = null;
        this.walletConnected = false;
        this.tokenBalance = 0;
        this.provider = null;
        this.isInitialized = false; // Flag to track initialization

        // Try initializing provider immediately
        try {
            if (typeof window.ethereum !== 'undefined') {
                // IMPORTANT: Use ethers directly from window if loaded via CDN
                this.provider = new ethers.providers.Web3Provider(window.ethereum);
                console.log('Ethers.js provider initialized.');
            } else {
                console.warn('MetaMask (window.ethereum) is not detected.');
            }
        } catch (e) {
             console.error("Error initializing ethers provider:", e);
        }

        // Defer actual init steps until DOM is ready
        document.addEventListener('DOMContentLoaded', this.init.bind(this));
    }

    // This now runs *after* the DOM is loaded
    init() {
        if (this.isInitialized) return; // Prevent double initialization
        console.log('SafeVoice App Initializing (DOM Ready)...');

        this.loadUserState(); // Load state from localStorage
        this.setupEventListeners(); // Setup global and button listeners
        this.updateProfileUI(); // Update profile UI based on loaded state
        // Dispatch initial updates AFTER loading state
        this.dispatchUserUpdate();
        this.dispatchTokenUpdate();

        console.log('SafeVoice App Initialized.');
        this.isInitialized = true;
    }

    loadUserState() {
        console.log("Loading user state...");
        const savedUser = localStorage.getItem('safeVoiceUser');
        if (savedUser) {
            try {
                this.currentUser = JSON.parse(savedUser);
                this.walletConnected = !!this.currentUser?.walletAddress;
                this.tokenBalance = this.currentUser?.tokenBalance || 0;
                console.log('User state loaded:', this.currentUser);
            } catch (error) {
                console.error('Error parsing saved user state:', error);
                localStorage.removeItem('safeVoiceUser');
                this.currentUser = null; this.walletConnected = false; this.tokenBalance = 0;
            }
        } else {
            console.log('No saved user state found.');
            this.currentUser = null; this.walletConnected = false; this.tokenBalance = 0;
        }
        // Don't dispatch here, dispatch in init() after load
    }

    setupEventListeners() {
        console.log("Setting up event listeners...");

        // Global click handlers (reactions, etc.)
        document.body.addEventListener('click', this.handleGlobalClicks.bind(this));

        // --- Centralized Button Listeners ---
        // Index Page Buttons
        const connectBtnIndex = document.getElementById('connectWalletBtnIndex');
        const anonymousBtnIndex = document.getElementById('anonymousModeBtnIndex');
        if (connectBtnIndex) {
            console.log("Attaching listener to index connect button");
            connectBtnIndex.addEventListener('click', () => this.connectWallet());
        } else {
             // Only log if we expect it (e.g., on index page)
             if (document.getElementById('hero')) console.warn("Index connect button not found");
        }
        if (anonymousBtnIndex) {
            console.log("Attaching listener to index anonymous button");
            anonymousBtnIndex.addEventListener('click', () => {
                this.enterAnonymousMode();
                window.location.href = './feed.html'; // Redirect after entering mode
            });
        } else {
             if (document.getElementById('hero')) console.warn("Index anonymous button not found");
        }


        // Profile Page Button
        const connectBtnProfile = document.getElementById('connectWalletBtnProfile');
        if (connectBtnProfile) {
            console.log("Attaching listener to profile connect button");
            connectBtnProfile.addEventListener('click', () => this.connectWallet());
        } else {
             // Only log if we expect it (e.g., on profile page)
             if (document.getElementById('profileUsername')) console.warn("Profile connect button not found");
        }
        // --- End Centralized Button Listeners ---

        // Tooltips (if implemented)
        this.initTooltips();

         // Ensure Feather icons are replaced once DOM is ready and listeners attached
         if (typeof feather !== 'undefined') {
            feather.replace();
            console.log("Initial feather.replace() called.");
         } else {
            console.error("Feather library not loaded when setting listeners.");
         }
    }

    updateProfileUI() {
        // Find profile elements
        const usernameEl = document.getElementById('profileUsername');
        const walletEl = document.getElementById('profileWallet');
        const tokenEl = document.getElementById('profileTokenBalance');
        const connectBtn = document.getElementById('connectWalletBtnProfile');
        const postsContainer = document.getElementById('myPostsContainer');

        // If elements aren't found, we're not on the profile page, so exit.
        if (!usernameEl || !walletEl || !tokenEl || !connectBtn || !postsContainer) {
            // console.log('Not on profile page or elements missing, skipping profile UI update.');
            return;
        }
        console.log('Updating profile UI...');

        try { // Add try-catch for safety during updates
            if (this.currentUser) {
                tokenEl.textContent = this.tokenBalance?.toLocaleString() ?? '0';

                if (this.currentUser.isAnonymous) {
                    usernameEl.textContent = this.currentUser.anonymousId || 'Anonymous User';
                    walletEl.textContent = 'Anonymous Mode';
                    connectBtn.textContent = 'Connect Wallet';
                    connectBtn.style.display = 'inline-block';
                    postsContainer.innerHTML = '<p class="text-center text-gray-500">Connect wallet to see your posts.</p>';
                } else if (this.currentUser.walletAddress) {
                    usernameEl.textContent = 'Wallet Connected';
                    const shortAddress = `${this.currentUser.walletAddress.substring(0, 6)}...${this.currentUser.walletAddress.substring(this.currentUser.walletAddress.length - 4)}`;
                    walletEl.textContent = shortAddress;
                    connectBtn.style.display = 'none';
                    postsContainer.innerHTML = `
                        <div class="bg-gray-100 p-6 rounded-2xl text-center text-gray-500">
                            <i data-feather="loader" class="w-8 h-8 mx-auto mb-2 animate-spin"></i>
                            <p>Loading posts for ${shortAddress}...</p>
                            <p class="text-sm">(Requires Supabase integration)</p>
                        </div>`;
                } else { // Handle case where currentUser exists but has no wallet/anonymousId (shouldn't happen often)
                     throw new Error("Invalid currentUser state");
                }
            } else {
                // Default state if no user data
                usernameEl.textContent = 'Anonymous User';
                walletEl.textContent = 'Wallet not connected';
                tokenEl.textContent = '0';
                connectBtn.textContent = 'Connect Wallet';
                connectBtn.style.display = 'inline-block';
                postsContainer.innerHTML = '<p class="text-center text-gray-500">Connect wallet or enter anonymously to get started.</p>';
            }

            // Update placeholder stats (replace with real data later)
            const totalPostsEl = document.getElementById('profileTotalPosts');
            const reactionsGivenEl = document.getElementById('profileReactionsGiven');
            if(totalPostsEl) totalPostsEl.textContent = '0'; // Placeholder
            if(reactionsGivenEl) reactionsGivenEl.textContent = '0'; // Placeholder

            // Re-render Feather icons if needed after updating container
            if (typeof feather !== 'undefined') {
                feather.replace();
            }

        } catch (error) {
             console.error("Error updating profile UI:", error);
             // Optionally display an error message to the user on the profile page
             if (usernameEl) usernameEl.textContent = "Error loading profile";
             if (walletEl) walletEl.textContent = "-";
             if (tokenEl) tokenEl.textContent = "-";
             if (postsContainer) postsContainer.innerHTML = '<p class="text-center text-red-500">Could not load profile data.</p>';
        }
    }


    handleGlobalClicks(event) {
        // Handle dynamic reaction buttons
        const reactionBtn = event.target.closest('.reaction-btn');
        if (reactionBtn) {
            this.handleReaction(reactionBtn);
        }
        // Removed connect wallet handlers from here
    }

    async handleReaction(button) {
        // ... (reaction logic remains the same) ...
        const postId = button.dataset.postId;
        const reactionType = button.dataset.reaction;

        button.classList.add('opacity-50', 'pointer-events-none'); // Disable button during action

        try {
            await this.simulateAPICall(); // Simulate network request
            const countElement = button.querySelector('.reaction-count');
            if (countElement) {
                const currentCount = parseInt(countElement.textContent, 10) || 0;
                const newCount = currentCount + 1;
                countElement.textContent = newCount;
                 // Add visual feedback (optional)
                 button.classList.add('text-blue-500'); // Example: turn icon blue
            }
            this.awardTokens(2, 'reaction_given');
        } catch (error) {
            console.error('Reaction failed:', error);
            this.showNotification('Failed to add reaction.', 'error');
            // Optional: Revert count change if needed, but optimistic is often fine
        } finally {
            // Re-enable button slightly later to prevent spamming
            setTimeout(() => {
                 button.classList.remove('opacity-50', 'pointer-events-none');
            }, 300);
        }
    }

    async connectWallet() {
        console.log("Connect wallet action initiated...");
        if (!this.provider) {
             console.error("Connect Wallet failed: Provider not available.");
            this.showNotification('MetaMask not detected. Please install it or use the MetaMask browser.', 'error');
            // Optionally guide user
             if (!/Mobi|Android/i.test(navigator.userAgent)) { // Basic check if not mobile
                window.open('https://metamask.io/download/', '_blank');
             }
            return false;
        }

        try {
             console.log("Requesting accounts from MetaMask...");
            // Request accounts
            const accounts = await this.provider.send("eth_requestAccounts", []);
             console.log("Accounts received:", accounts);

            if (accounts && accounts.length > 0) {
                const walletAddress = accounts[0];
                this.walletConnected = true;
                const existingBalance = (this.currentUser && this.currentUser.isAnonymous) ? this.currentUser.tokenBalance : 0;
                const welcomeBonus = 100;

                // Update internal state
                this.currentUser = {
                    walletAddress: walletAddress,
                    isAnonymous: false,
                    tokenBalance: existingBalance + welcomeBonus
                };
                this.tokenBalance = this.currentUser.tokenBalance;

                // Save to localStorage
                localStorage.setItem('safeVoiceUser', JSON.stringify(this.currentUser));

                // Notify user
                const shortAddress = `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`;
                this.showNotification(`Wallet ${shortAddress} connected! +${welcomeBonus} tokens`, 'success');

                // Dispatch events to update UI components
                this.dispatchTokenUpdate(); // Update navbar, etc.
                this.dispatchUserUpdate(); // Triggers updateProfileUI implicitly

                // Redirect only if connecting from index page
                if (document.getElementById('hero')) {
                    console.log("Redirecting to feed from index...");
                    // Add a slight delay to allow notification to show
                    setTimeout(() => { window.location.href = './feed.html'; }, 1500);
                } else {
                    console.log("Wallet connected on profile page.");
                    // No redirect needed, UI updated by dispatchUserUpdate -> updateProfileUI
                }

                return true;
            } else {
                console.warn("No accounts returned from MetaMask.");
                this.showNotification('No accounts found. Please ensure MetaMask is unlocked and connected.', 'error');
                return false;
            }
        } catch (error) {
            console.error('Wallet connection failed:', error);
            if (error.code === 4001) { // User rejected request
                this.showNotification('Wallet connection request rejected.', 'warning');
            } else if (error.code === -32002) { // Request already pending
                 this.showNotification('Connection request already pending. Please check MetaMask.', 'info');
            } else {
                this.showNotification(`Wallet connection failed: ${error.message || 'Unknown error'}`, 'error');
            }
            return false;
        }
    }

    enterAnonymousMode() {
        console.log("Entering anonymous mode...");
        if (this.walletConnected) {
             console.log("Already wallet connected, redirecting to feed.");
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

        this.showNotification(`Entering anonymous mode. +${anonymousBonus} tokens`, 'info');

        this.dispatchTokenUpdate();
        this.dispatchUserUpdate(); // Will trigger profile UI update if needed

        // Redirect is handled by the button listener itself in this case
        console.log("Anonymous mode entered.");
        return true;
    }

    dispatchTokenUpdate() {
        console.log("Dispatching token update:", this.tokenBalance);
        window.dispatchEvent(new CustomEvent('safeVoiceTokenUpdate', {
            detail: { newBalance: this.tokenBalance }
        }));
    }

    dispatchUserUpdate() {
        console.log("Dispatching user update:", this.currentUser);
         window.dispatchEvent(new CustomEvent('safeVoiceUserUpdate', {
            detail: { currentUser: this.currentUser }
        }));
         // IMPLICITLY calls updateProfileUI if on profile page via the listener setup earlier
         this.updateProfileUI(); // Explicit call to ensure update happens if not triggered by event
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
        if (!this.currentUser) {
             console.warn("Cannot award tokens: No current user.");
             // Maybe show a notification asking to connect/enter anonymous?
             // this.showNotification("Connect wallet or enter anonymously to earn tokens!", "info");
             return;
        }
        try {
            this.currentUser.tokenBalance = (this.currentUser.tokenBalance || 0) + amount; // Ensure balance is a number
            this.tokenBalance = this.currentUser.tokenBalance;
            localStorage.setItem('safeVoiceUser', JSON.stringify(this.currentUser));
            this.dispatchTokenUpdate();
            console.log(`Awarded ${amount} tokens for: ${reason}`);
            this.showNotification(`+${amount} tokens for ${reason.replace(/_/g, ' ')}!`, 'success');
        } catch (error) {
             console.error("Error awarding tokens:", error);
        }
    }

    simulateAPICall() {
        return new Promise((resolve) => {
            setTimeout(resolve, 300 + Math.random() * 400);
        });
    }

    showNotification(message, type = 'info') {
        // Simple notification (can be enhanced)
        const notificationId = `notification-${Date.now()}`; // Unique ID
        const notification = document.createElement('div');
        notification.id = notificationId;
        // z-index increased, position fixed
        notification.className = `fixed top-20 right-4 p-4 rounded-lg text-white z-[5000] shadow-lg transition-opacity duration-300 ease-in-out opacity-0 max-w-sm`; // Start transparent
         notification.style.marginTop = `${document.querySelectorAll('[id^=notification]').length * 60}px`; // Stack notifications

        let bgColor = 'bg-blue-500';
        if (type === 'success') bgColor = 'bg-green-500';
        if (type === 'error') bgColor = 'bg-red-500';
        if (type === 'warning') bgColor = 'bg-yellow-500 text-black'; // Warning style
         if (type === 'info') bgColor = 'bg-blue-500';

         notification.classList.add(...bgColor.split(' '));
        notification.textContent = message;

        document.body.appendChild(notification);

         // Fade in
         requestAnimationFrame(() => {
             notification.classList.add('opacity-100');
         });


        // Auto-remove after delay
        setTimeout(() => {
             const el = document.getElementById(notificationId);
             if (el) {
                 el.classList.remove('opacity-100'); // Start fade out
                 setTimeout(() => el.remove(), 300); // Remove after fade out
             }
        }, 3500); // Slightly longer duration
    }

    initTooltips() { /* Placeholder */ }
    showTooltip(event) { /* Placeholder */ }
    hideTooltip(event) { /* Placeholder */ }
}

// --- Global App Initialization ---
// Create instance immediately (accessible via window.safeVoiceApp)
// but defer initialization steps until DOM is ready via constructor listener.
if (!window.safeVoiceApp) {
    window.safeVoiceApp = new SafeVoiceApp();
    console.log("SafeVoiceApp instance created globally.");
} else {
    console.log("SafeVoiceApp instance already exists globally.");
}
// --- END ---


// --- Utility functions (Ensure these are copied correctly) ---
const SafeVoiceUtils = {
    formatNumber: (num) => {
        const number = Number(num); // Ensure it's a number
        if (isNaN(number)) return '0';
        if (number >= 1000000) return (number / 1000000).toFixed(1) + 'M';
        if (number >= 1000) return (number / 1000).toFixed(1) + 'K';
        return number.toLocaleString();
    },
    formatDate: (dateString) => {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Invalid date'; // Check validity
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMins = Math.floor(diffMs / (1000 * 60));
            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins} min ago`;
            if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hr ago`;
            if (diffMins < 10080) return `${Math.floor(diffMins / 1440)} days ago`; // Add days
            return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        } catch (e) {
            console.error("Error formatting date:", dateString, e);
            return 'Date error';
        }
    },
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const context = this; // Capture context
            const later = () => {
                timeout = null;
                func.apply(context, args); // Use apply with context
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    simulatePGPEncryption: async (content) => { /* ... unchanged ... */
        return new Promise((resolve) => {
            setTimeout(() => {
                try {
                    const stringContent = String(content || '');
                    resolve(`🔒 PGP_ENCRYPTED_${btoa(stringContent).substring(0, 20)}...`);
                } catch (e) {
                     console.error("Error during PGP simulation:", e);
                     resolve(`🔒 PGP_ERROR...`);
                }
            }, 300); // Shorter delay
        });
    },
    calculateTokenReward: (action, metadata = {}) => { /* ... unchanged ... */
        const rewards = { post_created: 10, reaction_given: 2, reaction_received: 2, comment_posted: 5, crisis_support: 50, content_moderated: 15, first_post: 25, first_reaction: 10, wallet_connected: 100, anonymous_entry: 50 };
        return rewards[action] || 0;
    }
};
window.SafeVoiceUtils = SafeVoiceUtils;
// --- END UTILS ---

