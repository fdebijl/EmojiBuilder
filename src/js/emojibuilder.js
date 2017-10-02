$(document).ready(function() {
    var svg = document.getElementById('svg2');
    $('g')
        // Initiate jQuery draggable on every SVG group level element
        .draggable()
        .bind('mousedown', function(event, ui){
            $(event.target.parentElement).append( event.target );
        })
        .bind('drag', function(event, ui){
        // update coordinates manually, since top/left style props don't work on SVG
        var coords = DOMtoSVG(this, event.clientX, event.clientY);
        event.target.setAttribute('transform', 'translate(' + coords.x + ',' + coords.y + ')');
    });
    
    // Translate DOM coords to SVG relative coordinates
    function DOMtoSVG(element, x, y) {
        var pt = svg.createSVGPoint();
        
        pt.x = x;
        pt.y = y;

        return pt.matrixTransform(element.getScreenCTM().inverse());
    }
});