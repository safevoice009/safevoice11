// SafeVoice Global JavaScript V5.3 (WalletConnect Defer + Retry Init) - COMPLETE

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

        // --- WalletConnect Project ID ---
        this.walletConnectProjectId = 'da4f1e37c813d4c75f45c08c62395981'; // Your Project ID

        this._boundInit = this.init.bind(this);
        // Ensure init runs after DOM is ready AND scripts likely loaded
        if (document.readyState === 'loading') {
            // Use DOMContentLoaded which fires after parsing, before images etc.
            // script.js with defer should run after this or around this time.
            document.addEventListener('DOMContentLoaded', this._boundInit);
            console.log("DOMContentLoaded listener attached for init.");
        } else {
            // If DOM already loaded, defer slightly to allow other deferred scripts
            console.log("DOM already loaded, scheduling init slightly deferred.");
            setTimeout(this._boundInit, 0);
        }
    }

    // Helper to check for WalletConnect library with retries
    async checkWalletConnectLibrary(retries = 3, delay = 300) {
        console.log("Checking for WalletConnect library...");
        for (let i = 0; i < retries; i++) {
            // Check if the necessary object and its 'EthereumProvider' property exist
            if (typeof window.WalletConnectEthereumProvider !== 'undefined' && typeof window.WalletConnectEthereumProvider.EthereumProvider !== 'undefined') {
                console.log(`WalletConnect library found successfully after ${i} retries.`);
                return true; // Library is loaded and ready
            }
            // If not found, log a warning and wait before retrying
            console.warn(`WalletConnect library not found, retrying in ${delay}ms... (${i + 1}/${retries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        // If the loop completes without finding the library
        console.error("WalletConnectEthereumProvider library failed to load after multiple retries!");
        console.log("Window keys potentially related:", Object.keys(window).filter(k => k.toLowerCase().includes('walletconnect'))); // Log relevant window keys for debugging
        this.showNotification("WalletConnect library failed to load. Please check network or refresh.", "error");
        return false; // Indicate failure after all retries
    }


    async initWalletConnectProvider() {
        console.log("Attempting to initialize WalletConnect Provider...");
        if (!this.walletConnectProjectId) {
            console.error("WalletConnect Project ID is missing! Cannot initialize.");
            this.showNotification("WalletConnect setup error (ID missing).", "error");
            return null; // Stop initialization
        }

        // --- ENHANCED CHECK WITH RETRY ---
        // Wait for the library check to complete
        const libraryLoaded = await this.checkWalletConnectLibrary();
        if (!libraryLoaded) {
            console.error("Stopping WalletConnect init because library check failed.");
            return null; // Stop initialization if library isn't found after retries
        }
        // --- END ENHANCED CHECK ---

        // Proceed with initialization only if library check passed
        try {
            console.log("WalletConnectEthereumProvider library confirmed. Initializing...");
            // Destructure the EthereumProvider class from the loaded library object
            const { EthereumProvider } = window.WalletConnectEthereumProvider;

            // Prevent re-initialization if already successfully initialized
            if (this.wcProvider) {
                 console.log("WalletConnect Provider instance already exists. Skipping re-initialization.");
                 return this.wcProvider;
            }

            // Initialize the WalletConnect provider
            this.wcProvider = await EthereumProvider.init({
                projectId: this.walletConnectProjectId, // Your unique project ID from WalletConnect Cloud
                chains: [1], // Specify desired chains (e.g., [1] for Ethereum Mainnet)
                showQrModal: true, // Automatically show QR code modal on desktop
                qrModalOptions: { themeMode: "light" }, // Modal theme
                methods: ["eth_requestAccounts", "personal_sign"], // ETH methods allowed
                events: ["connect", "disconnect", "accountsChanged"] // Events to listen for
            });

            // --- Setup Event Listeners ---
            // Listen for disconnection events
            this.wcProvider.on("disconnect", () => {
                console.log("WalletConnect: 'disconnect' event received.");
                this.handleDisconnect(); // Trigger app state reset
            });

            // Listen for changes in connected accounts
            this.wcProvider.on("accountsChanged", (accounts) => {
                 console.log("WalletConnect: 'accountsChanged' event received", accounts);
                 if (accounts && accounts.length > 0) {
                     // If user is currently connected via wallet and the address changed
                     if (this.currentUser && !this.currentUser.isAnonymous && this.currentUser.walletAddress !== accounts[0]) {
                          console.log("Wallet address changed. Updating current user state.");
                          this.currentUser.walletAddress = accounts[0]; // Update address in state
                          localStorage.setItem('safeVoiceUser', JSON.stringify(this.currentUser)); // Save updated state
                          this.dispatchUserUpdate(); // Notify UI components of the change
                     } else {
                         // Log cases where change is ignored (e.g., user was anonymous, address is same)
                         console.log("Account change event ignored: User not connected via wallet or address unchanged.");
                     }
                 } else {
                     // An empty accounts array usually signifies disconnection
                     console.log("Received empty accounts array via 'accountsChanged', handling as disconnect.");
                     this.handleDisconnect();
                 }
            });
            // --- End Event Listeners ---

            console.log("WalletConnect EthereumProvider initialized successfully.");
            return this.wcProvider; // Return the initialized provider instance
        } catch (error) {
            // Catch and log errors during initialization
            console.error("FAILED to initialize WalletConnect EthereumProvider:", error);
            let message = "Could not initialize WalletConnect."; // Default error message
            // Provide more specific feedback based on common error messages
            if (error.message?.includes('Project ID is invalid')) { message = "WalletConnect Project ID is invalid."; }
            else if (error.message?.includes('Network request failed')) { message = "Network error initializing WalletConnect. Check connection."; }
            else if (error.message?.includes('Unsupported chain id')) { message = "WalletConnect: Unsupported blockchain configured."; }
            else if (error.message) { message = `WalletConnect Init Error: ${error.message}`; } // Use specific error if available
            this.showNotification(message, "error"); // Show error to the user
            this.wcProvider = null; // Ensure provider is null if initialization failed
            return null; // Return null to indicate failure
        }
    }

    // Main initialization function called after DOM is ready
    async init() {
        // Prevent multiple initializations
        if (this.isInitialized) {
            console.log("Initialization already completed. Skipping.");
            return;
        }
        // Remove the DOMContentLoaded listener once init starts to prevent re-triggering
        document.removeEventListener('DOMContentLoaded', this._boundInit);
        console.log('SafeVoice App Initializing (DOM Ready)...');

        try {
            // Step 1: Attempt to initialize WalletConnect Provider (includes library check + retry)
            // This needs to happen early as other parts might depend on it.
            await this.initWalletConnectProvider();

            // Step 2: Load user state from localStorage. This should run even if WC init failed,
            // allowing anonymous mode or showing previous state.
            this.loadUserState();

            // Step 3: Attach event listeners AFTER DOM is ready and initial state is loaded.
            this.setupEventListeners();

            // Step 4: Perform initial UI updates based on the loaded state.
            this.updateProfileUI(); // Update profile page elements if present
            this.dispatchUserUpdate(); // Notify navbar and other components about the user state
            this.dispatchTokenUpdate(); // Notify navbar and other components about the token balance

            console.log('SafeVoice App Initialized Successfully.');
            this.isInitialized = true; // Mark initialization as complete

        } catch (error) {
             // Catch any unexpected errors during the entire initialization sequence
             console.error("!!! CRITICAL ERROR DURING APP INITIALIZATION SEQUENCE !!!", error);
             this.showNotification("Critical error loading the app. Please refresh the page.", "error");
             this.isInitialized = false; // Ensure the app knows initialization failed
        }
    }


    loadUserState() {
        console.log("Loading user state from localStorage...");
        try {
            const savedUser = localStorage.getItem('safeVoiceUser');
            if (savedUser) {
                this.currentUser = JSON.parse(savedUser);
                // Basic validation: ensure it's an object
                if (typeof this.currentUser !== 'object' || this.currentUser === null) {
                    console.error("Invalid user data structure found in localStorage:", this.currentUser);
                    throw new Error("Parsed user data is not a valid object.");
                }
                // Determine connection status based on walletAddress presence
                this.walletConnected = !!this.currentUser.walletAddress;
                // Safely parse tokenBalance, defaulting to 0
                this.tokenBalance = Number(this.currentUser.tokenBalance) || 0;
                console.log('User state successfully loaded:', this.currentUser);
            } else {
                console.log('No saved user state found in localStorage.');
                // Explicitly set default state if nothing is loaded
                this.currentUser = null;
                this.walletConnected = false;
                this.tokenBalance = 0;
            }
        } catch (error) {
            // Handle errors during loading or parsing (e.g., corrupted data)
            console.error('Error loading or parsing user state from localStorage:', error);
            localStorage.removeItem('safeVoiceUser'); // Clear potentially corrupted data
            // Reset to default state after error
            this.currentUser = null;
            this.walletConnected = false;
            this.tokenBalance = 0;
        }
        // Note: dispatchUserUpdate/dispatchTokenUpdate happens after full init completes.
    }

    setupEventListeners() {
        console.log("Setting up global and button event listeners...");

        // Event Delegation for Reactions (more robust than attaching to each button)
        // Listen on the body for clicks bubbling up from reaction buttons
        document.body.addEventListener('click', (event) => {
            // Find the closest ancestor element that matches the '.reaction-btn' selector
            const reactionBtn = event.target.closest('.reaction-btn');
            // If a reaction button was clicked (or an element inside it)
            if (reactionBtn) {
                this.handleReaction(reactionBtn); // Call the handler function
            }
        });

        // Specific Button Listeners (using IDs for uniqueness)
        const connectBtnIndex = document.getElementById('connectWalletBtnIndex');
        const anonymousBtnIndex = document.getElementById('anonymousModeBtnIndex');
        const connectBtnProfile = document.getElementById('connectWalletBtnProfile');

        // Attach listener for index page connect button if it exists
        if (connectBtnIndex) {
            connectBtnIndex.addEventListener('click', () => this.connectWallet());
            console.log("Listener attached to #connectWalletBtnIndex.");
        } else if (document.getElementById('hero')) { // Only warn if we expect it (on index page)
             console.warn("Button #connectWalletBtnIndex not found on index page! Check ID.");
        }

        // Attach listener for index page anonymous button if it exists
        if (anonymousBtnIndex) {
            anonymousBtnIndex.addEventListener('click', () => {
                // `enterAnonymousMode` returns true on success/confirmation
                if (this.enterAnonymousMode()) {
                    window.location.href = './feed.html'; // Redirect to feed after entering mode
                }
            });
            console.log("Listener attached to #anonymousModeBtnIndex.");
        } else if (document.getElementById('hero')) { // Only warn if on index page
            console.warn("Button #anonymousModeBtnIndex not found on index page! Check ID.");
        }

        // Attach listener for profile page connect button if it exists
        if (connectBtnProfile) {
            connectBtnProfile.addEventListener('click', () => this.connectWallet());
            console.log("Listener attached to #connectWalletBtnProfile.");
        } else if (document.getElementById('profileUsername')) { // Only warn if on profile page
            console.warn("Button #connectWalletBtnProfile not found on profile page! Check ID.");
        }

        // Listeners for Custom State Change Events (to update profile UI dynamically)
        // Use .bind(this) to ensure `updateProfileUI` retains the correct `this` context
        window.addEventListener('safeVoiceUserUpdate', this.updateProfileUI.bind(this));
        window.addEventListener('safeVoiceTokenUpdate', this.updateProfileUI.bind(this)); // Token updates also refresh stats on profile

        // Initial Feather Icons Render (for any icons potentially added dynamically during setup)
        try {
            if (typeof feather !== 'undefined') {
                 feather.replace(); // Render all feather icons on the page
                 console.log("Feather.replace() called at the end of setupEventListeners.");
            } else {
                 // Log error if Feather library isn't loaded by this point
                 console.error("Feather icons library not available at end of setupEventListeners.");
            }
        } catch(e) { console.error("Error running feather.replace in setupEventListeners:", e); }

        this.initTooltips(); // Initialize tooltips if needed
        console.log("Event listeners setup complete.");
    }

    updateProfileUI() {
        const usernameEl = document.getElementById('profileUsername');
        // If username element doesn't exist, we are not on the profile page, so exit.
        if (!usernameEl) {
             return; // Exit silently, not an error if not on profile page.
        }

        console.log('Attempting to update profile page UI elements...');
        // Find all necessary profile page elements, checking for existence
        const walletEl = document.getElementById('profileWallet');
        const tokenEl = document.getElementById('profileTokenBalance');
        const connectBtn = document.getElementById('connectWalletBtnProfile');
        const postsContainer = document.getElementById('myPostsContainer');
        const totalPostsEl = document.getElementById('profileTotalPosts');
        const reactionsGivenEl = document.getElementById('profileReactionsGiven');
        const postsPlaceholder = document.getElementById('postsPlaceholder'); // Get the placeholder paragraph/div

        // If any critical element is missing, log an error and stop the update
        if (!walletEl || !tokenEl || !connectBtn || !postsContainer || !totalPostsEl || !reactionsGivenEl || !postsPlaceholder) {
             console.error("CRITICAL: One or more required profile UI elements are missing! Cannot update profile page. Check element IDs.");
             if (usernameEl) usernameEl.textContent = "Profile Display Error"; // Indicate error state
             return;
        }

        try {
            // Update UI based on the current user state (`this.currentUser`, `this.tokenBalance`)
            if (this.currentUser) {
                // Update token balance display, formatting it
                tokenEl.textContent = this.tokenBalance?.toLocaleString() ?? '0';

                if (this.currentUser.isAnonymous) {
                    // State: User is anonymous
                    usernameEl.textContent = this.currentUser.anonymousId || 'Anonymous User';
                    walletEl.textContent = 'Anonymous Mode';
                    connectBtn.textContent = 'Connect Wallet';
                    connectBtn.style.display = 'inline-block'; // Ensure connect button is visible
                    // Update placeholder text for posts
                    postsPlaceholder.textContent = 'Connect your wallet to view your posts (feature coming soon).';
                    postsContainer.innerHTML = ''; // Clear any previously loaded posts
                    postsContainer.appendChild(postsPlaceholder); // Ensure placeholder is visible
                } else if (this.currentUser.walletAddress) {
                    // State: User is connected via wallet
                    usernameEl.textContent = 'Wallet Connected';
                    // Display shortened wallet address
                    const shortAddress = `${this.currentUser.walletAddress.substring(0, 6)}...${this.currentUser.walletAddress.substring(this.currentUser.walletAddress.length - 4)}`;
                    walletEl.textContent = shortAddress;
                    connectBtn.style.display = 'none'; // Hide connect button
                    // Update placeholder text for posts (indicating loading/feature status)
                    postsPlaceholder.innerHTML = `
                        <i data-feather="loader" class="w-8 h-8 mx-auto mb-2 animate-spin"></i>
                        <p>Loading posts for ${shortAddress}...</p>
                        <p class="text-sm">(Supabase integration needed to fetch posts)</p>`;
                     postsContainer.innerHTML = ''; // Clear any previously loaded posts
                     postsContainer.appendChild(postsPlaceholder); // Ensure placeholder is visible
                } else {
                     // Defensive coding for an unexpected state
                     console.warn("currentUser state is invalid (neither anonymous nor wallet address). Resetting UI.");
                     throw new Error("Invalid currentUser state detected during UI update.");
                }
            } else {
                // State: No user loaded (e.g., first visit, logged out)
                usernameEl.textContent = 'Anonymous User';
                walletEl.textContent = 'Wallet not connected';
                tokenEl.textContent = '0'; // Show zero tokens
                connectBtn.textContent = 'Connect Wallet';
                connectBtn.style.display = 'inline-block'; // Ensure connect button is visible
                // Set appropriate placeholder text
                postsPlaceholder.textContent = 'Connect wallet or enter anonymously to get started.';
                 postsContainer.innerHTML = ''; // Clear any previously loaded posts
                 postsContainer.appendChild(postsPlaceholder); // Ensure placeholder is visible
            }

            // Update placeholder stats (replace with actual data retrieval later)
            totalPostsEl.textContent = '0'; // Placeholder
            reactionsGivenEl.textContent = '0'; // Placeholder

            // IMPORTANT: Re-render Feather icons AFTER updating innerHTML (e.g., for the loader icon)
            if (typeof feather !== 'undefined') {
                feather.replace(); // Render all icons on the page again
            } else {
                 console.warn("Feather library not available during profile UI update for dynamic icons.");
            }
             console.log("Profile UI updated successfully based on current state.");

        } catch (error) {
             // Catch errors during the UI update process
             console.error("Error updating profile UI:", error);
             // Attempt to display a user-friendly error state on the profile page
             if (usernameEl) usernameEl.textContent = "Profile Error";
             if (walletEl) walletEl.textContent = "Could not load profile data";
             if (tokenEl) tokenEl.textContent = "-";
             // Display error message in the posts container
             if (postsContainer) postsContainer.innerHTML = '<p class="text-center text-red-500">Error displaying profile details. Please try refreshing the page.</p>';
        }
    }


    async handleReaction(button) {
        const postId = button.dataset.postId;
        const reactionType = button.dataset.reaction;
        // Basic validation
        if (!postId || !reactionType) {
            console.warn("Reaction button is missing data-post-id or data-reaction attribute.");
            return;
        }
        // Prevent multiple clicks while processing
        button.classList.add('opacity-50', 'pointer-events-none');
        try {
            await this.simulateAPICall(100, 300); // Simulate network latency

            // Optimistically update the UI count
            const countElement = button.querySelector('.reaction-count');
            if (countElement) {
                const currentCount = parseInt(countElement.textContent, 10) || 0;
                countElement.textContent = currentCount + 1; // Increment count
                // Add a brief visual feedback animation
                 button.style.transition = 'transform 0.1s ease-out';
                 button.style.transform = 'scale(1.15)';
                 setTimeout(() => { button.style.transform = 'scale(1)'; }, 150);
            }

            // Award tokens only if a user session exists (anonymous or connected)
            if (this.currentUser) {
                 this.awardTokens(2, 'reaction_given'); // Award simulated tokens
            } else {
                 console.log("Reaction added, but no user session exists to award tokens.");
                 // Optionally: Show a notification encouraging connection/entry
                 // this.showNotification("Connect wallet or enter anonymously to earn tokens!", "info", 2500);
            }
        } catch (error) {
            // Handle potential errors during the simulated API call or UI update
            console.error('Reaction failed:', error);
            this.showNotification('Failed to add reaction. Please try again.', 'error');
            // TODO: In a real app, revert the optimistic count increment here on failure
        } finally {
            // Re-enable the button after a short delay, regardless of success/failure
            setTimeout(() => {
                button.classList.remove('opacity-50', 'pointer-events-none');
            }, 400); // Delay helps prevent accidental double-clicks
        }
    }

    async connectWallet() {
        console.log("Connect wallet action initiated...");
        // Prevent multiple connection attempts simultaneously
        if (this._isConnecting) {
            console.log("Connection attempt already in progress. Please wait.");
            this.showNotification("Connecting... Please check your wallet or wait.", "info");
            return false; // Indicate connection attempt is already happening
        }
        this._isConnecting = true; // Set guard flag

        let accounts = []; // To store retrieved wallet accounts
        let connectionError = null; // To store any error encountered

        try {
            // Step 1: Ensure WalletConnect Provider is ready (includes library check + retry)
            if (!this.wcProvider) {
                 console.log("WalletConnect provider not ready, attempting initialization...");
                 await this.initWalletConnectProvider(); // Attempt to initialize it
                 // If initialization fails (returns null), throw an error to stop connection
                 if (!this.wcProvider) throw new Error("WalletConnect could not be initialized. Cannot connect.");
            }

            // Step 2: Initiate Connection via WalletConnect
            console.log("Attempting connection via WalletConnect provider...");
            this.showNotification("Connecting wallet... Please check your wallet app to approve.", "info", 6000); // Show prompt with longer duration

            // Check if WC provider already has an active session/accounts
            if (this.wcProvider.accounts && this.wcProvider.accounts.length > 0) {
                 console.log("Using existing WalletConnect session:", this.wcProvider.accounts);
                 accounts = this.wcProvider.accounts; // Use existing accounts
            } else {
                 console.log("No existing WC session found, calling connect() (will trigger modal/redirect)...");
                 // This method triggers the QR modal on desktop or redirects to mobile wallet app
                 await this.wcProvider.connect();
                 // After successful connection approval, accounts should be populated
                 accounts = this.wcProvider.accounts;
                 console.log("WalletConnect connect() successful, received accounts:", accounts);
                 // Defensive check: ensure accounts were actually returned
                 if (!accounts || accounts.length === 0) {
                     throw new Error("WalletConnect connect() succeeded but returned no accounts unexpectedly.");
                 }
            }

            // --- Step 3: Process Successful Connection ---
            const walletAddress = accounts[0]; // Get the primary connected address

            console.log("Wrapping WalletConnect provider with Ethers.js Web3Provider...");
            // Use the active WalletConnect provider instance to create an Ethers provider
            // This allows using standard Ethers.js methods to interact with the wallet
            this.provider = new ethers.providers.Web3Provider(this.wcProvider);
            console.log("Ethers.js provider created successfully from WalletConnect.");

            this.walletConnected = true; // Update connection status flag
            // Determine initial token balance (preserve anonymous balance or start fresh)
            const existingBalance = (this.currentUser && this.currentUser.isAnonymous) ? this.currentUser.tokenBalance : 0;
            const welcomeBonus = 100; // Define welcome bonus for connecting wallet

            // Step 4: Update Application State
            this.currentUser = {
                walletAddress: walletAddress,
                isAnonymous: false, // User is no longer anonymous
                tokenBalance: existingBalance + welcomeBonus // Grant welcome bonus
            };
            this.tokenBalance = this.currentUser.tokenBalance; // Sync instance balance variable
            // Persist the new user state in localStorage
            localStorage.setItem('safeVoiceUser', JSON.stringify(this.currentUser));

            // Step 5: Provide UI Feedback & Dispatch Updates
            const shortAddress = `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`;
            this.showNotification(`Wallet ${shortAddress} connected successfully! +${welcomeBonus} tokens`, 'success');
            this.dispatchTokenUpdate(); // Update token displays globally
            this.dispatchUserUpdate(); // Update user displays globally (e.g., hide connect buttons)

            // Step 6: Redirect if connected from the main landing page
            if (document.getElementById('hero')) { // Check if the hero section exists (indicates index page)
                console.log("Connected on index page, scheduling redirect to feed page...");
                // Use setTimeout to allow the user to read the success notification
                setTimeout(() => { window.location.href = './feed.html'; }, 1500);
            } else {
                console.log("Connected on a page other than index (e.g., profile), no redirect needed.");
            }

            this._isConnecting = false; // Reset connection guard flag *before* returning success
            return true; // Indicate successful connection

        } catch (error) {
            // Handle errors during the connection process
            console.error('Wallet connection process failed:', error);
            connectionError = error; // Store the error for potential use in finally block

            // Provide more specific user feedback based on common WalletConnect/MetaMask errors
            if (error.message?.includes("User closed modal") || String(error.code).includes('USER_REJECTED') || error.code === 4001 /* MetaMask reject code */) {
                 this.showNotification('Connection request cancelled by user.', 'warning');
            } else if (error.message?.includes("Expired connection") || String(error.code).includes('SESSION_EXPIRED')) {
                 this.showNotification('Connection attempt timed out. Please try again.', 'warning');
            } else if (error.message?.includes("pairing modal closed")) {
                 // This often happens if user closes QR code early; might not need strong error
                 console.warn("WalletConnect pairing modal closed before completion.");
                 this.showNotification('Connection cancelled.', 'info'); // Softer notification
            } else if (error.message?.includes("WalletConnect could not be initialized")) {
                // Error came from our init function, likely shown already
                console.error("Initialization failure prevented connection attempt.");
            } else if (error.message?.includes("Session currently disconnected")) {
                 this.showNotification('Session disconnected. Please try connecting again.', 'warning');
                 // Potentially call handleDisconnect here if appropriate
                 // this.handleDisconnect();
            }
             else {
                 // General fallback error message
                 this.showNotification(`Wallet connection failed: ${error.message || 'Unknown error. Please retry.'}`, 'error');
            }
            // Do not automatically disconnect here; let the user retry if possible.

        } finally {
            // CRITICAL: Ensure the connection guard flag is *always* reset
            this._isConnecting = false;
            console.log("Connect wallet process finished.");
             // Determine final return value based on whether accounts were obtained successfully
            if (accounts && accounts.length > 0 && !connectionError) {
                 // If we have accounts and didn't hit the catch block's error setting
                 console.log("Returning true (success).");
                 // return true; // Already returned in try block
            } else {
                 // If there was an error OR connect succeeded but gave no accounts
                 console.log("Returning false (failure or incomplete).");
                 return false; // Indicate failure
            }
        }
    }


     handleDisconnect() {
        console.log("Handling WalletConnect disconnection event...");
        // Reset the core application state related to the user
        this.currentUser = null; // Clear current user object
        this.walletConnected = false; // Set connection status to false
        this.tokenBalance = 0; // Reset token balance
        this.provider = null; // Clear the Ethers provider linked to the disconnected session

        // Remove the user session data from local storage
        localStorage.removeItem('safeVoiceUser');

        // Provide feedback to the user and update UI elements
        this.showNotification("Wallet has been disconnected.", "info");
        this.dispatchUserUpdate(); // Trigger updates for UI elements (e.g., show connect buttons, reset profile)
        this.dispatchTokenUpdate(); // Trigger updates for token balance displays (reset to 0)

        console.log("Application state and localStorage reset after wallet disconnect.");
        // Optional: Consider redirecting the user, e.g., to the homepage, especially
        // if they were on a page requiring a connection (like profile).
        // setTimeout(() => {
        //     // Check if the current page is not the index page before redirecting
        //     if (!document.getElementById('hero')) {
        //         window.location.href = './index.html';
        //     }
        // }, 1500); // Delay allows user to see the notification
     }


    enterAnonymousMode() {
        console.log("Attempting to enter anonymous mode...");
        // If a wallet is already connected, prevent switching to anonymous mode.
        if (this.walletConnected) {
             console.log("Cannot enter anonymous mode: Wallet is already connected.");
             this.showNotification("You are already connected with a wallet.", "info");
             // Return true to allow any subsequent redirect logic, but don't change the state.
             return true;
        }

        const anonymousBonus = 50; // Define the token bonus for anonymous entry.
        // Proceed only if the user isn't already in anonymous mode or if no user is set.
        if (!this.currentUser || !this.currentUser.isAnonymous) {
             console.log("Setting new anonymous user state...");
             // Create the anonymous user object.
             this.currentUser = {
                 anonymousId: this.generateAnonymousId(), // Generate a unique anonymous ID.
                 isAnonymous: true, // Mark state as anonymous.
                 tokenBalance: anonymousBonus // Grant the bonus tokens.
             };
             // Save the new state to localStorage.
             localStorage.setItem('safeVoiceUser', JSON.stringify(this.currentUser));
             this.tokenBalance = this.currentUser.tokenBalance; // Update the instance's token balance.
             // Notify the user and update UI components.
             this.showNotification(`Entering anonymous mode. +${anonymousBonus} tokens granted!`, 'info');
             this.dispatchTokenUpdate(); // Update token displays.
             this.dispatchUserUpdate(); // Update user-related UI (e.g., navbar, profile).
        } else {
             // If already anonymous, just log it. Maybe refresh token display just in case.
             console.log("Already in anonymous mode.");
             this.tokenBalance = this.currentUser.tokenBalance; // Ensure instance balance is correct.
             this.dispatchTokenUpdate(); // Refresh UI just in case.
        }
        console.log("Anonymous mode entry process completed.");
        return true; // Indicate success (allows redirection in calling function).
     }

    // --- Dispatchers ---
    // Dispatches a custom event to notify components (like navbar, index counters) about token balance changes.
    dispatchTokenUpdate() {
        window.dispatchEvent(new CustomEvent('safeVoiceTokenUpdate', {
            detail: { newBalance: this.tokenBalance }
        }));
    }
    // Dispatches a custom event to notify components (like navbar, profile page) about user state changes.
    dispatchUserUpdate() {
        window.dispatchEvent(new CustomEvent('safeVoiceUserUpdate', {
            detail: { currentUser: this.currentUser }
        }));
    }

    // --- Helpers ---
    // Generates a random anonymous user ID.
    generateAnonymousId() {
        const adjectives = ['Brave', 'Calm', 'Wise', 'Kind', 'Strong', 'Gentle', 'Bright', 'True', 'Quiet', 'Clear', 'Silent', 'Swift'];
        const nouns = ['Owl', 'Phoenix', 'Lion', 'Dolphin', 'Eagle', 'Wolf', 'Tiger', 'Bear', 'River', 'Star', 'Flame', 'Stone'];
        const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
        const number = Math.floor(Math.random() * 900) + 100; // 3-digit number
        return `${randomAdj}${randomNoun}${number}`;
     }

    // Awards simulated tokens to the current user.
    awardTokens(amount, reason) {
        // Check if there is an active user session.
        if (!this.currentUser) {
             console.warn("Cannot award tokens: No current user session.");
             // Maybe show a notification suggesting login/connection?
             // this.showNotification("Connect your wallet or enter anonymously to earn tokens!", "info", 2500);
             return; // Exit if no user
        }
        try {
            // Safely get current balance and amount to add.
            const currentBalance = Number(this.currentUser.tokenBalance) || 0;
            const amountToAdd = Number(amount) || 0;
            // Don't award zero or negative amounts.
            if (amountToAdd <= 0) {
                 console.log("Attempted to award zero or negative tokens. Ignoring.");
                 return;
            }

            // Update the user object and instance variable.
            this.currentUser.tokenBalance = currentBalance + amountToAdd;
            this.tokenBalance = this.currentUser.tokenBalance;

            // Save the updated user state.
            localStorage.setItem('safeVoiceUser', JSON.stringify(this.currentUser));
            // Notify UI components about the change.
            this.dispatchTokenUpdate();
            console.log(`Awarded ${amountToAdd} tokens for: ${reason}. New balance: ${this.tokenBalance}`);
            // Show a success notification to the user.
            this.showNotification(`+${amountToAdd} tokens: ${reason.replace(/_/g, ' ')}!`, 'success');
        } catch (error) {
             // Handle potential errors during the update.
             console.error("Error occurred while awarding tokens:", error);
             this.showNotification("Error updating token balance. Please refresh.", "error");
        }
    }

    // Simulates a network request delay.
    simulateAPICall(minDuration = 100, maxDuration = 400) {
        const duration = Math.random() * (maxDuration - minDuration) + minDuration;
        return new Promise(resolve => setTimeout(resolve, duration));
     }

    // Displays temporary notifications (toasts) to the user.
    showNotification(message, type = 'info', duration = 3500) {
        try {
            // Create a unique ID for the notification element.
            const notificationId = `notification-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
            const notification = document.createElement('div');
            notification.id = notificationId;

            // Define base styling and type-specific background/text colors.
            let baseClasses = 'fixed top-20 right-4 p-4 rounded-lg text-white z-[5000] shadow-lg transition-all duration-300 ease-in-out opacity-0 max-w-sm transform translate-x-full';
            let typeClasses = '';
            switch(type) {
                case 'success': typeClasses = 'bg-green-500'; break;
                case 'error': typeClasses = 'bg-red-500'; break;
                case 'warning': typeClasses = 'bg-yellow-500 text-black'; break; // Use black text for better contrast on yellow
                case 'info':
                default: typeClasses = 'bg-blue-500'; break;
            }
            notification.className = `${baseClasses} ${typeClasses}`;
            notification.textContent = message; // Set the notification message.
            document.body.appendChild(notification); // Add to the page.

            // Animate the notification sliding in.
            // Use requestAnimationFrame to ensure the element is in the DOM before animating.
            requestAnimationFrame(() => {
                notification.classList.remove('opacity-0', 'translate-x-full');
                 notification.classList.add('opacity-100', 'translate-x-0'); // Slide in from right
                 // Adjust vertical position of existing notifications to stack them.
                 const existingNotifications = Array.from(document.querySelectorAll('[id^=notification-]:not(#'+notificationId+')')).reverse(); // Get others, newest first
                 existingNotifications.forEach((el, index) => {
                      // Move existing notifications down based on index (adjust 70px for desired spacing)
                      el.style.transform = `translateY(${(index + 1) * 70}px) translateX(0px)`;
                 });
            });

            // Set a timer to automatically remove the notification.
            setTimeout(() => {
                const elToRemove = document.getElementById(notificationId);
                if (elToRemove) {
                    // Animate sliding out.
                    elToRemove.classList.remove('opacity-100', 'translate-x-0');
                    elToRemove.classList.add('opacity-0', 'translate-x-full');
                    // Wait for the animation to finish before removing from DOM.
                    setTimeout(() => {
                         elToRemove.remove();
                         // Optional: Re-adjust stacking of remaining notifications after one is removed (can be complex).
                    }, 300); // Corresponds to the transition duration.
                }
            }, duration); // Use the specified duration.
        } catch (e) {
            // Log errors if notification fails to display.
            console.error("Error showing notification:", e);
        }
    }

    // Placeholder for tooltip initialization logic.
    initTooltips() { /* console.log("Init tooltips (placeholder)"); */ }
    // Placeholder for showing a tooltip.
    showTooltip(event) { /* Placeholder */ }
    // Placeholder for hiding a tooltip.
    hideTooltip(event) { /* Placeholder */ }
}

