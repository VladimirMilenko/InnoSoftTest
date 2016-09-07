/**
 * Created by AsTex on 07.09.2016.
 */
var shapeCounter = 0;
var shapes = [];
var currentShape = {};
var selectedShapes = [];
var drag = false;
var drawingLine = false;
var fixedPosition = false;
var svgNS = "http://www.w3.org/2000/svg";

var globalMarginLeft = 250;
var globalMarginTop = 0;
var oldX, oldY, newX, newY = 0;

var context = document.getElementById("field");


function deselectShapes() {
    for (var i = 0; i < selectedShapes.length; i++) {
        selectedShapes[i].deselectShape();
    }
    selectedShapes = [];
}
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
        currentShape.move(deltaX, deltaY);
    }
});

function editPolyLine(line, x, y, dstX, dstY) {
    $(line).attr("points", x + "," + y + " " + dstX + "," + dstY);
}

function pointsArrayToString(points) {
    var result = "";
    for (var i = 0; i < points.length; i++) {
        result += points[i] + " ";
    }
    return result.trim();
}

function AbstractShape() {
    this.outerLines = [];
    this.innerLines = [];
}

AbstractShape.prototype.createOverlay = function () {
    var overlay = document.createElementNS(svgNS, "g");
    $(overlay).attr("stroke", "black");
    $(overlay).attr("fill", "none");
    $(overlay).attr("transform", "translate(0.5,0.5)");
    $(overlay).attr("pointer-events", "all");
    this.shapeOverlay = overlay;
};

AbstractShape.prototype.updateLines = function (dx, dy) {
    for (var i = 0; i < this.outerLines.length; i++) {
        var line = this.outerLines[i];
        var points = $(line).attr("points").split(' ');
        var startPoint = points[0].split(',');
        var startPointX = parseInt(startPoint[0]) + dx;
        var startPointY = parseInt(startPoint[1]) + dy;
        points[0] = startPointX + "," + startPointY;
        $(line).attr("points", pointsArrayToString(points));
    }
    for (var i = 0; i < this.innerLines.length; i++) {
        var line = this.innerLines[i];
        var points = $(line).attr("points").split(' ');
        var endPoint = points[points.length - 1].split(',');
        var endPointX = parseInt(endPoint[0]) + dx;
        var endPointY = parseInt(endPoint[1]) + dy;
        points[points.length - 1] = endPointX + "," + endPointY;
        $(line).attr("points", pointsArrayToString(points));
    }
};

AbstractShape.prototype.createPointElement = function (x, y) {
    var circle = document.createElementNS(svgNS, "circle");
    circle.setAttribute("cx", x);
    circle.setAttribute("cy", y);
    circle.setAttribute("r", 3);
    circle.setAttribute("fill", "lightblue");
    circle.setAttribute("additional", "true");

    circle.onmousedown = this.startDrawLine.bind(this);
    circle.onmouseup = this.finishFixedDrawLine.bind(this);
    return circle;
};

AbstractShape.prototype.startDrawLine = function (event) {
    var sender = event.target || event.srcElement;
    var shapeObject = sender.parentNode.childNodes.item(1);

    lineStartObject = this;//getShapeById($(shapeObject).attr("id"));

    var x = parseInt(sender.getAttribute("cx"));
    var y = parseInt(sender.getAttribute("cy"));
    lineStartXY = {x: x, y: y};
    currentLine = this.drawPolyLine(x, y, x, y);
    drawingLine = true;
};

AbstractShape.prototype.finishFixedDrawLine = function (event) {
    var sender = event.target || event.srcElement;
    var shapeObject = sender.parentNode.childNodes.item(1);
    lineEndObject = this;
    lineEndObject.innerLines.push(currentLine);
};

AbstractShape.prototype.drawPolyLine = function (x, y, dstX, dstY) {
    var line = document.createElementNS(svgNS, "polyline");
    $(line).attr("style", "fill:none;stroke:black;stroke-width:1");
    $(line).attr("points", x + "," + y + " " + dstX + "," + dstY);
    $(line).attr("pointer-events", "none");
    $(line).attr("marker-end", "url(#arrow)");
    context.appendChild(line);
    return line;
};


AbstractShape.prototype.selectShape = function () {
    deselectShapes();
    var shapeObject = $("#" + this.shapeId);
    shapeObject.attr("stroke", "blue");
    shapeObject.css("cursor", "move");
    selectedShapes.push(this);
};

AbstractShape.prototype.deselectShape = function () {
    var shapeObject = $("#" + this.shapeId);
    shapeObject.attr("stroke", "black");
    shapeObject.css("cursor", "auto");
};

