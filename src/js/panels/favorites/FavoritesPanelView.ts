import { IPanelDependencies, Panel } from "../panels";
import { ISubtitle, ISession, IFavoriteSubtitle } from "../../lib";
import { IPannelView } from "../../lib/base/panel";

import { MDCRipple } from '@material/ripple';
import { requireEl } from "../../lib/utils";
import { Snackbar } from "../../components/snackbar";
import { IFavoritesPanelController } from "./FavoritesPanelController";

export interface IFavoritesPanelView extends IPannelView {
    confirmFavoriteRemoved: (undoAsync: () => Promise<boolean>) => void;
    addSubtitleToDom: (sub: IFavoriteSubtitle) => void;
    updateSubtitleInDom: (sub: IFavoriteSubtitle) => void;
    deteleSubtitleInDom: (sub: IFavoriteSubtitle) => void;
}

export interface IFavoritesPanelViewDependencies extends IPanelDependencies {
    snackbar: Snackbar;
}

export class FavoritesPanelView extends Panel implements IFavoritesPanelView {
    private readonly controller: IFavoritesPanelController;

    private readonly subsPlaceholderEl: HTMLElement;
    private favorites: { [id: string]: HTMLElement } = {};
    private readonly snackbar: Snackbar;

    constructor(container: HTMLElement, controllerCreator: (view: IFavoritesPanelView) => IFavoritesPanelController, deps: IFavoritesPanelViewDependencies) {
        super("favorites", container, deps);

        this.snackbar = deps.snackbar;

        this.subsPlaceholderEl = requireEl("#favorite-subs-container");

        this.controller = controllerCreator(this);
    }

    protected init() {
        super.init();
        this.containerEl.addEventListener("click", e => this.favoriteClickHandler(e));
    }

    public deinit() {
        this.containerEl.removeEventListener("click", e => this.favoriteClickHandler(e));
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

    private favoriteClickHandler(e: MouseEvent) {
        e.preventDefault();
        const targetEl = e.target as HTMLElement;
        const deleteFavoriteIconEl = targetEl.closest(".delete-favorite");
        if (deleteFavoriteIconEl) {
            const subEl = deleteFavoriteIconEl.closest(".sub");
            if (subEl) {
                const favoriteId = subEl.getAttribute("data-subid");
                this.controller.removeFromFavoritesClicked(favoriteId);
            }
        }
    }

    private getFavoriteTemplate(sub: IFavoriteSubtitle) {
        return this.getTextTemplate(sub) + this.getControlsTemplate(sub);
    }

    private getTextTemplate(sub: IFavoriteSubtitle): string {
        return `
                <div class="text">
                    <p class="original">${sub.subtitle}</p>
                    ${sub.translation ? `<p class="translation">${sub.translation}</p>` : ""}
                </div>
        `;
    }

    private getControlsTemplate(sub: IFavoriteSubtitle) {
        return sub.translation
            ? ` <div class="sub-controls">
                <button class="mdc-icon-button material-icons delete-favorite">clear</button>
                <!-- <a href="#" class="edit-favorite"><span>✎</span></a> -->
            </div>`
            : "";
    }

    public addSubtitleToDom(sub: IFavoriteSubtitle) {
        let favoriteEl: HTMLElement | null = document.createElement("div");
        favoriteEl.setAttribute("data-subid", sub.id);
        favoriteEl.classList.add("sub");
        favoriteEl.insertAdjacentHTML("afterbegin", this.getFavoriteTemplate(sub))

        // TODO: check typing of lib insertAdjecentElement if it could be made generic
        favoriteEl = this.subsPlaceholderEl.insertAdjacentElement("afterbegin", favoriteEl) as HTMLElement;
        if (favoriteEl == null) throw new Error("Could not insert favorite with id:" + sub.id);

        this.favorites[sub.id] = favoriteEl;
    }

    public updateSubtitleInDom(sub: IFavoriteSubtitle) {
        const template = this.getFavoriteTemplate(sub);
        this.favorites[sub.id].innerHTML = template;
    }

    public deteleSubtitleInDom(sub: IFavoriteSubtitle) {
        const favoriteEl = this.favorites[sub.id];
        favoriteEl.parentElement!.removeChild(favoriteEl);

        // todo: move to caller?
        delete this.favorites[sub.id];
    }

    public confirmFavoriteRemoved(undoAsync: () => Promise<boolean>): void {
        this.snackbar.show({
            message: "Subtitle removed from favorites",
            actionText: "undo",
            actionHandler: () => undoAsync().then(() => this.snackbar.show({
                message: "Subtitle back in favorites"
            }))
        });
    }
}