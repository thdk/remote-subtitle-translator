/// <reference path="panels.ts" />

import { Panel } from "./panels";
import { ITranslateService, ISubtitle, ISession } from "../lib";

declare const firebase: any;

export class SubtitlesPanel extends Panel {
    // todo: get rid of JQuery (use the containerEl on Panel instead)
    private readonly $container: JQuery;
    private readonly $toolbar: JQuery;

    private readonly translateService: ITranslateService;
    private readonly dbSubtitlesRef: any;
    private readonly session?: ISession;

    private readonly dbFavoritesRef: any;
    private readonly dbSessionsRef: any;

    // todo: use a better authentication manager
    private readonly uid: string;

    private unsubscribe?: () => void;

    constructor(container: HTMLElement, uid: string, dbSubtitlesRef:any,  dbFavoritesRef: any, dbSessionsRef: any, session: ISession, translateService: ITranslateService) {
        super('subtitles', container);

        this.uid = uid;

        const subsPlaceholderEl = this.containerEl.querySelector("#subsContainer");
        if (!subsPlaceholderEl) throw new Error("Subtitle panel must have a placeholder element for subs");

        // todo: get rid of JQuery
        this.$container = $(subsPlaceholderEl as HTMLElement);
        this.$toolbar = $(this.containerEl.querySelector("#toolbar") as HTMLElement);

        this.translateService = translateService;
        this.dbFavoritesRef = dbFavoritesRef;
        this.dbSessionsRef = dbSessionsRef;
        this.dbSubtitlesRef = dbSubtitlesRef;
        this.session = session;
    }

    protected init() {
        super.init();

        if (!this.containerEl || !this.$toolbar)
            return;

        this.$container.on("click.rst", ".sub", e => {
            const $target = $(e.currentTarget);
            const subId = $target.attr("data-subid");
            this.translateService.translate($target.find("p.original").html()).then(translation => {
                if (this.dbSubtitlesRef) {
                    this.dbSubtitlesRef.doc(subId).update({ translation });
                } else {
                    throw new Error("Can't update subtitle: dbSubtitlesRef is undefined.");
                }
            });
        });

        this.$container.on("click.rst", ".fav, .unfav", e => {
            const $target = $(e.currentTarget);
            const subId = $target.closest(".sub").attr("data-subid");
            if (!subId) {
                throw new Error("Can't add subtitle to favorites. No element .sub found with attibute: data-subid");
            }

            this.toggleSubtitleInFavoritesAsync(subId);
        });

        this.$toolbar.on("click.rst touch.rst", ".toggleplayback", e => {
            e.preventDefault();

            if (!this.dbSessionsRef) return;

            this.dbSessionsRef.doc(this.session!.id).update({ isWatching: !this.session!.isWatching }).then(() => {
                this.session!.isWatching = !this.session!.isWatching;
            });
        });

        this.unsubscribe = this.dbSubtitlesRef.orderBy("created")
            .onSnapshot(snapshot => {
                snapshot.docChanges().forEach(change => {
                    const subtitle = Object.assign(change.doc.data(), { id: change.doc.id }) as ISubtitle;
                    if (change.type === "added") {
                        this.addSubtitleToDom(subtitle);
                    }
                    if (change.type === "modified") {
                        this.updateSubtitleInDom(subtitle);
                    }
                    if (change.type === "removed") {
                        throw 'not implemented';
                    }
                });
            });
    }

    protected deinit() {
        if (this.unsubscribe) this.unsubscribe();

        this.$container.off(".rst");
        this.$toolbar.off(".rst");
        super.deinit();
    }

    public openAsync() {
        // TODO: implement firebase auth and replace below uid with the uid of logged in user
        if (!this.uid) throw new Error("firebase uid is not set!");

        return super.openAsync();
    }

    public close() {
        super.close();
        // remove all subtitles from DOM
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
                    <span class="fav${!sub.favoriteId ? "" : " hide"}">☆</span>
                    <span class="unfav${sub.favoriteId ? "" : " hide"}">★</span>
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
        this.scrollDown();
    }

    private updateSubtitleInDom(sub: ISubtitle) {
        if (!this.$container)
            return;

        const $template = this.getSubitleTemplate(sub);

        // todo: use an dictionary to keep reference of subtitles in DOM by id
        this.$container.find(`.sub[data-subid=${sub.id}]`).replaceWith($template);
    }

    private toggleSubtitleInFavoritesAsync(subId: string) {
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
                const fav = {
                    sourceSubtitleId,
                    subtitle,
                    translation,
                    created: firebase.firestore.FieldValue.serverTimestamp(),
                    uid: this.uid
                };
                const favoriteSubRef = this.dbFavoritesRef!.doc();

                return Promise.all([
                    favoriteSubRef.set(fav),
                    sourceSubtitleRef.update({ favoriteId: favoriteSubRef.id })
                ]);
            }
        });
    }

    private scrollDown() {
        if (!this.$toolbar)
            return;

        $('html, body').animate({
            scrollTop: this.$toolbar.offset()!.top + 100
        }, 0);
    }
}