AbstractShape.prototype.postInitConnectionPoints = function (pointsArray) {
    for (var i = 0; i < pointsArray.length; i++) {
        $(pointsArray[i]).on("mouseenter", function (event) {
            this.setAttribute("r", 7);
            this.setAttribute("fill-opacity", ".5");
            this.setAttribute("active", "true");
            if (drawingLine) {
                fixedPosition = true;
                fixedPositionX = parseInt($(this).attr("cx"));
                fixedPositionY = parseInt($(this).attr("cy"));
            }
        }.bind(pointsArray[i]));
        $(pointsArray[i]).on("mouseleave", function (event) {
            this.setAttribute("r", 3);
            this.setAttribute("fill-opacity", "1");
            this.removeAttribute("active");
            fixedPosition = false;
        }.bind(pointsArray[i]));
    }
};

AbstractShape.prototype.postInitShape = function () {
    var overlay = $(this.shapeOverlay);

    $(this.shape).mousedown(function (event) {
        currentShape = this;
        drag = true;
        newX = event.pageX;
        newY = event.pageY;
        this.removeConnectionPoints();
    }.bind(this));

    $(this.shape).mouseup(function (event) {
        drag = false;
        this.drawConnectionPoints();
    }.bind(this));

    overlay.on("mouseenter", function (event) {
        if (!drag)
            this.drawConnectionPoints();
    }.bind(this));
    overlay.on("mouseleave", function (event) {
        this.removeConnectionPoints();
    }.bind(this));
    overlay.on("click", function (event) {
        this.selectShape();
    }.bind(this));
    overlay.on("mousedown", function (event) {
        this.selectShape();
    }.bind(this));
};

AbstractShape.prototype.removeConnectionPoints = function () {
    var len = this.shapeOverlay.childNodes.length;
    var toBeRemoved = [];
    for (var i = 0; i < len; i++) {
        if (this.shapeOverlay.childNodes.item(i).hasAttribute("additional"))
            toBeRemoved.push(this.shapeOverlay.childNodes.item(i));
    }
    console.log(toBeRemoved);
    for (var i = 0; i < toBeRemoved.length; i++) {
        this.shapeOverlay.removeChild(toBeRemoved[i]);
    }
};

function RectangleShape(x, y, width, height) {
    this.params = {x: x, y: y, width: width, height: height};
    AbstractShape.apply(this);
}

RectangleShape.prototype = Object.create(AbstractShape.prototype);
RectangleShape.prototype.constructor = RectangleShape;

RectangleShape.prototype.createRectangleElement = function (x, y, w, h) {
    var rect = document.createElementNS(svgNS, "rect");
    $(rect).attr("x", x);
    $(rect).attr("stroke-width", 2);
    $(rect).attr("stroke", "black");
    $(rect).attr("fill", "white");
    $(rect).attr("y", y);
    $(rect).attr("width", w);
    $(rect).attr("height", h);
    return rect;
};

RectangleShape.prototype.draw = function () {
    this.createOverlay();
    var shape = this.createRectangleElement(this.params.x, this.params.y, this.params.width, this.params.height);
    shapeCounter += 1;
    $(shape).attr("id", "rect" + shapeCounter);
    $(this.shapeOverlay).attr("id", "overlay" + shapeCounter);

    var rect2 = this.createRectangleElement(this.params.x - 10, this.params.y - 10, this.params.width + 10, this.params.height + 10);

    $(rect2).attr("fill", "none");
    $(rect2).attr("stroke", "white");
    $(rect2).attr("stroke-width", 20);
    $(rect2).attr("pointer-events", "stroke");
    $(rect2).attr("visibility", "hidden");

    this.shape = shape;
    this.shapeOuterOverlay = rect2;
    this.shapeId = "rect" + shapeCounter;
    console.log(this);
    this.shapeOverlay.appendChild(rect2);
    this.shapeOverlay.appendChild(shape);
    shapes.push(this);
    context.appendChild(this.shapeOverlay);

    this.postInitShape();
};

RectangleShape.prototype.drawConnectionPoints = function () {
    var connectionPointTop = this.createPointElement(this.params.x + this.params.width / 2, this.params.y);
    var connectionPointLeft = this.createPointElement(this.params.x, this.params.y + this.params.height / 2);
    var connectionPointRight = this.createPointElement(this.params.x + this.params.width, this.params.y + this.params.height / 2);
    var connectionPointBottom = this.createPointElement(this.params.x + this.params.width / 2, this.params.y + this.params.height);
    this.shapeOverlay.appendChild(connectionPointTop);
    this.shapeOverlay.appendChild(connectionPointLeft);
    this.shapeOverlay.appendChild(connectionPointRight);
    this.shapeOverlay.appendChild(connectionPointBottom);
    var pointsArray = [];
    pointsArray.push(connectionPointTop);
    pointsArray.push(connectionPointLeft);
    pointsArray.push(connectionPointRight);
    pointsArray.push(connectionPointBottom);
    this.postInitConnectionPoints(pointsArray);
};

