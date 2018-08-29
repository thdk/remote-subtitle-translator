/// <reference path="panels.ts" />

import { Panel } from "./panels";
import { ITranslateService, ISubtitle, ISession, IFavoriteSubtitle } from "../lib";

declare const firebase: any;

export class FavoriteSubtitlesPanel extends Panel {
    private readonly dbFavoritesRef: any;
    private readonly dbSubtitlesRef: any;

    private unsubscribe?: () => void;

    // TODO: get rid of JQuery
    private readonly $container: JQuery;

    constructor(container: HTMLElement, dbFavoritesRef: any, dbSubtitlesRef: any) {
        super('favorite-subtitles', container);

        this.$container = $(container.querySelector("#favorite-subs-container") as HTMLElement);

        const subsPlaceholderEl = this.containerEl.querySelector(".subs");
        if (!subsPlaceholderEl) throw new Error("Favorite Subtitle panel must have a placeholder element for subs");

        this.dbFavoritesRef = dbFavoritesRef;
        this.dbSubtitlesRef = dbSubtitlesRef;
    }

    protected init() {
        super.init();

        if (!this.containerEl)
            return;

        // TODO: only get the favorites of logged in user
        this.unsubscribe = this.dbFavoritesRef.orderBy("created")
            .onSnapshot(snapshot => {
                console.log(snapshot);
                snapshot.docChanges().forEach(change => {
                    const subtitle = Object.assign(change.doc.data(), { id: change.doc.id }) as ISubtitle;
                    if (change.type === "added") {
                        this.addSubtitleToDom(subtitle);
                    }
                    if (change.type === "modified") {
                        this.updateSubtitleInDom(subtitle);
                    }
                    if (change.type === "removed") {
                        this.deteleSubtitleInDom(subtitle);
                    }
                });
            });

        this.containerEl.addEventListener("click", e => this.deleteIconClickHandler(e));
    }

    private deleteIconClickHandler(event: Event) {
        event.preventDefault();
        const targetEl = event.target as HTMLElement;
        const deleteFavoriteIconEl = targetEl.closest(".delete-favorite");
        if (deleteFavoriteIconEl) {
            const subEl = deleteFavoriteIconEl.closest(".sub");
            if (subEl) {
                const subid = subEl.attributes["data-subid"].value;
                this.deleteFromFavorites(subid);
            }
        }
    }

    protected deinit() {
        if (this.unsubscribe) this.unsubscribe();
        super.deinit();
    }

    public close() {
        // remove all subtitles from DOM
        super.close();
        this.$container.empty();
    }

    private getSubitleTemplate(sub: ISubtitle): JQuery {
        const $template = $(`
            <div class="sub" data-subid="${sub.id}">
                <p class="original">${sub.subtitle}</p>
            </div>`);

        if (sub.translation) {
            // TODO: reduce into single append!
            $template.append(`<p class="translation">${sub.translation}</p>`);
            $template.append(`
                <div class="sub-controls">
                    <a href="#" class="delete-favorite"><span >✘</span></a>
                    <!-- <a href="#" class="edit-favorite"><span>✎</span></a> -->
                </div>`);
            $template.append(`<div class="clear"></div>`);
        }

        return $template;
    }

    private addSubtitleToDom(sub: ISubtitle) {
        if (!this.$container)
            return;

        // todo: use an dictionary to keep reference of subtitles in DOM by id
        const $template = this.getSubitleTemplate(sub);
        this.$container.append($template);
    }

    private updateSubtitleInDom(sub: ISubtitle) {
        if (!this.$container)
            return;

        const $template = this.getSubitleTemplate(sub);

        // todo: use an dictionary to keep reference of subtitles in DOM by id
        this.$container.find(`.sub[data-subid=${sub.id}]`).replaceWith($template);
    }

    private deteleSubtitleInDom(sub: ISubtitle) {
        this.$container.find(".sub[data-subid=" + sub.id + "]").remove();
    }

    private deleteFromFavorites(subId: string) {
        const favoriteSubRef = this.dbFavoritesRef.doc(subId);
        favoriteSubRef.get().then(favoriteSubDoc => {
            favoriteSubRef.delete().then(function () {
                console.log("Document successfully deleted!");
            }).catch(function (error) {
                console.error("Error removing document: ", error);
            });

            this.dbSubtitlesRef.doc((favoriteSubDoc.data() as IFavoriteSubtitle).sourceSubtitleId).update(
                { favoriteId: firebase.firestore.FieldValue.delete() });
        });
    }
}