import { ITopNavigationView } from "./TopNavigationView";
import { PanelDashboard } from "../panels/dashboard";
import { IBroadcaster, BroadCaster, IMessage, IListener } from "../broadcaster";

export interface ITopNavigationController {
    itemClicked: (itemName: string) => void;
}

export class TopNavigationController implements ITopNavigationController, IListener {
    private readonly panelDashboard: PanelDashboard;
    private readonly view: ITopNavigationView;
    private readonly broadcaster: IBroadcaster;

    // todo: use a panelDashboard to control multiple panels
    constructor(panelDashboard: PanelDashboard, view: ITopNavigationView){
        this.panelDashboard = panelDashboard;
        this.view = view;

        this.broadcaster = new BroadCaster("app");
        this.broadcaster.onMessage = (msg) => this.onMessage(msg);
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