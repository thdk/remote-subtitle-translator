import { config, IAppConfig } from '../config';

import { AuthenticationPanel } from './panels/authenticationPanel';
import { ITranslateService, HttpNetwork, GoogleTranslate } from './lib';
import { SettingsPanel } from './panels/settings';
import { INavigationView } from './navigation/TopNavigationView';
import { PanelDashboard } from './panels/dashboard';
import { FavoriteSubtitlesPanel } from './panels/favoriteSubtitles';

// This import loads the firebase namespace along with all its type information.
import * as firebase from "firebase";
// These imports load individual services into the firebase namespace.
import 'firebase/auth';
import 'firebase/database';
import { SubtitlesPanelView, ISubtitlesPanelView } from './panels/subtitles/SubtitlesPanelView';
import { SubtitlesPanelController } from './panels/subtitles/SubtitlesPanelController';
import { DrawerNavigationView } from './navigation/DrawerNavigationView';
import { NavigationController, INavigationControllerDependencies } from './navigation/NavigationController';
import { AppBarView } from './appbar/AppBarView';
import { AppBarController } from './appbar/AppBarController';
import { PubSubBroadcaster } from './lib/broadcaster';
import { isPanelWithActions } from './panels/panels';
import { IBroadcaster, IDisposable, IListener } from './lib/interfaces';
import { requireEl } from './lib/utils';
import { Authenticator, IAuthenticator } from './lib/authenticator';
import { AnyMessage } from './messages';

export class RemoteSubtitleReceiver implements IDisposable, IListener {
    private readonly firestore: firebase.firestore.Firestore;

    private readonly panelDashboard: PanelDashboard;

    private readonly subtitlesPanel: ISubtitlesPanelView;
    private readonly authenticationPanel: AuthenticationPanel;

    private readonly navigation: INavigationView;
    private readonly appBar: AppBarView;

    private firebaseApp: firebase.app.App;
    private authenticator: IAuthenticator;
    private broadcaster: IBroadcaster;

    constructor(config: IAppConfig, translateService: ITranslateService) {
        // firebase
        this.firebaseApp = firebase.initializeApp({
            apiKey: config.apiKey,
            authDomain: 'czech-subs-1520975638509.firebaseapp.com',
            projectId: 'czech-subs-1520975638509'
        });

        this.firestore = firebase.firestore();
        const settings = { timestampsInSnapshots: true };
        this.firestore.settings(settings);

        const auth = this.firebaseApp.auth();

        this.panelDashboard = new PanelDashboard();
        this.broadcaster = new PubSubBroadcaster();
        this.authenticator = new Authenticator({ broadcaster: this.broadcaster, auth });

        const { broadcaster, firestore, authenticator } = this;

        // panels
        const subtitlesControllerCreator = (view) => new SubtitlesPanelController(view, { broadcaster, firestore, translateService });
        this.subtitlesPanel = new SubtitlesPanelView(requireEl("#subtitle-player"), subtitlesControllerCreator, { toggleDrawer: () => this.navigation.toggle(), broadcaster: this.broadcaster });
        this.panelDashboard.setPanel(this.subtitlesPanel);

        const favoriteSubtitlesPanel = new FavoriteSubtitlesPanel(requireEl("#favorite-subtitles"), { broadcaster, firestore });
        this.panelDashboard.setPanel(favoriteSubtitlesPanel);

        const settingsPanel = new SettingsPanel(requireEl("#settings"), { broadcaster });
        this.panelDashboard.setPanel(settingsPanel);

        this.authenticationPanel = new AuthenticationPanel({ authenticator, broadcaster }, requireEl("#authentication"));
        this.panelDashboard.setPanel(this.authenticationPanel);

        // drawer navigation
        const navigationDeps: INavigationControllerDependencies = {
            broadcaster,
            navigate: destination => this.panelDashboard.showPanel(destination)
        };

        this.navigation = new DrawerNavigationView(view => new NavigationController(view, navigationDeps));

        // app bar
        const getActions = () => {
            const openPanel = this.panelDashboard.getOpenPanel();
            if (!openPanel || !isPanelWithActions(openPanel)) return undefined;
            else return openPanel.actions;
        };

        this.appBar = new AppBarView({ toggleMenu: () => this.navigation.toggle() }, view => new AppBarController(view, { getActions, broadcaster }));

        this.subscribe();
        this.authenticator.watchAuthenticatedUser();
    }

    public dispose() {
        this.appBar.dispose();
    }

    public onMessage(msg: AnyMessage) {
        if (msg.type === "authentication") {
            if (msg.payload.loggedIn)
                this.panelDashboard.showPanel(this.subtitlesPanel.name);
            else
                this.panelDashboard.showPanel(this.authenticationPanel.name);
        }
    }

    public subscribe() {
        this.broadcaster.subscribe(this);
    }
}

$(function () {
    const network = new HttpNetwork();
    const app = new RemoteSubtitleReceiver(config, new GoogleTranslate(config, network));
});
