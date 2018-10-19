export const getLastItemInMap = map => Array.from(map)[map.size - 1];
export const getLastKeyInMap = map => Array.from(map)[map.size - 1][0];
export const getLastValueInMap = <T, K = any>(map: Map<K, T>, n = 1) => {
    const lastItem = Array.from(map)[map.size - n];
    return lastItem ? lastItem[1] : undefined;
};

export const requireEl = <T extends Element = HTMLElement>(selector: string, container?: HTMLElement) => {
    let el: T | null;
    if (container) el = container.querySelector<T>(selector);
    else el = document.querySelector<T>(selector);

    if (!el) throw Error("Element is required: " + selector);

    return el;
};

export const requireEls = <T extends Element = HTMLElement>(selector: string, container?: HTMLElement) => {
    let els: T[] | null;
    if (container) els = Array.from(container.querySelectorAll<T>(selector));
    else els = Array.from(document.querySelectorAll<T>(selector));

    if (!els.length) throw Error("Elements are required: " + selector);

    return els;
}