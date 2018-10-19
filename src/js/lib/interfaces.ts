export interface IDisposable {
    dispose:() => void;
}

export interface IMessage {
    type: string;
    payload: any;
}

export interface IListener {
    onMessage(message: IMessage): void;
    subscribe(): void;
}

export interface IBroadcaster extends IDisposable{
    onMessage?: (message: IMessage) => void;
    postMessage(type: string, data: any);
    subscribe(listner: IListener);
    unsubscribe(listener: IListener);
}

export interface IControllerDependencies {
    broadcaster: IBroadcaster;
}

export interface IController extends IDisposable, IListener {
}