// --- Global App Initialization ---
// Ensure only one instance of SafeVoiceApp is created globally.
// The constructor handles attaching the main init() call to DOMContentLoaded or setTimeout.
if (!window.safeVoiceApp) {
    window.safeVoiceApp = new SafeVoiceApp();
    console.log("SafeVoiceApp instance created globally and scheduled for initialization.");
} else {
    // This case should ideally not happen if script is loaded once correctly.
    console.warn("SafeVoiceApp instance already exists globally. Check for duplicate script imports or execution.");
    // Avoid re-initializing if it's already done or in progress.
    // if (!window.safeVoiceApp.isInitialized) {
    //     console.log("Attempting to re-initialize existing SafeVoiceApp instance (use with caution).");
    //     window.safeVoiceApp.init(); // Be careful with potential side effects of re-running init.
    // }
}
// --- END ---


// --- Utility functions (SafeVoiceUtils) ---
// Keep these outside the class, attached to the window for global access.
const SafeVoiceUtils = {
    // Formats numbers into K (thousands) or M (millions) if large.
    formatNumber: (num) => {
        const number = Number(num);
        if (isNaN(number)) return '0'; // Handle invalid input
        if (number >= 1e6) return (number / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'; // Format millions
        if (number >= 1e3) return (number / 1e3).toFixed(1).replace(/\.0$/, '') + 'K'; // Format thousands
        return number.toLocaleString(); // Format smaller numbers with commas
    },
    // Formats a date string into a relative time ago string (e.g., "5m ago", "2d ago") or a full date.
    formatDate: (dateString) => {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Invalid date'; // Handle invalid date strings
            const now = new Date();
            const diffMs = now.getTime() - date.getTime(); // Difference in milliseconds
            const diffSeconds = Math.round(diffMs / 1000);
            const diffMins = Math.round(diffSeconds / 60);
            const diffHours = Math.round(diffMins / 60);
            const diffDays = Math.round(diffHours / 24);

            // Return relative time based on difference
            if (diffSeconds < 5) return 'Just now';
            if (diffMins < 1) return `${diffSeconds}s ago`;
            if (diffHours < 1) return `${diffMins}m ago`;
            if (diffDays < 1) return `${diffHours}h ago`;
            if (diffDays < 7) return `${diffDays}d ago`;
            // For older dates, return formatted date string
            return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        } catch (e) {
            console.error("Error formatting date:", dateString, e);
            return 'Date error'; // Return error string on failure
        }
    },
    // Debounce function: Limits the rate at which a function can fire.
    debounce: (func, wait) => {
        let timeout; // Stores the timeout ID
        // Return a function that wraps the original function
        return function executedFunction(...args) {
            const context = this; // Preserve the context (`this`)
            // Function to execute after the wait time
            const later = () => {
                timeout = null; // Clear the timeout ID
                func.apply(context, args); // Call the original function
            };
            clearTimeout(timeout); // Clear any existing timeout
            // Set a new timeout
            timeout = setTimeout(later, wait);
        };
    },
    // Simulates PGP encryption (replace with actual library like OpenPGP.js).
    simulatePGPEncryption: async (content) => {
        return new Promise(resolve => {
            setTimeout(() => {
                try {
                    const stringContent = String(content || ''); // Ensure content is a string
                    // Basic simulation using base64 encoding (NOT real encryption)
                    const encrypted = `🔒 PGP_ENCRYPTED_${btoa(stringContent).substring(0, 20)}...[SIMULATED]`;
                    resolve(encrypted);
                } catch (e) {
                    console.error("PGP simulation error:", e);
                    resolve(`🔒 PGP_ERROR...`); // Return error indicator
                }
            }, 300); // Simulate asynchronous operation delay
        });
    },
    // Calculates simulated token rewards based on action type.
    calculateTokenReward: (action, metadata = {}) => {
        // Define reward amounts for different actions
        const rewards = {
            post_created: 10,
            reaction_given: 2,
            reaction_received: 2, // Note: Implementing this requires tracking reactions received on posts (DB side)
            comment_posted: 5,    // Requires comment system implementation
            crisis_support: 50,   // How is this verified? Needs a mechanism.
            content_moderated: 15,// Needs a moderation system.
            first_post: 25,       // Requires checking user's post history in DB.
            first_reaction: 10,   // Requires checking user's reaction history in DB.
            wallet_connected: 100,// Awarded directly in connectWallet function.
            anonymous_entry: 50   // Awarded directly in enterAnonymousMode function.
        };
        // Return the reward amount for the action, or 0 if action not defined
        return rewards[action] || 0;
    }
};
// Attach SafeVoiceUtils to the window object for global access
window.SafeVoiceUtils = SafeVoiceUtils;
console.log("SafeVoiceUtils attached to window.");
// --- END UTILS ---

