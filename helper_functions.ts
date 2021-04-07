export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function interpolate(x: number, x_min: number, x_max: number, y_min: number, y_max: number) {
    if (x < x_min) {
        return y_min;
    } else if(x > x_max) {
        return y_max;
    } else {
        return (y_min - y_max)/(x_min - x_max)*(x - x_min) + y_min;
    }
}