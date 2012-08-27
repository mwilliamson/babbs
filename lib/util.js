exports.find = find;
exports.numberComparator = numberComparator;

function find(array, predicate) {
    for (var i = 0; i < array.length; i += 1) {
        if (predicate(array[i])) {
            return array[i];
        }
    }
}

function numberComparator(first, second) {
    if (first < second) {
        return -1;
    } else if (first > second) {
        return 1;
    } else {
        return 0;
    }
}
