import { MDCTopAppBar } from '@material/top-app-bar/index';
import { IAppBarController } from './AppBarController';
import { requireEl } from '../lib/utils';

/**
 * @param sequence Set sequence of action, lowest number should apear first. Higher sequence could be grouped in "More".
 */
export interface IAppBarAction {
    text: string;
    icon: string;
    iconActive?: string;
    action: () => void;
    sequence?: number;
}

export interface IAppBarView {
    setActions(actions: IAppBarAction[] | undefined)
}

export interface IAppBarDependencies {
    toggleMenu: () => void;
}

export class AppBarView implements IAppBarView {
    private readonly topAppBar: MDCTopAppBar
    private readonly toggleMenu: () => void;
    private readonly topAppBarEl: HTMLElement;
    private readonly menuItemEl: HTMLElement;
    private readonly titleEl: HTMLElement;
    private readonly actionsEl: HTMLElement;
    private readonly controller: IAppBarController;
    private actions: { [id: string]: () => void } = {};

    constructor(deps: IAppBarDependencies, contollerCreator: (view) => IAppBarController) {
        this.topAppBarEl = requireEl(".mdc-top-app-bar");
        this.menuItemEl = requireEl(".rst-top-bar-menu-item", this.topAppBarEl);
        this.titleEl = requireEl(".rst-title", this.topAppBarEl);
        this.actionsEl = requireEl(".rst-actions", this.topAppBarEl);
        this.topAppBar = new MDCTopAppBar(this.topAppBarEl);
        this.toggleMenu = deps.toggleMenu;

        this.controller = contollerCreator(this);

        // TODO: pass config options with title and actions
        this.setTitle(undefined);
        this.setActions(undefined);

        // add class on root html element
        requireEl("html").classList.add("has-top-app-bar");

        this.init();
    }

    public init() {
        this.menuItemEl.addEventListener("click", this.menuItemClicked.bind(this));
        this.topAppBarEl.addEventListener("click", this.topBarClicked.bind(this));
    }

    public dispose() {
        this.controller.dispose();
        this.menuItemEl.removeEventListener("click", e => this.menuItemClicked(e));
    }

    private topBarClicked(e: MouseEvent) {
        e.preventDefault();
        const targetEl = e.target as HTMLElement;
        const actionEl = targetEl.closest(".rst-action");
        if (actionEl) {
            const actionId = actionEl.getAttribute("data-action-id");
            if (!actionId) return;

            // TODO: actions should be run through the controller
            this.actions[actionId]();
        }
    }

    private menuItemClicked(e: MouseEvent) {
        e.preventDefault();
        this.toggleMenu();
    }

    public setActions(actions: IAppBarAction[] | undefined) {
        this.actions = {};
        this.actionsEl.innerHTML = "";
        if (!actions || !actions.length) {
            this.actionsEl.classList.add("hide");
        }
        else {
            this.actionsEl.classList.remove("hide");
            const actionsHtml = actions
                .map(a => {
                    this.actions[a.icon] = a.action;
                    return this.getActionTemplate(a);
                })
                .reduce((p, c) => p + c, "");
            this.actionsEl.insertAdjacentHTML("afterbegin", actionsHtml);

            Array.from(this.actionsEl.querySelectorAll<HTMLElement>(".mdc-icon-button")).forEach(buttonEl => {
                buttonEl.addEventListener("click", () => buttonEl.classList.toggle("mdc-icon-button--on"));
            })
        }
    }

    public setTitle(title: string | undefined) {
        this.titleEl.classList.toggle("hide", !title);
        this.titleEl.textContent = title ? title : null;
    }

    private getActionTemplate(action: IAppBarAction, active = false) {
        return `
            <button data-action-id=${action.icon} class="rst-action mdc-icon-button${active ? " mdc-icon-button--on" : ""}" aria-label="${action.text}"
                aria-hidden="true" aria-pressed="false">
                <i class="material-icons mdc-icon-button__icon mdc-icon-button__icon--on">${action.iconActive ? action.iconActive : action.icon}</i>
                <i class="material-icons mdc-icon-button__icon">${action.icon}</i>
            </button>
        `;
    }
}