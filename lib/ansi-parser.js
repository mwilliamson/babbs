exports.ansiToHtml = ansiToHtml;


function ansiToHtml(input) {
    var output = [];
    var result;
    var ansiState = {};
    var regex = /\033\[(\d+)m/g;
    var position = 0;
    while ((result = regex.exec(input)) !== null) {
        output.push(ansiText(input.substring(position, result.index), ansiState));
        position = regex.lastIndex;
        updateAnsiState(ansiState, result[1]);
    }
    output.push(ansiText(input.substring(position), ansiState));
    return output.join("");
};

function ansiText(text, ansiState) {
    if (text) {
        var color = ansiState.color;
        return addBold(addColors(text, ansiState.color), ansiState.bold);
    } else {
        return text;
    }
}

function addColors(text, color) {
    var colors = {
        30: "rgb(0, 0, 0)", //black
        31: "rgb(205, 0, 0)", // red
        32: "rgb(0, 205, 0)", // green
        33: "rgb(205, 205, 0)", // yellow
        34: "rgb(0, 0, 238)", // blue
        35: "rgb(205, 0, 205)", // magenta
        36: "rgb(0, 205, 205)", // cyan
        37: "rgb(229, 229, 229)" // white
    };
    if (!color || !colors[color]) {
        return text;
    } else {
        return '<span style="color:' + colors[color] + '">' + text + '</span>'
    }
}

function addBold(text, bold) {
    if (bold) {
        return '<b>' + text + '</b>'
    } else {
        return text;
    }
}

function updateAnsiState(state, code) {
    code = parseInt(code, 10);
    if (code === 1) {
        state.bold = true;
    } else if (code === 22) {
        state.bold = false;
    } else if (code >= 30 && code <= 37) {
        state.color = code;
    } else if (code === 39) {
        state.color = null;
    } else {
        console.log(code);
    }
}
