exports.numberComparator = numberComparator;
exports.reverseComparator = reverseComparator;

// TODO: Move to comparator module

function numberComparator(first, second) {
    if (first < second) {
        return -1;
    } else if (first > second) {
        return 1;
    } else {
        return 0;
    }
}

function reverseComparator(comparator) {
    return function(first, second) {
        return -comparator(first, second);
    };
}
