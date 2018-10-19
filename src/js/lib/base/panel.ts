import { IDisposable, IController, IMessage, IBroadcaster } from "../interfaces";

export interface IPanel {
    readonly containerEl: HTMLElement;
    readonly name: string;
    openAsync(): Promise<void>;
    close();
}

export interface IPanelMessage extends IMessage {
    type: "panel";
    payload: {
        action: "show" | "close",
        panelName: string
    }
}

export interface IPannelController extends IController {
}

export interface IPannelView extends IPanel, IDisposable {
}

export interface IPanelControllerDependencies {
    broadcaster: IBroadcaster;
}

export class PanelController implements IPannelController {
    private readonly broadcaster: IPanelControllerDependencies["broadcaster"];
    protected readonly view: IPannelView;
    constructor(view: IPannelView, deps: IPanelControllerDependencies) {
        this.view = view;
        this.broadcaster = deps.broadcaster;
    }

    public subscribe() {
        this.broadcaster.subscribe(this);
    }

    public dispose() {
        this.broadcaster.unsubscribe(this);
    }

    public onMessage() {

    }
}