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
    postMessage<T extends IMessage>(type: T["type"], data: T["payload"])
    subscribe(listner: IListener);
    unsubscribe(listener: IListener);
}

export interface IControllerDependencies {
    broadcaster: IBroadcaster;
}

export interface IController extends IDisposable, IListener {
}