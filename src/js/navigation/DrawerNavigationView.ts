import { INavigationController } from "./NavigationController";

import {MDCDrawer} from "@material/drawer";

interface IDrawer {
    open: boolean;
}

export interface INavigationView {
    show();
    hide();
    toggle();
}

export class DrawerNavigationView implements INavigationView {
    private readonly controller: INavigationController;
    private readonly containerEl: HTMLElement;
    private drawer: IDrawer;

    private isOpen = false;

    constructor(controllerCreator: (view) => INavigationController) {
        // material design drawer must have a mdc-drawer class
        const container = document.querySelector<HTMLElement>(".mdc-drawer");
        if (!container)  throw new Error(".mdc-drawer element is required");
        this.containerEl = container;

        this.drawer = MDCDrawer.attachTo(this.containerEl);

        this.controller = controllerCreator(this);

        container.addEventListener("click", e => {
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
}