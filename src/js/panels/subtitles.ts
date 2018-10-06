import { Panel } from "./panels";
import { ITranslateService, ISubtitle, ISession } from "../lib";

import * as firebase from "firebase";
import "firebase/firestore";
import "firebase/auth";
import { getLastValueInMap } from "../lib/utils";

type PlayerSettings = {
    realtimeTranslation: boolean;
    hideOriginals: boolean;
}

type SubtitleWithHtmlElement = { el: HTMLElement, subtitle: ISubtitle };

export class SubtitlesPanel extends Panel {
    // todo: get rid of JQuery (use the containerEl on Panel instead)
    private readonly $container: JQuery;
    private readonly $toolbar: JQuery;
    private readonly toolbarRealtimeButtonEl: HTMLElement;
    private readonly toolbarHideOriginalsButtonEl: HTMLElement;
    private readonly toolbarToggleSingleViewButtonEl: HTMLElement;

    private readonly translateService: ITranslateService;
    private readonly dbSubtitlesRef: firebase.firestore.CollectionReference;
    private readonly session?: ISession;

    private readonly dbFavoritesRef: firebase.firestore.CollectionReference;
    private readonly dbSessionsRef: firebase.firestore.CollectionReference;

    private readonly subs: Map<string, SubtitleWithHtmlElement> = new Map();

    // todo: use a better authentication manager
    private readonly uid: string;

    private unsubscribe?: () => void;

    private settings: PlayerSettings;

