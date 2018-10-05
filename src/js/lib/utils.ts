export const getLastItemInMap = map => Array.from(map)[map.size - 1];
export const getLastKeyInMap = map => Array.from(map)[map.size - 1][0];
export const getLastValueInMap = <T, K = any>(map: Map<K, T>, n = 1) => {
    const lastItem = Array.from(map)[map.size - n];
    return lastItem ? lastItem[1] : undefined;
};