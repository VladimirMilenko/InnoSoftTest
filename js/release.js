/**
 * Created by AsTex on 06.09.2016.
 */

var shapes = [];
var selectedShapes = [];
var shapeCounter = 0;

var svgNS = "http://www.w3.org/2000/svg";

var context = document.getElementById("field");

// PAGE OFFSET //
var globalMarginLeft = 250;
var globalMarginTop = 0;


// LINE DRAWING //
var drawingLine = false;
var lineStartXY = {};
var currentLine = {};
var lineStartObject = {};
var lineEndObject = {};
var fixedPosition = false;
var fixedPositionX, fixedPositionY = 0;


// OBJECT MOVING //
var currentShape = {};
var drag = false;
var oldX, oldY, newX, newY = 0;

$("#createTriangleButton").on("click", function(event){
    createTriangle(200,200,100);
});
$("#createCircleButton").on("click", function(event){
    createCircle(200,200,100);
});
$("#createRectangleButton").on("click", function(event){
    createRectangle(200,200,150,100);
});


$("#field").on("mouseup", function (event) {

    if (drawingLine) {
        lineStartObject.outerLines.push(currentLine);
        drawingLine = false;
        currentLine = {};
        lineStartXY = {};
    }
    if (drag) {
        drag = false;
    }
});


$("#field").on("mousemove", function (event) {

    var dstX = event.pageX - globalMarginLeft;
    var dstY = event.pageY - globalMarginTop;

    oldX = newX;
    oldY = newY;
    newX = event.pageX;
    newY = event.pageY;

    var deltaX = newX - oldX;
    var deltaY = newY - oldY;

    if (drawingLine) {
        if (fixedPosition)
            editPolyLine(currentLine, lineStartXY.x, lineStartXY.y, fixedPositionX, fixedPositionY);
        else
            editPolyLine(currentLine, lineStartXY.x, lineStartXY.y, dstX, dstY);
    }
    if (drag) {
        switch (currentShape.shapeType) {
            case "rectangle":
                var startX = parseInt($(currentShape.shape).attr('x'));
                var startY = parseInt($(currentShape.shape).attr('y'));
                var overlayStartX = parseInt($(currentShape.shapeOuterOverlay).attr('x'));
                var overlayStartY = parseInt($(currentShape.shapeOuterOverlay).attr('y'));
                $(currentShape.shape).attr('x', parseInt(startX + deltaX));
                $(currentShape.shape).attr('y', parseInt(startY + deltaY));
                $(currentShape.shapeOuterOverlay).attr('x', parseInt(overlayStartX + deltaX));
                $(currentShape.shapeOuterOverlay).attr('y', parseInt(overlayStartY + deltaY));
                updateShapeLines(currentShape, deltaX, deltaY);
                break;
            case "circle":
                var startX = parseInt($(currentShape.shape).attr('cx'));
                var startY = parseInt($(currentShape.shape).attr('cy'));
                var overlayStartX = parseInt($(currentShape.shapeOuterOverlay).attr('cx'));
                var overlayStartY = parseInt($(currentShape.shapeOuterOverlay).attr('cy'));
                $(currentShape.shape).attr('cx', parseInt(startX + deltaX));
                $(currentShape.shape).attr('cy', parseInt(startY + deltaY));
                $(currentShape.shapeOuterOverlay).attr('cx', parseInt(overlayStartX + deltaX));
                $(currentShape.shapeOuterOverlay).attr('cy', parseInt(overlayStartY + deltaY));
                updateShapeLines(currentShape, deltaX, deltaY);
                break;
            case "triangle":
                var startPoints = $(currentShape.shape).attr('points').split(' ');
                var movedPts = buildTrianglePointsWithOffsets(startPoints, deltaX, deltaY);
                $(currentShape.shape).attr('points', movedPts);

                var overlayStartPoints = $(currentShape.shapeOuterOverlay).attr('points').split(' ');
                var overlayMovedPts = buildTrianglePointsWithOffsets(overlayStartPoints, deltaX, deltaY);
                $(currentShape.shapeOuterOverlay).attr('points', overlayMovedPts);

                updateShapeLines(currentShape, deltaX, deltaY);

        }
    }

});


function createOverlay() {
    var overlay = document.createElementNS(svgNS, "g");
    overlay.setAttribute("stroke", "black");
    overlay.setAttribute("fill", "none");
    return overlay;
}

