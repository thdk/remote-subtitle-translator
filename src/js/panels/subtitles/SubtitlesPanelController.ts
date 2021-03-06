import { ISubtitlesPanelView } from "./SubtitlesPanelView";
import { ITranslateService, ISession, ISubtitle, getCurrentUserAsync } from "../../lib";
import { IController, IMessage } from "../../lib/interfaces";

import * as firebase from "firebase";
import "firebase/firestore";
import "firebase/auth";
import { PanelController } from "../../lib/base/panel";
import { IPanelDependencies } from "../panels";
import { getLoggedInUserAsync } from "../../lib/authenticator";
import { getLastValueInMap } from "../../lib/utils";
import { AnyMessage } from "../../messages";
import { IAppBarAction } from "../../appbar/AppBarView";
import { IActionsMessage } from "../../appbar/AppBarController";
import * as firestoreUtils from "../../lib/firestoreUtils";
import { toggleSubtitleInFavoritesAsync } from "../../dal";

export interface ISessionMessage extends IMessage {
    type: "session";
    payload: {
        event: "new" | "modified",
        session: ISession
    }
}
export interface ISubtitlesPanelController extends IController {
    togglePlayback: () => void;
    translate(subId: string, text: string);
    toggleSubtitleInFavorites(subId: string);
    toggleRealtimeTranslation(): void;
    toggleHideOriginals(): void;
    toggleSingleView(): void;
    shouldHideOriginals(): boolean;
    loadSession(session: ISession): void;
}

type PlayerSettings = {
    realtimeTranslation: boolean;
    hideOriginals: boolean;
}

export interface ISubtitlesPanelControllerDependencies extends IPanelDependencies {
    firestore: firebase.firestore.Firestore;
    translateService: ITranslateService;
    isVideoMode: () => boolean;
}

export class SubtitlesPanelController extends PanelController implements ISubtitlesPanelController {
    protected readonly view: ISubtitlesPanelView;

    private settings: PlayerSettings;

    private readonly translateService: ITranslateService;
    private readonly dbSubtitlesRef: firebase.firestore.CollectionReference;
    private session?: ISession;

    private readonly dbFavoritesRef: firebase.firestore.CollectionReference;
    private readonly dbSessionsRef: firebase.firestore.CollectionReference;

    private readonly subs: Map<string, ISubtitle>

    private subtitlesUnsubscribe?: () => void;
    private sessionsUnsubscribe?: () => void;
    private readonly isVideoMode: () => boolean;

    constructor(view: ISubtitlesPanelView, deps: ISubtitlesPanelControllerDependencies) {
        super(view, deps);

        this.view = view;
        this.subs = new Map<string, ISubtitle>();

        this.settings = {
            realtimeTranslation: false,
            hideOriginals: false
        }

        this.isVideoMode = deps.isVideoMode;

        // reflect default settings in view with their side effects
        this.settingsSetHideOriginals(this.settings.hideOriginals);

        this.setPlaybackState(false);

        if (this.isVideoMode()) {
            this.toggleSingleView();
            this.settingsSetHideOriginals(true);
        }

        this.translateService = deps.translateService;
        this.dbSubtitlesRef = deps.firestore.collection("subtitles");
        this.dbSessionsRef = deps.firestore.collection("sessions");
        this.dbFavoritesRef = deps.firestore.collection("favorites");
    }

    /**
     * TODO: broadcast message with actions when panel opens
     */
    private getActions(): IAppBarAction[] {
        if (this.isVideoMode())
            return [{
                icon: "fullscreen",
                text: "Fullscreen",
                action: () => this.toggleSingleView()
            }];
        else return [
            {
                iconActive: "cloud",
                icon: "cloud_off",
                text: "Realtime",
                action: () => this.toggleRealtimeTranslation(),
                isActive: this.settings.realtimeTranslation
            },
            {
                iconActive: "unfold_less",
                icon: "unfold_more",
                text: "English only",
                action: () => this.toggleHideOriginals(),
                isActive: this.settings.hideOriginals
            },
            {
                icon: "fullscreen",
                text: "Fullscreen",
                action: () => this.toggleSingleView()
            }
        ];
    }

    public togglePlayback() {
        if (!this.session) return;

        firestoreUtils.updateAsync<ISession>(this.dbSessionsRef,
            {
                isWatching: !this.session.isWatching,
                id: this.session.id
            });
    }

    public toggleRealtimeTranslation(force?: boolean) {
        if (!this.session) return;

        firestoreUtils.updateAsync<ISession>(this.dbSessionsRef,
            {
                isRealtimeTranslated: force !== undefined ? force : !this.session.isRealtimeTranslated,
                id: this.session.id
            });
    }

    private watchSessionsAsync() {
        return getLoggedInUserAsync().then(user => {
            return this.dbSessionsRef
                .where("uid", "==", user.uid)
                .orderBy("created", "desc")
                .limit(1)
                .onSnapshot(snapshot => {
                    snapshot.docChanges().forEach(change => {
                        const session = firestoreUtils.typeSnapshot<ISession>(change.doc);
                        if (change.type === "added") {
                            this.broadcaster.postMessage<ISessionMessage>("session", { event: "new", session });
                        }
                        else if (change.type === "modified") {
                            if (this.session && this.session.id === session.id) {
                                this.session = { ...this.session, ...session };
                                this.broadcaster.postMessage<ISessionMessage>("session", { event: "modified", session: this.session });
                            }
                        }
                    });
                });
        });
    }

