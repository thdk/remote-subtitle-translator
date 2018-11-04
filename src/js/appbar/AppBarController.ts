import { IAppBarView, IAppBarAction } from "./AppBarView";
import { AnyMessage } from "../messages";
import { IController, IControllerDependencies, IMessage, Library } from "../lib/interfaces";

export interface IAppBarController extends IController {
}

export interface IAppBarControllerDependencies extends IControllerDependencies {
    library: Library;
}

export interface IActionsMessage extends IMessage {
    type: "actions",
    payload: {
        actions: IAppBarAction[];
    }
}

export class AppBarController implements IAppBarController {
    private readonly view: IAppBarView;
    private readonly broadcaster: IAppBarControllerDependencies["broadcaster"];
    private readonly library: IAppBarControllerDependencies["library"];

    constructor(view: IAppBarView, deps: IAppBarControllerDependencies) {
        this.view = view;
        this.broadcaster = deps.broadcaster;
        this.library = deps.library;

        this.subscribe();
    }

    public onMessage(message: AnyMessage) {
        // todo: move to open function of each panel!
        if (message.type === "actions") {
            this.view.setActions(message.payload.actions);
        }

        if (message.type === "panel") {
            if (message.payload.action === "show") {
                const libItem = this.library[message.payload.panelName];
                this.view.setTitle(libItem ? libItem.text : undefined);
            }
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