function drawConnectionPoints(e) {
    var overlay = e.target || e.srcElement;
    var object = overlay.parentNode.childNodes.item(1);
    var shape = getShapeById(object.getAttribute("id"));

    switch (shape.shapeType) {
        case "rectangle":
            drawRectangleConnectionPoints(shape);
            break;
        case "circle":
            drawCircleConnectionPoints(shape);
            break;
        case "triangle":
            drawTriangleConnectionPoints(shape);
            break;
    }
}

function removeConnectionPoints(e) {
    var overlay = e.target || e.srcElement;
    var object = overlay.parentNode.childNodes.item(1);
    //console.log(object);
    var shape = getShapeById(object.getAttribute("id"));

    switch (shape.shapeType) {
        case "rectangle":
            removeRectangleConnectionPoints(shape);
            break;
        case "circle":
            removeCircleConnectionPoints(shape);
            break;
        case "triangle":
            removeTriangleConnectionPoints(shape);
            break;

    }
}

function selectShape(e) {
    var overlay = e.target || e.srcElement;
    var object = overlay.parentNode.childNodes.item(1);
    var shape = getShapeById(object.getAttribute("id"));
    deselectShapes();

    switch (shape.shapeType) {
        case "rectangle":
            selectRectangle(shape);
            break;
        case "circle":
            selectCircle(shape);
            break;
        case "triangle":
            selectTriangle(shape);
            break;
    }
}

function createPointElement(x, y) {
    var circle = document.createElementNS(svgNS, "circle");
   // console.log(x + "," + y);
    circle.setAttribute("cx", x);
    circle.setAttribute("cy", y);
    circle.setAttribute("r", 3);
    circle.setAttribute("fill", "lightblue");
    circle.setAttribute("additional", "true");


    circle.onmousedown = startDrawLine;
    circle.onmouseup = finishFixedDrawLine;
    return circle;
}

function postInitConnectionPoints(pointsArray){
    for (var i = 0; i < pointsArray.length; i++) {
        $(pointsArray[i]).on("mouseenter", function (event) {
            //console.log(this);
            this.setAttribute("r", 7);
            this.setAttribute("fill-opacity", ".5");
            this.setAttribute("active", "true");
            if (drawingLine) {
                fixedPosition = true;
                fixedPositionX = parseInt($(this).attr("cx"));
                fixedPositionY = parseInt($(this).attr("cy"));
            }
        });
        $(pointsArray[i]).on("mouseleave", function (event) {
            this.setAttribute("r", 3);
            this.setAttribute("fill-opacity", "1");
            this.removeAttribute("active");
            fixedPosition = false;
        });
    }
}

///========================TRIANGLE AREA ===============================///

function createTriangle(cx, cy, h) {
    var shapeOverlay = createOverlay();
    $(shapeOverlay).attr("transform", "translate(0.5,0.5)");
    $(shapeOverlay).attr("pointer-events", "all");
    var triangle1 = createTriangleElement(cx, cy, h);
    shapeCounter += 1;
    $(triangle1).attr("id", "triangle" + shapeCounter);

    $(shapeOverlay).attr("id", "overlay" + shapeCounter);

    var triangle2 = createTriangleElement(cx, cy, h + 10);

    $(triangle2).attr("fill", "none");
    $(triangle2).attr("stroke", "white");
    $(triangle2).attr("stroke-width", 20);
    $(triangle2).attr("pointer-events", "stroke");
    $(triangle2).attr("visibility", "hidden");

    shapeOverlay.appendChild(triangle2);
    shapeOverlay.appendChild(triangle1);

    var shapeResult = {
        shapeOverlay: shapeOverlay,
        shape: triangle1,
        shapeOuterOverlay: triangle2,
        shapeType: "triangle",
        shapeId: "triangle" + shapeCounter,
        innerLines: [],
        outerLines: []
    };

    shapes.push(shapeResult);

    context.appendChild(shapeOverlay);
    postInitShape(shapeResult);
}


function createTriangleElement(cx, cy, h) {
    var points = [];
    points.push({x: cx - h / 2, y: cy + h / 2});
    points.push({x: cx + h / 2, y: cy + h / 2});
    points.push({x: cx, y: cy - h / 2});
    points.push({x: cx - h / 2, y: cy + h / 2});
    points = buildTrianglePoints(points);
    return createTriangleShape(points);


}
function createTriangleShape(points) {
    var element = document.createElementNS(svgNS, "polyline");
    $(element).attr('points', points);
    $(element).attr('points', points);
    $(element).attr("stroke-width", 2);
    $(element).attr("stroke", "black");
    $(element).attr("fill", "white");
    return element;

}