RectangleShape.prototype.move = function (dx, dy) {
    var startX = parseInt($(this.shape).attr('x'));
    var startY = parseInt($(this.shape).attr('y'));
    var overlayStartX = parseInt($(this.shapeOuterOverlay).attr('x'));
    var overlayStartY = parseInt($(this.shapeOuterOverlay).attr('y'));
    $(this.shape).attr('x', parseInt(startX + dx));
    $(this.shape).attr('y', parseInt(startY + dy));
    $(this.shapeOuterOverlay).attr('x', parseInt(overlayStartX + dx));
    $(this.shapeOuterOverlay).attr('y', parseInt(overlayStartY + dy));
    this.updateParams();
    this.updateLines(dx, dy);
};

RectangleShape.prototype.updateParams = function () {
    this.params = {
        x: parseInt($(this.shape).attr('x')),
        y: parseInt($(this.shape).attr('y')),
        width: parseInt($(this.shape).attr('width')),
        height: parseInt($(this.shape).attr('height'))
    };
};


function CircleShape(cx, cy, r) {
    this.params = {x: cx, y: cy, r: r};
    AbstractShape.apply(this);
}

CircleShape.prototype = Object.create(AbstractShape.prototype);
CircleShape.prototype.constructor = CircleShape;

CircleShape.prototype.createCircleElement = function (x, y, r) {
    var circle = document.createElementNS(svgNS, "circle");
    $(circle).attr("cx", x);
    $(circle).attr("cy", y);
    $(circle).attr("r", r);
    $(circle).attr("stroke", "black");
    return circle;
};

CircleShape.prototype.draw = function () {
    this.createOverlay();
    var circle = this.createCircleElement(this.params.x, this.params.y, this.params.r);
    shapeCounter += 1;
    $(circle).attr("id", "circle" + shapeCounter);
    $(this.shapeOverlay).attr("id", "overlay" + shapeCounter);

    var circle2 = this.createCircleElement(this.params.x, this.params.y, this.params.r + 10);

    $(circle2).attr("fill", "none");
    $(circle2).attr("stroke", "white");
    $(circle2).attr("stroke-width", 20);
    $(circle2).attr("pointer-events", "stroke");
    $(circle2).attr("visibility", "hidden");

    this.shape = circle;
    this.shapeOuterOverlay = circle2;
    this.shapeId = "circle" + shapeCounter;
    console.log(this);
    this.shapeOverlay.appendChild(circle2);
    this.shapeOverlay.appendChild(circle);

    shapes.push(this);
    context.appendChild(this.shapeOverlay);

    this.postInitShape();
};

CircleShape.prototype.drawConnectionPoints = function () {
    console.log("DRAWIN");
    console.log(this);
    this.updateParams();
    var connectionPointTop = this.createPointElement(this.params.x, this.params.y - this.params.r);
    var connectionPointLeft = this.createPointElement(this.params.x - this.params.r, this.params.y);
    var connectionPointRight = this.createPointElement(this.params.x + this.params.r, this.params.y);
    var connectionPointBottom = this.createPointElement(this.params.x, this.params.y + this.params.r);
    this.shapeOverlay.appendChild(connectionPointTop);
    this.shapeOverlay.appendChild(connectionPointLeft);
    this.shapeOverlay.appendChild(connectionPointRight);
    this.shapeOverlay.appendChild(connectionPointBottom);
    var pointsArray = [];
    pointsArray.push(connectionPointTop);
    pointsArray.push(connectionPointLeft);
    pointsArray.push(connectionPointRight);
    pointsArray.push(connectionPointBottom);
    this.postInitConnectionPoints(pointsArray);
};

CircleShape.prototype.move = function (dx, dy) {
    var startX = parseInt($(currentShape.shape).attr('cx'));
    var startY = parseInt($(currentShape.shape).attr('cy'));
    var overlayStartX = parseInt($(currentShape.shapeOuterOverlay).attr('cx'));
    var overlayStartY = parseInt($(currentShape.shapeOuterOverlay).attr('cy'));
    $(this.shape).attr('cx', parseInt(startX + dx));
    $(this.shape).attr('cy', parseInt(startY + dy));
    $(this.shapeOuterOverlay).attr('cx', parseInt(overlayStartX + dx));
    $(this.shapeOuterOverlay).attr('cy', parseInt(overlayStartY + dy));
    this.updateParams();
    this.updateLines(dx, dy);
};

CircleShape.prototype.updateParams = function () {
    this.params = {
        x: parseInt($(this.shape).attr('cx')),
        y: parseInt($(this.shape).attr('cy')),
        r: parseInt($(this.shape).attr('r'))
    };
};


function TriangleShape(cx, cy, h) {
    this.params = {x: cx, y: cy, h: h};
    AbstractShape.apply(this);
}

