// Let the user know they need to let me known one of the SHA256 digests has become invalid, most likely because of an update to Canvg
$(window).on('securitypolicyviolation', function(event) {
	let oevt = event.originalEvent;
	let pevt = {
		time: Date.now(),
		uri: oevt.blockedURI,
		docuri: oevt.documentURI,
		disposition: oevt.disposition,
		effectivedirective: oevt.effectiveDirective,
		violateddirective: oevt.violatedDirective,
		line: oevt.lineNumber,
		referrer: oevt.referrer,
		sample: oevt.sample
	};

	// Since the user might not be able to create an issue, we also send a report to our own servers
	$.ajax({
		url: "https://floris.amsterdam/reports/csp",
		method: "POST",
		data: pevt
	})
	.done(function(data) {
		let issuelink = `https://github.com/Fdebijl/EmojiBuilder/issues/new?title=CSP%20Violation&body=${encodeURI(JSON.stringify(pevt, null, 4))}`
		$('#csp-issue-link').attr('href', issuelink);

		ShowModal("fatal-modal", 30);
	});
});

$(document).ready(function() {
	// The CSP prevents inline event binding, so we bind the drag-and-drop listeners here
	document.getElementById('drawboard').addEventListener('drop', function(event) {
		event.preventDefault();  
    	event.stopPropagation();
		appendEmoji(event);
	});

	document.getElementById('drawboard').addEventListener('dragover', function(event) {
		event.preventDefault();  
    	event.stopPropagation();
		allowDrop(event);
	});

    // Start by populating the emojigrid
	const svgdir = "svg/";
    getSVGFilesInDirectory(svgdir);
	
	// Remove the hint from the drawboard after 15 seconds
	setTimeout(function() {
		$('.hinting').removeClass('hinting');
	}, 15 * 1000);
	
	// Remove superfluous elements
	$('.ui-loader').remove();

	ControlsAndMenu();

	// Register the serviceworker used to cache all resources
	if ('serviceWorker' in navigator) {
		navigator.serviceWorker.register('/test/emojiworker.js');
	}

	// Check for availability of the persistent storage API
	if (navigator.storage && navigator.storage.persist) {
		$('.persist').removeClass('disabled');

		// Get usage in MB so the user can decide if the space is worth it
		navigator.storage.estimate().then(estimate => {
			$('.cachesize').html(`${Math.round(estimate.usage / 1000 / 1000 * 100) / 100}MB`);
		});

		$('.persist').on('vclick', function(evt){
			ShowModal("persist-modal", 0);
		});

		// Persistent storage permissions have been granted
		$('.persist-granted').on('vclick', function(evt){
			navigator.storage.persist().then(granted => {
				console.info("Persistent storage permissisons granted.")
			})
		});
	};
});

// Enable functionality on menubar and other controls
function ControlsAndMenu() {
	// File
		// New file
		$('.clear').on('vclick', function(evt){
			$('#drawboard').empty();
		});

		$('.open').on('vclick', function(evt){
			LoadSVG();
		});

		$('.saveas').on('vclick', function(evt){
			ShowModal("save-modal", 0);
		});

	// Edit
		// Delete selected path
		$('.delete').on('vclick', function(e) {
			$('.selected').remove();
		});
		
		// Bring forwards
		$('.forward').on('vclick', function(e){
			$('.selected').parent().insertAfter($('.selected').parent().next()); 
			
		});
		
		// Push backwards
		$('.backward').on('vclick', function(e){
			$('.selected').parent().insertBefore($('.selected').parent().prev()); 
		});

		// Transform
			// Flip horizontal
			$('.fliphorizontal').on('vclick', function(e){
				$('.selected').parent().insertBefore($('.selected').parent().prev()); 
			});

			// Flip vertical
			$('.flipvertical').on('vclick', function(e){
				$('.selected').parent().insertBefore($('.selected').parent().prev()); 
			});

	// About
		// Help
		$('.help').on('vclick', function(evt){
			ShowModal("info-modal", 0);
		});

	// Render the canvas and save as png when the "Save as PNG" button is clicked
	$('.download-png').on('vclick', function(evt) {
		SaveAsPNG();
	});

	// Same for SVG
	$('.download-svg').on('vclick', function(evt) {
		SaveAsSVG();
	});
}
	
// allowDrop is used on the drawboard to allow emoji from the sidebar to be dropped on there.
// Allow dropping other elements on this element 
function allowDrop(evt) {
	evt.preventDefault();
}

// appendEmoji is used when an element is dropped onto the drawboard.
// Translate dropped imgs to function call on addSVG()
function appendEmoji(evt) {
	addSVGtoDrawboard(document.getElementById(evt.dataTransfer.getData("text/html")), evt.clientX, evt.clientY);
}

