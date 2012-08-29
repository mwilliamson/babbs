exports.number = number;
exports.reverse = reverse;

function number(first, second) {
    if (first < second) {
        return -1;
    } else if (first > second) {
        return 1;
    } else {
        return 0;
    }
}

function reverse(comparator) {
    return function(first, second) {
        return -comparator(first, second);
    };
}