function drawTriangleConnectionPoints(shape) {
    var params = getTriangleParams(shape.shape);
    var connectionPointTop = createPointElement(params.top.x, params.top.y);
    var connectionPointLeft = createPointElement(params.left.x, params.left.y);
    var connectionPointRight = createPointElement(params.right.x, params.right.y);
    shape.shapeOverlay.appendChild(connectionPointTop);
    shape.shapeOverlay.appendChild(connectionPointLeft);
    shape.shapeOverlay.appendChild(connectionPointRight);
    var pointsArray = [];
    pointsArray.push(connectionPointTop);
    pointsArray.push(connectionPointLeft);
    pointsArray.push(connectionPointRight);
    postInitConnectionPoints(pointsArray);
}
function removeTriangleConnectionPoints(shape) {
    var len = shape.shapeOverlay.childNodes.length;
    var toBeRemoved = [];
    for (var i = 0; i < len; i++) {
        if (shape.shapeOverlay.childNodes.item(i).hasAttribute("additional"))
            toBeRemoved.push(shape.shapeOverlay.childNodes.item(i));
    }
    for (var i = 0; i < toBeRemoved.length; i++) {
        if (!toBeRemoved[i].hasAttribute('active'))
            shape.shapeOverlay.removeChild(toBeRemoved[i]);
    }
}

function getTriangleParams(triangle) {
    var points = parseSplittedTrianglePointsToArray($(triangle).attr('points').split(' '));
    return {
        left: {x: points[0].x, y: points[0].y},
        right: {x: points[1].x, y: points[1].y},
        top: {x: points[2].x, y: points[2].y}
    };
}

function buildTrianglePoints(points) {
    var result = "";
    for (var i = 0; i < points.length; i++) {
        result += points[i].x + "," + points[i].y + " ";
    }
    return result.trim();
}


function buildTrianglePointsWithOffsets(points, dx, dy) {
    var intPoints = parseSplittedTrianglePointsToArray(points);
    var result = "";
    for (var i = 0; i < intPoints.length; i++) {
        result += (intPoints[i].x + dx) + "," + (intPoints[i].y + dy) + " ";
    }
    return result.trim();
}
function parseSplittedTrianglePointsToArray(points) {
    var intPoints = [];
    for (var i = 0; i < points.length; i++) {
        var temp = points[i].split(',');
        intPoints.push({x: parseInt(temp[0]), y: parseInt(temp[1])});
    }
    return intPoints;
}


function selectTriangle(shape) {
    var shapeObject = $("#" + shape.shapeId);
    shapeObject.attr("stroke", "blue");
    shapeObject.css("cursor", "move");
    selectedShapes.push(shapeObject);
}

///========================CIRCLE AREA ===============================///
function createCircle(x, y, r) {
    var shapeOverlay = createOverlay();
    $(shapeOverlay).attr("transform", "translate(0.5,0.5)");
    $(shapeOverlay).attr("pointer-events", "all");

    var circle = createCircleElement(x, y, r);
    shapeCounter += 1;
    $(circle).attr("id", "circle" + shapeCounter);
    $(shapeOverlay).attr("id", "overlay" + shapeCounter);

    var circle2 = createCircleElement(x, y, r + 10);

    $(circle2).attr("fill", "none");
    $(circle2).attr("stroke", "white");
    $(circle2).attr("stroke-width", 20);
    $(circle2).attr("pointer-events", "stroke");
    $(circle2).attr("visibility", "hidden");

    shapeOverlay.appendChild(circle2);
    shapeOverlay.appendChild(circle);

    var shapeResult = {
        shapeOverlay: shapeOverlay,
        shape: circle,
        shapeOuterOverlay: circle2,
        shapeType: "circle",
        shapeId: "circle" + shapeCounter,
        innerLines: [],
        outerLines: []
    };

    shapes.push(shapeResult);

    context.appendChild(shapeOverlay);
    postInitShape(shapeResult);
}

function createCircleElement(x, y, r) {
    var circle = document.createElementNS(svgNS, "circle");
    $(circle).attr("cx", x);
    $(circle).attr("cy", y);
    $(circle).attr("r", r);
    $(circle).attr("stroke", "black");
    return circle;
}
function selectCircle(shape) {
    var shapeObject = $("#" + shape.shapeId);
    shapeObject.attr("stroke", "blue");
    shapeObject.css("cursor", "move");
    selectedShapes.push(shapeObject);
}