    public loadSession(session: ISession) {
        if (this.session && this.session.id !== session.id) {
            this.subs.clear();
        }

        this.session = session;

        // set the view session state
        this.setPlaybackState(session.isWatching);
        this.settingsSetRealtimeTranslation(session.isRealtimeTranslated);

        // unsubscribe from previous firestore queries
        if (this.subtitlesUnsubscribe) this.subtitlesUnsubscribe();

        const lastSubtitleReceived = getLastValueInMap(this.subs);
        this.subtitlesUnsubscribe = this.dbSubtitlesRef
            .where("sessionId", "==", session.id)
            .orderBy("modified", "asc")
            .startAfter(lastSubtitleReceived ? lastSubtitleReceived.modified : 0)
            .onSnapshot(snapshot => {
                snapshot.docChanges().forEach(change => {
                    const subtitle = Object.assign(change.doc.data(), { id: change.doc.id }) as ISubtitle;
                    if (change.type === "removed") throw 'not implemented';

                    if (change.type === "added") {
                        // note: change.type "added" can also be fired when document is updated:
                        // This can happen when the field from the order by query parameter document is updated.
                        // It will be followed with a modified change, so we can ignore it
                        if (!this.subs.has(subtitle.id)) {
                            this.subs.set(subtitle.id, subtitle);
                            this.view.addSubtitleToDom(subtitle);

                            if (!subtitle.translation && this.settings.realtimeTranslation) {
                                this.translate(subtitle.id, subtitle.subtitle);
                            }
                        }
                    }
                    else if (change.type === "modified") {
                        const oldSub = this.subs.get(subtitle.id);
                        if (oldSub) {
                            this.subs.set(subtitle.id, subtitle);
                            this.view.updateSubtitleInDom(oldSub, subtitle);
                            if (oldSub.translation || (!subtitle.translation && this.settings.realtimeTranslation)) {
                                this.translate(subtitle.id, subtitle.subtitle);
                            }
                        } else {
                            // TODO: subtitle did not exist on the client yet => add it
                        }
                    }
                });
            });
    }

    public onMessage(message: AnyMessage) {
        switch (message.type) {
            case "session": {
                if (message.payload.event === "new") {
                    const { session: newSession } = message.payload
                    if (!this.session || this.session.id !== newSession.id) {
                        // TODO: once possible to pick session from list, use the commented line instead
                        // this.view.sessionAvailable(this.session, newSession);
                        this.view.sessionAvailable(undefined, newSession);
                    } else if (this.session) {
                        // continue with the same session
                        this.loadSession(newSession);
                    }

                    this.broadcaster.postMessage<IActionsMessage>("actions", { actions: this.getActions() });
                }
                else if (message.payload.event === "modified") {
                    const { isRealtimeTranslated, isWatching } = message.payload.session;
                    this.settingsSetRealtimeTranslation(isRealtimeTranslated);
                    if (this.canSetPlaybackState()) this.view.setPlaybackState(isWatching);
                }
            }
        }
    }

    public subscribe() {
        super.subscribe();
        this.watchSessionsAsync().then(u => this.sessionsUnsubscribe = u);
    }

    public unsubscribe() {
        if (this.subtitlesUnsubscribe) this.subtitlesUnsubscribe();
        if (this.sessionsUnsubscribe) this.sessionsUnsubscribe();
        super.unsubscribe();
    }

    public dispose() {
        super.dispose();
    }

    public translate(subId: string, text: string) {
        this.translateService.translate(text).then(translation => {
            if (this.dbSubtitlesRef) {
                this.dbSubtitlesRef.doc(subId).update({ translation });
            } else {
                throw new Error("Can't update subtitle: dbSubtitlesRef is undefined.");
            }
        });
    }

    public toggleSubtitleInFavorites(subId: string) {
        if (!this.dbFavoritesRef) {
            throw new Error("Can't add favorite subtitle: dbFavoriteSubtitlesRef is undefined.")
        }

        if (!this.dbSubtitlesRef) {
            throw new Error("Can't add favorite subtitle: dbSubtitlesRef is undefined.")
        }

        toggleSubtitleInFavoritesAsync(subId, this.dbSubtitlesRef, this.dbFavoritesRef);
    }

    public toggleHideOriginals() {
        this.settingsSetHideOriginals(!this.settings.hideOriginals);
    }

    public toggleSingleView() {
        this.view.setSingleViewMode();
    }

    public shouldHideOriginals() {
        return this.settings.hideOriginals;
    }

    private settingsSetRealtimeTranslation(realtime: boolean) {
        this.settings.realtimeTranslation = realtime;
        this.view.setActiveRealTimeButton(realtime);
        // this.view.toolbarToggleHideOriginalsButton(realtime);

        if (!this.settings.realtimeTranslation) {
            // this.settingsSetHideOriginals(false);
        }
    }

    private settingsSetHideOriginals(hideOriginals: boolean) {
        this.settings.hideOriginals = hideOriginals;
        this.view.setActiveHideOriginals(hideOriginals);
    }

    private setPlaybackState(state: boolean) {
        if (this.canSetPlaybackState()) this.view.setPlaybackState(state);
    }

    private canSetPlaybackState() {
        return !this.isVideoMode();
    }
}