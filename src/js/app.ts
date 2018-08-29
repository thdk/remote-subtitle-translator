import { config, IAppConfig } from '../config';

import { IBroadcaster, BroadCaster } from './broadcaster';
import { AuthenticationPanel } from './panels/authentication';
import {  ITranslateService, HttpNetwork, GoogleTranslate } from './lib';
import { SettingsPanel } from './panels/settings';
import { TopNavigationView, ITopNavigationView } from './navigation/TopNavigationView';
import { TopNavigationController } from './navigation/TopNavigationController';
import { SubtitlesPanel } from './panels/subtitles';
import { PanelDashboard } from './panels/dashboard';
import { FavoriteSubtitlesPanel } from './panels/favoriteSubtitles';

declare const firebase: any;

export class RemoteSubtitleReceiver {
    private firestore?: any;
    private dbSessionsRef?: any;
    private dbFavoriteSubtitlesRef?: any;

    private readonly panelDashboard: PanelDashboard;
    private authenticator?: AuthenticationPanel;
    private readonly settingsPanel: SettingsPanel;
    private readonly subtitlePlayerEl: HTMLElement;
    private subtitlesPanel?: SubtitlesPanel;
    private readonly favoriteSubtitlesEl: HTMLElement;
    private favoriteSubtitlesPanel?: FavoriteSubtitlesPanel;

    private readonly translateService: ITranslateService;

    private readonly topNavigation: ITopNavigationView;

    private firebaseApp: any;

    private broadcaster: IBroadcaster;

    constructor(config: IAppConfig, translateService: ITranslateService) {
        this.firebaseApp = firebase.initializeApp({
            apiKey: config.apiKey,
            authDomain: 'czech-subs-1520975638509.firebaseapp.com',
            projectId: 'czech-subs-1520975638509'
        });

        this.translateService = translateService;

        this.panelDashboard = new PanelDashboard();
        this.topNavigation = new TopNavigationView((view) => new TopNavigationController(this.panelDashboard, view));

        this.broadcaster = new BroadCaster("app");

        const subtitlePlayerEl = document.getElementById('subtitle-player');
        if (!subtitlePlayerEl) throw new Error("Subtitle player element is missing in DOM");
        this.subtitlePlayerEl = subtitlePlayerEl;

        const favoriteSubtitlesEl = document.getElementById("favorite-subtitles");
        if (!favoriteSubtitlesEl) throw new Error("Favorite subtitles element is missing in DOM");
        this.favoriteSubtitlesEl = favoriteSubtitlesEl;

        const settingsEl = document.getElementById('settings');
        if (!settingsEl) throw new Error("Settings element is missing in DOM");
        this.settingsPanel = new SettingsPanel(settingsEl, this.firebaseApp);

        this.panelDashboard.setPanel(this.settingsPanel);

        // authentication
        this.firebaseApp.auth().onAuthStateChanged(user => {

            // todo: move broadcasting of loggedIn / loggedOut to authenticator?
            if (user) {
                this.handleLoggedIn(user.uid);
                this.broadcaster.postMessage("loggedIn", user.uid);
            } else {
                this.promptAuthentication();
                this.broadcaster.postMessage("loggedOut", null);
            };
        });
    }

    private handleLoggedIn(uid: string) {
        this.initCloudFirestore();
        if (this.authenticator) this.authenticator.close();

        return this.dbSessionsRef.where("uid", "==", uid).orderBy("created", "desc").limit(1)
            .get()
            .then(querySnapshot => {
                const session = querySnapshot.docs[0];
                const dbSubtitlesRef = this.dbSessionsRef.doc(session!.id).collection("subtitles");

                this.subtitlesPanel = new SubtitlesPanel(this.subtitlePlayerEl, uid, dbSubtitlesRef, this.dbFavoriteSubtitlesRef, this.dbSessionsRef, session, this.translateService);
                this.panelDashboard.setPanel(this.subtitlesPanel);

                this.favoriteSubtitlesPanel = new FavoriteSubtitlesPanel(this.favoriteSubtitlesEl, this.dbFavoriteSubtitlesRef, dbSubtitlesRef);
                this.panelDashboard.setPanel(this.favoriteSubtitlesPanel);

                this.subtitlesPanel.openAsync();
            })
            .catch(function (error) {
                console.log("Error getting documents: ", error);
            });
    }

    private promptAuthentication() {
        if (!this.authenticator) {
            const authenticationEl = document.getElementById('authentication');
            if (!authenticationEl) {
                throw new Error("authentication element is missing in DOM");
            }

            this.authenticator = new AuthenticationPanel({ firebaseApp: this.firebaseApp }, authenticationEl);
            this.panelDashboard.setPanel(this.authenticator);
        }

        this.authenticator.openAsync();
    }

    private initCloudFirestore() {
        // Initialize Cloud Firestore through Firebase
        this.firestore = firebase.firestore();
        const settings = { timestampsInSnapshots: true };
        this.firestore.settings(settings);

        this.dbSessionsRef = this.firestore.collection("sessions");
        this.dbFavoriteSubtitlesRef = this.firestore.collection("favorites");
    }
}

$(function () {
    const network = new HttpNetwork();
    const app = new RemoteSubtitleReceiver(config, new GoogleTranslate(config, network));
});
