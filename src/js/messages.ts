import { IPanelMessage } from "./lib/base/panel";
import { IAuthenticationMessage } from "./lib/authenticator";
import { ISessionMessage } from "./panels/subtitles/SubtitlesPanelController";

export type AnyMessage = IPanelMessage | IAuthenticationMessage | ISessionMessage;

export type AppBarChangedMessage = IPanelMessage;

