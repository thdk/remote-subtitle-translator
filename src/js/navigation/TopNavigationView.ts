import { ITopNavigationController } from "./TopNavigationController";

export interface ITopNavigationView {
    hide(): void;
    show(): void;
}

export class TopNavigationView {
    private readonly controller: ITopNavigationController;
    private readonly containerEl: HTMLElement;

    constructor(controllerCreator: (view) => ITopNavigationController) {
        const container = document.getElementById('top-navigation');
        if (!container) {
            throw new Error("'top-navigation' element is required");
        }

        this.containerEl = container;

        this.controller = controllerCreator(this);

        container.addEventListener("click", e => {
            e.preventDefault();
            const target = e.target as HTMLElement;
            const navItemEl = target ? target.closest(".nav-item") : undefined;
            if (navItemEl) {
                this.controller.itemClicked(navItemEl.attributes["data-item-name"].value);
            }
        });
    }

    public hide() {
        this.containerEl.style.display = 'none';
    }

    public show() {
        this.containerEl.style.display = 'block';
    }
}