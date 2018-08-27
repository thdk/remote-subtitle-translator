import { ITopNavigationController } from "./TopNavigationController";

export interface ITopNavigationView {

}

export class TopNavigationView {
    private readonly controller: ITopNavigationController;

    constructor(controllerCreator: (view) => ITopNavigationController) {
        const container = document.getElementById('top-navigation');
        if (!container) {
            throw new Error("'top-navigation' element is required");
        }

        const settingsNavEl = container.querySelector(".settings");

        this.controller = controllerCreator(this);

        if (settingsNavEl) {
            settingsNavEl.addEventListener("click", e => {
                e.preventDefault();
                this.controller.settingsItemClicked();
            });
        }
    }
}