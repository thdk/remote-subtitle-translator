import { IPanelMessage } from "./lib/base/panel";
import { IAuthenticationMessage } from "./lib/authenticator";

export type AnyMessage = IPanelMessage | IAuthenticationMessage;

export type AppBarChangedMessage = IPanelMessage;