function drawCircleConnectionPoints(shape) {
    var params = getCircleParams(shape.shape);
   // console.log(params);
    var connectionPointTop = createPointElement(params.cx, params.cy - params.r);
    var connectionPointLeft = createPointElement(params.cx - params.r, params.cy);
    var connectionPointRight = createPointElement(params.cx + params.r, params.cy);
    var connectionPointBottom = createPointElement(params.cx, params.cy + params.r);
    shape.shapeOverlay.appendChild(connectionPointTop);
    shape.shapeOverlay.appendChild(connectionPointLeft);
    shape.shapeOverlay.appendChild(connectionPointRight);
    shape.shapeOverlay.appendChild(connectionPointBottom);
    var pointsArray = [];
    pointsArray.push(connectionPointTop);
    pointsArray.push(connectionPointLeft);
    pointsArray.push(connectionPointRight);
    pointsArray.push(connectionPointBottom);

    postInitConnectionPoints(pointsArray);

}

function removeCircleConnectionPoints(shape) {
    var len = shape.shapeOverlay.childNodes.length;
    var toBeRemoved = [];
    for (var i = 0; i < len; i++) {
        if (shape.shapeOverlay.childNodes.item(i).hasAttribute("additional"))
            toBeRemoved.push(shape.shapeOverlay.childNodes.item(i));
    }
    for (var i = 0; i < toBeRemoved.length; i++) {
        if (!toBeRemoved[i].hasAttribute('active'))
            shape.shapeOverlay.removeChild(toBeRemoved[i]);
    }
}

function getCircleParams(circle) {
    return {cx: parseInt($(circle).attr('cx')), cy: parseInt($(circle).attr('cy')), r: parseInt($(circle).attr('r'))}
}

///========================RECTANGLE AREA ============================///

function createRectangle(x, y, w, h) {
    var shapeOverlay = createOverlay();
    $(shapeOverlay).attr("transform", "translate(0.5,0.5)");
    $(shapeOverlay).attr("pointer-events", "all");
    var rect = createRectangleElement(x, y, w, h);
    shapeCounter += 1;
    $(rect).attr("id", "rect" + shapeCounter);
    $(shapeOverlay).attr("id", "overlay" + shapeCounter);

    var rect2 = createRectangleElement(x - 10, y - 10, w + 10, h + 10);

    $(rect2).attr("fill", "none");
    $(rect2).attr("stroke", "white");
    $(rect2).attr("stroke-width", 20);
    $(rect2).attr("pointer-events", "stroke");
    $(rect2).attr("visibility", "hidden");

    shapeOverlay.appendChild(rect2);
    shapeOverlay.appendChild(rect);

    var shapeResult = {
        shapeOverlay: shapeOverlay,
        shape: rect,
        shapeOuterOverlay: rect2,
        shapeType: "rectangle",
        shapeId: "rect" + shapeCounter,
        innerLines: [],
        outerLines: []
    };

    shapes.push(shapeResult);

    context.appendChild(shapeOverlay);
    postInitShape(shapeResult);

}

function postInitShape(shape) {
    var overlay = $(shape.shapeOverlay);

    $(shape.shape).mousedown(function (event) {
        currentShape = shape;
        drag = true;
        newX = event.pageX;
        newY = event.pageY;
        removeConnectionPoints(event);
    });

    $(shape.shape).mouseup(function (event) {
        drag = false;
        drawConnectionPoints(event);
    });

    overlay.mouseenter(function (event) {
        if (!drag)
            drawConnectionPoints(event);
    });
    overlay.mouseleave(function (event) {
        removeConnectionPoints(event);
    });
    overlay.on("click", function (event) {
        selectShape(event);
    });
    overlay.on("mousedown", function (event) {
        selectShape(event);
    });
}

function createRectangleElement(x, y, w, h) {
    var rect = document.createElementNS(svgNS, "rect");

    $(rect).attr("x", x);
    $(rect).attr("stroke-width", 2);
    $(rect).attr("stroke", "black");
    $(rect).attr("fill", "white");
    $(rect).attr("y", y);
    $(rect).attr("width", w);
    $(rect).attr("height", h);
    return rect;
}


function drawRectangleConnectionPoints(shape) {
    var params = getRectangleParams(shape.shape);
    var connectionPointTop = createPointElement(params.x + params.width / 2, params.y);
    var connectionPointLeft = createPointElement(params.x, params.y + params.height / 2);
    var connectionPointRight = createPointElement(params.x + params.width, params.y + params.height / 2);
    var connectionPointBottom = createPointElement(params.x + params.width / 2, params.y + params.height);
    shape.shapeOverlay.appendChild(connectionPointTop);
    shape.shapeOverlay.appendChild(connectionPointLeft);
    shape.shapeOverlay.appendChild(connectionPointRight);
    shape.shapeOverlay.appendChild(connectionPointBottom);
    var pointsArray = [];
    pointsArray.push(connectionPointTop);
    pointsArray.push(connectionPointLeft);
    pointsArray.push(connectionPointRight);
    pointsArray.push(connectionPointBottom);

    postInitConnectionPoints(pointsArray);


}

