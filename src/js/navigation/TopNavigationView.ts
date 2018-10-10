import { INavigationController } from "./NavigationController";

export interface INavigationView {
    hide(): void;
    show(): void;
    toggle(): void;
}

export class TopNavigationView implements INavigationView {
    private readonly controller: INavigationController;
    private readonly containerEl: HTMLElement;
    private isOpen = false;

    constructor(controllerCreator: (view) => INavigationController) {
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
        this.isOpen = false;
        this.containerEl.style.display = 'none';
    }

    public show() {
        this.isOpen = true;
        this.containerEl.style.display = 'block';
    }

    public toggle() {
        this.isOpen ? this.hide() : this.show();
    }
}