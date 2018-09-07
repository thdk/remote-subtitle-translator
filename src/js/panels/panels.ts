import { IBroadcaster, IMessage, PubSubBroadcaster } from '../broadcaster';

export interface IPanel {
    readonly containerEl: HTMLElement;
    readonly name: string;
    openAsync(): Promise<void>;
    close();
}

export class Panel implements IPanel {
    public readonly containerEl: HTMLElement;
    private readonly closeEl?: HTMLElement;

    protected readonly bc: IBroadcaster;
    public readonly name: string;
    private isOpen = false;

    constructor(name: string, container: HTMLElement) {
        this.containerEl = container;
        this.bc = new PubSubBroadcaster();
        this.name = name;

        this.closeEl = this.containerEl.querySelector("#panelCloseIcon") as HTMLElement;
    }

    public openAsync() {
        return new Promise<void>((resolve, reject) => {
            // hide all open panels
            const panels = document.querySelectorAll('.panel');
            for (let index = 0; index < panels.length; index++) {
                const panel = panels[index];
                (panel as HTMLElement).style.display = 'none';
            }

            this.isOpen = true;
            this.bc.postMessage("panel", { action: "show", panelName: this.name });
            this.containerEl.style.display = 'block';
            this.init();
            resolve();
        });
    }

    public close() {
        if (!this.isOpen) return;
        this.isOpen = false;
        this.containerEl.style.display = 'none';
        this.deinit();
        this.bc.postMessage("panel", { action: "close", panelName: this.name });
    }

    protected init() {
        if (this.closeEl)
            this.closeEl.addEventListener('click', this.onCloseClicked);
    }

    protected deinit() {
        if (this.closeEl)
            this.closeEl.removeEventListener('click', this.onCloseClicked);
    }

    onCloseClicked = (event: MouseEvent): void => {
        console.log("close icon clicked");
        this.close();
    }
}

export interface IPanelMessage extends IMessage {
    action: "show" | "close",
    panelName: string
}