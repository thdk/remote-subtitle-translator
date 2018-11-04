import { DrawerNavigationView, INavigationItem } from "./DrawerNavigationView";
import { INavigationControllerDependencies, NavigationController } from "./NavigationController";
import { PanelDashboard, AnyPanel } from "../panels/dashboard";
import { waitAsync } from "../lib/utils";
import { IListener, IBroadcaster, Library } from "../lib/interfaces";
import { AnyMessage } from "../messages";

export interface IMainNavigationDependencies extends INavigationControllerDependencies {
    panelDashboard: PanelDashboard;
    broadcaster: IBroadcaster;
    library: Library;
}

export interface INavigationPath extends Pick<AnyPanel, "name"> {
    isNavigationAllowedAsync: () => Promise<boolean>
}

export class MainNavigation implements IListener {
    private readonly navigationPaths: INavigationPath[];
    private view?: DrawerNavigationView;
    private items?: INavigationItem[];
    private readonly library: Library;
    private readonly panelDashboard: PanelDashboard;
    private readonly broadcaster: IBroadcaster;

    // TODO: typing: navigationIds should be allowed only valid panel names!
    public constructor(deps: IMainNavigationDependencies, paths: INavigationPath[]) {
        this.navigationPaths = paths;
        this.panelDashboard = deps.panelDashboard;
        this.broadcaster = deps.broadcaster;
        this.library = deps.library;

        this.validateAndFilterItemsAsync().then(() => {
            this.view = new DrawerNavigationView(view => new NavigationController(view, this.items, deps));
        });

        this.subscribe();
    }

    public toggle() {
        return this.getViewAsync().then(view =>  {
            // Do not show the drawer if it's empty
            if (this.items !== undefined && this.items.length) {
                view.toggle();
            }
        });
    }

    private getViewAsync() {
        return new Promise<DrawerNavigationView>(resolve => {
            if (this.view !== undefined) resolve(this.view);
            else return waitAsync<DrawerNavigationView>(500, this.view!).then(() => this.getViewAsync());
        });
    }

    private validateAndFilterItemsAsync() {
        return Promise.all(this.navigationPaths.map(p => p.isNavigationAllowedAsync().then(isAllowed => {
            return { p, isAllowed };
        })))
            .then(validatedPaths => {
                this.items = validatedPaths
                    .filter(p => p.isAllowed)
                    .map(vp => vp.p)
                    .map(rule => ({
                        id: rule.name,
                        label: this.library[rule.name].text,
                        icon: this.library[rule.name].icon,
                        action: () => this.panelDashboard.showPanel(rule.name)
                    }));;
            });
    }

    public onMessage(message: AnyMessage) {
        switch (message.type) {
            case "authentication":
                this.validateAndFilterItemsAsync().then(() => {
                    this.view!.setItems(this.items);
                });
            break;
        }
    }

    public subscribe() {
        this.broadcaster.subscribe(this);
    }

    public unsubscribe() {
        this.broadcaster.unsubscribe(this);
    }
}