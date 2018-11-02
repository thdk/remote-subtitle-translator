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
    isActive?: boolean;
}

export interface IAppBarView {
    setActions(actions: IAppBarAction[] | undefined);
    show(): void;
    hide(): void;
}

export interface IAppBarDependencies {
    toggleMenu: () => void;
}


export interface IAppBarOptions {
    type: "short" | "dense" | "prominent" | "fixed" | "standard";
    fixed: boolean;
}

export class AppBarView implements IAppBarView {
    private readonly topAppBar: MDCTopAppBar
    private readonly toggleMenu: () => void;
    private readonly topAppBarEl: HTMLElement;
    private readonly contentEl: HTMLElement;
    private readonly menuItemEl: HTMLElement;
    private readonly titleEl: HTMLElement;
    private readonly actionsEl: HTMLElement;
    private readonly controller: IAppBarController;
    private actions: { [id: string]: () => void } = {};
    private readonly options: IAppBarOptions;

    constructor(deps: IAppBarDependencies, contollerCreator: (view) => IAppBarController, options: IAppBarOptions = {type: "standard", fixed: false}) {
        this.options = options;
        this.topAppBarEl = requireEl(".mdc-top-app-bar");
        this.contentEl = this.topAppBarEl.nextElementSibling as HTMLElement;
        if (!this.contentEl) throw "App must have html content following the top app bar";

        this.menuItemEl = requireEl(".rst-top-bar-menu-item", this.topAppBarEl);
        this.titleEl = requireEl(".rst-title", this.topAppBarEl);
        this.actionsEl = requireEl(".rst-actions", this.topAppBarEl);

        // css classes must be set before initializing the material app bar component
        this.setCssClasses();
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
            // For the short type action bar, only one action is allowed
            if (this.options.type === "short" && actions.length > 1) actions.shift();

            this.actionsEl.classList.remove("hide");
            const actionsHtml = actions
                .map(a => {
                    this.actions[a.icon] = a.action;
                    return this.getActionTemplate(a, a.isActive);
                })
                .reduce((p, c) => p + c, "");
            this.actionsEl.insertAdjacentHTML("afterbegin", actionsHtml);

            Array.from(this.actionsEl.querySelectorAll<HTMLElement>(".mdc-icon-button")).forEach(buttonEl => {
                buttonEl.addEventListener("click", () => buttonEl.classList.toggle("mdc-icon-button--on"));
            })
        }

        this.setCssClasses(actions);
    }

    public setTitle(title: string | undefined) {
        this.titleEl.classList.toggle("hide", !title);
        this.titleEl.textContent = title ? title : null;
    }

    private setCssClasses(actions?: IAppBarAction[]) {
        const {type, fixed} = this.options;

        // short
        this.topAppBarEl.classList.toggle("mdc-top-app-bar--short", type === "short");
        this.contentEl.classList.toggle("mdc-top-app-bar--short-fixed-adjust", type === "short");
        this.topAppBarEl.classList.toggle("mdc-top-app-bar--short-has-action-item", type === "short" && actions && actions.length === 1);
        this.topAppBarEl.classList.toggle("mdc-top-app-bar--short-collapsed", type === "short" && fixed);

        // dense
        this.topAppBarEl.classList.toggle("mdc-top-app-bar--dense", type === "dense");
        this.contentEl.classList.toggle("mdc-top-app-bar--dense-fixed-adjust", type === "dense");

        // standard
        this.contentEl.classList.toggle("mdc-top-app-bar--fixed-adjust", type === "standard");

        // fixed
        this.topAppBarEl.classList.toggle("mdc-top-app-bar--fixed", fixed);
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

    public show() {
        this.topAppBarEl.style.display = "block";
    }

    public hide() {
        this.topAppBarEl.style.display = "none";
    }
}