import { AnyMessage } from "../messages";
import { IPannelController } from "../lib/base/panel";
import { IBroadcaster, IController } from "../lib/interfaces";
import { INavigationView, INavigationItem } from "./DrawerNavigationView";

export interface INavigationController extends IPannelController {
    itemClicked: (itemName: string) => void;
}

export interface INavigationControllerDependencies {
    broadcaster: IBroadcaster;
}

export class NavigationController implements IController {
    private readonly view: INavigationView;
    private readonly broadcaster: INavigationControllerDependencies["broadcaster"];
    private readonly items?: INavigationItem[];

    constructor(view: INavigationView, items: INavigationItem[] | undefined,  deps: INavigationControllerDependencies){
        const {broadcaster} = deps;
        this.broadcaster = broadcaster;
        this.items = items;
        this.view = view;
        this.view.setItems(items);
        this.subscribe();
    }

    public itemClicked(itemName: string) {
        if (!this.items) return;

        this.items.filter(i => i.id === itemName)[0].action();
    }

    public onMessage(message: AnyMessage) {
        if (message.type === "panel" && message.payload.action === "show") {
            this.view.setActiveItem(message.payload.panelName);
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