TriangleShape.prototype = Object.create(AbstractShape.prototype);
TriangleShape.prototype.constructor = TriangleShape;

TriangleShape.prototype.createCircleElement = function (x, y, r) {
    var circle = document.createElementNS(svgNS, "circle");
    $(circle).attr("cx", x);
    $(circle).attr("cy", y);
    $(circle).attr("r", r);
    $(circle).attr("stroke", "black");
    return circle;
};

TriangleShape.prototype.draw = function () {
    this.createOverlay();
    var triangle1 = this.createTriangleElement(this.params.x, this.params.y, this.params.h);
    shapeCounter += 1;
    $(triangle1).attr("id", "triangle" + shapeCounter);
    $(this.shapeOverlay).attr("id", "overlay" + shapeCounter);

    var triangle2 = this.createTriangleElement(this.params.x, this.params.y, this.params.h + 10);

    $(triangle2).attr("fill", "none");
    $(triangle2).attr("stroke", "white");
    $(triangle2).attr("stroke-width", 20);
    $(triangle2).attr("pointer-events", "stroke");
    $(triangle2).attr("visibility", "hidden");

    this.shapeOverlay.appendChild(triangle2);
    this.shapeOverlay.appendChild(triangle1);

    this.shape = triangle1;
    this.shapeOuterOverlay = triangle2;
    this.shapeId = "triangle" + shapeCounter;

    shapes.push(this);
    context.appendChild(this.shapeOverlay);
    this.postInitShape();
};

TriangleShape.prototype.createTriangleElement = function (cx, cy, h) {
    var points = [];
    points.push({x: cx - h / 2, y: cy + h / 2});
    points.push({x: cx + h / 2, y: cy + h / 2});
    points.push({x: cx, y: cy - h / 2});
    points.push({x: cx - h / 2, y: cy + h / 2});
    points = this.buildTrianglePoints(points);
    return this.createTriangleShape(points);
};

TriangleShape.prototype.createTriangleShape = function (points) {
    var element = document.createElementNS(svgNS, "polyline");
    $(element).attr('points', points);
    $(element).attr('points', points);
    $(element).attr("stroke-width", 2);
    $(element).attr("stroke", "black");
    $(element).attr("fill", "white");
    return element;
};

TriangleShape.prototype.move = function (dx, dy) {
    var startPoints = $(this.shape).attr('points').split(' ');
    var movedPts = this.buildTrianglePointsWithOffsets(startPoints, dx, dy);
    $(this.shape).attr('points', movedPts);
    var overlayStartPoints = $(this.shapeOuterOverlay).attr('points').split(' ');
    var overlayMovedPts = this.buildTrianglePointsWithOffsets(overlayStartPoints, dx, dy);
    $(this.shapeOuterOverlay).attr('points', overlayMovedPts);
    this.updateLines(dx, dy);
};

TriangleShape.prototype.updateParams = function () {
    var points = this.parseSplittedTrianglePointsToArray($(this.shape).attr('points').split(' '));
    this.params = {
        left: {x: points[0].x, y: points[0].y},
        right: {x: points[1].x, y: points[1].y},
        top: {x: points[2].x, y: points[2].y}
    };
};

TriangleShape.prototype.buildTrianglePoints = function (points) {
    var result = "";
    for (var i = 0; i < points.length; i++) {
        result += points[i].x + "," + points[i].y + " ";
    }
    return result.trim();
};


TriangleShape.prototype.buildTrianglePointsWithOffsets = function (points, dx, dy) {
    var intPoints = this.parseSplittedTrianglePointsToArray(points);
    var result = "";
    for (var i = 0; i < intPoints.length; i++) {
        result += (intPoints[i].x + dx) + "," + (intPoints[i].y + dy) + " ";
    }
    return result.trim();
};
TriangleShape.prototype.parseSplittedTrianglePointsToArray = function (points) {
    var intPoints = [];
    for (var i = 0; i < points.length; i++) {
        var temp = points[i].split(',');
        intPoints.push({x: parseInt(temp[0]), y: parseInt(temp[1])});
    }
    return intPoints;
};

TriangleShape.prototype.drawConnectionPoints = function () {
    this.updateParams();
    var connectionPointTop = this.createPointElement(this.params.top.x, this.params.top.y);
    var connectionPointLeft = this.createPointElement(this.params.left.x, this.params.left.y);
    var connectionPointRight = this.createPointElement(this.params.right.x, this.params.right.y);
    this.shapeOverlay.appendChild(connectionPointTop);
    this.shapeOverlay.appendChild(connectionPointLeft);
    this.shapeOverlay.appendChild(connectionPointRight);
    var pointsArray = [];
    pointsArray.push(connectionPointTop);
    pointsArray.push(connectionPointLeft);
    pointsArray.push(connectionPointRight);
    this.postInitConnectionPoints(pointsArray);
};