import { config, IAppConfig } from '../config';

import { AuthenticationPanel } from './panels/authentication';
import { ITranslateService, HttpNetwork, GoogleTranslate, ISession } from './lib';
import { SettingsPanel } from './panels/settings';
import { INavigationView } from './navigation/TopNavigationView';
import { PanelDashboard } from './panels/dashboard';
import { FavoriteSubtitlesPanel } from './panels/favoriteSubtitles';

// This import loads the firebase namespace along with all its type information.
import * as firebase from "firebase";
// These imports load individual services into the firebase namespace.
import 'firebase/auth';
import 'firebase/database';
import { SubtitlesPanelView } from './panels/subtitles/SubtitlesPanelView';
import { SubtitlesPanelController } from './panels/subtitles/SubtitlesPanelController';
import { DrawerNavigationView } from './navigation/DrawerNavigationView';
import { NavigationController, INavigationControllerDependencies } from './navigation/NavigationController';
import { AppBarView } from './appbar/AppBarView';
import { AppBarController } from './appbar/AppBarController';
import { PubSubBroadcaster } from './lib/broadcaster';
import { isPanelWithActions } from './panels/panels';
import { IBroadcaster } from './lib/interfaces';

export class RemoteSubtitleReceiver {
    private firestore?: firebase.firestore.Firestore;
    private dbSessionsRef?: firebase.firestore.CollectionReference;
    private dbSubtitlesRef?: firebase.firestore.CollectionReference;
    private dbFavoriteSubtitlesRef?: firebase.firestore.CollectionReference;

    private readonly panelDashboard: PanelDashboard;
    private authenticator?: AuthenticationPanel;
    private readonly settingsPanel: SettingsPanel;
    private readonly subtitlePlayerEl: HTMLElement;
    private subtitlesPanel?: SubtitlesPanelView;
    private readonly favoriteSubtitlesEl: HTMLElement;
    private favoriteSubtitlesPanel?: FavoriteSubtitlesPanel;

    private readonly translateService: ITranslateService;

    private readonly navigation: INavigationView;
    private readonly appBar: AppBarView;

    private firebaseApp: firebase.app.App;

    private broadcaster: IBroadcaster;

    constructor(config: IAppConfig, translateService: ITranslateService) {
        this.firebaseApp = firebase.initializeApp({
            apiKey: config.apiKey,
            authDomain: 'czech-subs-1520975638509.firebaseapp.com',
            projectId: 'czech-subs-1520975638509'
        });

        this.translateService = translateService;
        this.panelDashboard = new PanelDashboard();
        this.broadcaster = new PubSubBroadcaster();

        const { broadcaster } = this;
        const navigationDeps: INavigationControllerDependencies = {
            broadcaster,
            navigate: destination => this.panelDashboard.showPanel(destination)
        };

        const subtitlePlayerEl = document.getElementById('subtitle-player');
        if (!subtitlePlayerEl) throw new Error("Subtitle player element is missing in DOM");
        this.subtitlePlayerEl = subtitlePlayerEl;

        const favoriteSubtitlesEl = document.getElementById("favorite-subtitles");
        if (!favoriteSubtitlesEl) throw new Error("Favorite subtitles element is missing in DOM");
        this.favoriteSubtitlesEl = favoriteSubtitlesEl;

        const settingsEl = document.getElementById('settings');
        if (!settingsEl) throw new Error("Settings element is missing in DOM");
        this.settingsPanel = new SettingsPanel(settingsEl, { broadcaster }, this.firebaseApp);

        this.panelDashboard.setPanel(this.settingsPanel);

        this.navigation = new DrawerNavigationView(view => new NavigationController(view, navigationDeps));

        const getActions = () => {
            const openPanel = this.panelDashboard.getOpenPanel();
            if (!openPanel || !isPanelWithActions(openPanel)) return undefined;
            else return openPanel.actions;
        };

        this.appBar = new AppBarView({ toggleMenu: () => this.navigation.toggle() }, view => new AppBarController(view, { getActions, broadcaster }));

        // authentication
        this.firebaseApp.auth().onAuthStateChanged(user => {

            // todo: move broadcasting of loggedIn / loggedOut to authenticator?
            if (user) {
                this.handleLoggedIn(user.uid);
                broadcaster.postMessage("loggedIn", user.uid);
            } else {
                this.promptAuthentication();
                broadcaster.postMessage("loggedOut", null);
            };
        });
    }

    private handleLoggedIn(uid: string) {
        this.initCloudFirestore();
        if (this.authenticator) this.authenticator.close();

        if (!this.dbSessionsRef) throw new Error("dbSessionRef is undefined");
        if (!this.dbSubtitlesRef) throw new Error("dbSubtitlesRef is undefined");

        return this.dbSessionsRef.where("uid", "==", uid).orderBy("created", "desc").limit(1)
            .get()
            .then(querySnapshot => {
                let session: ISession | null = null;
                if (querySnapshot.docs.length) {
                    const sessionSnapshot = querySnapshot.docs[0];
                    session = Object.assign({ id: sessionSnapshot.id }, sessionSnapshot.data());
                }
                if (session) {
                    if (!this.dbFavoriteSubtitlesRef) throw new Error("this.dbFavoriteSubtitlesRef is undefined");
                    const { broadcaster } = this;
                    const controllerCreator = (view) => new SubtitlesPanelController(view, { broadcaster }, this.dbSubtitlesRef!, this.dbFavoriteSubtitlesRef!, this.dbSessionsRef!, session!, this.translateService);
                    this.subtitlesPanel = new SubtitlesPanelView(this.subtitlePlayerEl, controllerCreator, { toggleDrawer: () => this.navigation.toggle(), broadcaster: this.broadcaster });
                    this.panelDashboard.setPanel(this.subtitlesPanel);

                    this.favoriteSubtitlesPanel = new FavoriteSubtitlesPanel(this.favoriteSubtitlesEl, { broadcaster }, this.dbFavoriteSubtitlesRef, this.dbSubtitlesRef!);
                    this.panelDashboard.setPanel(this.favoriteSubtitlesPanel);

                    this.panelDashboard.showPanel(this.subtitlesPanel.name);
                } else {
                    throw new Error("No sessions found");
                }
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

            const { firebaseApp, broadcaster } = this;
            this.authenticator = new AuthenticationPanel({ firebaseApp, broadcaster }, authenticationEl);
            this.panelDashboard.setPanel(this.authenticator);
        }

        this.panelDashboard.showPanel(this.authenticator.name);
    }

    private initCloudFirestore() {
        // Initialize Cloud Firestore through Firebase
        this.firestore = firebase.firestore();
        const settings = { timestampsInSnapshots: true };
        this.firestore.settings(settings);

        this.dbSubtitlesRef = this.firestore.collection("subtitles");
        this.dbSessionsRef = this.firestore.collection("sessions");
        this.dbFavoriteSubtitlesRef = this.firestore.collection("favorites");
    }
}

$(function () {
    const network = new HttpNetwork();
    const app = new RemoteSubtitleReceiver(config, new GoogleTranslate(config, network));
});
