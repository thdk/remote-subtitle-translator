import { ITopNavigationView } from "./TopNavigationView";
import { PanelDashboard } from "../panels/dashboard";
import { IBroadcaster, IMessage, IListener, PubSubBroadcaster } from "../broadcaster";

export interface ITopNavigationController {
    itemClicked: (itemName: string) => void;
}

export class TopNavigationController implements ITopNavigationController, IListener {
    private readonly panelDashboard: PanelDashboard;
    private readonly view: ITopNavigationView;
    private readonly broadcaster: IBroadcaster;

    constructor(panelDashboard: PanelDashboard, view: ITopNavigationView){
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