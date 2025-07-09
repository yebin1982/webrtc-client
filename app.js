/**
 * WebRTC Push Client
 * 
 * This script handles all the logic for the WebRTC client, including:
 * - Accessing the camera (getUserMedia)
 * - Managing settings with localStorage
 * - Handling the user interface (modal, buttons, status updates)
 * - Establishing a WebRTC connection (RTCPeerConnection)
 * - Communicating with a signaling server to push the stream
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // --- STATE MANAGEMENT ---
    let localStream = null;
    let peerConnection = null;
    let isStreaming = false;

    // --- DOM ELEMENTS ---
    const videoElement = document.getElementById('localVideo');
    const statusOverlay = document.getElementById('status-overlay');
    const settingsBtn = document.getElementById('settings-btn');
    const streamBtn = document.getElementById('stream-btn');
    const switchCameraBtn = document.getElementById('switch-camera-btn');
    const settingsModal = document.getElementById('settings-modal');
    const settingsForm = document.getElementById('settings-form');
    const saveBtn = document.getElementById('save-btn');
    const cancelBtn = document.getElementById('cancel-btn');

    // --- MODULES ---

    /**
     * UI Module
     * Handles all interactions with the DOM.
     */
    const UI = {
        showStatus(message) {
            statusOverlay.textContent = message;
            console.log(`Status: ${message}`);
        },
        showSettingsModal() {
            settingsModal.classList.remove('hidden');
        },
        hideSettingsModal() {
            settingsModal.classList.add('hidden');
        },
        updateStreamButton(streaming) {
            isStreaming = streaming;
            streamBtn.textContent = streaming ? '⏹️ Stop Stream' : '▶️ Start Stream';
            streamBtn.style.backgroundColor = streaming ? '#dc3545' : '#28a745';
        },
        setStreamButtonEnabled(enabled) {
            streamBtn.disabled = !enabled;
            streamBtn.style.opacity = enabled ? '1' : '0.5';
        },
        loadSettingsToForm(settings) {
            document.getElementById('server-url').value = settings.serverUrl;
            document.getElementById('username').value = settings.username;
            document.getElementById('password').value = settings.password;
            document.getElementById('resolution').value = settings.resolution;
            document.getElementById('framerate').value = settings.framerate;
            document.getElementById('camera').value = settings.camera;
        }
    };

    /**
     * Config Module
     * Manages application settings using localStorage.
     */
    const Config = {
        KEY: 'webrtc_settings',
        DEFAULT_SETTINGS: {
            serverUrl: '',
            username: '',
            password: '',
            resolution: '1280x720',
            framerate: '30',
            camera: 'user' // 'user' for front, 'environment' for rear
        },
        save(settings) {
            try {
                localStorage.setItem(this.KEY, JSON.stringify(settings));
                UI.showStatus('Settings saved.');
            } catch (e) {
                console.error('Failed to save settings to localStorage', e);
                UI.showStatus('Error: Could not save settings.');
            }
        },
        load() {
            try {
                const savedSettings = localStorage.getItem(this.KEY);
                return savedSettings ? JSON.parse(savedSettings) : this.DEFAULT_SETTINGS;
            } catch (e) {
                console.error('Failed to load settings from localStorage', e);
                UI.showStatus('Error: Could not load settings.');
                return this.DEFAULT_SETTINGS;
            }
        }
    };

    /**
     * WebRTC Module
     * Handles camera access and the WebRTC peer connection.
     */
    const WebRTC = {
        async getMedia(constraints) {
            try {
                // Stop any existing tracks before getting a new one
                if (localStream) {
                    localStream.getTracks().forEach(track => track.stop());
                }
                localStream = await navigator.mediaDevices.getUserMedia(constraints);
                videoElement.srcObject = localStream;
                videoElement.play(); // Explicitly play video for some browsers
                UI.showStatus('Camera ready.');
                UI.setStreamButtonEnabled(true); // Enable stream button
            } catch (error) {
                console.error('Error accessing media devices.', error);
                UI.showStatus(`Error: ${error.name}`);
                UI.setStreamButtonEnabled(false); // Disable stream button on error
                throw error;
            }
        },
        async startStream() {
            if (!localStream || !localStream.active) {
                UI.showStatus('Error: Camera not ready.');
                // Attempt to re-initialize the camera
                initializeApp();
                return;
            }
            if (!Config.load().serverUrl) {
                UI.showStatus('Error: Server URL not set.');
                alert('Please set the Server URL in Settings before starting the stream.');
                return;
            }

            UI.showStatus('Connecting...');
            
            // 1. Create RTCPeerConnection
            // This is the core of the WebRTC connection.
            peerConnection = new RTCPeerConnection();

            // 2. Add local media tracks to the connection
            // This tells the peer connection what media to send.
            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
            });

            // Handle ICE candidates - needed for network traversal
            peerConnection.onicecandidate = event => {
                if (event.candidate) {
                    console.log('New ICE candidate:', event.candidate);
                }
            };
            
            // Monitor connection state
            peerConnection.onconnectionstatechange = () => {
                const state = peerConnection.connectionState;
                UI.showStatus(`Connection: ${state}`);
                if (state === 'connected') {
                    UI.updateStreamButton(true);
                } else if (state === 'failed' || state === 'disconnected' || state === 'closed') {
                    WebRTC.stopStream(); // Correctly call stopStream
                }
            };

            try {
                // 3. Create an SDP Offer
                // The offer describes the media we want to send.
                const offer = await peerConnection.createOffer();

                // 4. Set the local description
                // We tell our peer connection about the offer we just created.
                await peerConnection.setLocalDescription(offer);

                // 5. Send the offer to the signaling server
                const answer = await Signaling.sendOffer(offer);

                // 6. Set the remote description with the server's answer
                // This completes the connection setup.
                await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));

            } catch (error) {
                console.error('WebRTC stream setup failed:', error);
                UI.showStatus('Error: Connection failed.');
                this.stopStream();
            }
        },
        stopStream() {
            if (peerConnection) {
                peerConnection.close();
                peerConnection = null;
            }
            UI.updateStreamButton(false);
            UI.showStatus('Stream stopped.');
        }
    };

    /**
     * Signaling Module
     * Communicates with the signaling server.
     */
    const Signaling = {
        async sendOffer(offer) {
            const { serverUrl, username, password } = Config.load();
            UI.showStatus('Sending offer...');
            try {
                const response = await fetch(serverUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/sdp',
                        // Optional: Add basic auth if username/password are provided
                        ...(username && password && {
                            'Authorization': 'Basic ' + btoa(`${username}:${password}`)
                        })
                    },
                    body: offer.sdp
                });

                if (!response.ok) {
                    throw new Error(`Signaling server returned ${response.status}`);
                }

                const answerSdp = await response.text();
                UI.showStatus('Received answer.');
                return { type: 'answer', sdp: answerSdp };

            } catch (error) {
                console.error('Signaling error:', error);
                UI.showStatus('Error: Signaling failed.');
                throw error;
            }
        }
    };

    // --- EVENT LISTENERS ---

    settingsBtn.addEventListener('click', () => {
        UI.loadSettingsToForm(Config.load());
        UI.showSettingsModal();
    });

    cancelBtn.addEventListener('click', UI.hideSettingsModal);

    settingsForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const settings = {
            serverUrl: document.getElementById('server-url').value,
            username: document.getElementById('username').value,
            password: document.getElementById('password').value,
            resolution: document.getElementById('resolution').value,
            framerate: document.getElementById('framerate').value,
            camera: document.getElementById('camera').value
        };
        Config.save(settings);
        UI.hideSettingsModal();
        // Re-initialize camera with new settings
        initializeApp();
    });

    streamBtn.addEventListener('click', () => {
        if (isStreaming) {
            WebRTC.stopStream();
        } else {
            WebRTC.startStream();
        }
    });

    switchCameraBtn.addEventListener('click', () => {
        const currentSettings = Config.load();
        currentSettings.camera = currentSettings.camera === 'user' ? 'environment' : 'user';
        Config.save(currentSettings);
        UI.loadSettingsToForm(currentSettings);
        initializeApp(); // Re-initialize with the new camera
    });

    // --- INITIALIZATION ---

    async function initializeApp() {
        UI.showStatus('Initializing...');
        UI.setStreamButtonEnabled(false); // Disable button during initialization
        const settings = Config.load();
        UI.loadSettingsToForm(settings);

        const [width, height] = settings.resolution.split('x').map(Number);

        const constraints = {
            video: {
                width: { ideal: width },
                height: { ideal: height },
                frameRate: { ideal: parseInt(settings.framerate, 10) },
                facingMode: { ideal: settings.camera }
            },
            audio: false // Audio is disabled as per requirements
        };

        try {
            await WebRTC.getMedia(constraints);
        } catch (error) {
            // Error is already logged in getMedia
        }
    }

    // Start the application
    initializeApp();
});
