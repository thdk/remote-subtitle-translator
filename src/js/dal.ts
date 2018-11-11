import * as firebase from 'firebase';
import 'firebase/firestore';

import { getCurrentUserAsync, ISubtitle, IFavoriteSubtitle } from "./lib";
import { typeSnapshot } from './lib/firestoreUtils';
import { rejects } from 'assert';

export const deleteFromFavorites = (subId: string, subtitleCollectionRef: firebase.firestore.CollectionReference, favoritesCollectionRef: firebase.firestore.CollectionReference) => {
    const favoriteSubRef = favoritesCollectionRef.doc(subId);

    return favoriteSubRef.get().then(favoriteSubDoc => {
        const favoriteData = typeSnapshot<IFavoriteSubtitle>(favoriteSubDoc);
        if (!favoriteData) return new Promise((_, rejects) => rejects());

        return Promise.all([favoriteSubRef.delete().then(() => {
        }).catch(error => {
            console.error("Error removing document: ", error);
        }),

        subtitleCollectionRef.doc(favoriteData.sourceSubtitleId)
            .update({ favoriteId: firebase.firestore.FieldValue.delete() })
        ]);
    });
}

export const toggleSubtitleInFavoritesAsync = (subId: string, subtitleCollectionRef: firebase.firestore.CollectionReference, favoritesCollectionRef: firebase.firestore.CollectionReference) => {
    const sourceSubtitleRef = subtitleCollectionRef.doc(subId);
    return sourceSubtitleRef.get().then(subDoc => {
        const sourceSubtitle = typeSnapshot<ISubtitle>(subDoc);
        // TODO: handle missing source subtitle
        if (!sourceSubtitle) throw new Error("Cannot find subtitle");

        const { id: sourceSubtitleId = subId, subtitle, translation, favoriteId } = sourceSubtitle;

        if (favoriteId) {
            // Remove from favorites
            const favoriteSubRef = favoritesCollectionRef.doc(favoriteId);
            return Promise.all([
                favoriteSubRef.delete(),
                sourceSubtitleRef.update({
                    favoriteId: firebase.firestore.FieldValue.delete(),
                    modified: firebase.firestore.FieldValue.serverTimestamp()
                })
            ]).then(() => false);
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
                const favoriteSubRef = favoritesCollectionRef.doc();

                return Promise.all([
                    favoriteSubRef.set(fav),
                    sourceSubtitleRef.update({
                        favoriteId: favoriteSubRef.id,
                        modified: firebase.firestore.FieldValue.serverTimestamp()
                    })
                ]).then(() => true);
            });
        }
    });
}