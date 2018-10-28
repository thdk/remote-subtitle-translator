import { INavigationView } from "./TopNavigationView";
import { AnyMessage } from "../messages";
import { IPannelController } from "../lib/base/panel";
import { IDisposable, IBroadcaster, IListener, IController } from "../lib/interfaces";

export interface INavigationController extends IPannelController {
    itemClicked: (itemName: string) => void;
}

export interface INavigationControllerDependencies {
    broadcaster: IBroadcaster;
    navigate: (destination: string) => void;
}

export class NavigationController implements IController {
    private readonly view: INavigationView;
    private readonly navigate: INavigationControllerDependencies["navigate"];
    private readonly broadcaster: INavigationControllerDependencies["broadcaster"];

    constructor(view: INavigationView, deps: INavigationControllerDependencies){
        const {navigate, broadcaster} = deps;
        this.navigate = navigate;
        this.broadcaster = broadcaster;
        this.subscribe();
        this.view = view;
    }

    public itemClicked(itemName: string) {
        this.navigate(itemName);
    }

    public onMessage(message: AnyMessage) {
        if (message.type === "panel" && message.payload.action === "show") {
            this.view.hide();
        }
    }

    public subscribe() {
        this.broadcaster.subscribe(this);
    }

    public unsubscribe() {
        this.broadcaster.unsubscribe(this);
    }

    public dispose() {
        this.unsubscribe();
    }
}