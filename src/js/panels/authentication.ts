/// <reference path="panels.ts"/>

import { Panel } from "./panels";
declare var firebase;
declare var firebaseui;

    interface IAuthenticatorDependencies {
        firebaseApp: any;
    }
    export class AuthenticationPanel extends Panel {
        private firebaseApp: any;
        private unsubscribeOAuthStateChanged?: () => void;
        private firebaseUI: any;

        constructor(deps: IAuthenticatorDependencies, containerEl: HTMLElement) {
            super("authentication", containerEl);
            this.firebaseApp = deps.firebaseApp;
        }

        public createAsync() {
            return this.createFirebaseAuthUIAsync();
        }

        public open() {
            this.launchFirebaseAuthUI();
            this.init();
            super.open();
        }

        private createFirebaseAuthUIAsync() {
            return new Promise<void>((resolve, reject) => {

                //launch the firebaseUI flow
                this.firebaseUI = new firebaseui.auth.AuthUI(this.firebaseApp.auth());

                resolve();

            });
        }

        private launchFirebaseAuthUI() {
            //ui config for firebaseUI
            const uiConfig = {
                // Url to redirect to after a successful sign-in.
                // 'signInSuccessUrl': 'chrome-extension://lbjdcodhahjohdkbigjhgmhikeflepdf/src/html/index.html?1',
                'callbacks': {
                    uiShown: () => {
                        // The widget is rendered.
                        // Hide the loader.
                        const loaderEl = this.containerEl.querySelector('#firebase-loader');
                        if (loaderEl)
                            (loaderEl as HTMLElement).style.display = 'none';
                    },
                    signInSuccessWithAuthResult: (authResult, redirectUrl) => {
                        return false;
                    },
                    signInFailure: (errorCode, credential) => {
                        return new Promise((resolve, reject) => {
                            alert(errorCode);
                        });
                    }
                },
                // Will use popup for IDP Providers sign-in flow instead of the default, redirect.
                signInFlow: 'popup',
                signInOptions: [{
                    provider: firebase.auth.GoogleAuthProvider.PROVIDER_ID,
                    'scopes': [
                        'https://www.googleapis.com/auth/plus.login'
                    ],
                    'customParameters': {
                        // Forces account selection even when one account
                        // is available.
                        'prompt': 'select_account'
                    }
                },
                {
                    provider: firebase.auth.EmailAuthProvider.PROVIDER_ID,
                    // Whether the display name should be displayed in Sign Up page.
                    requireDisplayName: true // true seems not to work:
                  },
                ],
                // Terms of service url.
                'tosUrl': 'https://www.google.com',
                'credentialHelper': firebaseui.auth.CredentialHelper.NONE
                //, 'credentialHelper': CLIENT_ID && CLIENT_ID != 'YOUR_OAUTH_CLIENT_ID' ? firebaseui.auth.CredentialHelper.GOOGLE_YOLO : firebaseui.auth.CredentialHelper.ACCOUNT_CHOOSER_COM
            };
            console.log("start firebase UI");
            this.firebaseUI.start('#firebaseui-auth-container', uiConfig);
        }
    }