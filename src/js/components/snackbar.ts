import {MDCSnackbar} from '@material/snackbar';
import { IDisposable } from '../lib/interfaces';

export interface ISnackbarData {
    readonly message: string;
    readonly timeout?: number;
    readonly actionHandler: () => void;
    readonly actionText: string;
    readonly multiline?: boolean;
    readonly actionOnBottom?: boolean;
}

export interface IToastData {
    readonly message: string;
    readonly timeout?: number;
    readonly multiline?: boolean;
}

export class Snackbar implements IDisposable {
    private readonly snackbar: MDCSnackbar;
    constructor(snackbarEl: HTMLElement) {
        this.snackbar = new MDCSnackbar(snackbarEl);
    }

    public dispose() {
        this.snackbar.dispose();
    }

    public show(data: ISnackbarData |IToastData) {
        this.snackbar.show(data);
    }
}