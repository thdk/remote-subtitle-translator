/// <reference path="panels.ts" />

import { Panel, IPanelDependencies } from "./panels";
import { requireEl, requireEls } from "../lib/utils";

import * as auth from "../lib/authenticator";
import {MDCRipple} from '@material/ripple';

export interface ISettingsPanelDependencies extends IPanelDependencies {
}

export class SettingsPanel extends Panel {
    private loggedInEls: HTMLElement[];

    constructor(container: HTMLElement, deps: ISettingsPanelDependencies) {
        super('settings', container, deps);
        this.loggedInEls = requireEls(".logged-in");
    }

    protected init() {
        super.init();
        requireEl("#settingsLogoutButton")
            .addEventListener("click", () => auth.logout());


        const buttonRipple = new MDCRipple(document.querySelector('.mdc-button'));
    }

    public openAsync() {
        return auth.getLoggedInUserAsync().then(user => {
            requireEl('.logged-in.username span')
                .textContent = user.displayName + "(" + user.email + ")";

            // display all elements for logged in users
            this.loggedInEls.forEach(el => {
                el.style.display = 'block';
            });
        })
        .then(() => super.openAsync());
    }
}