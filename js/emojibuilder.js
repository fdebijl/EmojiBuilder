(function() {
"use strict";

// Allow access to the files from the SVGdir in all methods. This variable is populated in the window.onload event handler.
var svg_files;

// Config and enums
const URLS = Object.freeze({
	WORKERPATH: "/emojiworker.js",
	SVG_DIR_PATH: "svg/"
});

const TRANSFORMS = Object.freeze({
	SCALE: "scale",
	FLIP: "flip",
	TRANSLATE: "translate",
	ROTATE: "rotate"
});

const FLIPS = Object.freeze({
	HORIZONTAL: "horizontal",
	VERTICAL: "vertical"
});

$(window).on("load", function() {
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

	// The emoji in the sidebar will initially be hidden from view for mobile users, so we'll start loading those on the first scroll for them.
	// For desktop clients we load only the first few rows of the 'faces' grid, since that one will be shown by default. Other tabs are loaded
	// in lazily in showGrid().
	getSVGFilesInDirectory()
		.then(files => { 
			svg_files = files;
			addTabs(files.tabs);
			addGrids(files.grids);
		})
		.then(() => {
			if (window.innerWidth <= 500) {
				// Mobile layout
				$(window).one('scroll touchmove', function(e){
					showGrid("SmileysPeople");
				});
			} else {
        // Desktop
        showGrid("SmileysPeople");
			}
		});
	
	// Remove the hint from the drawboard after 15 seconds
	setTimeout(function() {
		$('.hinting').removeClass('hinting');
	}, 15 * 1000);
	
	// Remove superfluous elements
	$('.ui-loader').remove();

	// Bind all clickhandlers to the menus and on-screen contrls
	ControlsAndMenu();

	// Register the serviceworker used to cache all resources
	if ('serviceWorker' in navigator) {
		navigator.serviceWorker.register(URLS.WORKERPATH);
	}

	// Check for availability of the persistent storage API
	if (navigator.storage && navigator.storage.persist) {
		$('.persist').removeClass('disabled');

		// Get usage in MB so the user can decide if the space is worth it
		navigator.storage.estimate().then(estimate => {
			$('.cachesize').html(`${Math.round(estimate.usage / 1000 / 1000 * 100) / 100}MB`);
		});

		$('.persist').on('click touch', function(evt){
			ShowModal("persist-modal", 0);
		});

		// Persistent storage permissions have been granted
		$('.persist-granted').on('click touch', function(evt){
			navigator.storage.persist().then(granted => {
				console.info("Persistent storage permissisons granted.")
			})
		});
	};
});

// Enable functionality on menubar and other controls
function ControlsAndMenu() {
	// Buttons inside modals
	$('.apply-scale').on('click touch', function(evt) {
		ApplyTransform($('.selected'), TRANSFORMS.SCALE, $('#scale-input').val());
	});

	// Menu structure
	// File
		// New file
		$('.clear').on('click touch', function(evt){
			$('#drawboard').empty();
		});

		$('.open').on('click touch', function(evt){
			LoadSVG();
		});

		$('.saveas').on('click touch', function(evt){
			ShowModal("save-modal", 0);
    });
    
  // Add
    // Add emoji
    $('.add-emoji').on('click touch', function(e) {
      emojiToBuilder($('#add-emoji-input').val());
    });

	// Edit
		// Delete selected path
		$('.delete').on('click touch', function(e) {
			$('.selected').remove();
		});
		
		// Bring forwards
		$('.forward').on('click touch', function(e){
			$('.selected').parent().insertAfter($('.selected').parent().next()); 
			
		});
		
		// Push backwards
		$('.backward').on('click touch', function(e){
			$('.selected').parent().insertBefore($('.selected').parent().prev()); 
		});

		// Transform
			// Flip horizontal
			$('.fliphorizontal').on('click touch', function(e){
				ApplyTransform($('.selected'), TRANSFORMS.FLIP, FLIPS.HORIZONTAL);
			});

			// Flip vertical
			$('.flipvertical').on('click touch', function(e){
				ApplyTransform($('.selected'), TRANSFORMS.FLIP, FLIPS.VERTICAL);
			});

			// Rotate 90 clockwise
			$('.rotate90cw').on('click touch', function(e){
				ApplyTransform($('.selected'), TRANSFORMS.ROTATE, 90);
			});

			// Rotate 90 counter-clockwise
			$('.rotate90ccw').on('click touch', function(e){
				ApplyTransform($('.selected'), TRANSFORMS.ROTATE, -90);
			});

		// Rotate
		$('.rotate').on('click touch', function(e){
			
		});

		// Scale
		$('.scale').on('click touch', function(e){
			ShowModal("scale-modal", 0);
		});
	// About
		// Help
		$('.help').on('click touch', function(evt){
			ShowModal("info-modal", 0);
		});

	// Render the canvas and save as png when the "Save as PNG" button is clicked
	$('.download-png').on('click touch', function(evt) {
		SaveAsPNG();
	});

	// Same for SVG
	$('.download-svg').on('click touch', function(evt) {
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
	addSVGtoDrawboard(document.getElementById(evt.dataTransfer.getData("text/html")));
}

// Pass the source element when dragging images so appendEmoji() can parse them onto the drawboard
function appendSource(evt) {
	evt.dataTransfer.setData('text/html', evt.target.id);
}

// Show the emojigrid for this tab (passed as category) in the sidebar
// If the grid hasn't been shown previously we will also load the images here.
function showGrid(cat) {
	if (!$('.grid_' + cat).hasClass('loaded')) {
    let files = svg_files.grids[cat];
    if (!files) {
      console.warn('Error pending, dumping svg_files:');
      console.warn(svg_files.grids);
      throw new Error('showGrid received a category  that does not exist in svg_files!')
    }
		addFilesToGrid(files);
		$('.grid_' + cat).addClass('loaded');
  }
  
  // Simple fadeout of the currently active grid and callback to show the desired grid
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
	
	$(target).on("pointerdown", function(evt) {
		evt.preventDefault();
		clickPoint = globalToLocalCoords(evt.clientX, evt.clientY);
		$(target).addClass("dragged");
		$(target.ownerSVGElement).on("pointermove", target, function(evt) {
			let p = globalToLocalCoords(evt.clientX, evt.clientY);
			currentMove.x = lastMove.x + (p.x - clickPoint.x);
			currentMove.y = lastMove.y + (p.y - clickPoint.y);
			ApplyTransform(target, "translate", currentMove.x + "," + currentMove.y);
		});
		
		$(target.ownerSVGElement).on("pointerup", target, function(evt) {
			lastMove.x = currentMove.x;
			lastMove.y = currentMove.y;
			$(target).removeClass("dragged");
			$(target.ownerSVGElement).off("pointermove");
			$(target.ownerSVGElement).off("pointerup");
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

// Retrieve all SVG files from the SVG directory.
// Note that RELATIVE_PATH_TO_SVG_DIR is only used to form the paths for the file src's.
// The actual location of all the SVG's is stored in /svgs.json, which is generated by /svg.php.
async function getSVGFilesInDirectory() {
	let directory = URLS.SVG_DIR_PATH;
	return new Promise((resolve, reject) => {
		$.ajax({
			url: "svgs.json",
		})
		.done(function(data) {
			let result = {
				tabs: [],
				grids: {}
			}
			
			// Iterate over directories inside the SVG folder. These are the categories.
			for (let i = 0; i < data.length; i++) {
				// Two versions of the gridname: one for scripts and one for displaying in the UI
        let gridname = data[i].name.replace(/\W/g, "");
        let humanname = data[i].name;
				// Append current category (gridname) to the list emojigrids and tabmenus
				result.grids[gridname] = {
					html: '<div class="grid grid_' + gridname + '"></div>',
					files: []
				};

				result.tabs.push('<div class="tab tab_' + gridname + '" data-cat="' + gridname + '">' + humanname + '</div>')
				
				// Iterate over files in directory d[i]. These are the emoji themselves.
				for (let j = 0; j < data[i].dir.length; j++) {
					// Root = "svg/"
					// d[1].name = The category. I.e. faces, objects, food, etc.
					// d[i].dir[i].file = The filename of the emoji. E.g. 1f47d.svg
					
					let htmlstring = '<img draggable="true" class="svg-icon" id="' + data[i].dir[j].file.split(".")[0] + '" src="' + directory + data[i].name + "/" + data[i].dir[j].file + '">';
					let targetgrid = '.grid_' + gridname;
					result.grids[gridname].files.push({
						grid: targetgrid,
						html: htmlstring
					});
				}
			}
			resolve(result);
		});
	});
}

// Add tabs (i.e. categories) to the sidebar
async function addTabs(tabs) {
	return new Promise((resolve, reject) => {
		// Asynchronously add every category to the tab menu
		tabs.forEach((async (tab) => {
			return new Promise((resolve, reject) => {
				$(".tabs").append(tab);
				resolve();
			})
		}));
		
		// Bind showGrid() to each tab to show the emojigrid for the corresponding category
		$('.tabs > div').click(function(e) {
			showGrid($(this).data('cat'));
		});

		resolve();
	});
}

// Add the grids to the sidebar
// Grids will contain the individual emoji, every category has its own grid
async function addGrids(grids) {
	return new Promise((resolve, reject) => {
		// Asynchronously add every category to the emojigrid
		// We will later append the emoji themselves to these grids
		Object.entries(grids).forEach((async (grid) => {
			return new Promise((resolve, reject) => {
				$(".emojigrid").append(grid[1].html);
				resolve();
			})
		}));

		resolve();
	});
}

// Append all emoji to the given grid.
// Expects an array with the following signature
// [
//		{
//			grid: ".grid_faces",
//			html: "<img draggable="true" class="svg-icon" id="1f47f" src="svg/faces/1f47f.svg">"
//		},
//		{
//			grid: ".grid_faces",
//			html: "<img draggable="true" class="svg-icon" id="1f600" src="svg/faces/1f600.svg">"
//		}
// ]
async function addFilesToGrid(grid) {
	return new Promise((resolve, reject) => {
		// Asynchronously add every category to the emojigrid
		// We will later append the emoji themselves to these grids
		grid.files.forEach((async (emoji) => {
			return new Promise((resolve, reject) => {
				$(emoji.grid).append($.parseHTML(emoji.html));
				resolve();
			})
		}));

		// Bind showGrid() to each tab to show the emojigrid for the corresponding category
		// Bind addSVG to each img to allow click-to-add to the drawboard
		$('.svg-icon').click(function(e) {
			addSVGtoDrawboard(this.src); 
		});
		
		// Once again we need to attach the drag-and-drop event handler here to prevent CSP violations
		// jQuery's bind doesn't properly pass event.dataTransfer, so we opt to use vanilla JS here
		let svgicons = document.getElementsByClassName("svg-icon");
		Array.from(svgicons).forEach(function(element) {
			element.addEventListener('dragstart', function(event) {
				appendSource(event);
			});
		});

		resolve();
	});
}

// Add this SVG element to the drawboard
function addSVGtoDrawboard(src) {
	// Append staging area to DOM to load SVG in. $.load is destructive so we need a proxy element to prevent clearing the drawboard
	let stager = '<div class="stagingarea" style="display: none;"></div>';
	$('.wrapper').append($.parseHTML(stager));
	
	// Clear the hinter - the user figured out how to add emoji to the drawboard at this point
	$('.hinter').removeClass('hinter');
	
	// Append the SVG file to the staging area and subsequently move to the drawboard
	$('.stagingarea').load(src, function() {
		// Aaaaand move it to the drawboard
		$('#drawboard').append($('.stagingarea').html());

		// Remove all clipping paths (i.e. masks) that prevent SVG movement outside of the bounding box. 
		// All metadata tags are also stripped because there's really no good reason to have it in here for our purposes.
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
			
	// Make a temporary canvas to dump all the SVG to and append it to the DOM
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
		for (let i = 1; i < SVGinMergeHelper.length; i++ ) {
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
	// This is a lot easier than PNG since we can just dump the entire contents of the drawboard to a file.
	// Note that this will only produce a valid SVG file if the user has added just one emoji to the drawboard.
	// Our custom loader will work just fine with more than one emoji, however.
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
	$('svg > *').each(function() {
		// Instantiate Draggable on this element
    new Draggable(this);

		// Make each path selectable by click
		$(this).on("click touch", function(evt) {
			$('svg > *').removeClass('selected');
			$(evt.target).addClass('selected');
		});
		
	});
}

// Apply a transformation to an SVG path without destroying/unsetting the current transformations
// Calling signature examples:
// 		ApplyTransform($('.selected'), TRANSFORMS.ROTATE, 90);
//		ApplyTransform($('.selected'), TRANSFORMS.FLIP, FLIPS.HORIZONTAL);
function ApplyTransform(path, name, value) {
	// All parameters are required
	if (!path || !name || !value) {
		throw new Error(`Attempted to apply transformation to path with missing arguments:${path?"":" path"}${name?"" :" name"} ${value?"":" value"}`)
	}

	let flip = false;
	
	// There is no official flip transform so we use scale instead.
	if (name === TRANSFORMS.FLIP) {
		flip = true;
		name = TRANSFORMS.SCALE;
	}

	let transforms = $(path).attr('transform');
	// If no transformation is applied to this element we will continue with an empty array. The new transformation will be pushed to this array later on.
	// We cant just split on " " since scale contains a space, so we split on a space followed by a letter and filter out elements that are just a space.
	transforms =  transforms ? transforms.split(/( )(?=[a-z])/gi).filter(transform => transform !== " ") : [];

	// Transforms all have the signature 'name(value)', so we can retrieve the name by getting every char ahead of the first parenthesis
	let targettransformindex = transforms.findIndex(transform => transform.split("(")[0] === name);

	// Make sure both x and y are populated if only x is passed for scale transforms.
	if (name === TRANSFORMS.SCALE && value.split(" ").length !== 2 && !flip) {
		value = value + " " + value;
	}

	// Flips (both horizontal and vertical) are applied using a negative value on the scale transform. We maintains those negatives here.
	// This statement is also used to generate 'value' for new flips
	if ((name === TRANSFORMS.SCALE && targettransformindex >= 0) ||  flip) {
		// Match the two parentheses that will contain the value and strip them, leaving us with a space-sepparated value for x and y.
		let currentvalue; 
		try {
			currentvalue = transforms[targettransformindex].match(/\((.+?)\)/g)[0].replace(/\(|\)/g, "");
		} catch(e) {
			currentvalue = "1 1";
		}
		let currentx = currentvalue.split(" ")[0], currenty = currentvalue.split(" ")[1];
		let newx, newy;

		if (flip) {
			currentx = currentx;
			currenty = currenty;
			newx = currentx;
			newy = currenty;
			// Scale has previously been applied to this element and we need to apply a new flip
			// i.e. inverse one of the scale parameters.
			if (value === FLIPS.HORIZONTAL) {
				// Apply horizontal flip (x axis)
				newx *= -1;	
			} else if (value === FLIPS.VERTICAL) {
				// Apply vertical flip (y axis)
				newy *= -1;	
			} else {
				// Value must either be horizontal or vertical
				throw new Error(`Attempted to apply flip with invalid value '${value}'`);
			}
		} else {
			newx = value.split(" ")[0];
			newy = value.split(" ")[1];
			// We need to apply a scale, but not a flip. Since flips are applied using negative or positive values we have to maintain the negative or positive value when applying a scale
			newx = currentx < 0 ? newx * -1 : newx;
			newy = currenty < 0 ? newy * -1 : newy;
		}

		value = newx + " " + newy;
	}

	// If targettransformindex is greater than or equal to 0, the target path already has a value for the desired transformation. We'll mutate that value right here.
	if (targettransformindex >= 0) {
		// The regex finds the old value, which will be between parentheses, and replaces it with our own value.
		transforms[targettransformindex] = transforms[targettransformindex].replace(/\((.+?)\)/g, `(${value})`);
	} else {
		// If targettransformindex is -1, we need to create the transformation ourselves and append it to the attribute.
		transforms.push(`${name}(${value})`);
	}

	// Sort transforms reversed-alphabetically so 'translate' comes before 'rotate'. If we didn't do this the element would translate from it's rotated origin, which is very counter-intuitive.
	// See https://drafts.csswg.org/css-transforms-1/#transform-rendering at point 3
	transforms.sort().reverse();

	$(path).attr('transform', transforms.join(" "));

	return transforms.join(" ");
}

// Spawn a builder emoji from a string emoji
function emojiToBuilder(emoji) {
  let codepoint = emoji.codePointAt(0);
  let hex = codepoint.toString(16).toLowerCase();
  let src = findSrc(hex);
  if (!src) {
    $('#add-emoji-input').val("Not found :(");
    return;
  }

  addSVGtoDrawboard(src);
  // // Find the svg icon that matches the passed emoji
  // let emojiWeShouldClick = [...document.querySelectorAll('.svg-icon')].filter(icon => {
  //   return (icon.id == hex);
  // });

  // $(emojiWeShouldClick[0]).click();
}

function findSrc(hex) {
  let src;
  for(let gridkey in svg_files.grids) {
    svg_files.grids[gridkey].files.forEach(file => {
      if ($(file.html)[0].id == hex) {
        src = $(file.html)[0].src;
      }
    });
  }

  return src || false;
}

// Allow access to ApplyTransform from anywhere for debug purposes
window.ApplyTransform = ApplyTransform;

// Listen for delete keypress and delete the currently selected path
$('html').keyup(function(evt) {
	switch(evt.keyCode) {
		case 46:
			$('.selected').remove();
			break;
		case 68:
			$('.selected').removeClass('selected');
			break;
		default:
			break;
	}

});
})();