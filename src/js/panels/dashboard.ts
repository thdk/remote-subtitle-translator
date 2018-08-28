import { IPanel } from "./panels";

export class PanelDashboard {
    private readonly panels: Map<string, IPanel>;

    constructor(){
        this.panels = new Map<string, IPanel>();
    }

    public setPanel(panel: IPanel, name?: string) {
        this.panels.set(name ? name : panel.name, panel);
    }

    public showPanel(name: string) {
        const panel = this.panels.get(name);
        if (panel) panel.openAsync();
        else throw new Error("Can's show panel: '" + name + "', panel does not exist");
    }
}