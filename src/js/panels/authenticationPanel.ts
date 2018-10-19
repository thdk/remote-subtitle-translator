import { Panel, IPanelDependencies } from "./panels";
import { IAuthenticator } from "../lib/authenticator";

interface IAuthenticatorDependencies extends IPanelDependencies {
    authenticator: IAuthenticator;
}

export class AuthenticationPanel extends Panel {
    private readonly authenticator: IAuthenticator;

    constructor(deps: IAuthenticatorDependencies, containerEl: HTMLElement) {
        super("authentication", containerEl, deps);
        this.authenticator = deps.authenticator;
    }

    public openAsync() {
        return this.authenticator.launchFirebaseAuthUIAsync('#firebaseui-auth-container')
            .then(() => {
                // Firebase auth ui is shown
                return super.openAsync();
            });
    }
}