import * as firebase from "firebase";
import { IBroadcaster, IDisposable, IMessage } from "./interfaces";
import { AnyMessage } from "../messages";

export interface IAuthenticationMessage extends IMessage {
    type: "authentication";
    payload: { loggedIn: boolean, user?: firebase.User };
}

declare const firebaseui;

export function getLoggedInUserAsync() {
    return new Promise<firebase.User>((resolve, reject) => {
        const unsubscribe = firebase.auth().onAuthStateChanged(user => {
            unsubscribe();
            if (user) resolve(user);
            else reject("Not authenticated");
        });
    });
}

export const logout = () => {
    firebase.auth().signOut();
}

export interface IAuthenticatorDependencies {
    auth: firebase.auth.Auth;
    broadcaster: IBroadcaster;
}

export interface IAuthenticator extends IDisposable {
    launchFirebaseAuthUIAsync(containerSelector: string): Promise<void>;
    watchAuthenticatedUser(): void;
}

export class Authenticator implements IAuthenticator {
    private readonly auth: firebase.auth.Auth;
    private broadcaster: IBroadcaster;
    private unsubscribeWatchAuthenticatedUser?: firebase.Unsubscribe;
    private readonly firebaseUI: any;

    public constructor(deps: IAuthenticatorDependencies) {
        this.auth = deps.auth;
        this.broadcaster = deps.broadcaster;
        this.firebaseUI = this.firebaseUI = new firebaseui.auth.AuthUI(this.auth);
    }

    public watchAuthenticatedUser() {
        getLoggedInUserAsync().then(user => {
            this.authenticatedhandler(user);
        })
        .then(() => this.unsubscribeWatchAuthenticatedUser = this.auth.onAuthStateChanged(this.authenticatedhandler.bind(this)));
    }

    private authenticatedhandler(user: firebase.User | null) {
        console.log("auth state changed");
        // todo: move broadcasting of loggedIn / loggedOut to authenticator?
        if (user) {
            this.broadcaster.postMessage<IAuthenticationMessage>("authentication", { loggedIn: true, user });
        } else {
            this.broadcaster.postMessage<IAuthenticationMessage>("authentication", { loggedIn: false });
        };
    }

    public launchFirebaseAuthUIAsync(containerSelector: string) {
        return new Promise<void>((resolve, reject) => {
            //ui config for firebaseUI
            const uiConfig = {
                // Url to redirect to after a successful sign-in.
                // 'signInSuccessUrl': 'chrome-extension://lbjdcodhahjohdkbigjhgmhikeflepdf/src/html/index.html?1',
                'callbacks': {
                    uiShown: () => {
                        // The widget is rendered.
                        resolve();
                    },
                    signInSuccessWithAuthResult: (authResult, redirectUrl) => {
                        return false;
                    },
                    signInFailure: (errorCode, credential) => {
                        alert(errorCode);
                        reject(errorCode);
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
            this.firebaseUI.start(containerSelector, uiConfig);
        });
    }

    public dispose() {
        if (this.unsubscribeWatchAuthenticatedUser) this.unsubscribeWatchAuthenticatedUser();
    }
}