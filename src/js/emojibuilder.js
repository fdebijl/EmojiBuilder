$(document).ready(function() {
    // Start by populating the emojigrid
	const svgdir = "svg/";
    getSVG(svgdir);
	
	// Remove the hint and betanote from DOM after 15 seconds by fading it out and removing it upon animation completion
	setTimeout(function() {
		$('.hinter').fadeOut("slow", function() {
			$(this).remove();
		});
        
        $('.betanote').fadeOut("slow", function() {
			$(this).remove();
		});
	}, 15 * 1000);
	
	// Remove selection when clicking anywhere on the drawboard
	$('.drawboard').click(function(e) {
		$('path').removeClass('selected');
	});

	// Clear the canvas when the reset button is clicked
	$('.clear').click(function(e){
		$('#drawboard').empty();
	});
	
	// Render the canvas and save as png
	$('.render').click(function(e){
		html2canvas(document.getElementById('drawboard'), {
			onrendered: function(canvas) {
				let base64blob = canvas.toDataURL("image/png");
				let download = document.createElement('a');
				download.href = base64blob;
				download.download = "emoji.png";
				download.click();
			},
            logging: true
		});
	});
});

// Allow dropping other elements on this element 
function allowDrop(e) {
	e.preventDefault();
}

// Translate dropped imgs to function call on addSVG()
function appendEmoji(e) {
	addSVG(document.getElementById(e.dataTransfer.getData("text/html")), e.clientX, e.clientY);
}

// Pass the source element when dragging images so appendEmoji() can parse them onto the drawboard
function appendSource(e) {
	e.dataTransfer.setData('text/html', e.target.id);
}

// Enable dragging on this element
function Draggable(elem) {
	// Rewritten from https://stackoverflow.com/questions/41514967/yes-no-is-there-a-way-to-improve-mouse-dragging-with-pure-svg-tools/41518545
    let target = elem;
	
	// Create SVG points for capturing...
	// clickpoint: ... where the cursor is relative to the rest of the path
	// lastMove: ... the last transformation applied to this element
	// currentMove .. the current transformation to apply next
	let lastMove    = target.ownerSVGElement.createSVGPoint();
    let clickPoint  = target.ownerSVGElement.createSVGPoint();
    let currentMove = target.ownerSVGElement.createSVGPoint();
	
	$(target).on("vmousedown", function(evt) {
        evt.preventDefault();
        clickPoint = globalToLocalCoords(evt.clientX, evt.clientY);
        target.classList.add("dragged");
        target.setAttribute("pointer-events", "none");
        $(target.ownerSVGElement).on("vmousemove", target, function(evt) {
			let p = globalToLocalCoords(evt.clientX, evt.clientY);
			currentMove.x = lastMove.x + (p.x - clickPoint.x);
			currentMove.y = lastMove.y + (p.y - clickPoint.y);
			target.setAttribute("transform", "translate(" + currentMove.x + "," + currentMove.y + ")");
		});
		
        $(target.ownerSVGElement).on("vmouseup", target, function(evt) {
			lastMove.x = currentMove.x;
			lastMove.y = currentMove.y;
			target.classList.remove("dragged");
			target.setAttribute("pointer-events", "all");
			$(target.ownerSVGElement).off("vmousemove");
			$(target.ownerSVGElement).off("vmouseup");
		});
    });
	
    // Convert DOM coordinates to SVG coordinates so we can apply a translation to this path accordingly
    function globalToLocalCoords(x, y) {
        let p = target.ownerSVGElement.createSVGPoint();
        let m = target.parentNode.getScreenCTM();
        p.x = x;
        p.y = y;
        return p.matrixTransform(m.inverse());
	}
}

// Retrieve all files from a given directory
function getSVG(directory) {
    $.ajax({
        url: "svg.php",
    })
    .done( function(data) {
		let root = directory;
        let d = data;
        
		// Iterate over directories
        for (i = 0; i < d.length; i++) {
            // Append current category (d[i].name) to emojigrid and tabmenu
            $(".emojigrid").append('<div class="grid grid_' + d[i].name + '"></div>');
            $(".tabs").append('<div class="tab tab_' + d[i].name + '">' + d[i].name + '</div>');
            
			// Iterate over files in directory d[i]
            for (j = 0; j < d[i].dir.length; j++) {
                // Root = "svg/"
                // d[1].name = faces/objects/etc
                // d[i].dir[i].file = filename
                let filestring = '<img draggable="true" ondragstart="appendSource(event)" class="svg-icon" id="' + d[i].dir[j].file.split(".")[0] + '" src="' + root + d[i].name + "/" + d[i].dir[j].file + '" data-cat="' + d[i].name + '">';				
                $(".grid_" + d[i].name).append($.parseHTML(filestring));
            }
        }
        
		// Bind addSVG to each img to allow click-to-add to the drawboard
        $('.svg-icon').click(function(e) {
            addSVG(this); 
        });
    });
}

// Add this SVG element to dom. x/y may be ommitted 
function addSVG(el, x, y) {
	// Append staging area to DOM to load SVG in. $.load is destructive so we need a proxy element to prevent clearing the drawboard
	let stager = '<div class="stagingarea" style="display: none;"></div>';
	$('.wrapper').append($.parseHTML(stager));
	
	// Clear the hinter - the user obviously figured out how to drag already
	$('.hinter').remove();
	
	// Append the SVG file to the staging area and subsequently move to the drawboard
	$('.stagingarea').load(el.src, function() {
		// Aaaaand move it to the drawboard
		$('#drawboard').append($('.stagingarea').html());
		
		// Done, let's make it draggable and selectable
		$('path').each(function() {
			new Draggable(this);
			$(this).dblclick(function(e) {
				$('path').removeClass('selected');
				$(this).addClass('selected');
			});
		});
		
		// Remove all clipping paths that prevent SVG movement outside of the bounding box. Also metadata because there's really no good reason to have it in here for our purposes.
		$('defs').remove();
		$('metadata').remove();
		
		// Destroy the staging area
		$('.stagingarea').remove();
	}); 
}

// Listen for delete keypress and delete the currently selected path
$('html').keyup(function(e){
    if(e.keyCode == 46) {
        $('.selected').remove();
    }
});