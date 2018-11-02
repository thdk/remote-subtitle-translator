import { IPanel } from "../lib/base/panel";
import { SettingsPanel } from "./settings";
import { AuthenticationPanel } from "./authenticationPanel";
import { SubtitlesPanelView } from "./subtitles/SubtitlesPanelView";
import { FavoriteSubtitlesPanel } from "./favoriteSubtitles";

export type AnyPanel = SettingsPanel | AuthenticationPanel | SubtitlesPanelView | FavoriteSubtitlesPanel;
export type panelKeys = keyof AnyPanel;

export type PanelIds = Pick<AnyPanel, keyof (Pick<AnyPanel, "name">)>;

export class PanelDashboard {
    private readonly panels: Map<string, IPanel>;
    private openPanel?: IPanel;

    constructor() {
        this.panels = new Map<string, IPanel>();
    }

    public setPanel(panel: IPanel, name?: string) {
        this.panels.set(name ? name : panel.name, panel);
    }

    public showPanel(name: string) {
        const panel = this.panels.get(name);
        if (this.openPanel) this.openPanel.close();
        if (panel) {
            panel.openAsync();
            this.openPanel = panel;
        }
        else throw new Error("Can't show panel: '" + name + "', panel does not exist");
    }
}