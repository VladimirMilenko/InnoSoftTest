/**
 * Created by AsTex on 07.09.2016.
 */

$("#createTriangleButton").on("click", function(event){
    new TriangleShape(200,200,100).draw();
});
$("#createCircleButton").on("click", function(event){
    new CircleShape(200,200,100).draw();
});
$("#createRectangleButton").on("click", function(event){
    new RectangleShape(200,200,150,100).draw();
});