// SafeVoice Global JavaScript V6.1 (Using Web3Modal v1) - COMPLETE

// --- Constants ---
// WalletConnect v1 requires an Infura ID if you want Infura-provided RPC endpoints
// YOUR ACTUAL INFURA ID IS NOW HERE:
const INFURA_ID = "61bf1b20f35746ada4114a0210084f05"; // <<< YOUR ID INSERTED
const WALLETCONNECT_PROJECT_ID = 'da4f1e37c813d4c75f45c08c62395981'; // Your WC Project ID (Used by Web3Modal internally for WC option)

class SafeVoiceApp {
    constructor() {
        console.log("SafeVoiceApp constructing...");
        this.currentUser = null;
        this.walletConnected = false;
        this.tokenBalance = 0;
        this.provider = null; // Ethers.js provider (will come from Web3Modal)
        this.web3Modal = null; // Web3Modal v1 instance
        this.web3ModalProvider = null; // Raw provider instance from Web3Modal connection
        this.isInitialized = false;
        this._isConnecting = false; // Guard flag for connection process

        // Bind the init function to ensure correct `this` context
        this._boundInit = this.init.bind(this);
        // Wait for the DOM to be ready before initializing
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', this._boundInit);
            console.log("SafeVoiceApp: DOMContentLoaded listener attached for init.");
        } else {
            // If DOM is already loaded, schedule init slightly deferred
            console.log("SafeVoiceApp: DOM already loaded, scheduling init deferred.");
            setTimeout(this._boundInit, 50); // Short delay allows other scripts potentially
        }
    }

    // Initialize Web3Modal v1 instance
    async initWeb3Modal() {
        console.log("initWeb3Modal (v1): Initializing...");

        // Check if required library objects exist on the window scope
        if (typeof window.Web3Modal === 'undefined') {
            console.error("initWeb3Modal (v1): Web3Modal Core library (window.Web3Modal) not found!");
            this.showNotification("Wallet connection library (Core) failed to load. Please refresh.", "error");
            return false;
        }
        if (typeof window.WalletConnectProvider === 'undefined' || typeof window.WalletConnectProvider.default === 'undefined') {
            console.error("initWeb3Modal (v1): WalletConnectProvider v1 library (window.WalletConnectProvider.default) not found!");
            this.showNotification("Wallet connection library (WC Provider) failed to load. Please refresh.", "error");
            return false; // WalletConnect option won't work without this
        }

        // Check if the necessary Infura ID is set (replace placeholder)
        if (!INFURA_ID || INFURA_ID === "YOUR_INFURA_PROJECT_ID") {
             console.error("initWeb3Modal (v1): CRITICAL - Infura ID placeholder detected in script.js! Replace it with your actual Infura Project ID.");
             this.showNotification("WalletConnect configuration error (Missing Infura ID). Get one from infura.io.", "error", 6000);
             // Stop initialization if the essential ID is missing
             return false;
        }


        try {
            console.log("initWeb3Modal (v1): Required libraries found. Configuring provider options...");

            // Configure providers for Web3Modal v1
            const providerOptions = {
                // WalletConnect configuration
                walletconnect: {
                    package: window.WalletConnectProvider.default, // Reference the loaded WalletConnectProvider class
                    options: {
                        infuraId: INFURA_ID, // Pass the Infura ID constant
                        // Recommended: Add specific RPC URLs for networks you intend to support
                        // This provides fallback if Infura has issues or for networks Infura doesn't cover by default.
                         rpc: {
                             1: `https://mainnet.infura.io/v3/${INFURA_ID}`, // Ethereum Mainnet (Chain ID 1)
                             // Example: Add Polygon (Chain ID 137)
                             // 137: `https://polygon-mainnet.infura.io/v3/${INFURA_ID}`,
                             // Example: Add Goerli Testnet (Chain ID 5) if needed for testing
                             // 5: `https://goerli.infura.io/v3/${INFURA_ID}`,
                         }
                    }
                },
                // Add configurations for other wallet providers supported by Web3Modal v1 here if desired
                // Example: Coinbase Wallet (requires additional setup/SDK potentially)
                // 'custom-coinbase': { ... }
            };

            console.log("initWeb3Modal (v1): Attempting to create Web3Modal instance...");
            // Create the Web3Modal instance using the constructor from the loaded library
            this.web3Modal = new window.Web3Modal({
                network: "mainnet",         // Optional: Specify default network (e.g., "mainnet", "goerli", or chain ID like 1)
                cacheProvider: true,       // Recommended: Remember the user's chosen provider
                providerOptions,           // Pass the configured provider options
                theme: "light",            // Optional: Set theme ("light" or "dark")
                disableInjectedProvider: false // Important: Set to false to allow direct connection via MetaMask/injected providers
            });

            console.log("initWeb3Modal (v1): Web3Modal instance created successfully.");
            return true; // Indicate success

        } catch (error) {
            // Catch any errors during Web3Modal instantiation
            console.error("initWeb3Modal (v1): FAILED during initialization:", error);
            // Show a user-friendly error message
            this.showNotification(`Web3Modal Init Error: ${error.message || 'Unknown configuration issue.'}`, "error");
            this.web3Modal = null; // Ensure instance is null on failure
            return false; // Indicate failure
        }
    }

    // Main application initialization sequence
    async init() {
        // Prevent re-initialization if already completed
        if (this.isInitialized) {
            console.log("App Init: Already initialized. Skipping.");
            return;
        }
        // Remove the DOM listener once init starts
        document.removeEventListener('DOMContentLoaded', this._boundInit);
        console.log('App Init: Starting initialization sequence (DOM Ready)...');

        try {
            // Step 1: Initialize Web3Modal (essential for wallet connections)
            console.log("App Init: Step 1 - Initializing Web3Modal v1...");
            const w3mInitialized = await this.initWeb3Modal(); // Call the v1 initializer
            // If Web3Modal fails, log error but allow app to continue for anonymous access
            if (!w3mInitialized) {
                console.error("App Init: Web3Modal initialization failed. Wallet connections will not work, but continuing app load for anonymous mode.");
                // No need to throw an error, just means wallet features won't work
            } else {
                console.log("App Init: Web3Modal initialized successfully.");
            }

            // Step 2: Load any existing user state from localStorage
            console.log("App Init: Step 2 - Loading user state...");
            this.loadUserState();

            // Step 3: Set up event listeners for buttons and global events
            console.log("App Init: Step 3 - Setting up event listeners...");
            this.setupEventListeners();

            // Step 4: Perform initial UI updates based on loaded state
            console.log("App Init: Step 4 - Performing initial UI updates...");
            this.updateProfileUI();     // Update profile page elements (if on profile page)
            this.dispatchUserUpdate();  // Notify components (like navbar) of current user state
            this.dispatchTokenUpdate(); // Notify components (like navbar) of current token balance

            console.log('App Init: Initialization sequence completed successfully.');
            this.isInitialized = true; // Mark as initialized

            // Step 5: Check for cached provider (only if Web3Modal loaded)
            // This attempts to automatically reconnect if user previously connected
            if (this.web3Modal && this.web3Modal.cachedProvider) {
                console.log("App Init: Cached provider found by Web3Modal. Attempting auto-connect in background...");
                // Call connectWallet but don't wait for it (await) to avoid blocking page load
                // Catch potential errors during auto-connect so they don't crash the init sequence
                this.connectWallet().catch(err => {
                    console.warn("App Init: Auto-connect attempt failed:", err);
                    // Optionally clear cache if auto-connect fails persistently
                    // this.web3Modal.clearCachedProvider();
                    // this.handleDisconnect(false); // Silently reset state if needed
                });
            } else if (this.web3Modal) {
                 console.log("App Init: No cached provider found by Web3Modal.");
            } else {
                 console.log("App Init: Web3Modal failed to initialize, skipping cached provider check.");
            }

        } catch (error) {
             // Catch unexpected errors during the main init flow
             console.error("!!! App Init: CRITICAL ERROR DURING INITIALIZATION SEQUENCE !!!", error);
             // Show error to user
             const initErrorMessage = error.message?.includes("Web3Modal") ? error.message : "Critical error loading the application. Please refresh.";
             this.showNotification(initErrorMessage, "error", 6000); // Show longer duration
             this.isInitialized = false; // Mark init as failed
        }
    }

    // Connect Wallet using Web3Modal v1
    async connectWallet() {
        console.log("connectWallet (v1): Action initiated...");
        // Prevent multiple simultaneous connection attempts
        if (this._isConnecting) {
            console.log("connectWallet (v1): Connection attempt already in progress.");
            this.showNotification("Connecting... Please check wallet or wait.", "info");
            return false; // Exit if already connecting
        }
        // Ensure Web3Modal was successfully initialized before attempting connection
        if (!this.web3Modal) {
            console.error("connectWallet (v1): Web3Modal is not initialized! Cannot proceed.");
            this.showNotification("Wallet connection module failed to load. Please refresh.", "error");
            return false; // Exit if Web3Modal isn't ready
        }

        this._isConnecting = true; // Set guard flag to indicate connection process started
        let connectionError = null; // Variable to store any errors encountered
        let provider = null; // Variable for the raw provider instance from Web3Modal

        try {
            console.log("connectWallet (v1): Calling web3Modal.connect() to trigger modal...");
            // Inform user that the wallet modal/prompt is coming
            this.showNotification("Opening wallet connection... Please check your wallet app or browser extension.", "info", 7000); // Show for 7 seconds

            // --- Trigger Web3Modal ---
            // This is the core function call that shows the modal and handles connection flow
            provider = await this.web3Modal.connect();
            this.web3ModalProvider = provider; // Store the raw provider instance (e.g., WalletConnect or MetaMask)
            console.log("connectWallet (v1): web3Modal.connect() successful. Raw provider instance obtained.");

            // --- Subscribe to Provider Events ---
            // Important: Attach event listeners immediately after getting the provider
            this.subscribeProviderEvents(provider);

            // --- Wrap with Ethers.js ---
            console.log("connectWallet (v1): Wrapping raw provider with Ethers.js Web3Provider...");
            // Create an Ethers.js provider instance using the raw provider from Web3Modal
            this.provider = new ethers.providers.Web3Provider(provider);
            console.log("connectWallet (v1): Ethers.js provider created successfully.");

            // --- Get Account Information ---
            const signer = this.provider.getSigner(); // Get the signer object representing the connected account
            const walletAddress = await signer.getAddress(); // Retrieve the wallet address
            console.log("connectWallet (v1): Successfully retrieved wallet address:", walletAddress);
            if (!walletAddress) {
                // Defensive check in case getAddress fails unexpectedly
                throw new Error("Could not retrieve wallet address after connection.");
            }

            // --- Update Application State ---
            this.walletConnected = true; // Mark application as wallet-connected
            // Check if user was previously anonymous to potentially carry over balance (or reset)
            const existingBalance = (this.currentUser && this.currentUser.isAnonymous) ? this.currentUser.tokenBalance : 0;
            const welcomeBonus = 100; // Define the welcome bonus for connecting
            console.log("connectWallet (v1): Updating application state (currentUser, tokenBalance)...");
            this.currentUser = { // Create/update the global user state object
                walletAddress: walletAddress,
                isAnonymous: false, // Mark as not anonymous
                tokenBalance: existingBalance + welcomeBonus // Grant welcome bonus
            };
            this.tokenBalance = this.currentUser.tokenBalance; // Sync the instance variable
            // Persist the user state in local storage
            localStorage.setItem('safeVoiceUser', JSON.stringify(this.currentUser));
            console.log("connectWallet (v1): Application state updated successfully:", this.currentUser);

            // --- UI Feedback and Updates ---
            const shortAddress = `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`;
            this.showNotification(`Wallet ${shortAddress} connected successfully! +${welcomeBonus} tokens awarded.`, 'success');
            this.dispatchTokenUpdate(); // Notify UI components (e.g., navbar) of token balance change
            this.dispatchUserUpdate(); // Notify UI components (e.g., profile page, navbar) of user state change

            // --- Redirect if on Homepage ---
            if (document.getElementById('hero')) { // Check if the hero section exists (indicates index page)
                console.log("Connected successfully on index page, scheduling redirect to feed page...");
                // Redirect after a short delay to allow user to see success message
                setTimeout(() => { window.location.href = './feed.html'; }, 1500);
            } else {
                console.log("Connected on a page other than index (e.g., profile page), no redirect necessary.");
            }

            this._isConnecting = false; // Reset guard flag BEFORE returning success
            console.log("connectWallet (v1): Connection process completed successfully.");
            return true; // Indicate successful connection

        } catch (error) {
            // --- Error Handling ---
            console.error('connectWallet (v1): Connection process failed:', error);
            connectionError = error; // Store the encountered error
            let displayError = `Wallet connection failed: ${error.message || 'Unknown error. Please try again.'}`; // Default error message

            // Provide more specific feedback for common user actions or errors
            if (String(error).includes("Modal closed") || String(error.message).includes("User closed modal") || String(error).includes("User rejected") || error.code === 4001 /* Standard EIP-1193 reject */) {
                 displayError = 'Connection request cancelled.';
                 console.warn("connectWallet (v1): User cancelled or rejected the connection attempt.");
                 this.showNotification(displayError, 'warning'); // Use warning level for user cancellation
            } else if (String(error.message).includes("Provider not found") || String(error.message).includes("No provider found")) {
                displayError = 'No compatible wallet provider (like MetaMask) was detected in your browser.';
                console.warn("connectWallet (v1): Injected provider (e.g., MetaMask extension) likely missing.");
                this.showNotification(displayError, 'warning', 5000); // Show longer
            } else if (String(error.message).includes("Already processing eth_requestAccounts")) {
                 displayError = 'Connection request already pending. Please check your wallet.';
                 console.warn("connectWallet (v1): Request already pending.");
                 this.showNotification(displayError, 'info');
            }
             else {
                // Show a generic error message for other unexpected issues
                this.showNotification(displayError, 'error');
            }
            // Optional: Consider automatically disconnecting or clearing cache on certain errors
            // await this.handleDisconnect(false); // Disconnect silently if state is inconsistent

        } finally {
            // --- Cleanup ---
            this._isConnecting = false; // CRITICAL: Always reset the connection guard flag
            console.log("connectWallet (v1): Connection process finished (success or failure).");
            // Determine the final return value based on success
            // Return true only if the Ethers provider was successfully created and no critical error stopped the process
            return !!this.provider && !connectionError;
        }
    }

    // Subscribe to events from the connected provider (MetaMask or WalletConnect via Web3Modal)
    subscribeProviderEvents(provider) {
        // Ensure provider is valid and supports event listening (.on method)
        if (!provider?.on) {
            console.error("subscribeProviderEvents: Cannot attach listeners - invalid provider object passed.");
            return;
        }
        console.log("subscribeProviderEvents: Attaching listeners for 'accountsChanged', 'chainChanged', 'disconnect'...");

        // --- Define Bound Event Handlers ---
        // Binding ensures `this` refers to the SafeVoiceApp instance inside the handlers.
        // Define them once and store on the instance to allow correct removal later.

        // Handles account switching or disconnection via empty array
        this._handleAccountsChanged = this._handleAccountsChanged || ((accounts) => {
            console.log("Provider Event Received: 'accountsChanged'", accounts);
            // Check if accounts array is valid and contains at least one address
            if (accounts && accounts.length > 0) {
                 // Check if the user is currently connected via wallet and if the address has actually changed
                 // Compare case-insensitively as addresses might differ in casing
                 if (this.currentUser && !this.currentUser.isAnonymous && this.currentUser.walletAddress.toLowerCase() !== accounts[0].toLowerCase()) {
                     console.log("Account address has changed. Updating application state.");
                     this.currentUser.walletAddress = accounts[0]; // Update address in state
                     localStorage.setItem('safeVoiceUser', JSON.stringify(this.currentUser)); // Persist change
                     this.dispatchUserUpdate(); // Notify UI
                     this.showNotification("Wallet account switched successfully.", "info");
                 } else if (this.currentUser && !this.currentUser.isAnonymous) {
                      console.log("Account change event received, but address is the same or user not connected via wallet.");
                 }
             } else {
                 // An empty accounts array signifies disconnection, especially for injected providers
                 console.log("Received empty accounts array via 'accountsChanged' event, interpreting as disconnect.");
                 this.handleDisconnect(); // Trigger full disconnect process
             }
        }).bind(this);

        // Handles network/chain switching in the wallet
        this._handleChainChanged = this._handleChainChanged || ((chainId) => {
            console.log("Provider Event Received: 'chainChanged'", chainId);
            // Inform the user about the network change
            this.showNotification(`Wallet network changed to Chain ID: ${chainId}. SafeVoice currently supports Ethereum Mainnet (Chain ID: 1). Please switch back or refresh if issues occur.`, "warning", 6000); // Show longer
            // --- Robust Handling Strategy ---
            // For simplicity and safety in a basic setup, it's often best to disconnect
            // when the chain changes, forcing the user to reconnect on the correct network.
            // This avoids potential issues with contract interactions on unsupported chains.
            console.log("Chain changed, forcing disconnect for state consistency.");
            this.handleDisconnect();
            // Alternative: Check if chainId is supported, if not, show error and potentially disable actions.
            // const supportedChainId = 1; // Example: Ethereum Mainnet
            // if (parseInt(chainId, 16) !== supportedChainId) { // Chain IDs often hex
            //     this.showNotification(`Unsupported network (ID: ${chainId}). Please switch to Ethereum Mainnet.`, "error", 6000);
            //     // Disable sending transactions, etc.
            // } else {
            //     // If chain is supported, maybe just refresh data?
            //     // window.location.reload(); // Simple refresh
            // }
        }).bind(this);

        // Handles explicit disconnection events (more common with WalletConnect v1)
        this._handleDisconnectEvent = this._handleDisconnectEvent || ((error) => {
            // The error object might provide details, especially for WC v1 (e.g., code 1013 for rejection)
            console.log("Provider Event Received: 'disconnect'", error);
            // Avoid double-handling if disconnect was due to user rejection during connection
            // Check if we are currently in the connection process
            if (this._isConnecting && (error?.code === 1013 || String(error?.message).includes("rejected"))) {
                 console.log("Disconnect event received during connection, likely user rejection - connection handler will manage state.");
                 // Reset connect flag here just in case
                 this._isConnecting = false;
                 return; // Let the connectWallet error handler deal with UI/state
            }
            // For all other disconnect events, trigger the full disconnect handler
            console.log("Handling unexpected disconnect event.");
            this.handleDisconnect(); // Use the main disconnect logic
        }).bind(this);

        // --- Remove Old Listeners ---
        // Attempt to remove any previously attached listeners using the *same bound functions*
        // This prevents memory leaks and duplicate event triggers if connect happens multiple times
        if (provider.removeListener) {
            try {
                 provider.removeListener("accountsChanged", this._handleAccountsChanged);
                 provider.removeListener("chainChanged", this._handleChainChanged);
                 provider.removeListener("disconnect", this._handleDisconnectEvent);
                 console.log("subscribeProviderEvents: Successfully removed potential old listeners.");
            } catch(e) { console.warn("subscribeProviderEvents: Error occurred while removing old provider listeners:", e); }
        } else { console.warn("subscribeProviderEvents: Provider does not support removeListener method."); }

        // --- Attach New Listeners ---
        provider.on("accountsChanged", this._handleAccountsChanged);
        provider.on("chainChanged", this._handleChainChanged);
        provider.on("disconnect", this._handleDisconnectEvent);

        console.log("subscribeProviderEvents: Event listeners successfully attached.");
    }


    // Disconnect Wallet (adjusted for Web3Modal v1)
    async handleDisconnect(showNotification = true) {
        console.log("handleDisconnect (v1): Initiating disconnection process...");

        // --- Step 1: Clear Application State ---
        // Reset flags and user data immediately to reflect disconnected status internally
        this.currentUser = null;
        this.walletConnected = false;
        this.tokenBalance = 0;
        this.provider = null; // Clear the Ethers.js provider instance
        console.log("handleDisconnect (v1): Internal state variables cleared.");

        // --- Step 2: Attempt to Close/Disconnect Underlying Provider ---
        // Check if a raw provider instance exists from the last connection
        if (this.web3ModalProvider) {
            console.log("handleDisconnect (v1): Attempting to close/disconnect underlying provider...");
            // WalletConnect v1 provider typically uses a `close()` method
            if (typeof this.web3ModalProvider.close === 'function') {
                try {
                    await this.web3ModalProvider.close();
                    console.log("handleDisconnect (v1): Underlying WalletConnect v1 provider session closed.");
                } catch (e) {
                    console.error("handleDisconnect (v1): Error occurred while closing WalletConnect v1 provider:", e);
                }
            // Other providers (like MetaMask injected) might use `disconnect()` or handle it implicitly
            } else if (typeof this.web3ModalProvider.disconnect === 'function') {
                 try {
                    await this.web3ModalProvider.disconnect();
                    console.log("handleDisconnect (v1): Underlying provider disconnect() method called.");
                 } catch (e) {
                     console.error("handleDisconnect (v1): Error occurred during provider disconnect() call:", e);
                 }
            } else {
                 console.log("handleDisconnect (v1): Underlying provider has no standard close/disconnect method. State cleared.");
            }
            // Clear the reference to the raw provider instance regardless of success/failure
            this.web3ModalProvider = null;
        } else {
             console.log("handleDisconnect (v1): No active underlying provider instance found to close/disconnect.");
        }

        // --- Step 3: Clear Web3Modal Cache ---
        // This prevents Web3Modal from trying to auto-reconnect with the disconnected provider on next load
        if (this.web3Modal && typeof this.web3Modal.clearCachedProvider === 'function') {
            this.web3Modal.clearCachedProvider();
            console.log("handleDisconnect (v1): Web3Modal provider cache cleared.");
        } else {
            console.warn("handleDisconnect (v1): Web3Modal instance not found or doesn't support clearCachedProvider.");
        }

        // --- Step 4: Clear Local Storage ---
        // Remove the persisted user session data
        localStorage.removeItem('safeVoiceUser');
        console.log("handleDisconnect (v1): User session removed from localStorage.");

        // --- Step 5: UI Feedback and Updates ---
        // Only show notification if requested (e.g., suppress during chain change)
        if (showNotification) {
            this.showNotification("Wallet has been disconnected successfully.", "info");
        }
        // Dispatch events to update all relevant UI components (navbar, profile page, etc.)
        this.dispatchUserUpdate();  // Reflects currentUser = null
        this.dispatchTokenUpdate(); // Reflects tokenBalance = 0

        console.log("handleDisconnect (v1): Disconnection process complete. UI updated.");

        // Optional: Redirect if needed, e.g., if user was on a protected page
        // Consider the user experience before forcing a redirect.
        // if (!document.getElementById('hero')) { // Example: Redirect if not on home page
        //     console.log("Redirecting to home page after disconnect...");
        //     setTimeout(() => { window.location.href = './index.html'; }, 1000);
        // }
    }


    // --- Other Methods (No Changes Needed Here - Retained from previous versions) ---

    // Loads user state from localStorage
    loadUserState() {
        console.log("loadUserState: Loading user session from localStorage...");
        try {
            const savedUserData = localStorage.getItem('safeVoiceUser');
            if (savedUserData) {
                this.currentUser = JSON.parse(savedUserData);
                // Basic validation of the loaded data
                if (typeof this.currentUser !== 'object' || this.currentUser === null) {
                    console.error("loadUserState: Invalid data structure found in localStorage.", this.currentUser);
                    throw new Error("Parsed user data is not a valid object.");
                }
                // Update app state based on loaded data
                this.walletConnected = !!this.currentUser.walletAddress; // True if walletAddress exists
                this.tokenBalance = Number(this.currentUser.tokenBalance) || 0; // Ensure tokenBalance is a number, default 0
                console.log('loadUserState: User session loaded successfully:', this.currentUser);
            } else {
                // No saved data found
                console.log('loadUserState: No saved user session found.');
                this.currentUser = null;
                this.walletConnected = false;
                this.tokenBalance = 0;
            }
        } catch (error) {
            // Handle errors during JSON parsing or validation
            console.error('loadUserState: Error loading or parsing user state:', error);
            localStorage.removeItem('safeVoiceUser'); // Clear potentially corrupted data
            // Reset to default state
            this.currentUser = null;
            this.walletConnected = false;
            this.tokenBalance = 0;
        }
    }

    // Sets up event listeners for buttons and global events
    setupEventListeners() {
        console.log("setupEventListeners: Attaching event listeners...");

        // Use event delegation on the document body for reaction buttons
        document.body.addEventListener('click', (event) => {
            const reactionBtn = event.target.closest('.reaction-btn');
            if (reactionBtn) {
                console.log("Reaction button click detected via delegation.");
                this.handleReaction(reactionBtn);
            }
        });

        // Get references to specific buttons by their unique IDs
        const connectBtnIndex = document.getElementById('connectWalletBtnIndex');
        const anonymousBtnIndex = document.getElementById('anonymousModeBtnIndex');
        const connectBtnProfile = document.getElementById('connectWalletBtnProfile');

        // Attach listeners if the buttons exist on the current page
        if (connectBtnIndex) {
            connectBtnIndex.addEventListener('click', () => {
                console.log("Index page 'Connect Wallet' button clicked.");
                this.connectWallet(); // Call the connect function
            });
            console.log("Listener attached successfully: #connectWalletBtnIndex.");
        } else if (document.getElementById('hero')) {
             console.warn("setupEventListeners: Button #connectWalletBtnIndex not found on index page! Check ID spelling.");
        }

        if (anonymousBtnIndex) {
            anonymousBtnIndex.addEventListener('click', () => {
                console.log("Index page 'Enter Anonymously' button clicked.");
                if (this.enterAnonymousMode()) { // Enter anonymous mode
                    window.location.href = './feed.html'; // Redirect on success
                }
            });
            console.log("Listener attached successfully: #anonymousModeBtnIndex.");
        } else if (document.getElementById('hero')) {
            console.warn("setupEventListeners: Button #anonymousModeBtnIndex not found on index page! Check ID spelling.");
        }

        if (connectBtnProfile) {
            connectBtnProfile.addEventListener('click', () => {
                console.log("Profile page 'Connect Wallet' button clicked.");
                this.connectWallet(); // Call the connect function
            });
            console.log("Listener attached successfully: #connectWalletBtnProfile.");
        } else if (document.getElementById('profileUsername')) { // Check if we are likely on the profile page
            console.warn("setupEventListeners: Button #connectWalletBtnProfile not found on profile page! Check ID spelling.");
        }

        // Listen for custom events dispatched when user state or token balance changes
        // Use .bind(this) to ensure `updateProfileUI` runs with the correct `this` context
        window.addEventListener('safeVoiceUserUpdate', this.updateProfileUI.bind(this));
        console.log("Listener attached: 'safeVoiceUserUpdate' will trigger profile UI update.");
        window.addEventListener('safeVoiceTokenUpdate', this.updateProfileUI.bind(this));
        console.log("Listener attached: 'safeVoiceTokenUpdate' will trigger profile UI update.");

        // Render Feather icons after attaching listeners (in case UI updates added icons)
        try {
            if (typeof feather !== 'undefined') {
                 feather.replace(); // Render all feather icons
                 console.log("Feather.replace() called successfully at the end of setupEventListeners.");
            } else {
                 console.error("setupEventListeners: Feather icons library (feather) not available!");
            }
        } catch(e) { console.error("setupEventListeners: Error running feather.replace():", e); }

        this.initTooltips(); // Initialize tooltips (if implemented)
        console.log("setupEventListeners: Event listener setup complete.");
    }

    // Updates the UI elements on the profile page based on current state
    updateProfileUI() {
        // Find the username element; if it doesn't exist, we're not on the profile page.
        const usernameEl = document.getElementById('profileUsername');
        if (!usernameEl) {
            // console.log("updateProfileUI: Not on profile page (usernameEl not found). Skipping update.");
            return; // Exit silently
        }

        console.log('updateProfileUI: Updating profile page elements...');
        // Get references to all necessary elements, checking for their existence
        const walletEl = document.getElementById('profileWallet');
        const tokenEl = document.getElementById('profileTokenBalance');
        const connectBtn = document.getElementById('connectWalletBtnProfile');
        const postsContainer = document.getElementById('myPostsContainer');
        const totalPostsEl = document.getElementById('profileTotalPosts');
        const reactionsGivenEl = document.getElementById('profileReactionsGiven');
        const postsPlaceholder = document.getElementById('postsPlaceholder'); // The placeholder <p> or <div>

        // If any critical element is missing, log an error and display an error state
        if (!walletEl || !tokenEl || !connectBtn || !postsContainer || !totalPostsEl || !reactionsGivenEl || !postsPlaceholder) {
             console.error("updateProfileUI: CRITICAL - One or more required profile UI elements missing! Check IDs: profileWallet, profileTokenBalance, connectWalletBtnProfile, myPostsContainer, profileTotalPosts, profileReactionsGiven, postsPlaceholder.");
             if (usernameEl) usernameEl.textContent = "Profile Display Error";
             return; // Stop the update
        }

        try {
            // Logic based on whether a user session exists (`this.currentUser`)
            if (this.currentUser) {
                // Always update token balance if user exists
                tokenEl.textContent = this.tokenBalance?.toLocaleString() ?? '0';

                if (this.currentUser.isAnonymous) {
                    // --- ANONYMOUS USER ---
                    usernameEl.textContent = this.currentUser.anonymousId || 'Anonymous User'; // Display generated ID
                    walletEl.textContent = 'Anonymous Mode'; // Indicate mode
                    connectBtn.textContent = 'Connect Wallet'; // Button prompts connection
                    connectBtn.style.display = 'inline-block'; // Make button visible
                    postsPlaceholder.textContent = 'Connect your wallet to view your posts (feature coming soon).'; // Update placeholder text
                    postsContainer.innerHTML = ''; // Clear previous content (like loading indicator)
                    if (!postsContainer.contains(postsPlaceholder)) postsContainer.appendChild(postsPlaceholder); // Ensure placeholder is shown

                } else if (this.currentUser.walletAddress) {
                    // --- WALLET CONNECTED USER ---
                    usernameEl.textContent = 'Wallet Connected'; // Indicate connection
                    // Display shortened address
                    const shortAddress = `${this.currentUser.walletAddress.substring(0, 6)}...${this.currentUser.walletAddress.substring(this.currentUser.walletAddress.length - 4)}`;
                    walletEl.textContent = shortAddress;
                    connectBtn.style.display = 'none'; // Hide connect button
                    // Update placeholder to show loading state (until posts are implemented)
                    postsPlaceholder.innerHTML = `<i data-feather="loader" class="w-8 h-8 mx-auto mb-2 animate-spin"></i><p>Loading your posts...</p><p class="text-sm">(Feature coming soon with Supabase)</p>`;
                    postsContainer.innerHTML = ''; // Clear previous content
                    if (!postsContainer.contains(postsPlaceholder)) postsContainer.appendChild(postsPlaceholder); // Ensure placeholder is shown

                } else {
                    // Should not happen if currentUser exists, but handle defensively
                    console.warn("updateProfileUI: currentUser exists but has neither anonymousId nor walletAddress.");
                    throw new Error("Invalid application state: currentUser structure incorrect.");
                }
            } else {
                // --- NO USER SESSION ---
                usernameEl.textContent = 'Anonymous User'; // Default display
                walletEl.textContent = 'Wallet not connected'; // Indicate disconnected state
                tokenEl.textContent = '0'; // Show zero tokens
                connectBtn.textContent = 'Connect Wallet'; // Button prompts connection
                connectBtn.style.display = 'inline-block'; // Make button visible
                postsPlaceholder.textContent = 'Connect your wallet or enter anonymously to get started.'; // Initial prompt
                postsContainer.innerHTML = ''; // Clear previous content
                if (!postsContainer.contains(postsPlaceholder)) postsContainer.appendChild(postsPlaceholder); // Ensure placeholder is shown
            }

            // Update placeholder stats (replace with actual data later)
            totalPostsEl.textContent = '0';
            reactionsGivenEl.textContent = '0';

            // Re-render Feather icons AFTER potentially updating innerHTML (for loader icon)
            if (typeof feather !== 'undefined') {
                feather.replace();
            }

             console.log("updateProfileUI: Update completed successfully.");

        } catch (error) {
             // Catch errors during the UI update logic
             console.error("updateProfileUI: Error during update:", error);
             // Display error state on the profile page
             if (usernameEl) usernameEl.textContent = "Profile Error";
             if (walletEl) walletEl.textContent = "Could not load data";
             if (tokenEl) tokenEl.textContent = "-";
             if (postsContainer) postsContainer.innerHTML = '<p class="text-center text-red-500 font-semibold">Error displaying profile details. Please try refreshing.</p>';
        }
    }

    // Handles reaction button clicks
    async handleReaction(button) {
        console.log("handleReaction: Processing reaction click...");
        const postId = button.dataset.postId;
        const reactionType = button.dataset.reaction;

        // Validate necessary data attributes
        if (!postId || !reactionType) {
            console.warn("handleReaction: Button missing 'data-post-id' or 'data-reaction'.", button);
            return; // Stop if data is missing
        }

        // Disable button temporarily to prevent multiple clicks
        button.classList.add('opacity-50', 'pointer-events-none');
        console.log(`handleReaction: Reacting '${reactionType}' to post '${postId}'.`);

        try {
            // Simulate network delay for the reaction action
            await this.simulateAPICall(100, 300); // Short delay

            // Optimistically update the reaction count in the UI
            const countElement = button.querySelector('.reaction-count');
            if (countElement) {
                const currentCount = parseInt(countElement.textContent, 10) || 0; // Get current count, default 0
                countElement.textContent = currentCount + 1; // Increment visually
                // Add visual feedback (briefly scale up)
                button.style.transition = 'transform 0.1s ease-out';
                button.style.transform = 'scale(1.15)';
                setTimeout(() => { button.style.transform = 'scale(1)'; }, 150); // Reset scale after 150ms
            } else {
                console.warn("handleReaction: Could not find '.reaction-count' element inside the button.");
            }

            // Award simulated tokens if a user session exists
            if (this.currentUser) {
                 this.awardTokens(2, 'reaction_given'); // Award 2 tokens for giving a reaction
            } else {
                 // Optionally notify user they need to connect/enter to earn
                 // this.showNotification("Connect or enter anonymously to earn tokens!", "info", 2500);
                 console.log("handleReaction: Reaction added visually, but no user session to award tokens.");
            }
        } catch (error) {
            // Handle errors (e.g., if the simulated API call failed)
            console.error('handleReaction: Error processing reaction:', error);
            this.showNotification('Failed to add reaction. Please try again later.', 'error');
            // IMPORTANT: In a real application, you would need to revert the optimistic UI update here
            // e.g., decrement the countElement.textContent if the backend call failed.
        } finally {
            // Re-enable the button after a short delay, allowing visual feedback to complete
            setTimeout(() => {
                button.classList.remove('opacity-50', 'pointer-events-none');
            }, 400); // Delay helps prevent accidental rapid clicks
        }
    }

    // Enters anonymous mode if not already connected
    enterAnonymousMode() {
        console.log("enterAnonymousMode: Attempting to enter anonymous mode...");
        // Prevent entering anonymous mode if a wallet is already connected
        if (this.walletConnected) {
             console.log("enterAnonymousMode: Blocked - Wallet is already connected.");
             this.showNotification("You are already connected with your wallet.", "info");
             // Return true signifies the action was acknowledged (even if no state change), allows redirects
             return true;
        }

        const anonymousBonus = 50; // Define token bonus for entering anonymously

        // Proceed only if there's no current user or the user isn't already anonymous
        if (!this.currentUser || !this.currentUser.isAnonymous) {
             console.log("enterAnonymousMode: Setting new anonymous user state...");
             // Create the anonymous user object
             this.currentUser = {
                 anonymousId: this.generateAnonymousId(), // Generate a unique ID
                 isAnonymous: true, // Mark as anonymous
                 tokenBalance: anonymousBonus // Grant bonus
             };
             // Save state to localStorage
             localStorage.setItem('safeVoiceUser', JSON.stringify(this.currentUser));
             this.tokenBalance = this.currentUser.tokenBalance; // Sync instance variable
             // Notify user and update UI
             this.showNotification(`Entered anonymous mode successfully! +${anonymousBonus} tokens granted.`, 'info');
             this.dispatchTokenUpdate(); // Update token displays
             this.dispatchUserUpdate(); // Update user-related UI
             console.log("enterAnonymousMode: Anonymous state set and saved.");
        } else {
             // User is already anonymous, no state change needed
             console.log("enterAnonymousMode: Already in anonymous mode.");
             // Ensure instance balance is correct and maybe refresh UI just in case
             this.tokenBalance = this.currentUser.tokenBalance;
             this.dispatchTokenUpdate();
        }
        console.log("enterAnonymousMode: Process completed.");
        return true; // Indicate success (allows calling function to proceed, e.g., redirect)
     }

    // Dispatches a custom event indicating token balance has changed
    dispatchTokenUpdate() {
        console.log("Dispatching 'safeVoiceTokenUpdate' event with balance:", this.tokenBalance);
        window.dispatchEvent(new CustomEvent('safeVoiceTokenUpdate', {
            detail: { newBalance: this.tokenBalance }
        }));
    }
    // Dispatches a custom event indicating user state has changed
    dispatchUserUpdate() {
        console.log("Dispatching 'safeVoiceUserUpdate' event with user:", this.currentUser);
        window.dispatchEvent(new CustomEvent('safeVoiceUserUpdate', {
            detail: { currentUser: this.currentUser }
        }));
    }

    // Generates a unique anonymous ID string
    generateAnonymousId() {
        // Expanded lists for more variety
        const adjectives = ['Brave', 'Calm', 'Wise', 'Kind', 'Strong', 'Gentle', 'Bright', 'True', 'Quiet', 'Clear', 'Silent', 'Swift', 'Eager', 'Bold', 'Keen', 'Loyal'];
        const nouns = ['Owl', 'Phoenix', 'Lion', 'Dolphin', 'Eagle', 'Wolf', 'Tiger', 'Bear', 'River', 'Star', 'Flame', 'Stone', 'Hawk', 'Fox', 'Sky', 'Moon'];
        const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
        // Generate a 3-digit number (100-999)
        const number = Math.floor(Math.random() * 900) + 100;
        return `${randomAdj}${randomNoun}${number}`;
     }

    // Awards simulated tokens and updates state/UI
    awardTokens(amount, reason) {
        // Ensure there is an active user session before awarding tokens
        if (!this.currentUser) {
             console.warn("awardTokens: Cannot award tokens - No current user session found.");
             // Optionally inform the user they need to be "logged in" (anonymously or via wallet)
             // this.showNotification("Connect wallet or enter anonymously to earn tokens for this action!", "info", 3000);
             return; // Stop execution if no user
        }
        try {
            // Safely get current balance and amount to add, ensuring they are numbers
            const currentBalance = Number(this.currentUser.tokenBalance) || 0;
            const amountToAdd = Number(amount) || 0;
            // Validate the amount to add (must be positive)
            if (amountToAdd <= 0) {
                 console.log(`awardTokens: Attempted to award zero or negative tokens (${amountToAdd}). Ignoring.`);
                 return; // Do nothing if amount is not positive
            }

            // Update token balance in the user object and the instance variable
            this.currentUser.tokenBalance = currentBalance + amountToAdd;
            this.tokenBalance = this.currentUser.tokenBalance;

            // Persist the updated user state to localStorage
            localStorage.setItem('safeVoiceUser', JSON.stringify(this.currentUser));
            // Notify other parts of the application about the updated balance
            this.dispatchTokenUpdate();

            console.log(`awardTokens: Successfully awarded ${amountToAdd} tokens for reason: '${reason}'. New balance: ${this.tokenBalance}`);
            // Show a success notification to the user
            // Format reason string for better readability
            const formattedReason = reason.replace(/_/g, ' '); // Replace underscores with spaces
            this.showNotification(`+${amountToAdd} tokens awarded: ${formattedReason}!`, 'success');
        } catch (error) {
             // Catch potential errors during state update or saving
             console.error("awardTokens: An error occurred while awarding tokens:", error);
             // Inform the user about the error
             this.showNotification("An error occurred while updating your token balance. Please refresh.", "error");
        }
    }

    // Simulates a network request delay with configurable min/max duration
    simulateAPICall(minDuration = 100, maxDuration = 400) {
        const duration = Math.random() * (maxDuration - minDuration) + minDuration;
        return new Promise(resolve => setTimeout(resolve, duration));
     }

    // Displays temporary notifications (toasts) with stacking
    showNotification(message, type = 'info', duration = 3500) {
        try {
            const notificationId = `notification-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
            const notification = document.createElement('div');
            notification.id = notificationId;

            // Base classes for styling and initial state (off-screen right, invisible)
            let baseClasses = 'fixed top-20 right-4 p-4 rounded-lg text-white z-[5000] shadow-lg transition-all duration-300 ease-in-out opacity-0 max-w-sm transform translate-x-full';
            // Determine background color based on type
            let typeClasses = '';
            switch(type) {
                case 'success': typeClasses = 'bg-green-500'; break;
                case 'error': typeClasses = 'bg-red-500'; break;
                case 'warning': typeClasses = 'bg-yellow-500 text-black'; break; // Yellow needs black text
                case 'info':
                default: typeClasses = 'bg-blue-500'; break;
            }
            notification.className = `${baseClasses} ${typeClasses}`;
            notification.textContent = message;
            document.body.appendChild(notification); // Add to DOM

            // --- Animate In ---
            // Use requestAnimationFrame to ensure styles apply correctly for transition
            requestAnimationFrame(() => {
                // Apply final state styles (on-screen, visible)
                notification.classList.remove('opacity-0', 'translate-x-full');
                 notification.classList.add('opacity-100', 'translate-x-0');

                 // --- Stacking Logic ---
                 // Find existing notifications (excluding the new one)
                 const existingNotifications = Array.from(document.querySelectorAll('[id^=notification-]:not(#'+notificationId+')')).reverse(); // Get others, newest first
                 // Apply vertical translation to stack them below the new one
                 existingNotifications.forEach((el, index) => {
                      const verticalOffset = (index + 1) * (el.offsetHeight + 10); // Calculate offset based on height + margin (adjust 10px)
                      el.style.transform = `translateY(${verticalOffset}px) translateX(0px)`;
                      el.style.zIndex = `${5000 - (index + 1)}`; // Adjust z-index to stack correctly
                 });
            });

            // --- Auto-Dismiss Timer ---
            setTimeout(() => {
                const elToRemove = document.getElementById(notificationId);
                if (elToRemove) {
                    // Animate out (back off-screen right, fade out)
                    elToRemove.classList.remove('opacity-100', 'translate-x-0');
                    elToRemove.classList.add('opacity-0', 'translate-x-full');
                    // Remove from DOM after animation completes
                    setTimeout(() => {
                         elToRemove.remove();
                         // Optional: Re-adjust stacking of remaining notifications after one is removed
                         const remaining = Array.from(document.querySelectorAll('[id^=notification-]')).reverse();
                         remaining.forEach((el, index) => {
                             const verticalOffset = (index) * (el.offsetHeight + 10); // Recalculate offset
                             el.style.transform = `translateY(${verticalOffset}px) translateX(0px)`;
                             el.style.zIndex = `${5000 - index}`;
                         });
                    }, 300); // Must match transition duration
                }
            }, duration); // Use the specified duration
        } catch (e) {
            console.error("showNotification: Error displaying notification:", e);
        }
    }

    // Placeholder for tooltip initialization logic
    initTooltips() { /* console.log("Init tooltips (placeholder)"); */ }
    // Placeholder for showing a tooltip
    showTooltip(event) { /* Placeholder */ }
    // Placeholder for hiding a tooltip
    hideTooltip(event) { /* Placeholder */ }

} // End SafeVoiceApp Class


// --- Global App Initialization ---
// Create the single instance of the SafeVoiceApp and attach it to the window object
// The constructor handles attaching the main init() call to the appropriate event (DOMContentLoaded or setTimeout)
if (!window.safeVoiceApp) {
    window.safeVoiceApp = new SafeVoiceApp();
    console.log("Global: SafeVoiceApp instance created and scheduled for initialization.");
} else {
    // This should generally not happen if the script is included only once
    console.warn("Global: SafeVoiceApp instance seems to already exist. This might indicate duplicate script loading.");
    // Avoid re-initializing to prevent potential issues
}
// --- END ---


// --- Utility functions (SafeVoiceUtils) ---
// Define utility functions in a separate object for organization
const SafeVoiceUtils = {
    // Formats numbers into K (thousands) or M (millions) if large, otherwise uses locale string.
    formatNumber: (num) => {
        const number = Number(num); // Ensure input is treated as a number
        if (isNaN(number)) return '0'; // Return '0' for invalid inputs
        if (number >= 1e6) return (number / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'; // Format millions (e.g., 1.2M)
        if (number >= 1e3) return (number / 1e3).toFixed(1).replace(/\.0$/, '') + 'K'; // Format thousands (e.g., 3.5K)
        return number.toLocaleString(); // Use browser's locale formatting for smaller numbers (e.g., 1,234)
    },

    // Formats a date string (or Date object) into a relative time string or a formatted date.
    formatDate: (dateInput) => {
        try {
            const date = new Date(dateInput); // Attempt to create a Date object
            if (isNaN(date.getTime())) return 'Invalid date'; // Check if the date is valid

            const now = new Date();
            const diffMs = now.getTime() - date.getTime(); // Difference in milliseconds
            const diffSeconds = Math.round(diffMs / 1000);
            const diffMins = Math.round(diffSeconds / 60);
            const diffHours = Math.round(diffMins / 60);
            const diffDays = Math.round(diffHours / 24);

            // Return relative time strings for recent dates
            if (diffSeconds < 5) return 'Just now';
            if (diffMins < 1) return `${diffSeconds}s ago`;
            if (diffHours < 1) return `${diffMins}m ago`;
            if (diffDays < 1) return `${diffHours}h ago`;
            if (diffDays < 7) return `${diffDays}d ago`;

            // For dates older than a week, return a formatted date string (e.g., "Oct 25, 2025")
            return date.toLocaleDateString(undefined, { // Use browser's locale settings
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            console.error("SafeVoiceUtils.formatDate Error:", dateInput, error);
            return 'Date error'; // Return error string on failure
        }
    },

    // Debounce function: Prevents a function from being called too frequently.
    // Useful for handling events like search input or window resize.
    debounce: (func, wait) => {
        let timeoutId; // Stores the timeout ID
        // Return the debounced function
        return function executedFunction(...args) {
            const context = this; // Preserve the original context (`this`)
            // Function to run after the wait time has passed without new calls
            const later = () => {
                timeoutId = null; // Clear the timeout ID
                func.apply(context, args); // Call the original function
            };
            clearTimeout(timeoutId); // Clear any existing timeout
            // Set a new timeout to execute the function after `wait` milliseconds
            timeoutId = setTimeout(later, wait);
        };
    },

    // Simulates PGP encryption (for placeholder/demo purposes ONLY - NOT secure)
    simulatePGPEncryption: async (content) => {
        // NOTE: Replace this with a real client-side encryption library (e.g., OpenPGP.js) for actual security.
        return new Promise(resolve => {
            setTimeout(() => { // Simulate async operation
                try {
                    const stringContent = String(content || ''); // Ensure content is a string
                    // Basic simulation using base64 (visible indicator, no real encryption)
                    const encryptedPlaceholder = `🔒 PGP_ENCRYPTED_${btoa(stringContent).substring(0, 20)}...[SIMULATED]`;
                    resolve(encryptedPlaceholder);
                } catch (error) {
                    console.error("SafeVoiceUtils.simulatePGPEncryption Error:", error);
                    resolve(`🔒 PGP_ERROR...`); // Return error indicator
                }
            }, 300); // Simulate processing time
        });
    },

    // Calculates simulated token rewards based on action type (for front-end display/logic)
    calculateTokenReward: (action, metadata = {}) => {
        // Define base reward amounts for various actions
        const baseRewards = {
            post_created: 10,       // Creating a post
            reaction_given: 2,        // Giving a reaction
            reaction_received: 2,   // Receiving a reaction (requires backend logic)
            comment_posted: 5,      // Posting a comment (requires comment system)
            crisis_support: 50,     // Special reward, needs verification mechanism
            content_moderated: 15,  // For moderators (requires role system)
            first_post: 25,         // Bonus for user's first post (requires tracking)
            first_reaction: 10,     // Bonus for user's first reaction (requires tracking)
            wallet_connected: 100,  // One-time bonus for connecting wallet
            anonymous_entry: 50     // One-time bonus for entering anonymously
            // Add more actions as needed...
        };
        // Return the defined reward, or 0 if the action is not recognized
        return baseRewards[action] || 0;
    }
};
// Attach the utility object to the window for global accessibility
window.SafeVoiceUtils = SafeVoiceUtils;
console.log("Global: SafeVoiceUtils attached to window.");
// --- END UTILS ---

