// SafeVoice Global JavaScript V5.1 (WalletConnect Integration with Project ID)

class SafeVoiceApp {
    constructor() {
        console.log("SafeVoiceApp constructing...");
        this.currentUser = null;
        this.walletConnected = false;
        this.tokenBalance = 0;
        this.provider = null; // Ethers.js provider (MetaMask OR WalletConnect)
        this.wcProvider = null; // WalletConnect Provider instance
        this.isInitialized = false;
        this._isConnecting = false; // Connection guard flag

        // --- WalletConnect Project ID (REPLACED) ---
        this.walletConnectProjectId = 'da4f1e37c813d4c75f45c08c62395981'; // Your Project ID

        this._boundInit = this.init.bind(this);
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', this._boundInit);
        } else {
            // Use setTimeout to ensure it runs after the current execution context
            setTimeout(this._boundInit, 0);
        }
    }

    async initWalletConnectProvider() {
        if (!this.walletConnectProjectId) {
            console.error("WalletConnect Project ID is missing!");
            this.showNotification("WalletConnect is not configured.", "error");
            return null;
        }
        // Check if WalletConnect library is loaded
        if (typeof window.WalletConnectEthereumProvider === 'undefined') {
             console.error("WalletConnectEthereumProvider library not found on window. Ensure CDN script is loaded before script.js.");
             this.showNotification("WalletConnect library failed to load.", "error");
             return null;
        }

        try {
            console.log("Initializing WalletConnect EthereumProvider...");
            const { EthereumProvider } = window.WalletConnectEthereumProvider;

            this.wcProvider = await EthereumProvider.init({
                projectId: this.walletConnectProjectId,
                chains: [1], // Mainnet. Add others e.g., [1, 137] for Polygon
                showQrModal: true,
                qrModalOptions: { themeMode: "light" },
                methods: ["eth_requestAccounts", "personal_sign"],
                events: ["connect", "disconnect", "accountsChanged"]
            });

            // Event Listeners for WalletConnect
            this.wcProvider.on("disconnect", () => {
                console.log("WalletConnect session disconnected");
                this.handleDisconnect();
            });

            this.wcProvider.on("accountsChanged", (accounts) => {
                 console.log("WalletConnect account changed", accounts);
                 if (accounts.length > 0) {
                     // If user is connected, update the address
                     if (this.currentUser && !this.currentUser.isAnonymous) {
                          this.currentUser.walletAddress = accounts[0];
                          localStorage.setItem('safeVoiceUser', JSON.stringify(this.currentUser));
                          this.dispatchUserUpdate(); // Update UI with new address
                          console.log("User wallet address updated.");
                     } else {
                         // If not previously connected or was anonymous, potentially treat as new connection?
                         console.log("Account changed, but user wasn't connected via wallet. Ignoring change for now.");
                         // Optional: You could trigger `connectWallet` logic here if desired.
                     }
                 } else {
                     // If accounts array is empty, it means disconnection
                     this.handleDisconnect();
                 }
            });

            console.log("WalletConnect EthereumProvider initialized.");
            return this.wcProvider;
        } catch (error) {
            console.error("Failed to initialize WalletConnect EthereumProvider:", error);
            // Provide more specific feedback if possible
            let message = "Could not initialize WalletConnect.";
            if (error.message && error.message.includes('Project ID is invalid')) {
                message = "WalletConnect Project ID seems invalid. Please check configuration.";
            } else if (error.message && error.message.includes('Network request failed')) {
                 message = "Network error initializing WalletConnect. Check internet connection.";
            }
            this.showNotification(message, "error");
            return null;
        }
    }

    async init() { // init is async because initWalletConnectProvider is async
        if (this.isInitialized) {
            console.log("Initialization already complete.");
            return;
        }
        // Make sure the listener doesn't run again if called directly
        document.removeEventListener('DOMContentLoaded', this._boundInit);
        console.log('SafeVoice App Initializing (DOM Ready)...');

        try {
            // Attempt to initialize WalletConnect provider first
            await this.initWalletConnectProvider();

            // Load user state *after* potentially initializing providers
            this.loadUserState();

            // Setup listeners *after* DOM is ready and state is loaded
            this.setupEventListeners();

            // Perform initial UI updates *after* everything is set up
            this.updateProfileUI(); // Update profile if on profile page
            this.dispatchUserUpdate(); // Let navbar know the user state
            this.dispatchTokenUpdate(); // Let navbar/index know the token state

            console.log('SafeVoice App Initialized Successfully.');
            this.isInitialized = true;

        } catch (error) {
             console.error("!!! CRITICAL ERROR DURING APP INITIALIZATION !!!", error);
             this.showNotification("Error loading the application. Please refresh.", "error");
             // Prevent further execution if init fails critically
             this.isInitialized = false; // Mark as not initialized
        }
    }


    loadUserState() {
        console.log("Loading user state...");
        try {
            const savedUser = localStorage.getItem('safeVoiceUser');
            if (savedUser) {
                this.currentUser = JSON.parse(savedUser);
                // Validate loaded data minimally
                if (typeof this.currentUser !== 'object' || this.currentUser === null) {
                    throw new Error("Parsed user data is not an object.");
                }
                this.walletConnected = !!this.currentUser.walletAddress; // More robust check
                this.tokenBalance = Number(this.currentUser.tokenBalance) || 0; // Ensure it's a number
                console.log('User state loaded:', this.currentUser);
            } else {
                console.log('No saved user state found.');
                this.currentUser = null; this.walletConnected = false; this.tokenBalance = 0;
            }
        } catch (error) {
            console.error('Error loading or parsing saved user state:', error);
            localStorage.removeItem('safeVoiceUser'); // Clear potentially corrupted data
            this.currentUser = null; this.walletConnected = false; this.tokenBalance = 0;
        }
        // Dispatch happens after init completes
    }

    setupEventListeners() {
        console.log("Setting up event listeners...");
        if (!this.isInitialized) { // Basic safety check
             console.warn("Attempted to set listeners before app fully initialized.");
             // It might be okay if init calls this, but good to be cautious
        }

        // --- Event Delegation for Reactions ---
        // Listen on a container that exists reliably, like `document.body` or a main wrapper
        document.body.addEventListener('click', (event) => {
            const reactionBtn = event.target.closest('.reaction-btn');
            if (reactionBtn) {
                this.handleReaction(reactionBtn);
            }
        });

        // --- Specific Button Listeners ---
        const connectBtnIndex = document.getElementById('connectWalletBtnIndex');
        const anonymousBtnIndex = document.getElementById('anonymousModeBtnIndex');
        const connectBtnProfile = document.getElementById('connectWalletBtnProfile');

        // Check if elements exist before adding listeners
        if (connectBtnIndex) {
            connectBtnIndex.addEventListener('click', () => this.connectWallet());
            console.log("Listener attached to index connect button.");
        } else {
            // Only log warning if we expect it (i.e., on index page)
            if (document.getElementById('hero')) console.warn("Index connect button not found!");
        }

        if (anonymousBtnIndex) {
            anonymousBtnIndex.addEventListener('click', () => {
                if (this.enterAnonymousMode()) { // Redirect only on success
                    window.location.href = './feed.html';
                }
            });
            console.log("Listener attached to index anonymous button.");
        } else {
            if (document.getElementById('hero')) console.warn("Index anonymous button not found!");
        }

        if (connectBtnProfile) {
            connectBtnProfile.addEventListener('click', () => this.connectWallet());
            console.log("Listener attached to profile connect button.");
        } else {
             // Only log warning if we expect it (i.e., on profile page)
             if (document.getElementById('profileUsername')) console.warn("Profile connect button not found!");
        }

        // --- Listeners for State Changes ---
        // Use `this.updateProfileUI.bind(this)` to maintain correct `this` context
        window.addEventListener('safeVoiceUserUpdate', this.updateProfileUI.bind(this));
        window.addEventListener('safeVoiceTokenUpdate', this.updateProfileUI.bind(this));

        // --- Feather Icons ---
        try {
             if (typeof feather !== 'undefined') {
                 feather.replace();
                 console.log("Feather.replace() called after setting listeners.");
             } else {
                 console.error("Feather library not available when setting listeners.");
             }
        } catch(e) { console.error("Error running feather.replace in setupEventListeners:", e); }


        this.initTooltips(); // Initialize tooltips
    }

    updateProfileUI() {
        const usernameEl = document.getElementById('profileUsername');
        // If username element doesn't exist, we are not on the profile page, so exit.
        if (!usernameEl) {
             // console.log("Not on profile page, skipping profile UI update.");
             return;
        }

        console.log('Attempting profile UI update...');
        // Find other elements, checking for existence
        const walletEl = document.getElementById('profileWallet');
        const tokenEl = document.getElementById('profileTokenBalance');
        const connectBtn = document.getElementById('connectWalletBtnProfile');
        const postsContainer = document.getElementById('myPostsContainer');
        const totalPostsEl = document.getElementById('profileTotalPosts');
        const reactionsGivenEl = document.getElementById('profileReactionsGiven');
        const postsPlaceholder = document.getElementById('postsPlaceholder'); // Get placeholder

        // Check essential elements needed for basic display
        if (!walletEl || !tokenEl || !connectBtn || !postsContainer || !totalPostsEl || !reactionsGivenEl || !postsPlaceholder) {
             console.error("One or more required profile UI elements are missing! Cannot update.");
             // Maybe display a general error message if critical elements are gone
             if (usernameEl) usernameEl.textContent = "Profile Error";
             return;
        }

        try {
            // Update based on currentUser state
            if (this.currentUser) {
                tokenEl.textContent = this.tokenBalance?.toLocaleString() ?? '0';

                if (this.currentUser.isAnonymous) {
                    usernameEl.textContent = this.currentUser.anonymousId || 'Anonymous User';
                    walletEl.textContent = 'Anonymous Mode';
                    connectBtn.textContent = 'Connect Wallet';
                    connectBtn.style.display = 'inline-block'; // Show button
                    postsPlaceholder.textContent = 'Connect wallet to see your posts.'; // Update placeholder
                    postsContainer.innerHTML = ''; // Clear any previous posts
                    postsContainer.appendChild(postsPlaceholder); // Add placeholder back
                } else if (this.currentUser.walletAddress) {
                    usernameEl.textContent = 'Wallet Connected';
                    const shortAddress = `${this.currentUser.walletAddress.substring(0, 6)}...${this.currentUser.walletAddress.substring(this.currentUser.walletAddress.length - 4)}`;
                    walletEl.textContent = shortAddress;
                    connectBtn.style.display = 'none'; // Hide button
                    // Update placeholder text for connected user (integration needed for actual posts)
                    postsPlaceholder.innerHTML = `
                        <i data-feather="loader" class="w-8 h-8 mx-auto mb-2 animate-spin"></i>
                        <p>Loading posts for ${shortAddress}...</p>
                        <p class="text-sm">(Requires Supabase integration)</p>`;
                    postsContainer.innerHTML = ''; // Clear previous content
                    postsContainer.appendChild(postsPlaceholder); // Add placeholder
                } else {
                    // This case shouldn't happen with proper state management, but handle defensively
                     console.warn("currentUser exists but has neither anonymousId nor walletAddress.");
                     throw new Error("Invalid currentUser state encountered.");
                }
            } else {
                // Default state when no user is loaded (e.g., first visit)
                usernameEl.textContent = 'Anonymous User';
                walletEl.textContent = 'Wallet not connected';
                tokenEl.textContent = '0';
                connectBtn.textContent = 'Connect Wallet';
                connectBtn.style.display = 'inline-block'; // Show button
                postsPlaceholder.textContent = 'Connect wallet or enter anonymously to get started.';
                postsContainer.innerHTML = ''; // Clear previous content
                postsContainer.appendChild(postsPlaceholder); // Add placeholder
            }

            // Update placeholder stats (replace with real data retrieval later)
            totalPostsEl.textContent = '0';
            reactionsGivenEl.textContent = '0';

            // IMPORTANT: Re-render Feather icons *after* updating innerHTML
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
             console.log("Profile UI updated successfully.");

        } catch (error) {
             console.error("Error updating profile UI:", error);
             // Provide more robust error state for the user
             usernameEl.textContent = "Profile Error";
             if (walletEl) walletEl.textContent = "Could not load data";
             if (tokenEl) tokenEl.textContent = "-";
             if (postsContainer) postsContainer.innerHTML = '<p class="text-center text-red-500">Error displaying profile details.</p>';
        }
    }


    async handleReaction(button) {
        const postId = button.dataset.postId;
        const reactionType = button.dataset.reaction;
        if (!postId || !reactionType) {
            console.warn("Reaction button missing data-post-id or data-reaction");
            return;
        }
        // Prevent clicking again while processing
        button.classList.add('opacity-50', 'pointer-events-none');
        try {
            await this.simulateAPICall(); // Simulate network request
            const countElement = button.querySelector('.reaction-count');
            if (countElement) {
                const currentCount = parseInt(countElement.textContent, 10) || 0;
                countElement.textContent = currentCount + 1;
                // Add brief visual feedback
                 button.style.transform = 'scale(1.15)';
                 setTimeout(() => { button.style.transform = 'scale(1)'; }, 150);
            }
            // Award tokens only if a user context exists
            if (this.currentUser) {
                 this.awardTokens(2, 'reaction_given');
            } else {
                 console.log("Reaction added, but no user to award tokens to.");
                 // Optionally show a message like "Connect wallet to earn tokens for reactions!"
            }
        } catch (error) {
            console.error('Reaction failed:', error);
            this.showNotification('Failed to add reaction. Please try again.', 'error');
            // TODO: Consider reverting optimistic UI update on failure
        } finally {
            // Re-enable the button after a short delay
            setTimeout(() => {
                button.classList.remove('opacity-50', 'pointer-events-none');
            }, 300); // Adjust delay as needed
        }
    }

    async connectWallet() {
        console.log("Connect wallet action initiated...");
        if (this._isConnecting) { console.log("Connection already in progress."); return false; }
        this._isConnecting = true;

        let accounts = [];
        let connectionError = null;

        try {
            // Ensure WalletConnect Provider is initialized
            if (!this.wcProvider) {
                 console.log("WalletConnect provider not ready, attempting init...");
                 await this.initWalletConnectProvider();
                 if (!this.wcProvider) throw new Error("WalletConnect could not be initialized.");
            }

            console.log("Attempting connection via WalletConnect provider...");
            // Check existing session vs initiating new connection
            if (this.wcProvider.accounts && this.wcProvider.accounts.length > 0) {
                 console.log("WalletConnect already connected:", this.wcProvider.accounts);
                 accounts = this.wcProvider.accounts;
            } else {
                 console.log("No existing WC session, calling connect (will show modal)...");
                 // This triggers the QR modal or mobile wallet selection
                 await this.wcProvider.connect();
                 accounts = this.wcProvider.accounts; // Accounts should be populated after connect
                 console.log("WalletConnect connect() successful, accounts:", accounts);
                 if (!accounts || accounts.length === 0) {
                     // Should not happen if connect() succeeded, but handle defensively
                     throw new Error("WalletConnect connect() resolved but returned no accounts.");
                 }
            }

            // --- Process successful connection ---
            const walletAddress = accounts[0];

            console.log("Wrapping WalletConnect provider with Ethers.js Web3Provider...");
            // Use the ACTIVE WalletConnect provider for Ethers
            this.provider = new ethers.providers.Web3Provider(this.wcProvider);
            console.log("Ethers.js provider created from WalletConnect.");

            this.walletConnected = true;
            const existingBalance = (this.currentUser && this.currentUser.isAnonymous) ? this.currentUser.tokenBalance : 0;
            const welcomeBonus = 100;

            // Update user state
            this.currentUser = { walletAddress, isAnonymous: false, tokenBalance: existingBalance + welcomeBonus };
            this.tokenBalance = this.currentUser.tokenBalance;
            localStorage.setItem('safeVoiceUser', JSON.stringify(this.currentUser));

            // UI Feedback & Updates
            const shortAddress = `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`;
            this.showNotification(`Wallet ${shortAddress} connected! +${welcomeBonus} tokens`, 'success');
            this.dispatchTokenUpdate(); // Update token displays
            this.dispatchUserUpdate(); // Update profile/navbar displays

            // Redirect if on index page
            if (document.getElementById('hero')) {
                console.log("Redirecting to feed from index...");
                setTimeout(() => { window.location.href = './feed.html'; }, 1500); // Delay for notification
            } else {
                console.log("Wallet connected on non-index page, no redirect.");
            }

            this._isConnecting = false;
            return true; // Indicate success

        } catch (error) {
            console.error('Wallet connection failed:', error);
            connectionError = error; // Store error for finally block

            // User-friendly error messages
            if (error.message?.includes("User closed modal") || error.code === 'USER_REJECTED') { // WC v2 might use code
                 this.showNotification('Connection cancelled.', 'warning');
            } else if (error.message?.includes("Expired connection") || error.code === 'SESSION_EXPIRED') {
                 this.showNotification('Connection timed out. Please try again.', 'warning');
            } else if (error.message?.includes("pairing modal closed")) {
                 // Ignore this specific error if it happens before accounts are received, user might retry
                 console.warn("Pairing modal closed before connection established.");
            }
             else {
                 this.showNotification(`Wallet connection failed: ${error.message || 'Unknown error'}`, 'error');
            }
            // No need to disconnect here, allow user to retry if appropriate

        } finally {
            this._isConnecting = false; // Ensure guard flag is always reset
            // If connection failed AND we still don't have accounts, return false
            if (connectionError && (!accounts || accounts.length === 0)) {
                console.log("Connection process ended with an error and no accounts.");
                return false; // Indicate failure
            }
            // If no error but also no accounts (edge case), return false
            if (!connectionError && (!accounts || accounts.length === 0)) {
                 console.warn("ConnectWallet finished unexpectedly with no accounts and no error.");
                 return false;
            }
        }
        // Should only reach here if connection succeeded earlier
        // return true; // Already returned true within try block on success
    }


     handleDisconnect() {
        console.log("Handling disconnection...");
        // Reset state variables
        this.currentUser = null;
        this.walletConnected = false;
        this.tokenBalance = 0;
        this.provider = null; // Clear Ethers provider
        // Do NOT nullify wcProvider here, WalletConnect might handle reconnection internally

        // Clear storage
        localStorage.removeItem('safeVoiceUser');

        // Update UI
        this.showNotification("Wallet disconnected.", "info");
        this.dispatchUserUpdate(); // Trigger UI updates (e.g., show connect button)
        this.dispatchTokenUpdate(); // Trigger token updates (e.g., set to 0)

        console.log("App state reset after disconnect.");
        // Optional: Redirect to home page after a delay
        // setTimeout(() => { if (window.location.pathname !== '/index.html') window.location.href = './index.html'; }, 1500);
     }


    enterAnonymousMode() {
        console.log("Entering anonymous mode action...");
        // Prevent entering anonymous if already connected via wallet
        if (this.walletConnected) {
             console.log("Wallet already connected. Cannot enter anonymous mode.");
             this.showNotification("Wallet already connected.", "info");
             return true; // Allow potential redirect if needed, but don't change state
        }

        const anonymousBonus = 50;
        // Update state only if not already in anonymous mode or if no user exists
        if (!this.currentUser || !this.currentUser.isAnonymous) {
             console.log("Setting anonymous mode state...");
             this.currentUser = {
                 anonymousId: this.generateAnonymousId(),
                 isAnonymous: true,
                 tokenBalance: anonymousBonus
             };
             localStorage.setItem('safeVoiceUser', JSON.stringify(this.currentUser));
             this.tokenBalance = this.currentUser.tokenBalance; // Update local balance
             this.showNotification(`Entering anonymous mode. +${anonymousBonus} tokens`, 'info');
             this.dispatchTokenUpdate(); // Update UI
             this.dispatchUserUpdate(); // Update UI
        } else {
             console.log("Already in anonymous mode.");
        }
        console.log("Anonymous mode entered/confirmed.");
        return true; // Indicate success for redirection
     }

    // --- Dispatchers ---
    dispatchTokenUpdate() {
        // console.log("Dispatching token update:", this.tokenBalance);
        window.dispatchEvent(new CustomEvent('safeVoiceTokenUpdate', {
            detail: { newBalance: this.tokenBalance }
        }));
    }
    dispatchUserUpdate() {
        // console.log("Dispatching user update:", this.currentUser);
         window.dispatchEvent(new CustomEvent('safeVoiceUserUpdate', {
            detail: { currentUser: this.currentUser }
        }));
    }

    // --- Helpers ---
    generateAnonymousId() {
        const adjectives = ['Brave', 'Calm', 'Wise', 'Kind', 'Strong', 'Gentle', 'Bright', 'True', 'Quiet', 'Clear'];
        const nouns = ['Owl', 'Phoenix', 'Lion', 'Dolphin', 'Eagle', 'Wolf', 'Tiger', 'Bear', 'River', 'Star'];
        const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
        const number = Math.floor(Math.random() * 999) + 1;
        return `${randomAdj}${randomNoun}${number}`;
     }

    awardTokens(amount, reason) {
        if (!this.currentUser) {
             console.warn("Cannot award tokens: No current user session.");
             // Maybe show a notification prompting login/connect?
             // this.showNotification("Connect your wallet to earn tokens!", "info");
             return;
        }
        try {
            const currentBalance = Number(this.currentUser.tokenBalance) || 0;
            const amountToAdd = Number(amount) || 0;
            if (amountToAdd <= 0) return; // Don't award zero or negative

            this.currentUser.tokenBalance = currentBalance + amountToAdd;
            this.tokenBalance = this.currentUser.tokenBalance; // Sync instance variable

            localStorage.setItem('safeVoiceUser', JSON.stringify(this.currentUser));
            this.dispatchTokenUpdate(); // Update UI
            console.log(`Awarded ${amountToAdd} tokens for: ${reason}. New balance: ${this.tokenBalance}`);
            this.showNotification(`+${amountToAdd} tokens for ${reason.replace(/_/g, ' ')}!`, 'success');
        } catch (error) {
             console.error("Error awarding tokens:", error);
             this.showNotification("Error updating token balance.", "error");
        }
    }

    simulateAPICall(minDuration = 100, maxDuration = 400) {
        const duration = Math.random() * (maxDuration - minDuration) + minDuration;
        return new Promise(resolve => setTimeout(resolve, duration));
     }

    showNotification(message, type = 'info', duration = 3500) {
        try {
            const notificationId = `notification-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
            const notification = document.createElement('div');
            notification.id = notificationId;
            // Base classes + type specific classes
            let baseClasses = 'fixed top-20 right-4 p-4 rounded-lg text-white z-[5000] shadow-lg transition-all duration-300 ease-in-out opacity-0 max-w-sm transform translate-x-full';
            let typeClasses = '';
            switch(type) {
                case 'success': typeClasses = 'bg-green-500'; break;
                case 'error': typeClasses = 'bg-red-500'; break;
                case 'warning': typeClasses = 'bg-yellow-500 text-black'; break;
                case 'info':
                default: typeClasses = 'bg-blue-500'; break;
            }
            notification.className = `${baseClasses} ${typeClasses}`;
            notification.textContent = message;
            document.body.appendChild(notification);

            // Animate in
            requestAnimationFrame(() => {
                notification.classList.remove('opacity-0', 'translate-x-full');
                 notification.classList.add('opacity-100', 'translate-x-0');
                 // Adjust stacking for existing notifications
                 const existingNotifications = Array.from(document.querySelectorAll('[id^=notification-]:not(#'+notificationId+')')).reverse();
                 existingNotifications.forEach((el, index) => {
                      el.style.transform = `translateY(${(index + 1) * 70}px)`; // Adjust spacing (e.g., 70px)
                 });
            });

            // Animate out and remove
            setTimeout(() => {
                const el = document.getElementById(notificationId);
                if (el) {
                    el.classList.remove('opacity-100', 'translate-x-0');
                    el.classList.add('opacity-0', 'translate-x-full');
                    setTimeout(() => {
                         el.remove();
                         // Re-adjust stacking (optional, can get complex)
                    }, 300); // Wait for fade out transition
                }
            }, duration);
        } catch (e) {
            console.error("Error showing notification:", e);
        }
    }

    initTooltips() { /* Placeholder */ }
    showTooltip(event) { /* Placeholder */ }
    hideTooltip(event) { /* Placeholder */ }
}

// --- Global App Initialization ---
// Create instance immediately; initialization waits for DOMContentLoaded via constructor logic.
if (!window.safeVoiceApp) {
    window.safeVoiceApp = new SafeVoiceApp();
    console.log("SafeVoiceApp instance created globally.");
} else {
    console.log("SafeVoiceApp instance already exists globally. Check for duplicate script loading?");
}
// --- END ---


// --- Utility functions (Ensure these are copied correctly and fully) ---
const SafeVoiceUtils = {
    formatNumber: (num) => {
        const number = Number(num);
        if (isNaN(number)) return '0';
        if (number >= 1e6) return (number / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
        if (number >= 1e3) return (number / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
        return number.toLocaleString();
    },
    formatDate: (dateString) => {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Invalid date';
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffSeconds = Math.round(diffMs / 1000);
            const diffMins = Math.round(diffSeconds / 60);
            const diffHours = Math.round(diffMins / 60);
            const diffDays = Math.round(diffHours / 24);

            if (diffSeconds < 5) return 'Just now';
            if (diffMins < 1) return `${diffSeconds}s ago`;
            if (diffHours < 1) return `${diffMins}m ago`;
            if (diffDays < 1) return `${diffHours}h ago`;
            if (diffDays < 7) return `${diffDays}d ago`;
            return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        } catch (e) {
            console.error("Error formatting date:", dateString, e);
            return 'Date error';
        }
    },
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const context = this;
            const later = () => {
                timeout = null;
                func.apply(context, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    simulatePGPEncryption: async (content) => {
        return new Promise(resolve => {
            setTimeout(() => {
                try {
                    const s = String(content || '');
                    // Basic simulation - in reality, use a library like OpenPGP.js
                    const encrypted = `🔒 PGP_ENCRYPTED_${btoa(s).substring(0, 20)}...[SIMULATED]`;
                    resolve(encrypted);
                } catch (e) {
                    console.error("PGP simulation error:", e);
                    resolve(`🔒 PGP_ERROR...`);
                }
            }, 300); // Simulate async operation
        });
    },
    calculateTokenReward: (action, metadata = {}) => {
        const rewards = {
            post_created: 10,
            reaction_given: 2,
            reaction_received: 2, // Note: Implementing this requires tracking reactions on posts in DB
            comment_posted: 5,
            crisis_support: 50, // How is this verified? Needs mechanism.
            content_moderated: 15, // Needs mechanism.
            first_post: 25, // Needs DB check
            first_reaction: 10, // Needs DB check
            wallet_connected: 100, // Awarded in connectWallet
            anonymous_entry: 50 // Awarded in enterAnonymousMode
        };
        return rewards[action] || 0;
    }
};
window.SafeVoiceUtils = SafeVoiceUtils;
// --- END UTILS ---

