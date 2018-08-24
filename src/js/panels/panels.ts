namespace thdk.rst {
    export interface IPanel {
        readonly containerEl: HTMLElement;

        createAsync(): Promise<void>;
        open(panel: IPanel);
    }

    export class Panel implements IPanel {
        public readonly containerEl: HTMLElement;
        private readonly closeEl?: HTMLElement;

        protected readonly bc: IBroadcaster;
        public readonly name: string;
        private isOpen = false;

        constructor(name: string, container: HTMLElement) {
            this.containerEl = container;
            this.bc = new BroadCaster("app");
            this.bc.onMessage = (type, payload) => this.onMessage(type, payload);
            this.name = name;

            this.closeEl = this.containerEl.querySelector("#panelCloseIcon") as HTMLElement;
        }

        public createAsync() {
            return new Promise<void>((resolve, reject) => {
                resolve();
            });
        }

        public open() {
            this.isOpen = true;
            this.bc.postMessage("panel", { action: "show", panelName: this.name });
            this.containerEl.style.display = 'block';
            this.init();
        }

        private onMessage(type: string, payload: any) {
            switch (type) {
                case "panel":
                    const msg = payload as IPanelMessage;
                    if (msg.action === "show" && msg.panelName !== this.name) {
                        this.containerEl.style.display = 'none';
                    }
                    break;
            }
        }

        public close() {
            if (!this.isOpen) return;
            this.isOpen = false;
            this.containerEl.style.display = 'none';
            this.deinit();
            this.bc.postMessage("panel", { action: "close", panelName: this.name })
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

    export interface IPanelMessage {
        action: "show" | "close",
        panelName: string
    }
}