import { IAppBarView, IAppBarAction } from "./AppBarView";
import { IPannelController } from "../lib/base/panel";
import { AnyMessage } from "../messages";
import { IDisposable, IController, IControllerDependencies } from "../lib/interfaces";

export interface IAppBarController extends IController {
}

export interface IAppBarControllerDependencies extends IControllerDependencies {
    getActions: () => IAppBarAction[] | undefined;
}

export class AppBarController implements IAppBarController {
    private readonly view: IAppBarView;
    private readonly getActions: IAppBarControllerDependencies["getActions"];
    private readonly broadcaster: IAppBarControllerDependencies["broadcaster"];

    constructor(view: IAppBarView, deps: IAppBarControllerDependencies) {
        this.view = view;
        this.getActions = deps.getActions;
        this.broadcaster = deps.broadcaster;

        this.subscribe();
    }

    public onMessage(message: AnyMessage) {
        // todo: move to open function of each panel!
        if (message.type === "panel") {
            this.view.setActions(this.getActions());
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