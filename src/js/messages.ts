import { IPanelMessage } from "./lib/base/panel";
import { IAuthenticationMessage } from "./lib/authenticator";
import { ISessionMessage } from "./panels/subtitles/SubtitlesPanelController";
import { IActionsMessage } from "./appbar/AppBarController";

export type AnyMessage =
    IPanelMessage |
    IAuthenticationMessage |
    ISessionMessage |
    IActionsMessage;

export type AppBarChangedMessage = IPanelMessage;

