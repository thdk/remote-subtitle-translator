import { IFavoriteSubtitle } from "../../lib";
import { IController, } from "../../lib/interfaces";

import * as firebase from "firebase";
import "firebase/firestore";
import "firebase/auth";
import { PanelController } from "../../lib/base/panel";
import { IPanelDependencies } from "../panels";
import { getLoggedInUserAsync } from "../../lib/authenticator";
import { AnyMessage } from "../../messages";
import { toggleSubtitleInFavoritesAsync, deleteFromFavorites } from "../../dal";
import { IFavoritesPanelView } from "./FavoritesPanelView";
import * as firestoreUtils from "../../lib/firestoreUtils";

export interface IFavoritesPanelController extends IController {
    removeFromFavoritesClicked: (favoriteId) => void;
}

export interface IFavoritesPanelControllerDependencies extends IPanelDependencies {
    firestore: firebase.firestore.Firestore;
}

export class FavoritesPanelController extends PanelController implements IFavoritesPanelController {
    protected readonly view: IFavoritesPanelView;

    private readonly dbSubtitlesRef: firebase.firestore.CollectionReference;
    private readonly dbFavoritesRef: firebase.firestore.CollectionReference;

    private readonly favorites: Map<string, IFavoriteSubtitle>;

    private favoritesUnsubscribe?: () => void;

    constructor(view: IFavoritesPanelView, deps: IFavoritesPanelControllerDependencies) {
        super(view, deps);

        this.favorites = new Map();
        this.dbSubtitlesRef = deps.firestore.collection("subtitles");
        this.dbFavoritesRef = deps.firestore.collection("favorites");
        this.view = view;
    }

    public subscribe() {
        super.subscribe();
        this.watchFavoritesAsync().then(u => this.favoritesUnsubscribe = u);
    }

    public unsubscribe() {
        if (this.favoritesUnsubscribe) this.favoritesUnsubscribe();
        super.unsubscribe();
    }

    public onMessage(message: AnyMessage) {
    }

    private watchFavoritesAsync() {
        return getLoggedInUserAsync().then(user => {
            return this.dbFavoritesRef.where("uid", "==", user.uid).orderBy("created")
                .onSnapshot(snapshot => {
                    snapshot.docChanges().forEach(change => {
                        const favorite = firestoreUtils.typeSnapshot<IFavoriteSubtitle>(change.doc);
                        const {id} = favorite;
                        if (change.type === "added") {
                            this.favorites.set(id, favorite);
                            this.view.addSubtitleToDom(favorite);
                        }
                        if (change.type === "modified") {
                            this.favorites.set(id, { ...this.favorites.get(id), ...favorite });
                            this.view.updateSubtitleInDom(favorite);
                        }
                        if (change.type === "removed") {
                            this.favorites.delete(id);
                            this.view.deteleSubtitleInDom(favorite);
                        }
                    });
                });
        });
    }

    public removeFromFavoritesClicked(favoriteId: string) {
        const favorite = this.favorites.get(favoriteId);
        if (!favorite) return;

        deleteFromFavorites(favoriteId, this.dbSubtitlesRef, this.dbFavoritesRef)
            .then(() => {
                this.view.confirmFavoriteRemoved(
                    () => toggleSubtitleInFavoritesAsync(favorite.sourceSubtitleId, this.dbSubtitlesRef, this.dbFavoritesRef)
                )
            });
    }
}