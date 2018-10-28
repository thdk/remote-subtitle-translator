import * as pubsub from 'pubsub-js'
import { IListener, IBroadcaster, IMessage } from './interfaces';

export class PubSubBroadcaster implements IBroadcaster {
    private readonly topic: string;
    private readonly subscriptions: Map<IListener, () => void>
    constructor(topic = "app") {
        this.topic = topic;
        this.subscriptions = new Map();
    }

    public postMessage<T extends IMessage>(type: T["type"], data: T["payload"]) {
        pubsub.publish(this.topic, Object.assign({ type }, data));
    }

    public subscribe(listener: IListener) {
        const unsubscribeToken = pubsub.subscribe(this.topic, (topic, data) => {
            listener.onMessage({ type: data.type, payload: data });
        });

        this.subscriptions.set(listener, () => pubsub.unsubscribe(unsubscribeToken));
    }

    public unsubscribe(listener: IListener) {
        const unsubscribe = this.subscriptions.get(listener);
        if (unsubscribe) unsubscribe();
        else console.log("ERROR: Trying to unsubscribe from broadcaster but it was never subscribed.");
    }

    public dispose() {
        this.subscriptions.forEach(unsubscribe => unsubscribe());
    }
}
