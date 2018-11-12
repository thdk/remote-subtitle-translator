import { INavigationController } from "./NavigationController";

import { MDCDrawer } from "@material/drawer";
import { requireEl, requireEls } from "../lib/utils";

interface IDrawer {
    open: boolean;
}

export interface INavigationView {
    show();
    hide();
    toggle();
    setItems(items: INavigationItem[] | undefined);
    setActiveItem(id: string);
}

export interface INavigationItem {
    label: string;
    icon?: string;
    id: string;
    action: () => void;
}

export type NavigationViewItem = Exclude<INavigationItem, "action">;

export class DrawerNavigationView implements INavigationView {
    private readonly controller: INavigationController;
    private readonly containerEl: HTMLElement;
    private readonly listEl: HTMLElement;
    private drawer: IDrawer;

    private isOpen = false;

    constructor(controllerCreator: (view) => INavigationController) {
        // material design drawer must have a mdc-drawer class
        this.containerEl = requireEl(".mdc-drawer");
        this.listEl = requireEl(".mdc-list", this.containerEl);

        this.drawer = MDCDrawer.attachTo(this.containerEl);

        this.controller = controllerCreator(this);

        // TODO: move to init (and deinit)
        this.containerEl.addEventListener("click", e => {
            e.preventDefault();
            const target = e.target as HTMLElement;
            const navItemEl = target ? target.closest(".mdc-list-item") : undefined;
            if (navItemEl) {
                this.controller.itemClicked(navItemEl.attributes["data-item-name"].value);
            }
        });
    }

    public hide() {
        this.drawer.open = false;
    }

    public show() {
        this.drawer.open = true;
    }

    public toggle() {
        this.isOpen ? this.hide() : this.show();
    }

    public setItems(items: NavigationViewItem[] | undefined) {
        if (!items) {
            this.listEl.innerHTML = "";
            return;
        }

        this.listEl.innerHTML = items.reduce<string>((result, item) => result + this.getTemplate(item), "");
    }

    public setActiveItem(id: string) {
        const itemEls = requireEls(".mdc-list-item", this.listEl);
        itemEls.forEach(itemEl =>
            itemEl.classList.toggle("mdc-list-item--activated", itemEl.getAttribute("data-item-name") === id.toLowerCase()));
    }

    private getTemplate(item: NavigationViewItem) {
        // TODO: add mdc-list-item--activated css class for active item
        const iconElString = item.icon ? `<i class="material-icons mdc-list-item__graphic" aria-hidden="true">${item.icon}</i>` : "";
        return `<a class="mdc-list-item" data-item-name="${item.id.toLowerCase()}" href="#" aria-selected="true">
            ${iconElString}
            <span class="mdc-list-item__text">${item.label}</span>
        </a>`;
    }
}