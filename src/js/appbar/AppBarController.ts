import { IAppBarView, IAppBarAction } from "./AppBarView";
import { AnyMessage } from "../messages";
import { IController, IControllerDependencies, IMessage } from "../lib/interfaces";

export interface IAppBarController extends IController {
}

export interface IAppBarControllerDependencies extends IControllerDependencies {
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

    constructor(view: IAppBarView, deps: IAppBarControllerDependencies) {
        this.view = view;
        this.broadcaster = deps.broadcaster;

        this.subscribe();
    }

    public onMessage(message: AnyMessage) {
        // todo: move to open function of each panel!
        if (message.type === "actions") {
            this.view.setActions(message.payload.actions);
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