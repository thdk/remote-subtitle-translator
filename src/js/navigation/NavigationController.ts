import { INavigationView } from "./TopNavigationView";
import { PanelDashboard } from "../panels/dashboard";
import { IBroadcaster, IMessage, IListener, PubSubBroadcaster } from "../broadcaster";

export interface INavigationController {
    itemClicked: (itemName: string) => void;
}

export class NavigationController implements INavigationController, IListener {
    private readonly panelDashboard: PanelDashboard;
    private readonly view: INavigationView;
    private readonly broadcaster: IBroadcaster;

    constructor(panelDashboard: PanelDashboard, view: INavigationView){
        this.panelDashboard = panelDashboard;
        this.view = view;

        this.broadcaster = new PubSubBroadcaster();
        this.broadcaster.subscribe(this);
    }

    public itemClicked(itemName: string) {
        this.panelDashboard.showPanel(itemName);
    }

    public onMessage(message: IMessage) {
        if (message.type === "loggedIn") {
            this.view.show();
        }

        if (message.type === "loggedOut") {
            this.view.hide();
        }
    }
}