    constructor(container: HTMLElement, uid: string, dbSubtitlesRef: firebase.firestore.CollectionReference, dbFavoritesRef: firebase.firestore.CollectionReference, dbSessionsRef: firebase.firestore.CollectionReference, session: ISession, translateService: ITranslateService) {
        super('subtitles', container);

        this.settings = {
            realtimeTranslation: false,
            hideOriginals: false
        }

        this.uid = uid;

        const subsPlaceholderEl = this.containerEl.querySelector("#subsContainer");
        if (!subsPlaceholderEl) throw new Error("Subtitle panel must have a placeholder element for subs");

        // todo: get rid of JQuery
        this.$container = $(subsPlaceholderEl as HTMLElement);
        this.$toolbar = $(this.containerEl.querySelector("#toolbar") as HTMLElement);
        this.toolbarRealtimeButtonEl = this.$toolbar.find(".toggleRealtime")[0];
        this.toolbarHideOriginalsButtonEl = this.$toolbar.find(".hideOriginals")[0];
        this.toolbarToggleSingleViewButtonEl = this.$toolbar.find(".toggleSingleView")[0];

        // reflect default settings in view with their side effects
        this.settingsSetHideOriginals(this.settings.hideOriginals);
        this.settingsSetRealtimeTranslation(this.settings.realtimeTranslation);

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

            // don't translate twice
            if (!$target.find("p.translation").length) {
                const subId = $target.attr("data-subid");
                const text = $target.find("p.original").html();
                if (subId) {
                    this.translate(subId, text);
                }
            }
        });

        this.$container.on("click.rst, tap.rst", ".fav, .unfav", e => {
            e.preventDefault();
            e.stopPropagation();
            const $target = $(e.currentTarget);
            const subId = $target.closest(".sub").attr("data-subid");
            if (!subId) {
                throw new Error("Can't add subtitle to favorites. No element .sub found with attibute: data-subid");
            }

            this.controllerToggleSubtitleInFavoritesAsync(subId);
        });

        this.$toolbar.on("click.rst touch.rst", ".toggleplayback", e => {
            e.preventDefault();

            if (!this.dbSessionsRef) return;

            this.dbSessionsRef.doc(this.session!.id).update({ isWatching: !this.session!.isWatching }).then(() => {
                this.session!.isWatching = !this.session!.isWatching;
            });
        });

        this.$toolbar.on("click.rst touch.rst", ".toggleRealtime", e => {
            e.preventDefault();
            this.controllerRealtimeTranslationClicked();
        });

        this.$toolbar.on("click.rst touch.rst", ".hideOriginals", e => {
            e.preventDefault();
            this.controllerHideOriginalsClicked();
        });

        this.$toolbar.on("click.rst touch.rst", ".toggleSingleView", e => {
            e.preventDefault();
            this.controllerToggleSingleViewClicked(!document.querySelector("body")!.classList.contains("single-view"));
        });

        this.unsubscribe = this.dbSubtitlesRef.orderBy("created")
            .onSnapshot(snapshot => {
                snapshot.docChanges().forEach(change => {
                    const subtitle = Object.assign(change.doc.data(), { id: change.doc.id }) as ISubtitle;
                    if (change.type === "added") {
                        const subEl = this.addSubtitleToDom(subtitle);
                        this.subs.set(subtitle.id, { el: subEl, subtitle });

                        if (!subtitle.translation && this.settings.realtimeTranslation) {
                            this.translate(subtitle.id, subtitle.subtitle);
                        }
                    }
                    if (change.type === "modified") {
                        const sub = this.subs.get(subtitle.id);
                        if (sub) {
                            this.updateSubtitle(sub.subtitle, subtitle, sub.el);
                            sub.subtitle = {...sub.subtitle, ...subtitle};
                            if (sub.subtitle.translation || (!subtitle.translation && this.settings.realtimeTranslation)) {
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

    private translate(subId: string, text: string) {
        this.translateService.translate(text).then(translation => {
            if (this.dbSubtitlesRef) {
                this.dbSubtitlesRef.doc(subId).update({ translation });
            } else {
                throw new Error("Can't update subtitle: dbSubtitlesRef is undefined.");
            }
        });
    }

    private controllerRealtimeTranslationClicked() {
        this.settingsSetRealtimeTranslation(!this.settings.realtimeTranslation);
    }

    private settingsSetRealtimeTranslation(realtime: boolean) {
        this.settings.realtimeTranslation = realtime;
        this.viewToolbarSetActiveRealTimeButton(realtime);
        this.viewToolbarToggleHideOriginalsButton(realtime);

        if (!this.settings.realtimeTranslation) {
            this.settingsSetHideOriginals(false);
        }
    }

    private settingsSetHideOriginals(hideOriginals: boolean) {
        this.settings.hideOriginals = hideOriginals;
        this.viewSetActiveHideOriginals(hideOriginals);
    }

    private viewToolbarSetActiveRealTimeButton(isRealtime: boolean) {
        this.toolbarRealtimeButtonEl.classList.toggle("active", isRealtime);
    }

    private viewToolbarSetActiveHideOriginalsButton(hideOriginals: boolean) {
        this.toolbarHideOriginalsButtonEl.classList.toggle("active", hideOriginals);
    }

    private controllerHideOriginalsClicked() {
        this.settingsSetHideOriginals(!this.settings.hideOriginals);
    }

    private controllerToggleSingleViewClicked(singleView: boolean) {
        this.viewSetSingleViewMode(singleView);
    }

    private viewSetSingleViewMode(singleView) {
        document.querySelector("body")!.classList.toggle("single-view", singleView);
        if (!singleView) this.scrollDown();
    }

    private viewToolbarToggleHideOriginalsButton(view: boolean) {
        this.toolbarHideOriginalsButtonEl.style.display = view ? "block" : "none";
    }

    private viewSetActiveHideOriginals(hideOriginals: boolean) {
        this.viewToolbarSetActiveHideOriginalsButton(hideOriginals);
        this.$container.toggleClass("hide-originals", hideOriginals);
    }

    private controllerShouldHideOriginals() {
        return this.settings.hideOriginals;
    }

    private getSubitleTemplate(sub: ISubtitle): string {
        return `
            <div class="sub ${sub.translation ? "has-translation" : "no-translation"}" data-subid="${sub.id}">
                <p class="original${this.controllerShouldHideOriginals() ? " hide" : ""}">${sub.subtitle}</p>
                ${sub.translation ? this.getSubtitleTranslationTemplate(sub) : ""}
                <div class="clear last"></div>
            </div>`;
    }

    private getSubtitleTranslationTemplate(sub: ISubtitle): string {
        return `
                <p class="translation">${sub.translation}</p>
                ${this.getSubtitleControlsTemplate(sub)}
            `;
    }

    private getSubtitleControlsTemplate(sub: ISubtitle): string {
        return `
            <div class="sub-controls">
                <span class="fav${!sub.favoriteId ? "" : " hide"}">☆</span>
                <span class="unfav${sub.favoriteId ? "" : " hide"}">★</span>
            </div>`;
    }

    private addSubtitleToDom(sub: ISubtitle) {
        // todo: use an dictionary to keep reference of subtitles in DOM by id
        const template = this.getSubitleTemplate(sub);
        const lastSub = getLastValueInMap<SubtitleWithHtmlElement>(this.subs);
        const isMulti = sub.time && lastSub && lastSub.subtitle.time === sub.time;

        // based on current scroll position, decide before appending new item to DOM
        const canScrollDown = this.canScrollDown();

        const $template = $(template);
        this.$container.append($template);

        if (isMulti) {
            $template.addClass("multi");
            // WARNING: THIS MUST BE OPTIMIZED!
            this.subs.forEach(s => s.el.classList.remove("multi"));
            lastSub!.el.classList.add("multi");
        }

        if (canScrollDown) this.scrollDown();

        return $template[0];
    }

    private canScrollDown(): boolean {
        return window.innerHeight + window.scrollY >= document.body.offsetHeight;
    }

    private updateSubtitle(oldSub: ISubtitle, newSub: ISubtitle, subEl: HTMLElement) {
        // based on current scroll position, decide before appending new item to DOM
        const canScrollDown = this.canScrollDown();

        // update original?
        if (oldSub.subtitle !== newSub.subtitle) {
            subEl.querySelector(".original")!.textContent = newSub.subtitle;
        }


        // update translation?
        subEl.classList.toggle("has-translation", !!newSub.translation);
        subEl.classList.toggle("no-translation", !newSub.translation);
        if (!oldSub.translation && newSub.translation) {
            const translationEl = this.getSubtitleTranslationTemplate(newSub);
            subEl.querySelector(".last")!.insertAdjacentHTML("beforebegin", translationEl);
        } else if (newSub.translation) {
            if (oldSub.translation !== newSub.translation) {
                subEl.querySelector(".translation")!.textContent = newSub.translation;
            }
            if (newSub.favoriteId !== oldSub.favoriteId) {
                const subControlsEl = subEl.querySelector(".sub-controls");
                if (subControlsEl) {
                    subControlsEl.querySelector(".fav")!.classList.toggle("hide", !!newSub.favoriteId);
                    subControlsEl.querySelector(".unfav")!.classList.toggle("hide", !newSub.favoriteId);
                }
            }
        }

        if (canScrollDown) this.scrollDown();
    }

    private controllerToggleSubtitleInFavoritesAsync(subId: string) {
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