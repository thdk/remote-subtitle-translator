import { ISubtitlesPanelController } from "./SubtitlesPanelController";
import { IPanelDependencies, PanelWithActions } from "../panels";
import { ISubtitle, ISession } from "../../lib";
import { IPannelView } from "../../lib/base/panel";

import { MDCRipple } from '@material/ripple';
import { requireEl } from "../../lib/utils";
import { Snackbar } from "../../components/snackbar";

export interface ISubtitlesPanelView extends IPannelView {
    setActiveRealTimeButton(isRealtime: boolean);
    setActiveHideOriginalsButton(hideOriginals: boolean);
    setSingleViewMode();
    setPlaybackState(isPlaying: boolean);
    toolbarToggleHideOriginalsButton(view: boolean);
    setActiveHideOriginals(hideOriginals: boolean);
    addSubtitleToDom(sub: ISubtitle): void;
    updateSubtitleInDom(oldSub: ISubtitle, newSub: ISubtitle);
    sessionAvailable(oldSession: ISession | undefined, newSession: ISession);
}

export interface ISubtitlesPanelViewDependencies extends IPanelDependencies {
    readonly snackbar: Snackbar;
}

export class SubtitlesPanelView extends PanelWithActions implements ISubtitlesPanelView {
    private readonly controller: ISubtitlesPanelController;

    private readonly $container: JQuery;
    private readonly playFabEl: HTMLElement;
    private readonly pauseFabEl: HTMLElement;
    private subs: { [id: string]: HTMLElement } = {};
    private readonly snackbar: Snackbar;

    constructor(container: HTMLElement, controllerCreator: (view: ISubtitlesPanelView) => ISubtitlesPanelController, deps: ISubtitlesPanelViewDependencies) {
        super("subtitles", container, deps);

        this.snackbar = deps.snackbar;

        const subsPlaceholderEl = this.containerEl.querySelector("#subsContainer");
        if (!subsPlaceholderEl) throw new Error("Subtitle panel must have a placeholder element for subs");

        // todo: get rid of JQuery
        this.$container = $(subsPlaceholderEl as HTMLElement);

        this.playFabEl = requireEl(".rst-playFab", this.containerEl);
        this.pauseFabEl = requireEl(".rst-pauseFab", this.containerEl);

        this.controller = controllerCreator(this);

        // TODO: use message to inform app bar with possible actions
        this.actions = this.controller.getActions();
    }

    protected init() {
        super.init();

        // todo: use attach to instead of new MDCRipple
        const fabRipple = new MDCRipple(this.playFabEl);
        const fabRipplePause = new MDCRipple(this.pauseFabEl);

        if (!this.containerEl)
            return;

        this.$container.on("click.rst", ".sub:not(.has-translation)", e => {
            const $target = $(e.currentTarget);
            const subId = $target.attr("data-subid");
            if (subId) {
                const text = $target.find("p.original").html();
                this.controller.translate(subId, text);
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

            this.controller.toggleSubtitleInFavorites(subId);
        });

        this.playFabEl.addEventListener("click", (e) => {
            this.controller.togglePlayback();
        });

        this.pauseFabEl.addEventListener("click", (e) => {
            this.controller.togglePlayback();
        });
    }

    public deinit() {
        this.$container.off(".rst");
        super.deinit();
    }

    public dispose() {
        this.controller.dispose();
    }

    public openAsync() {
        this.controller.subscribe();
        return super.openAsync();
    }

    public close() {
        this.controller.unsubscribe();
        super.close();
    }

    public sessionAvailable(oldSession: ISession | undefined, newSession: ISession) {
        if (!oldSession) this.controller.requestSubtitles(newSession);
        else {
            this.snackbar.show({
                actionHandler: () => {
                    this.$container[0].innerHTML = "";
                    this.subs = {};
                    this.controller.requestSubtitles(newSession);
                },
                message: "New session detected.",
                actionText: "Load subs",
                timeout: 5000,
                multiline: true
            });
        }
    }

    public setPlaybackState(isPlaying: boolean) {
        if (isPlaying) {
            this.pauseFabEl.classList.remove("mdc-fab--exited");
            this.playFabEl.classList.add("mdc-fab--exited");
        }
        else {
            this.pauseFabEl.classList.add("mdc-fab--exited");
            this.playFabEl.classList.remove("mdc-fab--exited");
        }
    }

    public setActiveRealTimeButton(isRealtime: boolean) {
        // TODO: implement this
    }

    public setActiveHideOriginalsButton(hideOriginals: boolean) {
        // TODO: implement this
    }

    public setSingleViewMode() {
        document.querySelector("body")!.classList.toggle("single-view");
        if (!document.querySelector("body")!.classList.contains("single-view")) this.scrollDown();
    }

    public toolbarToggleHideOriginalsButton(view: boolean) {
        // TODO: implement this
    }

    public setActiveHideOriginals(hideOriginals: boolean) {
        this.setActiveHideOriginalsButton(hideOriginals);
        this.$container.toggleClass("hide-originals", hideOriginals);
    }

    public addSubtitleToDom(sub: ISubtitle) {
        const template = this.getSubtitleTemplate(sub);

        // based on current scroll position, decide before appending new item to DOM
        const canScrollDown = this.canScrollDown();

        const $template = $(template);
        this.$container.append($template);

        if (sub.isMulti) {
            // TODO: optimize removal of multi class
            this.$container.find(".sub.multi:not([data-subtime='" + sub.time + "'])").removeClass("multi");
            $template.addClass("multi");
        }

        if (canScrollDown) this.scrollDown();

        this.subs[sub.id] = $template[0];
    }

    public updateSubtitleInDom(oldSub: ISubtitle, newSub: ISubtitle) {
        const subEl = this.subs[oldSub.id];

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

    private canScrollDown(): boolean {
        return window.innerHeight + window.scrollY >= document.body.offsetHeight - 200;
    }

    private getSubtitleTemplate(sub: ISubtitle): string {
        return `
            <div class="sub ${sub.translation ? "has-translation" : "no-translation"}" data-subid="${sub.id}" data-subtime="${sub.time}">
                <p class="original${this.controller.shouldHideOriginals() ? " hide" : ""}">${sub.subtitle}</p>
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

    private scrollDown() {
        window.scrollTo(0, document.body.scrollHeight);
    }
}