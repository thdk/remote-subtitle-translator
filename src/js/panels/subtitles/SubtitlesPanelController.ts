import { ISubtitlesPanelView } from "./SubtitlesPanelView";
import { ITranslateService, ISession, ISubtitle, getCurrentUserAsync } from "../../lib";
import { IDisposable, IListener, IController, IMessage } from "../../lib/interfaces";

import * as firebase from "firebase";
import "firebase/firestore";
import "firebase/auth";
import { PanelController } from "../../lib/base/panel";
import { IPanelDependencies } from "../panels";
import { getLoggedInUserAsync } from "../../lib/authenticator";
import { stringify } from "querystring";
import { getLastValueInMap, Omit } from "../../lib/utils";
import { AnyMessage } from "../../messages";

export interface ISessionMessage extends IMessage {
    type: "session";
    payload: {
        event: "new",
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
    requestSubtitles(session: ISession): void;
}

type PlayerSettings = {
    realtimeTranslation: boolean;
    hideOriginals: boolean;
}

export interface ISubtitlesPanelControllerDependencies extends IPanelDependencies {
    firestore: firebase.firestore.Firestore;
    translateService: ITranslateService;
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

    constructor(view: ISubtitlesPanelView, deps: ISubtitlesPanelControllerDependencies) {
        super(view, deps);

        this.view = view;
        this.subs = new Map<string, ISubtitle>();

        this.settings = {
            realtimeTranslation: false,
            hideOriginals: false
        }

        // reflect default settings in view with their side effects
        this.settingsSetHideOriginals(this.settings.hideOriginals);
        this.settingsSetRealtimeTranslation(this.settings.realtimeTranslation);

        this.translateService = deps.translateService;
        this.dbSubtitlesRef = deps.firestore.collection("subtitles");
        this.dbSessionsRef = deps.firestore.collection("sessions");
        this.dbFavoritesRef = deps.firestore.collection("favorites");
    }

    public togglePlayback() {
        if (!this.dbSessionsRef || !this.session) return;

        this.dbSessionsRef.doc(this.session.id)
            .update({ isWatching: !this.session.isWatching })
            .then(() => {
                this.session!.isWatching = !this.session!.isWatching;
            });
    }

    private watchSessionsAsync() {
        return getLoggedInUserAsync().then(user => {
            return this.dbSessionsRef
                .where("uid", "==", user.uid)
                .orderBy("created", "desc")
                .limit(1)
                .onSnapshot(snapshot => {
                    if (snapshot.size) {
                        const change = snapshot.docs[0];
                        const s: ISession = Object.assign<Pick<ISession, "id">, Exclude<ISession, "id">>({ id: change.id }, change.data() as Exclude<ISession, "id">);
                        this.broadcaster.postMessage<ISessionMessage>("session", { event: "new", session: s });
                    }
                });
        });
    }

    public requestSubtitles(session: ISession) {
        if (this.session && this.session.id !== session.id)
        {
            this.subs.clear();
        }

        this.session = session;

        // unsubscribe from previous firestore queries
        if (this.subtitlesUnsubscribe) this.subtitlesUnsubscribe();

        const lastSubtitleReceived = getLastValueInMap(this.subs);
        this.subtitlesUnsubscribe = this.dbSubtitlesRef
            .where("sessionId", "==", session.id)
            .orderBy("created", "asc")
            .startAfter(lastSubtitleReceived ? lastSubtitleReceived.created : 0)
            .onSnapshot(snapshot => {
                snapshot.docChanges().forEach(change => {
                    const subtitle = Object.assign(change.doc.data(), { id: change.doc.id }) as ISubtitle;
                    if (change.type === "added") {
                        this.subs.set(subtitle.id, subtitle);
                        this.view.addSubtitleToDom(subtitle);

                        if (!subtitle.translation && this.settings.realtimeTranslation) {
                            this.translate(subtitle.id, subtitle.subtitle);
                        }
                    }
                    if (change.type === "modified") {
                        const oldSub = this.subs.get(subtitle.id);
                        if (oldSub) {
                            const newSub = { ...oldSub, ...subtitle };
                            this.subs.set(subtitle.id, newSub);
                            this.view.updateSubtitleInDom(oldSub, newSub);
                            if (oldSub.translation || (!subtitle.translation && this.settings.realtimeTranslation)) {
                                this.translate(subtitle.id, subtitle.subtitle);
                            }
                        } else {
                            // TODO: subtitle did not exist on the client yet => add it
                        }
                    }
                    if (change.type === "removed") {
                        throw 'not implemented';
                    }
                });
            });
    }

    public onMessage(message: AnyMessage) {
        console.log(message);
        switch (message.type) {
            case "session": {
                if (message.payload.event === "new") {
                    if (!this.session || this.session.id !== message.payload.session.id) {
                        this.view.sessionAvailable(this.session, message.payload.session);
                    }
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

        const sourceSubtitleRef = this.dbSubtitlesRef.doc(subId);
        sourceSubtitleRef.get().then(subDoc => {
            const { id: sourceSubtitleId, subtitle, translation, favoriteId } = Object.assign(subDoc.data(), { id: subDoc.id }) as ISubtitle;

            if (favoriteId) {
                // Remove from favorites
                const favoriteSubRef = this.dbFavoritesRef!.doc(favoriteId);
                return Promise.all([
                    favoriteSubRef.delete(),
                    sourceSubtitleRef.update({ favoriteId: null })
                ]);
            }
            else {
                // Add to favorites
                // get logged in user first
                return getCurrentUserAsync().then(user => {
                    const fav = {
                        sourceSubtitleId,
                        subtitle,
                        translation,
                        created: firebase.firestore.FieldValue.serverTimestamp(),
                        uid: user.uid
                    };
                    const favoriteSubRef = this.dbFavoritesRef!.doc();

                    return Promise.all([
                        favoriteSubRef.set(fav),
                        sourceSubtitleRef.update({ favoriteId: favoriteSubRef.id })
                    ]);
                }, error => {
                    alert(error);
                });
            }
        });
    }

    public toggleRealtimeTranslation() {
        this.settingsSetRealtimeTranslation(!this.settings.realtimeTranslation);
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
        this.view.toolbarToggleHideOriginalsButton(realtime);

        if (!this.settings.realtimeTranslation) {
            this.settingsSetHideOriginals(false);
        }
    }

    private settingsSetHideOriginals(hideOriginals: boolean) {
        this.settings.hideOriginals = hideOriginals;
        this.view.setActiveHideOriginals(hideOriginals);
    }
}