// Pass the source element when dragging images so appendEmoji() can parse them onto the drawboard
function appendSource(evt) {
	evt.dataTransfer.setData('text/html', evt.target.id);
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

// Show the emojigrid for this tab (passed as category) in the sidebar
function showGrid(cat) {
	// Simple fadeout of the current active grid (ie: any grid) and callback to show the desired grid
	$('.grid').fadeOut(333, function() {
		$('.grid_' + cat).show();
		$('.tab').removeClass('tab_active');
		$('.tab_' + cat).addClass('tab_active')
	});	
}

// Enable dragging on this element
function Draggable(elem) {
	// Rewritten from https://stackoverflow.com/questions/41514967/
    let target = elem;
	
	// Create SVG points for capturing...
	// clickpoint: ... where the cursor is relative to the rest of the path
	// lastMove: ... the last transformation applied to this element
	// currentMove .. the current transformation to apply
	let lastMove    = target.ownerSVGElement.createSVGPoint();
    let clickPoint  = target.ownerSVGElement.createSVGPoint();
    let currentMove = target.ownerSVGElement.createSVGPoint();
	
	$(target).on("vmousedown", function(evt) {
        evt.preventDefault();
        clickPoint = globalToLocalCoords(evt.clientX, evt.clientY);
        $(target).addClass("dragged");
        $(target.ownerSVGElement).on("vmousemove", target, function(evt) {
			let p = globalToLocalCoords(evt.clientX, evt.clientY);
			currentMove.x = lastMove.x + (p.x - clickPoint.x);
			currentMove.y = lastMove.y + (p.y - clickPoint.y);
			target.setAttribute("transform", "translate(" + currentMove.x + "," + currentMove.y + ")");
		});
		
        $(target.ownerSVGElement).on("vmouseup", target, function(evt) {
			lastMove.x = currentMove.x;
			lastMove.y = currentMove.y;
			$(target).removeClass("dragged");
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

// Retrieve all SVG files from a given directory
function getSVGFilesInDirectory(directory) {
    $.ajax({
        url: "svgs.json",
    })
    .done( function(data) {
		let root = directory;
        let d = data;
        
		// Iterate over directories
        for (i = 0; i < d.length; i++) {
            // Append current category (d[i].name) to emojigrid and tabmenu
            $(".emojigrid").append('<div class="grid grid_' + d[i].name + '"></div>');
            $(".tabs").append('<div class="tab tab_' + d[i].name + '" data-cat="' + d[i].name + '">' + capitalizeFirstLetter(d[i].name) + '</div>');
            
			// Iterate over files in directory d[i]
            for (j = 0; j < d[i].dir.length; j++) {
                // Root = "svg/"
                // d[1].name = faces/objects/etc
                // d[i].dir[i].file = filename
                let filestring = '<img draggable="true" class="svg-icon" id="' + d[i].dir[j].file.split(".")[0] + '" src="' + root + d[i].name + "/" + d[i].dir[j].file + '">';				
                $(".grid_" + d[i].name).append($.parseHTML(filestring));
			}
        }
        
		// Bind showGrid() to each tab to show the emojigrid for the corresponding category
		$('.tabs > div').click(function(e) {
			showGrid($(this).data('cat'));
		});
		
		// Bind addSVG to each img to allow click-to-add to the drawboard
        $('.svg-icon').click(function(e) {
            addSVGtoDrawboard(this); 
		});
		
		// Once again we need to attach the drag-and-drop event handler inline to prevent CSP violations
		// jQuery's bind doesn't properly pass event.dataTransfer, so we opt to use vanilla JS here
		let svgicons = document.getElementsByClassName("svg-icon");
		Array.from(svgicons).forEach(function(element) {
			element.addEventListener('dragstart', function(event) {
				appendSource(event);
			});
		});

		// Show the 'faces' grid by default
		showGrid("faces");
    });
}

// Add this SVG element to the drawboard
function addSVGtoDrawboard(elem) {
	// Append staging area to DOM to load SVG in. $.load is destructive so we need a proxy element to prevent clearing the drawboard
	let stager = '<div class="stagingarea" style="display: none;"></div>';
	$('.wrapper').append($.parseHTML(stager));
	
	// Clear the hinter - the user obviously figured out how to drag already
	$('.hinter').remove();
	
	// Append the SVG file to the staging area and subsequently move to the drawboard
	$('.stagingarea').load(elem.src, function() {
		// Aaaaand move it to the drawboard
		$('#drawboard').append($('.stagingarea').html());

		// Remove all clipping paths that prevent SVG movement outside of the bounding box. Also metadata because there's really no good reason to have it in here for our purposes.
		$('defs').remove();
		$('metadata').remove();
		
		// Destroy the staging area
		$('.stagingarea').remove();
		
		// Done, let's make it draggable
		makePathsDraggable();
	}); 
}

function addSVGstring(svgstring) {
	// Same story as addSVG, but we load from a string instead of a file
	// DRY VIOLATIONS REEEEEEEEEEEEEEEEEEEE
	let stager = '<div class="stagingarea" style="display: none;"></div>';
	$('.wrapper').append($.parseHTML(stager));
	
	$('.hinter').remove();
	
	// Append the SVG string to the staging area and subsequently move to the drawboard
	$('.stagingarea').html(svgstring);
	$('#drawboard').append($('.stagingarea').html());
	$('defs').remove();
	$('metadata').remove();
	$('.stagingarea').remove();

	makePathsDraggable();
}

function SaveAsPNG() {
	// Show loading overlay
	UIkit.modal(document.getElementById('loading-modal')).show();
			
	// Make a temporary canvas to dump all the SVG to and append it to DOM
	let renderbox = '<canvas id="renderbox"></canvas>';
	$('.wrapper').append($.parseHTML(renderbox));

	// Set the appropriate dimensions for the renderbox and SVG elements so canvg doesn't get confused from the 100%/100vh we have on the SVGs
	$('#renderbox, #drawboard > svg').width($('#drawboard').outerWidth());
	$('#renderbox, #drawboard > svg').height($('#drawboard').outerHeight());

	// Get all the SVG elements on the drawboard and save it as a string canvg will use later on
	let drawboardContent = "";

	// If we have just one emoji, we only need the base HTML
	if ($('#drawboard > svg').length === 1) {
		// Remove all comments and strip whitespace from the single SVG element
		drawboardContent = $.trim($('#drawboard').html().replace(/<!--[\s\S]*?-->/gi, ""));
	} else {
		// If we have more than one emoji we'll need to merge them to one grand SVG, for this we need a new element to do some DOM manipulation
		let mergehelper = '<div class="mergehelper" style="display: none;"></div>';
		$('.wrapper').append($.parseHTML(mergehelper));
		$('.mergehelper').html($('#drawboard').html());
		
		// Remove all XML comments to prevent fuckery later on
		$('.mergehelper').html($('.mergehelper').html().replace(/<!--[\s\S]*?-->/gi, ""));
		
		let SVGinMergeHelper = $('.mergehelper > svg');
		
		// Append all subsequent SVG elements to the first
		for (i = 1; i < SVGinMergeHelper.length; i++ ) {
			let t = $(SVGinMergeHelper[i]).html();
			$('.mergehelper > svg').eq(0).append(t);
			$(SVGinMergeHelper[i]).remove();
		}
		
		drawboardContent = $.trim($('.mergehelper').html());
	}

	// Reset the dimensions on the SVGs in the drawboard
	$('svg').css('width', 'auto').css('height', 'auto');

	// Convert the SVG in the renderbox to PNG
	canvg(
		'renderbox',
		drawboardContent, {
			renderCallback: function() {
				// Wait 333ms for each SVG to make sure canvg is done rendering
				setTimeout(function() {
					let EmojiAsCanvas = document.getElementById('renderbox');
					let base64blob = EmojiAsCanvas.toDataURL("image/png");
					let DownloadHelper = document.createElement('a');
					DownloadHelper.href = base64blob;
					DownloadHelper.download = "emoji.png";
					DownloadHelper.click();
					
					// Remove all temporary elements from DOM
					$(DownloadHelper).remove();
					UIkit.modal(document.getElementById('loading-modal')).hide();
					$('#renderbox, .mergehelper').remove();
				}, $('#drawboard > svg').length * 333);
			}
		}
	);	
}	

// Save the drawboard to an SVG file the user can come back to edit later on
function SaveAsSVG() {
	// This is a lot easier than PNG
	let url = "data:image/svg+xml;charset=utf-8,"+encodeURIComponent($('#drawboard').html());
	let DownloadHelper = document.createElement('a');
	DownloadHelper.href = url;
	DownloadHelper.download = "emoji.svg";
	DownloadHelper.click();
	$(DownloadHelper).remove();
}

// Load an SVG file and display it to the drawboard
function LoadSVG() {
	let input = $(document.createElement("input"));
	input.attr("type", "file");
	input.on("change", function(evt) {
		let file = this.files[0];
		let reader = new FileReader();

		reader.onload = (function(resultfile) {
			return function(e) {
				// Append the contents of the SVG file to the drawboard
				addSVGstring(e.target.result);
			};
		})(file);
	
		// Read in the image file as a data URL.
		reader.readAsText(file);
	});
	input.click();
	return false;
}

// Show a modal for a specified period of time. Defaults to displaying the modal for 10 seconds.
function ShowModal(modalname, delay = 10) {
	if (delay > 0 ) {
		UIkit.modal(document.getElementById(modalname)).show();
		setTimeout(function(){
			UIkit.modal(document.getElementById(modalname)).hide();
		}, delay * 1000);
	} else {
		UIkit.modal(document.getElementById(modalname)).show();
	}
}

function makePathsDraggable() {
	$('path').each(function() {
		// Instantiate Draggable on this element
		new Draggable(this);
		
		// Make each path selectable by click
		$(this).on("vclick", function(evt) {
			$('path').removeClass('selected');
			$(evt.target).addClass('selected');
		});
		
	});
}

// Listen for delete keypress and delete the currently selected path
$('html').keyup(function(evt) {
    if (evt.keyCode == 46) {
        $('.selected').remove();
    }
});