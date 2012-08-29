exports.find = find;
exports.numberComparator = numberComparator;
exports.reverseComparator = reverseComparator;

function find(array, predicate) {
    for (var i = 0; i < array.length; i += 1) {
        if (predicate(array[i])) {
            return array[i];
        }
    }
}

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
