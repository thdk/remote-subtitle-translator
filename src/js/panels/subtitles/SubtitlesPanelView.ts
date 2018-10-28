import { ISubtitlesPanelController } from "./SubtitlesPanelController";
import { IPanelDependencies, PanelWithActions } from "../panels";
import { ISubtitle, ISession } from "../../lib";
import { IPannelView } from "../../lib/base/panel";

import {MDCRipple} from '@material/ripple';
import { requireEl } from "../../lib/utils";

export interface ISubtitlesPanelView extends IPannelView {
    setActiveRealTimeButton(isRealtime: boolean);
    setActiveHideOriginalsButton(hideOriginals: boolean);
    setSingleViewMode();
    toolbarToggleHideOriginalsButton(view: boolean);
    setActiveHideOriginals(hideOriginals: boolean);
    addSubtitleToDom(sub: ISubtitle): void;
    updateSubtitleInDom(oldSub: ISubtitle, newSub: ISubtitle);
    sessionAvailable(oldSession: ISession | undefined, newSession: ISession);
}

export interface ISubtitlesPanelViewDependencies extends IPanelDependencies {
    toggleDrawer: () => void;
}

export class SubtitlesPanelView extends PanelWithActions implements ISubtitlesPanelView {
    private readonly controller: ISubtitlesPanelController;

    private readonly $container: JQuery;
    private readonly playbackButtonEl: HTMLElement;
    private readonly subs: { [id: string]: HTMLElement } = {};
    private readonly toolbarToggleDrawer: () => void;

    constructor(container: HTMLElement, controllerCreator: (view: ISubtitlesPanelView) => ISubtitlesPanelController, deps: ISubtitlesPanelViewDependencies) {
        super("subtitles", container, deps);

        this.toolbarToggleDrawer = deps.toggleDrawer;

        const subsPlaceholderEl = this.containerEl.querySelector("#subsContainer");
        if (!subsPlaceholderEl) throw new Error("Subtitle panel must have a placeholder element for subs");

        // todo: get rid of JQuery
        this.$container = $(subsPlaceholderEl as HTMLElement);
        this.playbackButtonEl = requireEl(".rst-toggleplayback", this.containerEl);

        this.controller = controllerCreator(this);

        // TODO: move to controller?
        this.actions = [
            {
                iconActive: "cloud",
                icon: "cloud_off",
                text: "Realtime",
                action: () => this.controller.toggleRealtimeTranslation()
            },
            {
                iconActive: "unfold_less",
                icon: "unfold_more",
                text: "English only",
                action: () => this.controller.toggleHideOriginals()
            },
            {
                icon: "fullscreen",
                text: "Fullscreen",
                action: () => this.controller.toggleSingleView()
            }
        ];
    }

    protected init() {
        super.init();

        // const fabRipple = new MDCRipple(document.querySelector('.mdc-fab'));

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

        this.playbackButtonEl.addEventListener("click", (e) => {
            this.controller.togglePlayback();
        })
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
            const result = confirm("Do you want to begin a new session?");
            if (result) this.controller.requestSubtitles(newSession);
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
        // todo: use an dictionary to keep reference of subtitles in DOM by id
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
        window.scrollTo(0,document.body.scrollHeight);
    }
}