function removeRectangleConnectionPoints(shape) {

    var len = shape.shapeOverlay.childNodes.length;
    var toBeRemoved = [];
    for (var i = 0; i < len; i++) {
        if (shape.shapeOverlay.childNodes.item(i).hasAttribute("additional"))
            toBeRemoved.push(shape.shapeOverlay.childNodes.item(i));
    }
    //console.log(toBeRemoved);
    for (var i = 0; i < toBeRemoved.length; i++) {
        shape.shapeOverlay.removeChild(toBeRemoved[i]);
    }
}

function selectRectangle(shape) {
    var shapeObject = $("#" + shape.shapeId);
    //console.log("selected");
    //console.log(shape);
    shapeObject.attr("stroke", "blue");
    shapeObject.css("cursor", "move");
    selectedShapes.push(shapeObject);
}

function deselectShapes() {
    for (var i = 0; i < selectedShapes.length; i++) {
        selectedShapes[i].attr("stroke", "black");
        selectedShapes[i].css("cursor", "auto");
        selectedShapes.splice(i, 1);
    }
}

function getRectangleParams(rectangle) {
    var x = parseInt(rectangle.getAttribute("x"));
    var y = parseInt(rectangle.getAttribute("y"));
    var w = parseInt(rectangle.getAttribute("width"));
    var h = parseInt(rectangle.getAttribute("height"));
    var x1 = x + w;
    var y1 = y + h;

    return {x: x, y: y, width: w, height: h, x1: x1, y1: y1};
}


function startDrawLine(event) {
    var sender = event.target || event.srcElement;
    var shapeObject = sender.parentNode.childNodes.item(1);

    lineStartObject = getShapeById($(shapeObject).attr("id"));

    var x = parseInt(sender.getAttribute("cx"));
    var y = parseInt(sender.getAttribute("cy"));
    lineStartXY = {x: x, y: y};
    currentLine = drawPolyLine(x, y, x, y);
    drawingLine = true;
}

function finishFixedDrawLine(event) {
    var sender = event.target || event.srcElement;
    var shapeObject = sender.parentNode.childNodes.item(1);
    lineEndObject = getShapeById($(shapeObject).attr("id"));
    lineEndObject.innerLines.push(currentLine);
}

function drawPolyLine(x, y, dstX, dstY) {
    var line = document.createElementNS(svgNS, "polyline");
    $(line).attr("style", "fill:none;stroke:black;stroke-width:1");
    $(line).attr("points", x + "," + y + " " + dstX + "," + dstY);
    $(line).attr("pointer-events", "none");
    $(line).attr("marker-end", "url(#arrow)");
    context.appendChild(line);
    return line;
}

function editPolyLine(line, x, y, dstX, dstY) {
    $(line).attr("points", x + "," + y + " " + dstX + "," + dstY);
}

function updateShapeLines(shape, dx, dy) {
    for (var i = 0; i < shape.outerLines.length; i++) {
        var line = shape.outerLines[i];
        var points = $(line).attr("points").split(' ');
        var startPoint = points[0].split(',');
        var startPointX = parseInt(startPoint[0]) + dx;
        var startPointY = parseInt(startPoint[1]) + dy;
        points[0] = startPointX + "," + startPointY;
        $(line).attr("points", pointsArrayToString(points));
    }
    for (var i = 0; i < shape.innerLines.length; i++) {
        var line = shape.innerLines[i];
        var points = $(line).attr("points").split(' ');
        var endPoint = points[points.length - 1].split(',');
        var endPointX = parseInt(endPoint[0]) + dx;
        var endPointY = parseInt(endPoint[1]) + dy;
        points[points.length - 1] = endPointX + "," + endPointY;
        $(line).attr("points", pointsArrayToString(points));
    }
}
function pointsArrayToString(points) {
    var result = "";
    for (var i = 0; i < points.length; i++) {
        result += points[i] + " ";
    }
    return result.trim();
}
function getShapeById(id) {
    for (var i = 0, length = shapes.length; i < length; i++) {
        if (shapes[i].shapeId == id)
            return shapes[i];
    }
}
