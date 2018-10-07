import { ISubtitlesPanelView } from "./SubtitlesPanelView";
import { PanelDashboard } from "../../panels/dashboard";
import { IBroadcaster, IMessage, IListener, PubSubBroadcaster } from "../../broadcaster";
import { ITranslateService, ISession, IDisposable, ISubtitle, getCurrentUserAsync } from "../../lib";

import * as firebase from "firebase";
import "firebase/firestore";
import "firebase/auth";

export interface ISubtitlesPanelController extends IDisposable  {
    togglePlayback: () => void;
    translate(subId: string, text: string);
    toggleSubtitleInFavorites(subId: string);
    toggleRealtimeTranslation();
    toggleHideOriginals();
    toggleSingleView(singleView: boolean);
    shouldHideOriginals();
    subscribe();
}

type PlayerSettings = {
    realtimeTranslation: boolean;
    hideOriginals: boolean;
}

export class SubtitlesPanelController implements ISubtitlesPanelController, IListener {
    private readonly view: ISubtitlesPanelView;
    private readonly broadcaster: IBroadcaster;

    private settings: PlayerSettings;

    private readonly translateService: ITranslateService;
    private readonly dbSubtitlesRef: firebase.firestore.CollectionReference;
    private readonly session?: ISession;

    private readonly dbFavoritesRef: firebase.firestore.CollectionReference;
    private readonly dbSessionsRef: firebase.firestore.CollectionReference;

    private readonly subs: {[id: string]: ISubtitle} = {};

    private firestoreUnsubscribe?: () => void;

    constructor(view: ISubtitlesPanelView, dbSubtitlesRef: firebase.firestore.CollectionReference, dbFavoritesRef: firebase.firestore.CollectionReference, dbSessionsRef: firebase.firestore.CollectionReference, session: ISession, translateService: ITranslateService){
        this.view = view;

        this.broadcaster = new PubSubBroadcaster();
        this.broadcaster.subscribe(this);

        this.settings = {
            realtimeTranslation: false,
            hideOriginals: false
        }

        // reflect default settings in view with their side effects
        this.settingsSetHideOriginals(this.settings.hideOriginals);
        this.settingsSetRealtimeTranslation(this.settings.realtimeTranslation);

        this.translateService = translateService;
        this.dbFavoritesRef = dbFavoritesRef;
        this.dbSessionsRef = dbSessionsRef;
        this.dbSubtitlesRef = dbSubtitlesRef;
        this.session = session;

    }

    public onMessage(message: IMessage) {

    }

    public togglePlayback() {
        if (!this.dbSessionsRef) return;

            this.dbSessionsRef.doc(this.session!.id).update({ isWatching: !this.session!.isWatching }).then(() => {
                this.session!.isWatching = !this.session!.isWatching;
            });
    }

    public subscribe() {
        // move to controller
        this.firestoreUnsubscribe = this.dbSubtitlesRef.orderBy("created")
            .onSnapshot(snapshot => {
                snapshot.docChanges().forEach(change => {
                    const subtitle = Object.assign(change.doc.data(), { id: change.doc.id }) as ISubtitle;
                    if (change.type === "added") {
                        this.subs[subtitle.id] = subtitle;
                        this.view.addSubtitleToDom(subtitle);

                        if (!subtitle.translation && this.settings.realtimeTranslation) {
                            this.translate(subtitle.id, subtitle.subtitle);
                        }
                    }
                    if (change.type === "modified") {
                        let sub = this.subs[subtitle.id];
                        if (sub) {
                            this.view.updateSubtitleInDom(sub, subtitle);
                            sub = { ...sub, ...subtitle };
                            if (sub.translation || (!subtitle.translation && this.settings.realtimeTranslation)) {
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

    public dispose() {
        if (this.firestoreUnsubscribe) this.firestoreUnsubscribe();
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

    public toggleSingleView(singleView: boolean) {
        this.view.setSingleViewMode(singleView);
    }

    public shouldHideOriginals() {
        return this.settings.hideOriginals;
    }

    private settingsSetRealtimeTranslation(realtime: boolean) {
        this.settings.realtimeTranslation = realtime;
        this.view.toolbarSetActiveRealTimeButton(realtime);
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