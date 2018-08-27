import { SettingsPanel } from "../panels/settings";
import { IPanel } from "../panels/panels";
import { ITopNavigationView } from "./TopNavigationView";

export interface ITopNavigationController {
    settingsItemClicked: () => void;
}

export class TopNavigationController implements ITopNavigationController {
    private readonly settingsPanel: IPanel;
    private readonly view: ITopNavigationView;

    // todo: use a panelDashboard to control multiple panels
    constructor(settingsPanel: SettingsPanel, view: ITopNavigationView){
        this.settingsPanel = settingsPanel;
        this.view = view;
    }

    public settingsItemClicked() {
        this.settingsPanel.openAsync().then(() => { return; }, error => {
            console.log("Can't open settings panel: " + error);
        });
    }
}