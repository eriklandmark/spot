export function interpolate(x: number, x_min: number, x_max: number, y_min: number, y_max: number) {
    if (x < x_min) {
        return y_min;
    } else if(x > x_max) {
        return y_max;
    } else {
        return (y_min - y_max)/(x_min - x_max)*(x - x_min) + y_min;
    }
}

export function genRandomHash(length: number){
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return new Array(length)
        .fill(0)
        .map(() => chars.charAt(Math.floor(Math.random() * chars.length)))
        .join("")
    //.reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0)).toString(4)
}
