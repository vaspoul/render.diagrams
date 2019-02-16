function GeneralDrawing(docTag)
{
	var canvas;
	var propertyGrid;
	var objectList;
	var codeBoxDock;
	var codeBox;
	var menuBarDock;
	var fileManagerDock;
	var toolPaletteDock;
	var propertyGridDock;
	var keyModifiersDock;
	var ctrlKeyHint;
	var altKeyHint;
	var shiftKeyHint;
	var scene;
	var camera;
	var root;

	var dragStartMousePos		= {x:-1, y:-1};
	var dragStartMousePosPixels	= {x:-1, y:-1};
	var dragStartCamPos 		= {x:-1, y:-1};
	var dragOffset 				= new Vector(0,0);
	var lastMousePosPixels 		= {x:0, y:0}
	var lastMousePos	 		= {x:0, y:0}
	var lastMouseUpPos	 		= {x:0, y:0}
	var copyPasteDelta			= new Vector(0,0);
		
	var grid 					= new Grid()
	var mouseCursor 			= new MouseCursor(grid);
		
	var tool					= "select";
	var mode					= "";
		
	var selectionList			= [];
	var lastMouseDownEmpty		= false;	// track whether we selected anything on the most recent mouseDown
	var lastMouseDownSelection	= [];		// the objects selected on the most recent mouseDown
	var deepSelectionIndex		= -1;
	var transformRect;
	var moveOffsets				= [];
	var dragPoint				= null;
	var objectBeingMade			= undefined;
	var lastKeyPress;
	var enableSnap				= [];
	var showingModal			= false;

	var showGrid				= true;

	var undoRedoBuffer			= [];
	var undoRedoMaxCount		= 64;
	var undoRedoBackupPos		= 0;
	var undoRedoUndoPos			= 0;
	var undoRedoSuspendBackup	= false;
	var undoRedoLastSavePos		= 0;

	var clipboardText			= "";
	var urlParams				= [];

	var layerDirty				= [true, true, true];

	var frameTickTimer			= undefined;
	var lastFrameTickTime		= 0;

	var previousCoincidentEnabled;

	var preferences = {};

	window.addEventListener("resize", onResize);

	window.addEventListener("beforeunload", function (evt)
	{
		var dirty = (undoRedoLastSavePos != undoRedoUndoPos);

		if (!dirty)
			return undefined;

		var confirmationMessage = "You have unsaved changes! Are you sure you want to leave?";

		(evt || window.event).returnValue = confirmationMessage;

		return confirmationMessage;
	});

	window.addEventListener("focus", function (evt)
	{
		lastKeyPress = undefined;
		altKeyHint.className = altKeyHint.className.replace(" active", "");
		altKeyHint.innerHTML = "Alt";
	});

	function onResize()
	{
		if (camera != undefined)
		{
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;

			camera.onResize();

			var minX = camera.getViewPosition().x - camera.getViewSize().x/2;
			var maxX = camera.getViewPosition().x + camera.getViewSize().x/2;
			var minY = camera.getViewPosition().y - camera.getViewSize().y/2;
			var maxY = camera.getViewPosition().y + camera.getViewSize().y/2;
		
			camera.setViewPosition((minX+maxX)/2, (minY+maxY)/2);
			camera.setUnitScale(camera.getUnitScale());

			grid.spacing = Math.pow(10, Math.ceil(Math.log10(camera.invScale(10))));

			layerDirty[0] = true;
			layerDirty[1] = true;
			layerDirty[2] = true;

			draw();
		}
	}

	function setup()
	{
		// Parse URL params
		{
			var regex = /[?&]([^=#]+)=([^&#]*)/g;
			var  url = window.location.href;
			var match;

			while(match = regex.exec(url)) 
			{
				urlParams[match[1]] = match[2]; 
			}
		}

		root = document.getElementById(docTag);

		enableSnap["grid"] = true;
		enableSnap["node"] = true;
		enableSnap["midpoint"] = true;
		enableSnap["intersection"] = true;
		enableSnap["coincident"] = false;
		enableSnap["perpendicular"] = false;
		enableSnap["extendTo"] = false;

		preferences.objectListVisible = true;
		preferences.toolPaletteVisible = true;
		preferences.canvasControlsVisible = true;
		preferences.globalHintVisible = true;
		preferences.animateZoom = true;

		// Main canvas
		{
			canvas = document.getElementById("mainCanvas");
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			canvas.addEventListener('mousemove', onMouseMove, false);
			canvas.addEventListener('mousedown', onMouseDown, false);
			canvas.addEventListener('mouseup', onMouseUp, false);
			canvas.addEventListener('dblclick', onMouseDblClick, false);
			document.addEventListener('keydown', onKeyDown, false);
			document.addEventListener('keyup', onKeyUp, false);
			canvas.oncontextmenu = onContextMenu;
			canvas.onwheel = onMouseWheel;
			canvas.focus();

			// To stop some page elements being dragged on Chrome during marquee selection after a double click!
			canvas.ondragstart = function(evt) 
			{
				evt.preventDefault();
				return false;
			};
		}

		// Menu bar
		{
			menuBarDock = document.getElementById("menuBarDock");
			var menuBar = document.getElementById("menuBar");

			var menuButton = new MenuPopoutButton(undefined, undefined, "File", "bottom");
			{
				menuButton.addControl( "", new Button("images/new_drawing.svg",					[18,18],	"New Diagram",						undefined, function()	{ newDrawing();						}, "Ctrl+Alt+N"));
				menuButton.addControl( "", new Button("images/save_drawing_localstorage.svg",	[18,18],	"Save to LocalStorage",				undefined, function()	{ saveToLocalStorage();				}, "Ctrl+S"));
				menuButton.addControl( "", new Button("images/load_drawing_localstorage.svg",	[18,18],	"Load from LocalStorage",			undefined, function()	{ openLocalStorage();				}, "Ctrl+O"));
				menuButton.addControl( "", new Button("images/export_drawing_image.svg",		[18,18],	"Save as Image",					undefined, function()	{ setTool("takeScreenshot");		}));
				menuButton.addControl( "", new Button("images/export_drawing_embed.svg",		[18,18],	"Export Embeddable",				undefined, function()	{ saveAsEmbeddableJavascript();		}));
				menuButton.addControl( "", new Button("images/export_drawing_js.svg",			[18,18],	"Export As JavaScript",				undefined, function()	{ saveAsJavascript();				}));
				menuButton.addControl( "", new Button("images/import_drawing_js.svg",			[18,18],	"Import From JavaScript",			undefined, function()	{ loadFromJavascriptPanel();		}));
			}
			menuButton.addControls(menuBar);

			var menuButton = new MenuPopoutButton(undefined, undefined, "Edit", "bottom");
			{
				menuButton.addControl("", new Button("images/undo.svg", [18,18],						"Undo",				undefined, function () { undo(); }, "Ctrl+Z"));
				menuButton.addControl("", new Button("images/redo.svg", [18,18],						"Redo",				undefined, function () { redo(); }, ["Ctrl+Shift+Z", "Ctrl+Y"] ));

				menuButton.addControl("", new Divider());
	
				menuButton.addControl("", new Button("images/cut.svg", [18,18],							"Cut",				undefined, function () { clipboardCut(); }, "Ctrl+X" ));
				menuButton.addControl("", new Button("images/copy.svg", [18,18],						"Copy",				undefined, function () { clipboardCopy(); }, "Ctrl+C" ));
				menuButton.addControl("", new Button("images/paste.svg", [18,18],						"Paste",			undefined, function () { clipboardPaste(); }, "Ctrl+V"));

				menuButton.addControl("", new Divider());

				menuButton.addControl("", new Button("images/select_all.svg", [18,18],					"Select All",					undefined, function () { selectAll(); }, "Ctrl+A" ));
				menuButton.addControl("", new Button("images/invert_selection.svg", [18,18],			"Invert Selection",				undefined, function () { invertSelection(); }, "Ctrl+Shift+I" ));

				menuButton.addControl("", new Divider());

				menuButton.addControl("", new Button("images/hide_selected.svg", [18,18],				"Hide Selected",				undefined, function () { modifyObjects(true, true, false); }, "Ctrl+H" ));
				menuButton.addControl("", new Button("images/hide_unselected.svg", [18,18],				"Hide Unselected",				undefined, function () { modifyObjects(false, true, false); }, "Ctrl+Shift+H"));
				menuButton.addControl("", new Button("images/show_selected.svg", [18,18],				"Unhide Selected",				undefined, function () { modifyObjects(true, true, true); }));
				menuButton.addControl("", new Button("images/show_unselected.svg", [18,18],				"Unhide Unselected",			undefined, function () { modifyObjects(false, true, true); }));
				menuButton.addControl("", new Button("images/show.svg", [18,18],						"Unhide All",					undefined, function () { modifyObjects(false, true, true); modifyObjects(true, true, true); }, "Ctrl+Alt+H" ));

				menuButton.addControl("", new Divider());

				menuButton.addControl("", new Button("images/freeze_selected.svg", [18,18],				"Freeze Selected",				undefined, function () { modifyObjects(true, false, true); }, "Ctrl+F" ));
				menuButton.addControl("", new Button("images/freeze_unselected.svg", [18,18],			"Freeze Unselected",			undefined, function () { modifyObjects(false, false, true); }, "Ctrl+Shift+F"));
				menuButton.addControl("", new Button("images/unfreeze_selected.svg", [18,18],			"Unfreeze Selected",			undefined, function () { modifyObjects(true, false, false); }));
				menuButton.addControl("", new Button("images/unfreeze_unselected.svg", [18,18],			"Unfreeze Unselected",			undefined, function () { modifyObjects(false, false, false); }));
				menuButton.addControl("", new Button("images/unfreeze.svg", [18,18],					"Unfreeze All",					undefined, function () { modifyObjects(false, false, false); modifyObjects(true, false, false); }, "Ctrl+Alt+F"));

				menuButton.addControl("", new Divider());

				menuButton.addControl("", new Button("images/group_selection.svg", [18,18],				"Group",						undefined, function () { groupSelection(); }, "Ctrl+G" ));
				menuButton.addControl("", new Button("images/ungroup_selection.svg", [18,18],			"Ungroup",						undefined, function () { ungroupSelection(); }, "Ctrl+Shift+G" ));

				menuButton.addControl("", new Button("images/bring_forward.svg", [18,18],				"Bring Forward",				undefined, function () { moveUpSelection(); }, "Ctrl+Alt+PageUp" ));
				menuButton.addControl("", new Button("images/send_back.svg", [18,18],					"Send Back",					undefined, function () { moveDownSelection(); }, "Ctrl+Alt+PageDown" ));

			}
			menuButton.addControls(menuBar);

			var menuButton = new MenuPopoutButton(undefined, undefined, "View", "bottom");
			{
				menuButton.addControl("", new Tickbox("images/show.svg",		[18,18], "Tool Palette",	undefined,				preferences.toolPaletteVisible,		function (value) { toggleToolPaletteVisibility(value); } , undefined));
				menuButton.addControl("", new Tickbox("images/show.svg",		[18,18], "Object List",		undefined,				preferences.objectListVisible,		function (value) { toggleObjectListVisibility(value); } , undefined));
				menuButton.addControl("", new Tickbox("images/show.svg",		[18,18], "Canvas Controls", undefined,				preferences.canvasControlsVisible,	function (value) { toggleCanvasControlsVisibility(value); } , undefined));
				menuButton.addControl("", new Tickbox("images/show.svg",		[18,18], "Global Hint",		undefined,				preferences.globalHintVisible,		function (value) { toggleGlobalHintVisibility(value); } , undefined));

				menuButton.addControl("", new Divider());

				menuButton.addControl("", new Button("images/zoom_selection.svg", [18,18],				"Zoom Selected",					undefined, function () { zoomSelection(); }, ["F", "F2"]));
				menuButton.addControl("", new Button("images/zoom_extents.svg", [18,18],				"Zoom Extents",						undefined, function () { zoomExtents(); }, "F4"));

				menuButton.addControl("", new Divider());

				menuButton.addControl("", new Button("images/grid_cartesian.svg",	[18,18], "Cartesian Grid",	function() { showGrid = true; grid.type = 0; layerDirty[0] = true; draw(); }	 ));
				menuButton.addControl("", new Button("images/grid_isometric.svg",	[18,18], "Isometric Grid",	function() { showGrid = true; grid.type = 1; layerDirty[0] = true; draw(); }	 ));
				menuButton.addControl("", new Button("images/grid_radial.svg",		[18,18], "Radial Grid",		function() { showGrid = true; grid.type = 2; layerDirty[0] = true; draw(); }	 ));
				menuButton.addControl("", new Button("images/grid_none.svg",		[18,18], "No Grid",			function() { showGrid = false; layerDirty[0] = true; draw(); }					 ));

				menuButton.addControl("", new Divider());

				menuButton.addControl("", new Tickbox("images/snaps_grid.svg",			[18,18], "Snap: Grid", undefined,				enableSnap["grid"],				function (value) { enableSnap["grid"] = value; } , "G"));
				menuButton.addControl("", new Tickbox("images/snaps_node.svg",			[18,18], "Snap: Node", undefined,				enableSnap["node"],				function (value) { enableSnap["node"] = value; }) );
				menuButton.addControl("", new Tickbox("images/snaps_intersection.svg",	[18,18], "Snap: Intersection", undefined,		enableSnap["intersection"],		function (value) { enableSnap["intersection"] = value; }) );
				menuButton.addControl("", new Tickbox("images/snaps_midpoint.svg",		[18,18], "Snap: Midpoint", undefined,			enableSnap["midpoint"],			function (value) { enableSnap["midpoint"] = value; }) );
				menuButton.addControl("", new Tickbox("images/snaps_coincident.svg",	[18,18], "Snap: Coincident", undefined,			enableSnap["coincident"],		function (value) { enableSnap["coincident"] = value; }, "O" ));
				menuButton.addControl("", new Tickbox("images/snaps_perpendicular.svg",	[18,18], "Snap: Perpendicular", undefined,		enableSnap["perpendicular"],	function (value) { enableSnap["perpendicular"] = value; }, "P" ));
				menuButton.addControl("", new Tickbox("images/snaps_extend.svg",		[18,18], "Snap: Extend To", undefined,			enableSnap["extendTo"],			function (value) { enableSnap["extendTo"] = value; }, "E" ));
			}
			menuButton.addControls(menuBar);

			var menuButton = new MenuPopoutButton(undefined, undefined, "Create", "bottom");
			{
				menuButton.addControl("", new Button("images/tool_wall.svg",		[18,18], "Wall", "Rigid straight wall, multiple segments. Use this to contruct walls, rooms, objects, etc. Can bounce rays.", function () { setTool("addWall");}, "W" ));
				menuButton.addControl("", new Button("images/tool_arc_wall.svg",	[18,18], "Arc Wall", "Circular rigid wall. ", function () { setTool("addArcWall");} ));
				menuButton.addControl("", new Button("images/tool_ray.svg",			[18,18], "BRDF Ray", "Ray that bounces off rigid walls.", function () { setTool("addRay"); }, "B" ));

				menuButton.addControl("", new Divider());

				menuButton.addControl("", new Button("images/tool_light_point.svg",		[18,18], "Point Light",		"Omni-directional light.<p>Can 'collide' with rigid walls to cast shadows.",		function() { setTool("addPointLight");		} ));
				menuButton.addControl("", new Button("images/tool_light_spot.svg",		[18,18], "Spot Light",		"Frustum-like light.<p>Can 'collide' with rigid walls to cast shadows.",			function() { setTool("addSpotLight");		} ));
				menuButton.addControl("", new Button("images/tool_light_parallel.svg",	[18,18], "Parallel Light",	"Parallel / directional light.<p>Can 'collide' with rigid walls to cast shadows.",	function() { setTool("addParallelLight");	} ));

				menuButton.addControl("", new Divider());

				menuButton.addControl("", new Button("images/tool_camera.svg",			[18,18],	"Camera",				"Camera fustrum outline.<p>Can 'collide' with rigid walls.<p>Has pixel & Z Buffer functionality.",		function () { setTool("addCamera"); }, "C"		));
				menuButton.addControl("", new Button("images/tool_hemisphere.svg",		[18,18],	"BRDF Hemisphere",		"Draws a hemisphere with a BRDF lobe.",																	function () { setTool("addHemisphere"); }		));
				menuButton.addControl("", new Button("images/tool_line.svg",			[18,18],	"Line",					"Multi-line, non-collidable.<p>Can draw arrows.<p>Has 'pixelation' mode.",								function () { setTool("addLine"); }, "L"		));
				menuButton.addControl("", new Button("images/tool_rectangle.svg",		[18,18],	"Rectangle",			"Axis aligned rectangle.<p>Can be sub-divided into rows & columns to form a grid.",						function () { setTool("addRect"); }, "R"		));
				menuButton.addControl("", new Button("images/tool_ngon.svg",			[18,18],	"Circle / NGon",		"Circle or regular polygon.",																			function () { setTool("addNGon"); }, "N"		));
				menuButton.addControl("", new Button("images/tool_bar_chart.svg",		[18,18],	"Bar Chart",			"function based Bar Chart.<p>Has mip-map support.",														function () { setTool("addBarChart"); }			));
				menuButton.addControl("", new Button("images/tool_function_graph.svg",	[18,18],	"Function Graph",		"Plot a graph of a user-supplied function.",															function () { setTool("addFunctionGraph"); }	));
				menuButton.addControl("", new Button("images/tool_dimension.svg",		[18,18],	"Dimension",			"Adds a dimension.",																					function () { setTool("addDimension"); }, "D"	));
				menuButton.addControl("", new Button("images/tool_text.svg",			[18,18],	"Text",					"Adds text object.",																					function () { setTool("addText");}, "X"			));
				menuButton.addControl("", new Button("images/tool_axis.svg",			[18,18],	"Axis",					"Adds an axis-aligned axis object.",																	function () { setTool("addAxis"); }				));
				menuButton.addControl("", new Button("images/tool_page_outline.svg",	[18,18],	"Page Outline",			"Adds a standard page outline.",																		function () { setTool("addPageOutline");}		));
				menuButton.addControl("", new Button("images/tool_bouncing_ball.svg",	[18,18],	"Bouncing Ball",		"Adds a bouncing ball. Bounces off walls.",																function () { setTool("addBouncingBall");}		));

				menuButton.addControl("", new Divider());

				menuButton.addControl("", new Button("images/tool_tree.svg",		[18,18],		"Tree",					"Adds a Tree prefab.",			function() { addTree();		} ));
				menuButton.addControl("", new Button("images/tool_person.svg",		[18,18],		"Person",				"Adds a Person prefab.",		function() { addPerson();	} ));
			}
			menuButton.addControls(menuBar);

			var menuButton = new MenuPopoutButton(undefined, undefined, "Modify", "bottom");
			{
				menuButton.addControl("", new Button("images/tool_move.svg",			[18,18], "Select/Move", "Move objects, without modifying them.",	function(){setTool("select");}, "Q" ));
				menuButton.addControl("", new Button("images/tool_transform.svg",		[18,18], "Transform",	"Scale/Rotate objects.",					function(){setTool("transform");}, "T" ));
				menuButton.addControl("", new Button("images/tool_modify.svg",			[18,18], "Modify",		"Modify object nodes.",						function(){setTool("modify");}, "V" ));

				menuButton.addControl("", new Divider());

				menuButton.addControl("", new Button("images/flip_horizontal.svg",		[18,18], "Flip Horizontal",		"<hint>",	function(){ alert("COMING SOON!"); } ));
				menuButton.addControl("", new Button("images/flip_vertical.svg",		[18,18], "Flip Vertical",		"<hint>",	function(){ alert("COMING SOON!"); } ));
				menuButton.addControl("", new Button("images/rotate_right.svg",			[18,18], "Rotate Right",		"<hint>",	function(){ alert("COMING SOON!"); } ));
				menuButton.addControl("", new Button("images/rotate_left.svg",			[18,18], "Rotate Left",			"<hint>",	function(){ alert("COMING SOON!"); } ));

				menuButton.addControl("", new Divider());

				menuButton.addControl("", new Button("images/align_left.svg",					[18,18], "Align Left",					"<hint>",	function(){ alignObjects("left"); } ));
				menuButton.addControl("", new Button("images/align_right.svg",					[18,18], "Align Right",					"<hint>",	function(){ alignObjects("right"); } ));
				menuButton.addControl("", new Button("images/align_top.svg",					[18,18], "Align Top",					"<hint>",	function(){ alignObjects("top"); } ));
				menuButton.addControl("", new Button("images/align_bottom.svg",					[18,18], "Align Bottom",				"<hint>",	function(){ alignObjects("bottom"); } ));
				menuButton.addControl("", new Button("images/align_centers_horizontal.svg",		[18,18], "Align Centers Horizontal",	"<hint>",	function(){ alignObjects("centers-h"); } ));
				menuButton.addControl("", new Button("images/align_centers_vertical.svg",		[18,18], "Align Centers Vertical",		"<hint>",	function(){ alignObjects("centers-v"); } ));

				menuButton.addControl("", new Divider());

				menuButton.addControl("", new Button("images/distribute_horizontal.svg",		[18,18], "Distribute Horizontally",					"<hint>",	function(){ distributeObjects("horizontal"); } ));
				menuButton.addControl("", new Button("images/distribute_vertical.svg",			[18,18], "Distribute Vertically",					"<hint>",	function(){ distributeObjects("vertical"); } ));

			}
			menuButton.addControls(menuBar);

			var menuButton = new MenuPopoutButton(undefined, undefined, "Help", "bottom");
			{
				menuButton.addControl("", new Button("images/help_about.svg",		[18,18],	"About",							undefined, function() { alert("COMING SOON!"); }));
				menuButton.addControl("", new Button("images/open_example.svg",		[18,18],	"Open Tutorial",					undefined, function() { loadTutorial();	}));
				menuButton.addControl("", new Button("images/wipe_preferences.svg",	[18,18],	"Reset Preferences",				undefined, function() { clearPreferences(); })); 
				menuButton.addControl("", new Button("images/report_issue.svg",		[18,18],	"Report Issue",						undefined, function() { window.open("https://github.com/vaspoul/render.diagrams/issues", "_blank"); }));
			}
			menuButton.addControls(menuBar);
		}

		// Property grid
		{
			propertyGridDock = document.getElementById("propertyGridDock");
			var propertyGridList = document.getElementById("propertyGridList");
			propertyGrid = new PropertyBar(propertyGridList);
		}

		// Key modifiers
		{
			keyModifiersDock = document.getElementById("KeyModifiersDock");
			ctrlKeyHint = document.getElementById("CtrlKey");
			altKeyHint = document.getElementById("AltKey");
			shiftKeyHint = document.getElementById("ShiftKey");
		
			ctrlKeyHint.innerHTML = "Ctrl";
			altKeyHint.innerHTML = "Alt";
			shiftKeyHint.innerHTML = "Shift";
		}

		// Object list
		{
			objectListDock = document.getElementById("objectListDock");
			objectList = document.getElementById("objectList");
			var buttonArea = document.getElementById("objectListButtonArea");
			var buttonAreaTop = document.getElementById("objectListButtonAreaTop");
			var objectListResizeGrip = document.getElementById("objectListResizeGrip");

			(new Button("images/group_selection.svg",	[18,18], undefined, "Group (Ctrl+G)", groupSelection )).addControls(buttonAreaTop);
			(new Button("images/ungroup_selection.svg",	[18,18], undefined, "Ungroup (Ctrl+Shift+G)", ungroupSelection )).addControls(buttonAreaTop);
			(new Button("images/move_up.svg",			[18,18], undefined, "Move Up (Ctrl+Alt+PgUp)", moveUpSelection )).addControls(buttonAreaTop);
			(new Button("images/move_down.svg",			[18,18], undefined, "Move Down (Ctrl+Alt+PgDown)", moveDownSelection )).addControls(buttonAreaTop);

			(new Button("images/hide_selected.svg",		[18,18], undefined, "Hide Selected (Ctrl+H)",			function() { modifyObjects(true, true, false);	}	)).addControls(buttonArea);
			(new Button("images/hide_unselected.svg",	[18,18], undefined, "Hide Unselected (Ctrl+Alt+H)",		function() { modifyObjects(false, true, false); }	)).addControls(buttonArea);
			(new Button("images/show_selected.svg",		[18,18], undefined, "Show Selected",					function() { modifyObjects(true, true, true);	}	)).addControls(buttonArea);
			(new Button("images/show_unselected.svg",	[18,18], undefined, "Show Unselected",					function() { modifyObjects(false, true, true);	}	)).addControls(buttonArea);
			(new Button("images/show.svg",				[18,18], undefined, "Show All (Ctrl+Shift+H)",			function() { modifyObjects(true, true, true); modifyObjects(false, true, true);	}	)).addControls(buttonArea);
				
			(new Button("images/freeze_selected.svg",		[18,18], undefined, "Freeze Selected (Ctrl+F)",			function() { modifyObjects(true, false, true); }	)).addControls(buttonArea);
			(new Button("images/freeze_unselected.svg",		[18,18], undefined, "Freeze Unselected (Ctrl+Alt+F)",	function() { modifyObjects(false, false, true); }	)).addControls(buttonArea);
			(new Button("images/unfreeze_selected.svg",		[18,18], undefined, "Unfreeze Selected",				function() { modifyObjects(true, false, false); }	)).addControls(buttonArea);
			(new Button("images/unfreeze_unselected.svg",	[18,18], undefined, "Unfreeze Unselected",				function() { modifyObjects(false, false, false); }	)).addControls(buttonArea);
			(new Button("images/unfreeze.svg",				[18,18], undefined, "Unfreeze All (Ctrl+Shift+F)",		function() { modifyObjects(true, false, false); modifyObjects(false, false, false); }	)).addControls(buttonArea);

			objectListResizeGrip.onmousedown = function()
			{
				window.addEventListener('mousemove', objectListResizeGrip_Resize, false);
				window.addEventListener('mouseup', objectListResizeGrip_StopResize, false);
				buttonArea.style.pointerEvents = "none";
			}

			function objectListResizeGrip_Resize(evt)
			{
				objectListDock.style.height = (evt.clientY - objectListDock.offsetTop) + 'px';
			}

			function objectListResizeGrip_StopResize(evt)
			{
				window.removeEventListener('mousemove', objectListResizeGrip_Resize, false);
				window.removeEventListener('mouseup', objectListResizeGrip_StopResize, false);
				buttonArea.style.pointerEvents = "auto";

				preferences.objectListDockHeight = objectListDock.style.height;
				savePreferences();
			};

			var collapseButton = document.getElementById("objectListCollapse");

			objectListCollapse.onclick = function(evt)
			{
				toggleObjectListCollapse();
				savePreferences();
			}
		}

		// File controls
		{
			var fileControlsDock = document.getElementById("fileControlsDock");

			var popoutMenuButton = new MenuPopoutButton("images/menu.svg", [24,24], undefined);
			popoutMenuButton.addControl("", new Divider());
			popoutMenuButton.addControl("", new Divider());

			popoutMenuButton.addControls(fileControlsDock);
		}

		// Tool palette
		{
			toolPaletteDock = document.getElementById("toolPaletteDock");
			var toolPalette = document.getElementById("toolPalette");

			(new Button("images/tool_move.svg",		[18,18], "Select/Move", "Move objects, without modifying them.",	function(){setTool("select");}, "Q" )).addControls(toolPalette);
			(new Button("images/tool_transform.svg",[18,18], "Transform",	"Scale/Rotate objects.",					function(){setTool("transform");}, "T" )).addControls(toolPalette);
			(new Button("images/tool_modify.svg",	[18,18], "Modify",		"Modify object nodes.",						function(){setTool("modify");}, "V" )).addControls(toolPalette);

			(new Divider()).addControls(toolPalette);

			(new Button("images/tool_wall.svg",		[18,18], "Wall", "Rigid straight wall, multiple segments. Use this to contruct walls, rooms, objects, etc. Can bounce rays.", function () { setTool("addWall");}, "W" )).addControls(toolPalette);
			(new Button("images/tool_arc_wall.svg",	[18,18], "Arc Wall", "Circular rigid wall. ", function () { setTool("addArcWall");} )).addControls(toolPalette);
			(new Button("images/tool_ray.svg",		[18,18], "BRDF Ray", "Ray that bounces off rigid walls.", function () { setTool("addRay"); }, "B" )).addControls(toolPalette);

			var popout = new MultiToolButton([18,18]);
			popout.addButton("images/tool_light_point.svg",		"Point Light",		"Omni-directional light.<p>Can 'collide' with rigid walls to cast shadows.",		function() { setTool("addPointLight");		} );
			popout.addButton("images/tool_light_spot.svg",		"Spot Light",		"Frustum-like light.<p>Can 'collide' with rigid walls to cast shadows.",			function() { setTool("addSpotLight");		} );
			popout.addButton("images/tool_light_parallel.svg",	"Parallel Light",	"Parallel / directional light.<p>Can 'collide' with rigid walls to cast shadows.",	function() { setTool("addParallelLight");	} );
			popout.addControls(toolPalette);

			(new Button("images/tool_camera.svg",			[18,18],	"Camera",			"Camera fustrum outline.<p>Can 'collide' with rigid walls.<p>Has pixel & Z Buffer functionality.",		function () { setTool("addCamera"); }, "C"		)).addControls(toolPalette);
			(new Button("images/tool_hemisphere.svg",		[18,18],	"BRDF Hemisphere",	"Draws a hemisphere with a BRDF lobe.",																	function () { setTool("addHemisphere"); }		)).addControls(toolPalette);
			(new Button("images/tool_line.svg",				[18,18],	"Line",				"Multi-line, non-collidable.<p>Can draw arrows.<p>Has 'pixelation' mode.",								function () { setTool("addLine"); }, "L"		)).addControls(toolPalette);
			(new Button("images/tool_rectangle.svg",		[18,18],	"Rectangle",		"Axis aligned rectangle.<p>Can be sub-divided into rows & columns to form a grid.",						function () { setTool("addRect"); }, "R"		)).addControls(toolPalette);
			(new Button("images/tool_ngon.svg",				[18,18],	"Circle / NGon",	"Circle or regular polygon.",																			function () { setTool("addNGon"); }, "N"		)).addControls(toolPalette);
			(new Button("images/tool_bar_chart.svg",		[18,18],	"Bar Chart",		"function based Bar Chart.<p>Has mip-map support.",														function () { setTool("addBarChart"); }			)).addControls(toolPalette);
			(new Button("images/tool_function_graph.svg",	[18,18],	"Function Graph",	"Plot a graph of a user-supplied function.",															function () { setTool("addFunctionGraph"); }	)).addControls(toolPalette);
			(new Button("images/tool_dimension.svg",		[18,18],	"Dimension",		"Adds a dimension.",																					function () { setTool("addDimension"); }, "D"	)).addControls(toolPalette);
			(new Button("images/tool_text.svg",				[18,18],	"Text",				"Adds text object.",																					function () { setTool("addText");}, "X"			)).addControls(toolPalette);
			(new Button("images/tool_axis.svg",				[18,18],	"Axis",				"Adds an axis-aligned axis object.",																	function () { setTool("addAxis"); }				)).addControls(toolPalette);
			(new Button("images/tool_page_outline.svg",		[18,18],	"Page Outline",		"Adds a standard page outline.",																		function () { setTool("addPageOutline"); }		)).addControls(toolPalette);
			(new Button("images/tool_bouncing_ball.svg",	[18,18],	"Bouncing Ball",	"Adds a bouncing ball. Bounces off walls.",																function () { setTool("addBouncingBall");}		)).addControls(toolPalette);

			var popout = new MultiToolButton([18,18]);
			popout.addButton("images/tool_tree.svg",		"Tree",				"Adds a Tree prefab.",			function() { addTree();		} );
			popout.addButton("images/tool_person.svg",		"Person",			"Adds a Person prefab.",		function() { addPerson();	} );
			popout.addControls(toolPalette);

			(new Button("images/collapse_panel.svg", [18,18], undefined, "Hide Labels", function () 
					{
						var rect = toolPaletteDock.getBoundingClientRect();

						this.style;
						if (toolPaletteDock.offsetWidth > 60) 
							toolPaletteDock.style.width = '40px';
						else
							toolPaletteDock.style.width = "auto";

						preferences.toolPaletteDockWidth = toolPaletteDock.style.width;
						savePreferences();
					}
			)).addControls(toolPalette);
		}

		// Canvas controls
		{
			var canvasControlsDock = document.getElementById("canvasControlsDock");
			var canvasControls = document.getElementById("canvasControls");

			(new Button("images/undo.svg",			[18,18],	undefined, "Undo (Ctrl+Z)",			function () { undo(); }	)).addControls(canvasControls);
			(new Button("images/redo.svg",			[18,18],	undefined, "Redo (Ctrl+Shit+Z)", 	function () { redo(); }	)).addControls(canvasControls);

			var popout = new MultiToolButton([18,18]);
			popout.addButton("images/zoom_extents.svg",		undefined, "Zoom Extents (F4)",		function() { zoomExtents(); }	 );
			popout.addButton("images/zoom_selection.svg",	undefined, "Zoom Selection (F2)",	function() { zoomSelection(); }	 );
			popout.addControls(canvasControls);

			var popout = new MultiToolButton([18,18]);
			popout.addButton("images/grid_cartesian.svg",	undefined, "Cartesian Grid",	function() { showGrid = true; grid.type = 0; layerDirty[0] = true; draw(); }	 );
			popout.addButton("images/grid_isometric.svg",	undefined, "Isometric Grid",	function() { showGrid = true; grid.type = 1; layerDirty[0] = true; draw(); }	 );
			popout.addButton("images/grid_radial.svg",		undefined, "Radial Grid",		function() { showGrid = true; grid.type = 2; layerDirty[0] = true; draw(); }	 );
			popout.addButton("images/grid_none.svg",		undefined, "No Grid",			function() { showGrid = false; layerDirty[0] = true; draw(); }					 );
			popout.addControls(canvasControls);

			var popoutMenuButton = new MenuPopoutButton("images/snaps.svg",				[18,18], "Snaps");
			popoutMenuButton.addControl("", new Tickbox("images/snaps_grid.svg",			[18,18], "Grid", undefined,				enableSnap["grid"],				function (value) { enableSnap["grid"] = value; }, "G") );
			popoutMenuButton.addControl("", new Tickbox("images/snaps_node.svg",			[18,18], "Node", undefined,				enableSnap["node"],				function (value) { enableSnap["node"] = value; }) );
			popoutMenuButton.addControl("", new Tickbox("images/snaps_intersection.svg",	[18,18], "Intersection", undefined,		enableSnap["intersection"],		function (value) { enableSnap["intersection"] = value; }) );
			popoutMenuButton.addControl("", new Tickbox("images/snaps_midpoint.svg",		[18,18], "Midpoint", undefined,			enableSnap["midpoint"],			function (value) { enableSnap["midpoint"] = value; }) );
			popoutMenuButton.addControl("", new Tickbox("images/snaps_coincident.svg",		[18,18], "Coincident", undefined,		enableSnap["coincident"],		function (value) { enableSnap["coincident"] = value; }, "O") );
			popoutMenuButton.addControl("", new Tickbox("images/snaps_perpendicular.svg",	[18,18], "Perpendicular", undefined,	enableSnap["perpendicular"],	function (value) { enableSnap["perpendicular"] = value; }, "P") );
			popoutMenuButton.addControl("", new Tickbox("images/snaps_extend.svg",			[18,18], "Extend To", undefined,		enableSnap["extendTo"],			function (value) { enableSnap["extendTo"] = value; }, "E") );
			popoutMenuButton.addControls(canvasControls);
		}

		// File manager
		{
			fileManagerDock = document.getElementById("fileManagerDock");

			fileManagerDock.focus();

			fileManagerDock.onmousedown = function(e)
			{
				if(e.preventDefault) e.preventDefault();
			}
		}

		// Code box
		{
			codeBoxDock = document.getElementById("javascriptDock");
			codeBox = ace.edit("javascriptCodeblock");
			codeBox.session.setMode("ace/mode/javascript");

			codeBoxDock.focus();

			codeBoxDock.onmousedown = function(e)
			{
				if(e.preventDefault) e.preventDefault();
			}

			var buttonPanel = codeBoxDock.querySelector("#buttonPanel");
			var okButton = buttonPanel.querySelector("#OKButton");
			var cancelButton = buttonPanel.querySelector("#CancelButton");

			cancelButton.onclick = function ()
									{
										codeBoxDock.style.display = "none";
										canvas.focus();
										showingModal = false;
									}
		}
		
		scene = new Scene();
		camera = new Camera(canvas);
		
		grid.spacing = 1;

		scene.addChangeListener(onSceneChange);

		if (urlParams["loadLocal"] != undefined)
		{
			loadFromLocalStorage(urlParams["loadLocal"]);
		}

		// Default scene
		if (scene.objects.length == 0)
		{
			scene.addObject(new Wall( [new Vector(-10, 10), new Vector(-10, 0), new Vector(10, 0), new Vector(10, 10)] ));
			scene.addObject(new ArcWall(new Vector(0, 10), 10,  0*Math.PI/180, 180*Math.PI/180));
			scene.addObject(new BRDFRay(new Vector(0, 10), new Vector(-3, -5)));
			scene.addObject(new SpotLight(new Vector(0, 10), new Vector(10, 0), 35));

			camera.setViewPosition(0, 10);
			//loadTutorial();

			layerDirty[0] = true;
			layerDirty[1] = true;
			layerDirty[2] = true;
		}

		setSelection([]);

		undoRedoBackupPos = -1;
		undoRedoUndoPos	= -1;
		backup();
		undoRedoLastSavePos = undoRedoUndoPos;

		setTool("select");

		window.onload = function()
		{
			loadPreferences();
			setInterval(function () { saveToLocalStorage(true); savePreferences(); }, 5000);
		}

		updateWindowTitle();

		//saveAsJavascript();
	}
	
	function getCanvasProperties()
	{
		var canvasProperties =
		[
			{name: "Scene Name", control: new TextBox(scene.name, true, false, 64, function (value) { scene.name = value; updateWindowTitle(); }) },
		];

		return canvasProperties;
	}

	function ShowGlobalHint(title, hintText)
	{
		var globalHint = document.getElementById('GlobalHint');

		var titleElement = globalHint.querySelector("#title");
		var contentElement = globalHint.querySelector("#content");

		if (title != undefined || hintText != undefined)
		{
			titleElement.innerHTML = title;
			contentElement.innerHTML = hintText;
		}
	}

	function setTool(newTool)
	{
		if (newTool == "cancel")
		{
			if (tool == "addWall" || tool == "addLine")
			{
				if (objectBeingMade !== undefined && (objectBeingMade instanceof Wall || objectBeingMade instanceof Line))
				{
					if (objectBeingMade.points.length <= 2)
					{
						scene.deleteObjects([objectBeingMade]);
						delete objectBeingMade;
					}
					else
					{
						objectBeingMade.points.splice(objectBeingMade.points.length - 1, 1);
						setSelection([scene.objects[scene.objects.length-1]]);
					}
				}
			}
			else if (tool == "addArcWall" || tool == "addRay" || tool == "addPointLight" || tool == "addSpotLight" || tool == "addParallelLight" || tool == "addCamera" || tool == "addRect" || tool == "addHemisphere" || tool == "addNGon" || tool == "addDimension" || tool == "addBarChart" || tool == "addFunctionGraph" || tool == "takeScreenshot" || tool == "addText" || tool == "addAxis" || tool == "addPageOutline" || tool == "addBouncingBall")
			{
				if (objectBeingMade !== undefined)
				{
					scene.deleteObjects([objectBeingMade]);
					delete objectBeingMade;
					setSelection([]);
				}

				if (tool == "addHemisphere")
				{
					enableSnap["coincident"] = previousCoincidentEnabled;
				}
			}

			newTool = "select";
		}

		if (newTool == "takeScreenshot")
		{
			for (var i = 0; i != scene.objects.length; ++i)
			{
				if (scene.objects[i] instanceof ScreenshotArea)
				{
					newTool = "select";
					break;
				}
			}
		}

		if (tool == "transform" && transformRect != undefined)
		{
			scene.deleteObjects([transformRect]);
			transformRect = undefined;
		}

		objectBeingMade = undefined;

		ctrlKeyHint.style.visibility = "hidden";
		altKeyHint.style.visibility = "visible";
		shiftKeyHint.style.visibility = "hidden";

		if (newTool == "select")
		{
			if (tool != "select")
			{
				mode = null;
			}

			tool = "select";
			mouseCursor.shape = "cross";
			ShowGlobalHint("SELECT", "Click to select and move objects.");

			ctrlKeyHint.style.visibility = "visible";
			altKeyHint.style.visibility = "visible";
			shiftKeyHint.style.visibility = "hidden";

			draw();
		}
		else if (newTool == "transform")
		{
			if (tool != "transform")
			{
				mode = null;
			}

			tool = "transform";
			mouseCursor.shape = "angle";
			ShowGlobalHint("TRANSFORM", "Ctrl: rotates, Shift: Symmetrical, Alt: No aspect ratio lock");

			ctrlKeyHint.style.visibility = "visible";
			altKeyHint.style.visibility = "visible";
			shiftKeyHint.style.visibility = "visible";

			updateTransformTool();
			draw();
		}
		else if (newTool == "modify")
		{
			if (tool != "modify")
			{
				mode = null;
			}

			tool = "modify";
			mouseCursor.shape = "angle";
			ShowGlobalHint("MODIFY", "Click to select and move drag points.");

			ctrlKeyHint.style.visibility = "visible";
			altKeyHint.style.visibility = "visible";
			shiftKeyHint.style.visibility = "visible";

			draw();
		}
		else if (newTool == "addWall" || newTool == "addLine")
		{
			if (tool != newTool)
			{
				mode = null;
			}

			tool = newTool;
			mouseCursor.shape = "cross";
			ShowGlobalHint(newTool, "Click to add points. <p>ESC to terminate.");

			ctrlKeyHint.style.visibility = "visible";

			setSelection([]);
			draw();
		}
		else if (newTool == "addRay" || newTool == "addSpotLight" || newTool == "addParallelLight" || newTool == "addCamera" || newTool == "addBarChart" || newTool == "addText" || newTool == "addAxis")
		{
			if (tool != newTool)
			{
				mode = null;
			}

			tool = newTool;
			mouseCursor.shape = "cross";
			ShowGlobalHint(newTool, "Click to set direction. <p>ESC to terminate..");

			ctrlKeyHint.style.visibility = "visible";

			setSelection([]);
			draw();
		}
		else if (newTool == "addArcWall")
		{
			if (tool != "addArcWall")
			{
				mode = null;
			}

			tool = "addArcWall";
			mouseCursor.shape = "cross";
			ShowGlobalHint("Add Arc Wall", "Click to set direction. <p>ESC to terminate..");

			ctrlKeyHint.style.visibility = "visible";

			setSelection([]);
			draw();
		}
		else if (newTool == "addPointLight"  || newTool == "addRect" || newTool == "addHemisphere" || newTool == "addNGon" || newTool == "addDimension" || newTool == "takeScreenshot" || newTool == "addPageOutline" || newTool == "addFunctionGraph" || newTool == "addBouncingBall")
		{
			if (tool != newTool)
			{
				mode = null;
			}

			tool = newTool;
			mouseCursor.shape = "cross";
			ShowGlobalHint(newTool, "Click to add. <p>ESC to terminate..");

			setSelection([]);

			if (newTool == "addHemisphere")
			{
				previousCoincidentEnabled = enableSnap["coincident"];
				enableSnap["coincident"] = true;
				undoRedoSuspendBackup = true;
				objectBeingMade = new BRDFHemisphere(new Vector(1000, 1000), 3, new Vector(0,1));
				scene.addObject(objectBeingMade);
				undoRedoSuspendBackup = false;
			}
			else if (newTool == "addPageOutline")
			{
				undoRedoSuspendBackup = true;
				objectBeingMade = new PageOutline(new Vector(1000, 1000));
				scene.addObject(objectBeingMade);
				undoRedoSuspendBackup = false;
			}
			else if (newTool == "addBouncingBall")
			{
				undoRedoSuspendBackup = true;
				objectBeingMade = new BouncingBall(new Vector(1000, 1000));
				scene.addObject(objectBeingMade);
				undoRedoSuspendBackup = false;
			}
			else if (newTool == "addFunctionGraph")
			{
				undoRedoSuspendBackup = true;
				objectBeingMade = new FunctionGraph(new Vector(1000, 1000));
				scene.addObject(objectBeingMade);
				undoRedoSuspendBackup = false;
			}

			ctrlKeyHint.style.visibility = "visible";

			draw();
		}
	}

	function onContextMenu(evt)
	{
		//if (tool == "transform")
		//	return false;

		return false;
	}

	function onKeyUp(evt)
	{
		lastKeyPress = undefined;

		if (evt.keyCode == 17) // Ctrl
		{
			ctrlKeyHint.className = ctrlKeyHint.className.replace(" active", "");
			ctrlKeyHint.innerHTML = "Ctrl";
		}

		if (evt.keyCode == 18) // Alt
		{
			altKeyHint.className = altKeyHint.className.replace(" active", "");
			altKeyHint.innerHTML = "Alt";
		}

		if (evt.keyCode == 16) // Shift
		{
			shiftKeyHint.className = shiftKeyHint.className.replace(" active", "");
			shiftKeyHint.innerHTML = "Shift";
		}

		draw();
	}	

	function onKeyDown(evt)
	{
		if (document.activeElement != document.body)
		{
			if (evt.keyCode == 27) // ESC
			{
				document.activeElement.blur();
				canvas.focus();
			}
			else
			{
				return;
			}
		}

		if (evt.keyCode == 17) // Ctrl
		{
			if (!ctrlKeyHint.className.includes(" active"))
				ctrlKeyHint.className = ctrlKeyHint.className + " active";

			if (tool == "transform")
			{
				ctrlKeyHint.innerHTML = "Rotate";
			}
			else if (tool == "modify")
			{
				ctrlKeyHint.innerHTML = "Local Space";
			}
			else
			{
				ctrlKeyHint.innerHTML = "Dir Lock";
			}
		}

		if (evt.keyCode == 18) // Alt
		{
			if (!altKeyHint.className.includes(" active"))
				altKeyHint.className = altKeyHint.className + " active";

			if (tool == "transform")
			{
				altKeyHint.innerHTML = "Free Aspect";
			}
			else
			{
				altKeyHint.innerHTML = "No Snaps";
			}
		}

		if (evt.keyCode == 16) // Shift
		{
			if (!shiftKeyHint.className.includes(" active"))
				shiftKeyHint.className = shiftKeyHint.className + " active";

			if (tool == "select")
			{
				shiftKeyHint.innerHTML = "-";
			}
			else if (tool == "transform")
			{
				shiftKeyHint.innerHTML = "Symmetrical";
			}
			else if (tool == "modify")
			{
				shiftKeyHint.innerHTML = "Delete";
			}
		}

		if (evt.keyCode == 17) // Ctrl
			return;

		//if (evt.keyCode == lastKeyPress)
		//	return;

		var handled = true;

		if (evt.keyCode == 16 && tool == "modify") // shift
		{
			mouseCursor.shape = "angle";
			draw();
		}
		else if (evt.keyCode >= 37 && evt.keyCode <= 40) // Arrow keys
		{
			if (tool == "select")// && mode == "move")
			{
				if (selectionList.length>0)
				{
					var offset;

						 if (evt.keyCode == 37)		offset = new Vector(-1,  0);
					else if (evt.keyCode == 38)		offset = new Vector( 0, +1);
					else if (evt.keyCode == 39)		offset = new Vector(+1,  0);
					else if (evt.keyCode == 40)		offset = new Vector( 0, -1);

					var scale = grid.spacing;

					if (evt.ctrlKey)
					{
						scale *= 10;
					}
					else if (evt.shiftKey)
					{
						scale /= 10;
					}

		    		for (var i = 0; i < selectionList.length; ++i)
		    		{
		    			if (selectionList[i].getOrigin !== undefined)
		    			{
							layerDirty[1] = true;
		    				selectionList[i].setOrigin(mad(offset, scale, selectionList[i].getOrigin()));
		    			}
					}

					backup();
				}
			}
		}
		else if (evt.keyCode==27) // ESC
		{
			if (mode == "move")
			{
				if (tool == "select")
				{
		    		for (var i = 0; i < selectionList.length; ++i)
		    		{
		    			if (selectionList[i].getOrigin !== undefined)
		    			{
		    				selectionList[i].setOrigin(add(dragStartMousePos, moveOffsets[i]));
		    			}
		    		}
				}
			}

			if (mode=="move" || mode=="selection" || mode=="marquee")
			{
				mode = null;
			}
			else if (selectionList[0] instanceof ScreenshotArea)
			{
				cancelScreenshot();
			}
			else
			{
				setSelection([]);
			}

			{
				codeBoxDock.style.display = "none";
				fileManagerDock.style.display = "none";
				canvas.focus();
				showingModal = false;
			}

			setTool("cancel");
			draw();
		}
		else if (evt.keyCode==13) // Enter
		{
			if (selectionList[0] instanceof ScreenshotArea)
			{
				selectionList[0].onPopupClicked();
				setTool("cancel");
				draw();
			}
		}
		else if (evt.keyCode==46) // del
		{
			if (tool == "select" || tool == "modify" || tool == "transform")
			{
				scene.deleteObjects(selectionList);
				setSelection([]);
				draw();
			}
			else
			{
				handled = false;
			}
		}
		else if (evt.keyCode == 16 && tool == "modify") // shift
		{
			mouseCursor.shape = "cross";
			draw();
		}
		else
		{
			handled = false;
		}
	
		if (handled || evt.keyCode == 18) // Alt
		{
			evt.preventDefault();
		}
		else
		{
			g_shortcutSystem.onKeyDown(evt);
		}
	
		lastKeyPress = evt.keyCode;
	}

	function onMouseDown(evt)
	{
		if (showingModal)
			return;

		layerDirty[2] = true;

		lastMousePos = camera.getMousePos(evt);
		lastMousePosPixels = getMousePos(evt, canvas);
		
		dragStartMousePos.x	= lastMousePos.x;
		dragStartMousePos.y	= lastMousePos.y;
		dragStartMousePosPixels.x = lastMousePosPixels.x;
		dragStartMousePosPixels.y = lastMousePosPixels.y;
		dragStartCamPos.x = camera.getViewPosition().x;
		dragStartCamPos.y = camera.getViewPosition().y;

		if (evt.buttons & 1)
		{
			var threshold = 10 / camera.getUnitScale();

			if (tool == "select")
			{
				var s = scene.hitTest(sub(lastMousePos, threshold), add(lastMousePos, threshold), camera);

				var snapPoint = null;

				// We use this just for movement offset calculation. Don't update dragStartMousePos otherwise the movement threshold code in mouseUp
				// will think we moved more than we did.
				var snappedDragStartMousePos = dragStartMousePos;

				if (evt.altKey == 0)
				{
					snapPoint = scene.getSnapPoint(lastMousePos, camera.getSnapPoints(lastMousePos), camera.invScale(30), [objectBeingMade], enableSnap);

					if (snapPoint !== null)
					{
						snappedDragStartMousePos = snapPoint.p.copy();
					}
					else
					{
						if (enableSnap["grid"])
							snappedDragStartMousePos = grid.getSnapPoint(dragStartMousePos);
						else
							snappedDragStartMousePos = dragStartMousePos;
					}
				}

				if (s.length == 0)
				{
					if (snapPoint !== null && snapPoint.object != undefined)
					{
						if (!snapPoint.object.isFrozen() && snapPoint.object.isVisible())
						{
							s.push(snapPoint.object);
						}
					}
				}
				
				lastMouseDownEmpty = (s.length == 0);
				lastMouseDownSelection = s.concat([]);

				if (s.length>1) // select topmost
				{
					if (deepSelectionIndex>=0)
					{
						if (selectionList.length>0 && s.indexOf(selectionList[selectionList.length-1])<0)
						{
							deepSelectionIndex = -1;
							s = [s[0]];
						}
						else
						{
							deepSelectionIndex = (deepSelectionIndex % s.length);
							s = [s[deepSelectionIndex]];
						}
					}
					else
					{
						s = [s[0]];
					}
				}

				if (s.length == 0)
				{
					mode = "marquee";
				}
				else
				{
		    		mode = "selection";

					// Do object selection on mouseDown rather than mouseUp to help with object dragging.
					if (selectionList.indexOf(s[0])==-1 && evt.ctrlKey==0)
					{
						setSelection(s, evt.ctrlKey, evt.shiftKey);
					}

					if (evt.shiftKey)
					{
						clipboardCopy();
						clipboardPaste();
					}

		    		moveOffsets = [];

		    		for (var i = 0; i < selectionList.length; ++i)
		    		{
		    			if (selectionList[i].getOrigin !== undefined)
						{
		    				moveOffsets.push(sub(selectionList[i].getOrigin(), snappedDragStartMousePos));
		    			}
		    			else
		    			{
							moveOffsets.push(undefined);
		    			}

						if (selectionList[i].dragStart != undefined)
						{
							selectionList[i].dragStart(dragStartMousePos);
						}
		    		}
				}
			}
			else if (tool == "transform")
			{
				if (transformRect == undefined)
					dragPoint = scene.getDragPoint(lastMousePos, camera, evt.ctrlKey);
				else
					dragPoint = scene.getDragPoint(lastMousePos, camera, evt.ctrlKey, transformRect.objects);

				mode = null;

				if (dragPoint.point !== null && dragPoint.object == transformRect)
				{
					mode = "move";
					dragStartMousePos = dragPoint.point;
					transformRect.startDrag();
				}
				else
				{
					var s = scene.hitTest(sub(lastMousePos, threshold), add(lastMousePos, threshold), camera);

					if (s.length == 0)
					{
						var snapPoint = scene.getSnapPoint(lastMousePos, [], camera.invScale(30), [objectBeingMade], enableSnap);

						if (snapPoint !== null && snapPoint.object != undefined)
						{
							s.push(snapPoint.object);
						}
					}

					if (s.length == 0)
					{
						mode = "marquee";
					}
					else
					{
		    			mode = "selection";

		    			if (selectionList.indexOf(s[0])==-1 && evt.ctrlKey==0)
						{
							setSelection(s);
		    			}
					}
				}
			}
			else if (tool == "modify")
			{
				dragPoint = scene.getDragPoint(lastMousePos, camera, evt.ctrlKey);

				mode = null;

				if (dragPoint.point !== null)
				{
					mode = "move";
					dragStartMousePos = dragPoint.point;

					if (selectionList.indexOf(dragPoint.object)<0)
					{
						setSelection([dragPoint.object]);
					}

					if (dragPoint.object.dragStart != undefined)
					{
						dragPoint.object.dragStart(dragStartMousePos);
					}

					if (dragPoint.object instanceof BRDFHemisphere && dragPoint.index==0)
					{
						previousCoincidentEnabled = enableSnap["coincident"];
						enableSnap["coincident"] = true;
					}
				}
			}
		}
		//else if (evt.buttons & 2) 
		//{
		//	if (tool == "transform")
		//	{
		//		if (transformRect != undefined)
		//		{
		//			transformRect.setOrigin(lastMousePos);
		//		}
		//	}
		//}


		draw();
	}

	function onMouseDblClick(evt)
	{
		evt.preventDefault();
	}

	function onMouseUp(evt)
	{
		if (showingModal)
		{
			if (evt.button == 0) // object move or marquee
			{
				fileManagerDock.style.display = "none";
				codeBoxDock.style.display = "none";
				showingModal = false;
			}

			return;
		}

		layerDirty[2] = true;

		lastMousePos = camera.getMousePos(evt);
		lastMousePosPixels = getMousePos(evt, canvas);
		
		if (evt.button == 0) // object move or marquee
		{
			if (tool == "select")
			{
				if (mode == "marquee" || mode == "selection") // marquee
				{
					var threshold = 10 / camera.getUnitScale();

					var s = [];

					if ((sub(dragStartMousePos, lastMousePos)).length() < threshold) // no movement, selection
					{
						if (lastMouseDownEmpty)
						{
							setSelection([]);
						}
						else
						{
							deepSelectionIndex += 1;
							deepSelectionIndex = (deepSelectionIndex % lastMouseDownSelection.length);
							setSelection([lastMouseDownSelection[deepSelectionIndex]], evt.ctrlKey, evt.shiftKey);
						}
					}
					else // marquee
					{
						var pMin = new Vector(Math.min(dragStartMousePos.x, lastMousePos.x), Math.min(dragStartMousePos.y, lastMousePos.y));
						var pMax = new Vector(Math.max(dragStartMousePos.x, lastMousePos.x), Math.max(dragStartMousePos.y, lastMousePos.y));

						pMin = sub(pMin, threshold);
						pMax = add(pMax, threshold);

						s = scene.hitTest(pMin, pMax, camera);

						setSelection(s, evt.ctrlKey, evt.shiftKey);
					}
				}
				else if (mode == "move")
				{
					backup();

		    		for (var i = 0; i < selectionList.length; ++i)
		    		{
						if (selectionList[i].dragStop != undefined)
						{
							selectionList[i].dragStop();
						}
		    		}
				}

				mode = null;
			}
			else if (tool == "transform")
			{
				if (mode == "marquee" || mode == "selection") // marquee
				{
					var threshold = 10 / camera.getUnitScale();

					var s = [];

					if ((sub(dragStartMousePos, lastMousePos)).length() < threshold)
					{
						s = scene.hitTest(sub(lastMousePos, threshold), add(lastMousePos, threshold), camera);

						if (s.length == 0)
						{
							var snapPoint = scene.getSnapPoint(lastMousePos, [], camera.invScale(30), [objectBeingMade], enableSnap);

							if (snapPoint !== null && snapPoint.object != undefined)
							{
								s.push(snapPoint.object);
							}
						}
					}
					else
					{
						var pMin = new Vector(Math.min(dragStartMousePos.x, lastMousePos.x), Math.min(dragStartMousePos.y, lastMousePos.y));
						var pMax = new Vector(Math.max(dragStartMousePos.x, lastMousePos.x), Math.max(dragStartMousePos.y, lastMousePos.y));

						pMin = sub(pMin, threshold);
						pMax = add(pMax, threshold);

						s = scene.hitTest(pMin, pMax, camera);
					}
				
					if (evt.ctrlKey)
					{
						s = selectionList.concat(s);
					}
					else if (evt.shiftKey)
					{
						var copy = selectionList.concat([]);

						for (var i = 0; i < copy.length; ++i)
						{
							for (var j = 0; j < s.length; ++j)
							{
								index = copy.indexOf(s[j]);

								if (index >= 0)
								{
									copy.splice(index, 1);
									break;
								}
							}
						}

						s = copy;
					}

					setSelection(s);
				}
				else if (mode == "move")
				{
					backup();
				}

				mode = null;
			}
			else if (tool == "modify")
			{
				if (evt.shiftKey)
				{
					dragPoint = scene.getDragPoint(lastMousePos, camera, evt.ctrlKey);

					if (dragPoint.point !== null)
					{
						if (dragPoint.object.deleteDragPoint != undefined)
						{
							dragPoint.object.deleteDragPoint(dragPoint.index);

							if (dragPoint.object instanceof Wall || dragPoint.object instanceof Line)
							{
								if (dragPoint.object.getDragPoints(false).length < 2)
								{
									scene.deleteObjects([dragPoint.object]);
								}
							}
			
							layerDirty[1] = true;
							draw();
						}
					}
				}
				else
				{
					if (dragPoint.point !== null && dragPoint.object instanceof BRDFHemisphere && dragPoint.index==0)
					{
						enableSnap["coincident"] = previousCoincidentEnabled;
					}

					if (dragPoint.object && dragPoint.object.dragStop != undefined)
					{
						dragPoint.object.dragStop();
					}
				}

				backup();
				mode = null;
			}
			else if (tool == "addWall" || tool == "addArcWall" || tool == "addRay" || tool == "addPointLight" || tool == "addSpotLight" || tool == "addParallelLight" || tool == "addCamera" || tool == "addLine" || tool == "addRect" || tool == "addHemisphere" || tool == "addNGon" || tool == "addDimension" || tool == "addBarChart" || tool == "addFunctionGraph" || tool == "takeScreenshot" || tool == "addText" || tool == "addAxis" || tool == "addPageOutline" || tool == "addBouncingBall")
			{
				if (evt.altKey == 0)
				{
					var previousMousePos = undefined;

					if (tool == "addWall" || tool == "addLine")
					{
						if (objectBeingMade !== undefined)
						{
							previousMousePos = objectBeingMade.points[objectBeingMade.points.length - 2];
						}
					}

					var snapPoint = scene.getSnapPoint(lastMousePos, camera.getSnapPoints(lastMousePos, previousMousePos), camera.invScale(30), [objectBeingMade], enableSnap);

					var snapPos;

					if (snapPoint !== null)
					{
						snapPos = snapPoint.p;
					}
					else
					{
						if (enableSnap["grid"])
							snapPos = grid.getSnapPoint(lastMousePos);
						else
							snapPos = lastMousePos;
					}

					lastMousePos = snapPos;
				}

				if (evt.ctrlKey && objectBeingMade !== undefined)
				{
					var delta = sub(lastMousePos, lastMouseUpPos);

					var angle = toAngle(delta);

					angle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);

					var dir = fromAngle(angle);

					lastMousePos = mad(dir, length(delta), lastMouseUpPos);
				}

				var newPoint = lastMousePos;

				undoRedoSuspendBackup = true;

				if (tool == "addWall" || tool == "addLine")
				{
					if (objectBeingMade === undefined)
					{
						if (tool == "addWall")
							objectBeingMade = new Wall([newPoint.copy()]);
						else if (tool == "addLine")
							objectBeingMade = new Line([newPoint.copy()]);
						scene.addObject(objectBeingMade);

						// Add the next point as well, this is the one that moves with the cursor
						objectBeingMade.addPoint(lastMousePos.copy());
					}
					else
					{
						if (equal(objectBeingMade.points[0], newPoint))
						{
							objectBeingMade.closed = true;
							if (objectBeingMade.appearance.fillAlpha==0)
								objectBeingMade.appearance.fillAlpha = 0.2;
							objectBeingMade.onChange();
							setTool("cancel");
						}
						else if (equal(objectBeingMade.points[objectBeingMade.points.length - 2], newPoint))
						{
							objectBeingMade.onChange();
							setTool("cancel");
						}
						else
						{
							objectBeingMade.points[objectBeingMade.points.length - 1] = newPoint;

							// Add the next point as well, this is the one that moves with the cursor
							objectBeingMade.addPoint(lastMousePos.copy());
						}
					}
				}
				else if (tool == "addArcWall")
				{
					if (objectBeingMade === undefined)
					{
						objectBeingMade = new ArcWall(newPoint.copy(), 0, 0, Math.PI);
						scene.addObject(objectBeingMade);
					}
					else
					{
						objectBeingMade.setDragPointPos(1, newPoint);
						setTool("select");
						setSelection([scene.objects[scene.objects.length-1]]);
					}
				}
				else if (tool == "addRay")
				{
					if (objectBeingMade === undefined)
					{
						objectBeingMade = new BRDFRay(newPoint.copy(), new Vector(0,1));
						scene.addObject(objectBeingMade);
					}
					else
					{
						objectBeingMade.setDragPointPos(1, newPoint);
						setTool("select");
						setSelection([scene.objects[scene.objects.length-1]]);
					}
				}
				else if (tool == "addText")
				{
					if (objectBeingMade === undefined)
					{
						objectBeingMade = new Text(newPoint.copy(), "Sample Text");
						scene.addObject(objectBeingMade);
					}
					else
					{
						objectBeingMade.setDragPointPos(1, newPoint);
						setTool("select");
						setSelection([scene.objects[scene.objects.length-1]]);
					}
				}
				else if (tool == "addAxis")
				{
					if (objectBeingMade === undefined)
					{
						objectBeingMade = new Axis(newPoint.copy());
						scene.addObject(objectBeingMade);
					}
					else
					{
						objectBeingMade.setDragPointPos(1, newPoint);
						setTool("select");
						setSelection([scene.objects[scene.objects.length-1]]);
					}
				}
				else if (tool == "addPointLight")
				{
					if (objectBeingMade === undefined)
					{
						objectBeingMade = new PointLight(newPoint.copy(), 0);
						scene.addObject(objectBeingMade);
					}
					else
					{
						objectBeingMade.setDragPointPos(-1, newPoint);
						setTool("select");
						setSelection([scene.objects[scene.objects.length-1]]);
					}
				}
				else if (tool == "addBouncingBall")
				{
					if (objectBeingMade === undefined)
					{
						objectBeingMade = new BouncingBall(newPoint.copy());
						scene.addObject(objectBeingMade);
					}
					else
					{
						objectBeingMade.setDragPointPos(0, newPoint);
						setTool("select");
						setSelection([scene.objects[scene.objects.length-1]]);
					}
				}
				else if (tool == "addPageOutline")
				{
					if (objectBeingMade === undefined)
					{
						objectBeingMade = new PageOutline(newPoint.copy());
						scene.addObject(objectBeingMade);
					}
					else
					{
						objectBeingMade.setDragPointPos(0, newPoint);
						setTool("select");
						setSelection([scene.objects[scene.objects.length-1]]);
					}
				}
				else if (tool == "addFunctionGraph")
				{
					if (objectBeingMade === undefined)
					{
						objectBeingMade = new FunctionGraph(newPoint.copy());
						scene.addObject(objectBeingMade);
					}
					else
					{
						objectBeingMade.setOrigin(newPoint);
						setTool("select");
						setSelection([scene.objects[scene.objects.length-1]]);
					}
				}
				else if (tool == "addHemisphere")
				{
					enableSnap["coincident"] = previousCoincidentEnabled;

					setTool("select");
					setSelection([scene.objects[scene.objects.length-1]]);
				}
				else if (tool == "addSpotLight")
				{
					if (objectBeingMade === undefined)
					{
						objectBeingMade = new SpotLight(newPoint.copy(), new Vector(0,1), 40);
						scene.addObject(objectBeingMade);
					}
					else
					{
						objectBeingMade.setDragPointPos(1, newPoint);
						setTool("select");
						setSelection([scene.objects[scene.objects.length-1]]);
					}
				}
				else if (tool == "addCamera")
				{
					if (objectBeingMade === undefined)
					{
						objectBeingMade = new CameraObject(newPoint.copy(), new Vector(0,1), 40);
						scene.addObject(objectBeingMade);
					}
					else
					{
						objectBeingMade.setDragPointPos(1, newPoint);
						setTool("select");
						setSelection([scene.objects[scene.objects.length-1]]);
					}
				}
				else if (tool == "addParallelLight")
				{
					if (objectBeingMade === undefined)
					{
						objectBeingMade = new ParallelLight(newPoint.copy(), new Vector(0,1));
						scene.addObject(objectBeingMade);
					}
					else
					{
						objectBeingMade.setDragPointPos(1, newPoint);
						setTool("select");
						setSelection([scene.objects[scene.objects.length-1]]);
					}
				}
				else if (tool == "addRect")
				{
					if (objectBeingMade === undefined)
					{
						objectBeingMade = new Rectangle(newPoint.copy());
						scene.addObject(objectBeingMade);
					}
					else
					{
						objectBeingMade.setDragPointPos(2, newPoint);
						setTool("select");
						setSelection([scene.objects[scene.objects.length-1]]);
					}
				}
				else if (tool == "takeScreenshot")
				{
					if (objectBeingMade === undefined)
					{
						objectBeingMade = new ScreenshotArea(newPoint.copy(), saveAsImage, cancelScreenshot );
						scene.addObject(objectBeingMade);
					}
					else
					{
						objectBeingMade.setDragPointPos(2, newPoint);
						setTool("select");
						setSelection([scene.objects[scene.objects.length-1]]);
					}
				}
				else if (tool == "addNGon")
				{
					if (objectBeingMade === undefined)
					{
						objectBeingMade = new NGon(newPoint.copy(), 0);
						scene.addObject(objectBeingMade);
					}
					else
					{
						objectBeingMade.setDragPointPos(-1, newPoint);
						setTool("select");
						setSelection([scene.objects[scene.objects.length-1]]);
					}
				}
				else if (tool == "addDimension")
				{
					if (objectBeingMade === undefined)
					{
						objectBeingMade = new Dimension(newPoint.copy(), newPoint.copy());
						scene.addObject(objectBeingMade);
						objectBeingMade.pointCount = 1;
					}
					else
					{
						if (objectBeingMade.pointCount == 1)
						{
							objectBeingMade.setDragPointPos(1, newPoint);
							objectBeingMade.pointCount = 2;
						}
						else
						{
							objectBeingMade.setDragPointPos(2, newPoint);
							setTool("select");
							setSelection([scene.objects[scene.objects.length-1]]);
						}
					}
				}
				else if (tool == "addBarChart")
				{
					if (objectBeingMade === undefined)
					{
						objectBeingMade = new BarChart(newPoint.copy(), newPoint.copy());
						scene.addObject(objectBeingMade);
					}
					else
					{
						objectBeingMade.setDragPointPos(1, newPoint);
						setTool("select");
						setSelection([scene.objects[scene.objects.length-1]]);
					}
				}

				undoRedoSuspendBackup = false;


				if (objectBeingMade !== undefined)
				{
					setSelection([objectBeingMade]);
				}

				backup();
			}
		}

		lastMouseUpPos = lastMousePos;
	}

	function onMouseMove(evt)
	{
		var newMousePos = getMousePos(evt, canvas);

		if (lastMousePosPixels.x == newMousePos.x && lastMousePosPixels.y == newMousePos.y)
		{
			return;
		}

		if (showingModal)
		{
			canvas.style.cursor = "default";
			return;
		}
		else
		{
			canvas.style.cursor = "none";
		}


		layerDirty[2] = true;

		//canvas.focus();
		undoRedoSuspendBackup = true;

		lastMousePos = camera.getMousePos(evt);
		lastMousePosPixels = getMousePos(evt, canvas);

		mouseCursor.pos = camera.getMousePos(evt);

		draw();
	
		if (evt.buttons == 0)
		{
			if (tool == "select")
			{
				var snapPoint = scene.getSnapPoint(lastMousePos, camera.getSnapPoints(lastMousePos), camera.invScale(30), [], enableSnap);

				if (snapPoint !== null)
				{
					drawSnapPoint(snapPoint);
				}
			}
			else if (tool == "transform")
			{
				if (transformRect != undefined)
				{
					var newDragPoint = scene.getDragPoint(lastMousePos, camera, evt.ctrlKey, transformRect.objects);

					if (newDragPoint.point !== null && newDragPoint.object == transformRect)
					{
						if (newDragPoint.object.drawDragPoint !== undefined)
						{
							newDragPoint.object.drawDragPoint(camera, newDragPoint.index, newDragPoint.point, evt.ctrlKey);
						}
						else
						{
							camera.drawRectangle(newDragPoint.point, camera.invScale(10), "#ff0000", 2);
						}
					}
				}
			}
			else if (tool == "modify")
			{
				var proximityList = [];
				var newDragPoint = scene.getDragPoint(lastMousePos, camera, evt.ctrlKey, [], proximityList);

				var proximityThreshold = camera.invScale(200);

				for (var i=0; i!=proximityList.length; ++i)
				{
					var alpha = 0.3 - (proximityList[i].distance / proximityThreshold) * 0.2;
					proximityList[i].object.drawDragPoint(camera, proximityList[i].index, proximityList[i].point, evt.ctrlKey, alpha);
				}

				if (newDragPoint.point !== null)
				{
					if (newDragPoint.object.drawDragPoint !== undefined)
					{
						newDragPoint.object.drawDragPoint(camera, newDragPoint.index, newDragPoint.point, evt.ctrlKey);
					}
					else
					{
						camera.drawRectangle(newDragPoint.point, camera.invScale(10), "#ff0000", 2);
					}
				}
			}
			else if (tool == "addWall" || tool == "addArcWall" || tool == "addRay" || tool == "addPointLight" || tool == "addSpotLight" || tool == "addParallelLight" || tool == "addCamera" || tool == "addLine" || tool == "addRect" || tool == "addHemisphere" || tool == "addNGon" || tool == "addDimension" || tool == "addBarChart" || tool == "addFunctionGraph" || tool == "takeScreenshot" || tool == "addText" || tool == "addAxis" || tool == "addPageOutline" || tool == "addBouncingBall")
			{
				layerDirty[1] = true;

				var newPoint = lastMousePos;
				var snapPoint = null;

				if (evt.altKey == 0)
				{
					var previousMousePos = undefined;

					if (tool == "addWall" || tool == "addLine")
					{
						if (objectBeingMade !== undefined)
						{
							previousMousePos = objectBeingMade.points[objectBeingMade.points.length - 2];
						}
					}

					snapPoint = scene.getSnapPoint(lastMousePos, camera.getSnapPoints(lastMousePos, previousMousePos), camera.invScale(30), [objectBeingMade], enableSnap);

					if (snapPoint !== null)
					{
						newPoint = snapPoint.p;
						drawSnapPoint(snapPoint);
					}
					else
					{
						if (enableSnap["grid"])
							newPoint = grid.getSnapPoint(lastMousePos);
						else
							newPoint = lastMousePos;
					}
				}

				if (evt.ctrlKey && objectBeingMade !== undefined)
				{
					newPoint = directionSnap(lastMousePos, lastMouseUpPos);
				}

				if (tool == "addWall" || tool == "addLine")
				{
					if (objectBeingMade !== undefined)
					{
						objectBeingMade.points[objectBeingMade.points.length - 1] = newPoint;

						objectBeingMade.setDragPointPos(objectBeingMade.points.length - 1, newPoint, false, undefined, camera);
					}
				}
				else if (tool == "addPageOutline" || tool == "addFunctionGraph" || tool == "addBouncingBall")
				{
					if (objectBeingMade !== undefined)
					{
						objectBeingMade.setOrigin(newPoint);
					}
				}
				else if (tool == "addArcWall" || tool == "addRay" || tool == "addSpotLight" || tool == "addParallelLight" || tool == "addCamera" || tool == "addBarChart" || tool == "addText" || tool == "addAxis")
				{
					if (objectBeingMade !== undefined)
					{
						objectBeingMade.setDragPointPos(1, newPoint, false, undefined, camera);
					}
				}
				else if (tool == "addDimension")
				{
					if (objectBeingMade !== undefined)
					{
						if (objectBeingMade.pointCount == 1)
						{
							objectBeingMade.setDragPointPos(1, newPoint);
						}
						else
						{
							objectBeingMade.setDragPointPos(2, newPoint);
						}
					}
				}
				else if (tool == "addRect")
				{
					if (objectBeingMade !== undefined)
					{
						objectBeingMade.setDragPointPos(2, newPoint, false, undefined, camera);
					}
				}
				else if (tool == "takeScreenshot")
				{
					if (objectBeingMade !== undefined)
					{
						objectBeingMade.setDragPointPos(2, newPoint, false, undefined, camera);
					}
				}
				else if (tool == "addNGon" || tool == "addPointLight")
				{
					if (objectBeingMade !== undefined)
					{
						objectBeingMade.setDragPointPos(-1, newPoint, false, undefined, camera);
					}
				}
				else if (tool == "addHemisphere")
				{
					if (objectBeingMade !== undefined)
					{
						if (snapPoint !== null)
						{
							if (snapPoint.N != undefined)
							{
								if (dot(sub(lastMousePos, snapPoint.p), snapPoint.N) > 0)
								{
									objectBeingMade.normal = snapPoint.N;
								}
								else
								{
									objectBeingMade.normal = snapPoint.N.neg();
								}
							}
						}

						objectBeingMade.setDragPointPos(0, newPoint);
					}
				}
			}
		}
		else if (evt.buttons & 1) // object move or marquee
		{
			if (mode == "move")
			{
				var snapPoint = null;

				if (evt.altKey == 0 || tool == "transform")
				{
					var ignoreList;

					if (tool == "select")
						ignoreList = selectionList.concat([]);
					else if (tool == "modify")
						ignoreList = [dragPoint.object];

					var previousMousePos = undefined;
					var mouseDir = undefined;

					if (tool == "modify" && !dragPoint.local)
					{
						if (dragPoint.object instanceof Wall || dragPoint.object instanceof Line)
						{
							if (dragPoint.index>0)
							{
								previousMousePos = dragPoint.object.points[dragPoint.index - 1];
								mouseDir = sub(dragStartMousePos, previousMousePos).unit();
							}
							else
							{
								previousMousePos = dragPoint.object.points[1];
								mouseDir = sub(dragStartMousePos, previousMousePos).unit();
							}
						}
					}

					var posForSnapSearch = lastMousePos;

					// Disabled for now. Causes problems when resizing rectangle via mid-point
					//if (tool == "modify" && dragPoint.point !== null)
					//{
					//	posForSnapSearch = dragPoint.object.getDragPoints(dragPoint.local, camera)[dragPoint.index];
					//}

					snapPoint = scene.getSnapPoint(lastMousePos, camera.getSnapPoints(posForSnapSearch, previousMousePos, mouseDir), camera.invScale(30), ignoreList, enableSnap);

					if (snapPoint !== null)
					{
						drawSnapPoint(snapPoint);
						lastMousePos = snapPoint.p.copy();
					}
					else
					{
						if (enableSnap["grid"])
							lastMousePos = grid.getSnapPoint(lastMousePos);
						else
							lastMousePos = lastMousePos;
					}
				}

				if (evt.ctrlKey && tool == "select")
				{
					lastMousePos = directionSnap(lastMousePos, dragStartMousePos);
				}
			}

			if (tool == "select")
			{
				if (mode == "marquee") // marquee
				{
					camera.drawRectangle(dragStartMousePos, lastMousePos, "#000000", 1, [5, 5]);
					
					{
						var p0 = dragStartMousePos;
						var p1 = lastMousePos.copy();

						var delta = sub(p1, p0);

						var p = p1.copy();
						p.x += ((p1.x < p0.x) ? +1 : -1) * camera.invScale(10);
						p.y += camera.invScale(10);

						camera.drawText(p, "dx: " + delta.x.toFixed(1) + " dy: " + delta.y.toFixed(1), "#000000", (p1.x < p0.x) ? "left" : "right", 0, "12px Arial");
					}
				}
				else if (mode == "selection" || mode == "move" ) // object move
				{
					mode = "move";
				
		    		for (var i = 0; i < selectionList.length; ++i)
		    		{
		    			if (selectionList[i].getOrigin !== undefined)
		    			{
							layerDirty[1] = true;
		    				selectionList[i].setOrigin(add(lastMousePos, moveOffsets[i]));
		    			}
					}
				}
			}
			else if (tool == "transform")
			{
				if (mode == "marquee")
				{
					camera.drawRectangle(dragStartMousePos, lastMousePos, "#000000", 1, [5, 5]);
					
					{
						var p0 = dragStartMousePos;
						var p1 = lastMousePos.copy();

						var delta = sub(p1, p0);

						var p = p1.copy();
						p.x += ((p1.x < p0.x) ? +1 : -1) * camera.invScale(10);
						p.y += camera.invScale(10);

						camera.drawText(p, "dx: " + delta.x.toFixed(1) + " dy: " + delta.y.toFixed(1), "#000000", (p1.x < p0.x) ? "left" : "right", 0, "12px Arial");
					}
				}
				else if (mode === "move")
				{
					if (dragPoint.object == transformRect)
					{
						layerDirty[1] = true;
						dragPoint.object.setDragPointPos(dragPoint.index, lastMousePos, evt.ctrlKey, evt.altKey, evt.ctrlKey, evt.shiftKey);
					}
				}
			}
			else if (tool == "modify")
			{
				if (mode === "move")
				{
					layerDirty[1] = true;

					dragPoint.object.setDragPointPos(dragPoint.index, lastMousePos, evt.ctrlKey, dragPoint.point, camera);

					if (dragPoint.object instanceof BRDFHemisphere && dragPoint.index==0)
					{
						if (snapPoint !== null)
						{
							if (snapPoint.N != undefined)
							{
								if (dot(sub(camera.getMousePos(evt), snapPoint.p), snapPoint.N) > 0)
								{
									dragPoint.object.normal = snapPoint.N;
								}
								else
								{
									dragPoint.object.normal = snapPoint.N.neg();
								}
							}
						}
					}
				}
			}
		}
		//else if (evt.buttons & 2) 
		//{
		//	var snapPoint = null;

		//	if (evt.altKey == 0)
		//	{
		//		var ignoreList;

		//		if (tool == "select")
		//			ignoreList = selectionList.concat([]);
		//		else
		//			ignoreList = [dragPoint.object];

		//		var previousMousePos = undefined;
		//		var mouseDir = undefined;

		//		if (tool == "modify" && !dragPoint.local)
		//		{
		//			if (dragPoint.object instanceof Wall || dragPoint.object instanceof Line)
		//			{
		//				if (dragPoint.index>0)
		//				{
		//					previousMousePos = dragPoint.object.points[dragPoint.index - 1];
		//					mouseDir = sub(dragStartMousePos, previousMousePos).unit();
		//				}
		//				else
		//				{
		//					previousMousePos = dragPoint.object.points[1];
		//				}
		//			}
		//		}

		//		snapPoint = scene.getSnapPoint(lastMousePos, camera.getSnapPoints(lastMousePos, previousMousePos, mouseDir), camera.invScale(30), ignoreList, enableSnap);

		//		if (snapPoint !== null)
		//		{
		//			drawSnapPoint(snapPoint);
		//			lastMousePos = snapPoint.p.copy();
		//		}
		//		else
		//		{
		//			lastMousePos = grid.getSnapPoint(lastMousePos);
		//		}
		//	}

		//	if (tool == "transform")
		//	{
		//		if (transformRect != undefined)
		//		{
		//			transformRect.setOrigin(lastMousePos);
		//		}
		//	}
		//}
		else if (evt.buttons & 2) // camera pan
		{
			layerDirty[0] = true;
			layerDirty[1] = true;
			layerDirty[2] = true;
			var delta = div(sub(lastMousePosPixels, dragStartMousePosPixels), new Vector(-camera.getUnitScale(), camera.getUnitScale()));
			var P = add(dragStartCamPos, delta);
			camera.setViewPosition(P.x, P.y);
		}

		undoRedoSuspendBackup = false;
	}

	function onMouseWheel(evt)
	{
		lastMousePosPixels = camera.getMousePos(evt);

		layerDirty[0] = true;
		layerDirty[1] = true;
		layerDirty[2] = true;

		var zoomCenter = lastMousePosPixels;

		var zoomFactor = 1.0 + Math.sign(evt.deltaY) * 0.1;

		var minX = camera.getViewPosition().x - camera.getViewSize().x/2;
		var maxX = camera.getViewPosition().x + camera.getViewSize().x/2;
		var minY = camera.getViewPosition().y - camera.getViewSize().y/2;
		var maxY = camera.getViewPosition().y + camera.getViewSize().y/2;
		
		minX = zoomCenter.x - (zoomCenter.x - minX) * zoomFactor;
		maxX = zoomCenter.x + (maxX-zoomCenter.x) * zoomFactor;

		minY = zoomCenter.y - (zoomCenter.y - minY) * zoomFactor;
		maxY = zoomCenter.y + (maxY-zoomCenter.y) * zoomFactor;

		camera.setViewPosition((minX+maxX)/2, (minY+maxY)/2);
		camera.setUnitScale(camera.getUnitScale() / zoomFactor);

		grid.spacing = Math.pow(10, Math.ceil(Math.log10(camera.invScale(10))));

		draw();
		
		return false;
	}

	var g_zoomAnimation_centerDelta;
	var g_zoomAnimation_scaleDelta;
	var g_zoomAnimation_stepsLeft = 0;
	var g_zoomAnimation_timer;
	
	function zoom(center, scale)
	{
		if (preferences.animateZoom)
		{
			g_zoomAnimation_stepsLeft = 10;
			g_zoomAnimation_centerDelta = div(sub(center, camera.getViewPosition()), g_zoomAnimation_stepsLeft);



			g_zoomAnimation_scaleDelta = (1/scale - 1/camera.getUnitScale()) / g_zoomAnimation_stepsLeft;

			g_zoomAnimation_timer = setInterval(	function()
													{
														layerDirty[0] = true;
														layerDirty[1] = true;
														layerDirty[2] = true;

														var center = add(camera.getViewPosition(), g_zoomAnimation_centerDelta);
														camera.setViewPosition(center.x, center.y);

														var scale = 1/camera.getUnitScale() + g_zoomAnimation_scaleDelta;

														camera.setUnitScale(1/scale);
														
														grid.spacing = Math.pow(10, Math.ceil(Math.log10(camera.invScale(10))));
									
														draw();

														--g_zoomAnimation_stepsLeft;
				
														if (g_zoomAnimation_stepsLeft<=0)
														{
															clearTimeout(g_zoomAnimation_timer);
														}

													}, 20);
		}
		else
		{
			layerDirty[0] = true;
			layerDirty[1] = true;
			layerDirty[2] = true;

			camera.setViewPosition(center.x, center.y);
			camera.setUnitScale(scale);
			grid.spacing = Math.pow(10, Math.ceil(Math.log10(camera.invScale(10))));

			draw();
		}
	}

	function zoomExtents()
	{
		if (scene.objects.length>0)
		{
			var center = avg(scene.getBoundsMin(), scene.getBoundsMax());
			var extents = sub(scene.getBoundsMax(), scene.getBoundsMin());

			var uniScaleX = window.innerWidth / extents.x;
			var uniScaleY = window.innerHeight / extents.y;

			zoom(center, Math.min(uniScaleX, uniScaleY) * 0.9);
		}
		else
		{
			var center = new Vector(0,0);

			zoom(center, camera.getUnitScale());
		}
	}

	function zoomSelection()
	{
		if (selectionList.length==0)
			return;

		var boundsMin = new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
		var boundsMax = new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

		for (var i=0; i<selectionList.length; ++i)
		{
			if (selectionList[i].getBoundsMin !== undefined)
			{
				boundsMin = min(boundsMin, selectionList[i].getBoundsMin());
				boundsMax = max(boundsMax, selectionList[i].getBoundsMax());
			}
		}
			
		boundsMin = sub(boundsMin, camera.invScale(5));
		boundsMax = add(boundsMax, camera.invScale(5));

		var center = avg(boundsMin, boundsMax);
		var extents = sub(boundsMax, boundsMin);

		var uniScaleX = window.innerWidth / extents.x;
		var uniScaleY = window.innerHeight / extents.y;

		zoom(center, Math.min(uniScaleX, uniScaleY) * 0.9);
	}

	function setSelection(s, ctrlKey, shiftKey)
	{
		layerDirty[1] = true;
		layerDirty[2] = true;

		if (s.length == 1 && s[0] instanceof TransformRect)
		{
			return;
		}

		if (ctrlKey == true)
		{
			s = selectionList.concat(s);
		}
		else if (shiftKey == true)
		{
			var copy = selectionList.concat([]);

			for (var i = 0; i < copy.length; ++i)
			{
				for (var j = 0; j < s.length; ++j)
				{
					index = copy.indexOf(s[j]);

					if (index >= 0)
					{
						copy.splice(index, 1);
						break;
					}
				}
			}

			s = copy;
		}

		for (var i=0; i<selectionList.length; ++i)
		{
			selectionList[i].setSelected(false);
		}
	
		selectionList = [];

		for (var i = 0; i < s.length; ++i)
		{
			selectionList.push(s[i]);
		}
		
		for (var i=0; i<selectionList.length; ++i)
		{
			selectionList[i].setSelected(true);
		}

		if (selectionList.length == 1)
		{
			propertyGrid.setProperties(selectionList[0].getProperties());
		}
		//else if (selectionList.length > 0)
		//{
		//	var commonProperties = selectionList[0].getProperties();

		//	for (var i=1; i<selectionList.length; ++i)
		//	{
		//		var objectProperties = selectionList[i].getProperties();

		//		for (var p=0; p<commonProperties.length; ++p)
		//		{
		//			var found = false;

		//			for (var j=0; j<objectProperties.length; ++j)
		//			{
		//				if (commonProperties[p].name == objectProperties[j].name)
		//				{
		//					found = true;
		//					break;
		//				}
		//			}

		//			if (!found)
		//			{
		//				commonProperties.splice(p, 1);
		//				--p;
		//			}
		//		}
		//	}

		//	propertyGrid.setProperties(commonProperties);
		//}
		else
		{
			propertyGrid.setProperties(getCanvasProperties());
		}

		if (selectionList.length == 0)
		{
			deepSelectionIndex = -1;
		}

		if (tool == "transform")
		{
			updateTransformTool();
		}

		updateObjectList();
		draw();
	}
	
	function draw()
	{
		var t0 = performance.now();

		if (layerDirty[0])
		{
			camera.setLayer(0);
			camera.clear("rgba(255,255,255,1)");

			if (showGrid)
			{
				grid.draw(camera);
			}

			layerDirty[0] = false;
		}

		if (layerDirty[1])
		{
			camera.setLayer(1);
			camera.clear("rgba(255,255,255,0)");
			scene.draw(camera, lastMousePos);

			layerDirty[1] = false;
		}

		if (layerDirty[2])
		{
			camera.setLayer(2);
			camera.clear("rgba(255,255,0,0)");
			mouseCursor.draw(camera);

			// Selection bounding box
			if (tool != "transform" && selectionList.length>0)
			{
				var boundsMin = new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
				var boundsMax = new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

				for (var i=0; i<selectionList.length; ++i)
				{
					if (selectionList[i].getBoundsMin !== undefined)
					{
						boundsMin = min(boundsMin, selectionList[i].getBoundsMin());
						boundsMax = max(boundsMax, selectionList[i].getBoundsMax());
					}
				}
			
				boundsMin = sub(boundsMin, camera.invScale(5));
				boundsMax = add(boundsMax, camera.invScale(5));

				camera.drawRectangle(boundsMin, boundsMax, "#0084e0", 1, [5,5]);
			}

			layerDirty[2] = false;
		}

		camera.setLayer(2);

		var t1 = performance.now();

		//camera.getGraphics().drawText(new Vector(window.innerWidth*0.5, 90), (1000 / (t1 - t0)).toFixed(0) + " FPS", "#909090", "center");
		camera.getGraphics().drawText(new Vector(window.innerWidth-50, window.innerHeight-5), lastMousePos.x.toFixed(2) + " ", "#AAAAAA", "right");
		camera.getGraphics().drawText(new Vector(window.innerWidth-50, window.innerHeight-5), ",", "#AAAAAA", "center");
		camera.getGraphics().drawText(new Vector(window.innerWidth-50, window.innerHeight-5), " " + lastMousePos.y.toFixed(2), "#AAAAAA", "left");
	}
	
	function drawSnapPoint(snapPoint)
	{
		if (snapPoint.type == "node")
		{
			camera.drawRectangle(snapPoint.p, camera.invScale(10), "#0084e0", 2);
		}
		else if (snapPoint.type == "midpoint")
		{
			camera.drawStar(snapPoint.p, 3, camera.invScale(7), Math.cos(60*Math.PI/180), 180*Math.PI/180, "#0084e0", 2);
		}
		else if (snapPoint.type == "intersection")
		{
			camera.drawCross(snapPoint.p, camera.invScale(10), 45 * Math.PI/180, "#0084e0", 2);
		}
		else if (snapPoint.type == "coincident")
		{
			camera.drawArc(snapPoint.p, camera.invScale(5), 0, 2*Math.PI, "#0084e0", 2);
		}
		else if (snapPoint.type == "perpendicular")
		{
			camera.drawLine(snapPoint.testP, snapPoint.p0, "#0084e0", 2, [5,5]);

			var N = snapPoint.N;
			var T = sub(snapPoint.p, snapPoint.testP).unit();

			var p = snapPoint.p;

			p = mad(N, camera.invScale(5), p);
			p = mad(T, camera.invScale(5), p);

			var points = [];

			points.push( mad(T, camera.invScale(5), mad(N, camera.invScale(5), p)) );
			points.push( mad(T, camera.invScale(5), mad(N, camera.invScale(-5), p)) );
			points.push( mad(T, camera.invScale(-5), mad(N, camera.invScale(-5), p)) );
			points.push( mad(T, camera.invScale(-5), mad(N, camera.invScale(5), p)) );

			camera.drawLineStrip(points, true, "#0084e0", 2);
			camera.drawRectangle(p, camera.invScale(1), "#0084e0", 1);
		}
		else if (snapPoint.type == "extendTo")
		{
			camera.drawLine(snapPoint.p, snapPoint.p0, "#0084e0", 2, [5,5]);
			camera.drawRectangle(snapPoint.p, camera.invScale(10), "#0084e0", 1);

			//var N = snapPoint.N;
			//var T = sub(snapPoint.p, snapPoint.testP).unit();

			//var p = snapPoint.p;

			//p = mad(N, camera.invScale(5), p);
			//p = mad(T, camera.invScale(5), p);

			//var points = [];

			//points.push( mad(T, camera.invScale(5), mad(N, camera.invScale(5), p)) );
			//points.push( mad(T, camera.invScale(5), mad(N, camera.invScale(-5), p)) );
			//points.push( mad(T, camera.invScale(-5), mad(N, camera.invScale(-5), p)) );
			//points.push( mad(T, camera.invScale(-5), mad(N, camera.invScale(5), p)) );

			//camera.drawLineStrip(points, true, "#0084e0", 2);
			//camera.drawRectangle(p, camera.invScale(1), "#0084e0", 1);
		}
		else
		{
			camera.drawRectangle(snapPoint.p, camera.invScale(10), "#0084e0", 2);
		}
	}

	function saveAsImage(formatIndex, popout, includeGridlines)
	{
		var saveAsSVG = (formatIndex == 1);

		var screenshotObj = undefined;

		for (var i = 0; i != scene.objects.length; ++i)
		{
			if (scene.objects[i] instanceof ScreenshotArea)
			{
				screenshotObj = scene.objects[i];
				break;
			}
		}

		if (screenshotObj == undefined)
		{
			cancelScreenshot();
			return;
		}

		cancelScreenshot();

		var imgWidthUnits = Math.abs(screenshotObj.points[2].x - screenshotObj.points[0].x);
		var imgHeightUnits = Math.abs(screenshotObj.points[2].y - screenshotObj.points[0].y);

		var unitToCm = screenshotObj.CMperUnit;
		var cmToInches = 1.0 / 2.54;
		var DPI = screenshotObj.DPI;

		var imgWidthPixels = Math.round(imgWidthUnits * unitToCm * cmToInches * DPI);
		var imgHeightPixels = Math.round(imgHeightUnits * unitToCm * cmToInches * DPI);
		var imgWidthCm = imgWidthUnits * unitToCm;
		var imgHeightCm = imgHeightUnits * unitToCm;

		var cameraPos = avg(screenshotObj.points[0], screenshotObj.points[2]);

		var popoutCanvas1 = document.createElement('canvas');
		popoutCanvas1.width = imgWidthPixels;
		popoutCanvas1.height = imgHeightPixels;
		//popoutCanvas1.style.width = imgWidthCm + "cm";
		//popoutCanvas1.style.height = imgHeightCm + "cm";
		
		var popoutGrid = new Grid()
		popoutGrid.spacing = grid.spacing;

		var popoutCamera = new Camera(popoutCanvas1, saveAsSVG);
		popoutCamera.setViewPosition(cameraPos.x, cameraPos.y);
		popoutCamera.setUnitScale(unitToCm * cmToInches * DPI);

		// draw
		{
			popoutCamera.setLayer(2);
			popoutCamera.clear();

			if (showGrid && includeGridlines)
			{
				popoutGrid.draw(popoutCamera);
			}

			scene.draw(popoutCamera);
		}

		var popoutCanvas = popoutCanvas1;

		if (!saveAsSVG)
		{
			if (screenshotObj.copiesRows > 1 || screenshotObj.copiesColumns > 1)
			{
				popoutCanvas = document.createElement('canvas');
				popoutCanvas.width = imgWidthPixels * screenshotObj.copiesColumns;
				popoutCanvas.height = imgHeightPixels * screenshotObj.copiesRows;

				var popoutCanvasContext = popoutCanvas.getContext('2d');

				for (var i = 0; i < screenshotObj.copiesRows; ++i)
				{
					for (var j = 0; j < screenshotObj.copiesColumns; ++j)
					{
						popoutCanvasContext.drawImage(popoutCanvas1, j * imgWidthPixels, i * imgHeightPixels);
					}
				}
			}
		}

		var imageAsURL;
		var imageW_inCM = imgWidthCm * screenshotObj.copiesColumns;
		var imageH_inCM = imgHeightCm * screenshotObj.copiesRows;
		var filename = scene.name + [".png", ".svg"][formatIndex];

		if (saveAsSVG)
		{
			var svg = popoutCamera.getGraphics().getContext().getSerializedSvg(true);
			imageAsURL = "data:image/svg+xml," + encodeURIComponent(svg);
		}
		else
		{
			imageAsURL = popoutCanvas.toDataURL("image/png");
		}

		if (popout == true)
		{
			var popup = window.open();

			popup.document.open();

			popup.document.write("<style>@media print { @page { margin: 0; } }</style>");

			popup.document.write("<div style=\"text-align: center; margin: 2cm auto auto auto\">");
			popup.document.write("<div style=\"display: inline-block;\">");
		
			popup.document.write("<h2>" + scene.name + "</h2>\n");

			popup.document.write("<a href=\"" + imageAsURL + "\" download=\"" + filename + "\">\n");

			popup.document.write("<img style=\"width: " + imageW_inCM + "cm; height: " + imageH_inCM + "cm\" src=\"" + imageAsURL + "\">\n");

			popup.document.write("</a>\n");

			popup.document.write("</div>");
			popup.document.write("</div>");

			popup.document.close();
		}
		else
		{
			var link = document.createElement("a");
			document.body.appendChild(link);
			link.href = imageAsURL;
			link.download = filename;
			link.click();
			document.body.removeChild(link);
		}
	}

	function saveAsEmbeddableJavascript()
	{
		var popup = window.open();

		var center = avg(scene.getBoundsMin(), scene.getBoundsMax());
		var extents = sub(scene.getBoundsMax(), scene.getBoundsMin());

		var divWidth = 750;
		var divHeight = divWidth * extents.y / extents.x;

		var popupHeader = "";
		var popupHTML = "";
		var popupJS = "";

		popupHeader += "<script type=\"text/javascript\" src=\"lib/maths.js\"></script>\n";
		popupHeader += "<script type=\"text/javascript\" src=\"lib/graphics.js\"></script>\n";
		popupHeader += "<script type=\"text/javascript\" src=\"lib/camera.js\"></script>\n";
		popupHeader += "<script type=\"text/javascript\" src=\"lib/ui.js\"></script>\n";
		popupHeader += "<script type=\"text/javascript\" src=\"lib/scene.js\"></script>\n";
		popupHeader += "<script type=\"text/javascript\" src=\"lib/sceneObjects.js\"></script>\n";
		popupHeader += "<script type=\"text/javascript\" src=\"lib/brdf.js\"></script>\n";
		popupHeader += "\n";
		popupHeader += "<script type=\"text/javascript\" src=\"lib/embeddedDrawing.js\"></script>\n";

		var randomVal = Math.floor(Math.random() * 16777216);
		popupHTML += "<div id=\"embeddedDrawing_" + randomVal + "\" style=\"width: 100%; padding-bottom: " + ((divHeight/divWidth)*100).toFixed(0) + "%;\"></div>\n";

		popupJS += "<script>\n";
		popupJS += "(function ()\n";
		popupJS += "{\n";
		popupJS += "var embeddedObj = new EmbeddedDrawing(\"embeddedDrawing_" + randomVal + "\");\n";
		popupJS += "\n";
		popupJS += "var scene = embeddedObj.getScene();\n";
		popupJS += "\n";
		popupJS += scene.saveAsJavascript();
		popupJS += "embeddedObj.zoomExtents();\n";
		popupJS += "})();\n";
		popupJS += "</script>\n";

		popup.document.open();
		popup.document.write("<body>\n");
		popup.document.write(popupHeader);
		popup.document.write("<div id=\"container\" style=\"width: " + divWidth + "px; height: " + divHeight + "px; margin:0 auto; border:1px solid black;\">");
		popup.document.write(popupHTML);
		popup.document.write("</div>");
		popup.document.write(popupJS);

		popup.document.write("<div style=\"width: " + divWidth + "px; display: block; margin:auto auto;\">\n");

		popup.document.write("<p>Includes</p>\n");
		popup.document.write("<textarea rows=\"" + popupHeader.split("\n").length + "\" style=\"width: 100%; display: block; margin:auto auto; border:1px solid black;\">\n");
		popup.document.write(popupHeader);
		popup.document.write("</textarea>\n");

		popup.document.write("<p>HTML</p>\n");
		popup.document.write("<textarea rows=\"" + popupHTML.split("\n").length + "\" style=\"width: 100%; display: block; margin:auto auto; border:1px solid black;\">\n");
		popup.document.write(popupHTML);
		popup.document.write("</textarea>\n");

		popup.document.write("<p>Minified JS</p>\n");
		var popupJSMin = popupJS.replace(/\n/g, " ");
		popup.document.write("<textarea rows=\"" + popupJSMin.split("\n").length + "\" style=\"width: 100%; display: block; margin:auto auto; border:1px solid black;\">\n");
		popup.document.write(popupJSMin);
		popup.document.write("</textarea>\n");

		popup.document.write("<p>Pretty JS</p>\n");
		popup.document.write("<textarea rows=\"" + popupJS.split("\n").length + "\" style=\"width: 100%; display: block; margin:auto auto; border:1px solid black;\">\n");
		popup.document.write(popupJS);
		popup.document.write("</textarea>\n");

		popup.document.write("</div>\n");

		popup.document.write("</body>\n");
		popup.document.close();
	}

	function saveAsJavascript()
	{
		var str = "";

		str += "scene.name = \"" + scene.name + "\";\n";
		str += camera.saveAsJavascript();
		str += "\n\n";
		str += scene.saveAsJavascript();

		codeBox.setValue(str);
		codeBox.gotoLine(0);

		var buttonPanel = codeBoxDock.querySelector("#buttonPanel");
		var okButton = buttonPanel.querySelector("#OKButton");

		okButton.onclick = function ()
							{
								codeBoxDock.style.display = "none";
								canvas.focus();
								showingModal = false;
							}

		showingModal = true;
		canvas.blur();
		codeBoxDock.style.display = "block";

		canvas.blur();
		codeBoxDock.style.display = "block";
		//codeBoxDock.focus();
	}

	function loadFromJavascriptPanel()
	{
		var buttonPanel = codeBoxDock.querySelector("#buttonPanel");
		var okButton = buttonPanel.querySelector("#OKButton");

		okButton.onclick = function ()
							{
								codeBoxDock.style.display = "none";
								canvas.focus();
								showingModal = false;

								var str = codeBox.getValue();
								loadFromJavascript(str);
							}

		canvas.blur();
		codeBoxDock.style.display = "block";
	}

	function loadFromJavascript(str)
	{
		//if (	str.search(/document/i)>=0 ||
		//		str.search(/window/i)>0 ||
		//		str.search(/frame/i)>0 ||
		//		str.search(/cookie/i)>0 ||

		if (str != null)
		{
			scene.deleteAllObjects();
			eval(str);

			layerDirty[0] = true;
			layerDirty[1] = true;
			layerDirty[2] = true;

			draw();
			setSelection([]);
			updateWindowTitle();
		}
	}

	function saveToLocalStorage(autoSave)
	{
		if (typeof (Storage) === "undefined")
			return null;

		if (autoSave === undefined)
			autoSave = false;

		var sceneName = scene.name;

		if (autoSave)
		{
			sceneName = "auto save";
		}
		else
		{
			//setSelection([]);
		}

		sceneName = sanitizeString(sceneName);

		var str = "";


		str += "scene.name = \"" + scene.name + (autoSave ? "(auto save)" : "") + "\";\n";
		str += camera.saveAsJavascript();
		str += "\n\n";
		str += scene.saveAsJavascript();
		
		var thumbnailData;

		// thumbnail
		{
			var popoutCanvas = document.createElement('canvas');
			popoutCanvas.width = 256;
			popoutCanvas.height = 256;
		
			var popoutGrid = new Grid()
			popoutGrid.spacing = grid.spacing;

			var popoutCamera = new Camera(popoutCanvas);
			popoutCamera.setViewPosition(0, 0);

			var center = avg(scene.getBoundsMin(), scene.getBoundsMax());
			var extents = sub(scene.getBoundsMax(), scene.getBoundsMin());

			var uniScaleX = 256 / extents.x;
			var uniScaleY = 256 / extents.y;

			popoutCamera.setViewPosition(center.x, center.y);
			popoutCamera.setUnitScale(Math.min(uniScaleX, uniScaleY) * 0.9);

			// draw
			{
				popoutCamera.setLayer(2);

				popoutCamera.clear();

				if (showGrid)
				{
					popoutGrid.draw(popoutCamera);
				}

				scene.draw(popoutCamera);
			}

			thumbnailData = popoutCanvas.toDataURL("image/png");
		}

		localStorage.setItem("savedScene:" + sceneName, scene.name + (autoSave ? "(auto save)" : ""));
		localStorage.setItem("sceneCode:" + sceneName, str);
		localStorage.setItem("sceneDate:" + sceneName, (new Date()).toString());
		localStorage.setItem("sceneThumbnail:" + sceneName, thumbnailData);

		if (!autoSave)
		{
			undoRedoLastSavePos	= undoRedoUndoPos;
		}

		updateWindowTitle();

		return sceneName;
	}

	function newDrawing()
	{
		var dirty = (undoRedoLastSavePos != undoRedoUndoPos);

		if (dirty)
		{
			if (confirm("You have unsaved changes! Are you sure you want to make a new drawing?") == false)
			{
				return;
			}
		}

		backup();

		undoRedoSuspendBackup = true;
		
		cancelScreenshot();
		setSelection([]);
		scene.deleteAllObjects();
		scene.name = "New Drawing";

		layerDirty[0] = true;
		layerDirty[1] = true;
		layerDirty[2] = true;

		draw();
		updateObjectList();

		undoRedoSuspendBackup = false;
	}

	function savePreferences()
	{
		if (typeof (Storage) === "undefined")
			return;

		var temp = JSON.stringify(preferences);
		localStorage.setItem('userPreferences', JSON.stringify(preferences));
	}

	function loadPreferences()
	{
		if (typeof (Storage) === "undefined")
			return;

		var loadedPreferences = JSON.parse(localStorage.getItem('userPreferences'));

		if (loadedPreferences)
			preferences = loadedPreferences;
		else
			preferences = {};

		toolPaletteDock.style.width	= preferences.toolPaletteDockWidth	|| 'auto';
		
		if (preferences.objectListDockHeight)
			objectListDock.style.height = preferences.objectListDockHeight;

		if (preferences.objectListCollapsed != undefined)
			toggleObjectListCollapse(preferences.objectListCollapsed);

		if (preferences.objectListVisible != undefined)
			toggleObjectListVisibility(preferences.objectListVisible);

		if (preferences.toolPaletteVisible != undefined)
			toggleToolPaletteVisibility(preferences.toolPaletteVisible);

		if (preferences.canvasControlsVisible != undefined)
			toggleCanvasControlsVisibility(preferences.canvasControlsVisible);

		if (preferences.globalHintVisible != undefined)
			toggleGlobalHintVisibility(preferences.globalHintVisible);

		if (preferences.animateZoom == undefined)
			preferences.animateZoom = true;

		ShowGlobalHint(undefined, undefined);
	}

	function clearPreferences()
	{
		if (typeof (Storage) === "undefined")
			return;

		localStorage.removeItem('userPreferences');
		loadPreferences();
	}

	function toggleObjectListCollapse(force)
	{
		var collapse = objectListDock.offsetWidth > 100;

		if (force != undefined)
		{
			collapse = force;
		}

		var elementsToToggle = [];
		elementsToToggle.push( document.getElementById("objectListButtonArea") );
		elementsToToggle.push( document.getElementById("objectListButtonAreaTop") );
		elementsToToggle.push( document.getElementById("objectListResizeGrip") );
		elementsToToggle.push( document.getElementById("buttonAreaDock") );
		elementsToToggle.push( document.getElementById("objectList") );
		//elementsToToggle.push( document.getElementById("buttonAreaDockTop") );

		if (collapse)
		{
			objectListDock.style.width = 25;
			objectListDock.style.height = 30;
			objectListDock.style.minHeight = 20;
			objectListResizeGrip.style.visibility = "hidden";
			
			for (var i=0; i<elementsToToggle.length; ++i)
			{
				elementsToToggle[i].style.visibility = "hidden";
				elementsToToggle[i].style.display_backup = elementsToToggle[i].style.display;
				elementsToToggle[i].style.display = "none";

				for (var j=0; j<elementsToToggle[i].children.length; ++j)
				{
					elementsToToggle[i].children[j].style.visibility = "hidden";
				}
			}

			preferences.objectListCollapsed = true;
		}
		else
		{
			objectListDock.style.width = 250;
			objectListDock.style.height = preferences.objectListDockHeight;
			objectListDock.style.minHeight = 150;
			objectListResizeGrip.style.visibility = "visible";

			for (var i=0; i<elementsToToggle.length; ++i)
			{
				elementsToToggle[i].style.visibility = "visible";
				elementsToToggle[i].style.display = elementsToToggle[i].style.display_backup;

				for (var j=0; j<elementsToToggle[i].children.length; ++j)
				{
					elementsToToggle[i].children[j].style.visibility = "visible";
				}
			}

			preferences.objectListCollapsed = false;
		}
	}

	function toggleObjectListVisibility(force)
	{
		var visible = objectListDock.style.display == "none";

		if (force != undefined)
		{
			visible = force;
		}

		objectListDock.style.display = visible ? "flex" : "none";

		preferences.objectListVisible = visible;
	}

	function toggleToolPaletteVisibility(force)
	{
		var visible = toolPaletteDock.style.visibility == "hidden";

		if (force != undefined)
		{
			visible = force;
		}

		toolPaletteDock.style.visibility = visible ? "visible" : "hidden";

		preferences.toolPaletteVisible = visible;
	}

	function toggleCanvasControlsVisibility(force)
	{
		var canvasControlsDock = document.getElementById("canvasControlsDock");

		var visible = canvasControlsDock.style.visibility == "hidden";

		if (force != undefined)
		{
			visible = force;
		}

		canvasControlsDock.style.visibility = visible ? "visible" : "hidden";

		preferences.canvasControlsVisible = visible;
	}

	function toggleGlobalHintVisibility(force)
	{
		var globalHint = document.getElementById('GlobalHint');

		var visible = globalHint.style.visibility == "hidden";

		if (force != undefined)
		{
			visible = force;
		}

		globalHint.style.visibility = visible ? "visible" : "hidden";

		preferences.globalHintVisible = visible;
	}

	function openLocalStorage()
	{
		var dirty = (undoRedoLastSavePos != undoRedoUndoPos);

		if (dirty)
		{
			if (confirm("You have unsaved changes! Are you sure you want to open a different diagram?") == false)
			{
				return;
			}
		}

		if (typeof (Storage) === "undefined")
			return;

		showingModal = true;

		canvas.blur();
		fileManagerDock.style.display = "flex";
		fileManagerDock.focus();

		// populate list
		{
			while (fileManagerDock.firstChild)
			{
				fileManagerDock.removeChild(fileManagerDock.firstChild);
			}

			var sceneList = [];

			for (var i = 0; i != localStorage.length; ++i)
			{
				var key = localStorage.key(i);

				if (key.startsWith("savedScene:"))
				{
					var sceneKey = key.replace("savedScene:", "");
					sceneList.push( {key: sceneKey, title:localStorage.getItem(key)} );
				}
			}

			var sampleEntry = document.getElementById("fileManagerSampleEntry");

			for (var i=0; i!=sceneList.length; ++i)
			{
				var fileEntry = sampleEntry.cloneNode(true);

				fileEntry.style.visibility = "visible";

				fileManagerDock.appendChild(fileEntry);

				var fileDetails = fileEntry.querySelector("#details");

				var entryThumbnail = fileDetails.querySelector("#thumbnail");
				var entryTitle = fileDetails.querySelector("#title");
				var entryTitleEdit = fileDetails.querySelector("#titleEdit");
				var entryDate = fileDetails.querySelector("#date");
				var fileOpenIcon = fileDetails.querySelector("#details1").querySelector("#details2").querySelector("#fileOpen");
				var fileRenameIcon = fileDetails.querySelector("#details1").querySelector("#details2").querySelector("#fileRename");
				var fileDeleteIcon = fileDetails.querySelector("#details1").querySelector("#details2").querySelector("#fileDelete");

				entryThumbnail.src = localStorage.getItem( "sceneThumbnail:" + sceneList[i].key );

				entryTitle.innerHTML = sceneList[i].title;

				var dateStr = localStorage.getItem( "sceneDate:" + sceneList[i].key );
				var sceneDate = new Date(dateStr);
				entryDate.innerHTML = sceneDate.toLocaleString();

				entryTitleEdit.value = sceneList[i].title;

				fileDetails.querySelector("#details1").ondblclick = function(evt)
					{
						loadFromLocalStorage(this.key);

						fileManagerDock.style.display = "none";
						showingModal = false;

					}.bind(sceneList[i]);


				fileOpenIcon.onmouseup = function(evt)
					{
						loadFromLocalStorage(this.key);

						fileManagerDock.style.display = "none";
						showingModal = false;

					}.bind(sceneList[i]);

				fileDeleteIcon.onmouseup = function ()
					{
						if (confirm("Are you sure you want to delete '" + this.title + "'") == true)
						{
							
							localStorage.removeItem("savedScene:" + this.key);
							localStorage.removeItem("sceneCode:" + this.key);
							localStorage.removeItem("sceneDate:" + this.key);
							localStorage.removeItem("sceneThumbnail:" + this.key);
						}

						fileManagerDock.style.display = "none";
						showingModal = false;
						loadFromLocalStorage();

					}.bind(sceneList[i]);

				(	function(entryTitle, entryTitleEdit)
					{
						fileRenameIcon.onmouseup = function(evt)
						{
							entryTitle.style.display = "none";
							entryTitleEdit.style.display = "block";
							entryTitleEdit.focus();
						};
					}
				)(entryTitle, entryTitleEdit);

				(	function(entryTitle, entryTitleEdit)
					{
						entryTitle.onmouseup = function(evt)
						{
							entryTitle.style.display = "none";
							entryTitleEdit.style.display = "block";
							entryTitleEdit.focus();
						};
					}
				)(entryTitle, entryTitleEdit);

				(	function(entryTitle, entryTitleEdit)
					{
						entryTitleEdit.addEventListener('blur', function ()
														{
															entryTitle.style.display = "block";
															entryTitleEdit.style.display = "none";
															fileManagerDock.focus();
														});
					}
				)(entryTitle, entryTitleEdit);

				(	function(entryTitle, entryTitleEdit)
					{
						entryTitleEdit.addEventListener('keypress', function (evt)
															{
																if (evt.keyCode == 13) // Enter
																{
																	entryTitle.style.display = "block";
																	entryTitleEdit.style.display = "none";

																	var oldKey = this.key;
																	var oldTitle = this.title;
																	var newKey = sanitizeString(entryTitleEdit.value);
																	var newTitle = entryTitleEdit.value;

																	entryTitle.innerHTML = newTitle;

																	localStorage.setItem("savedScene:" + newKey, newTitle);
																	localStorage.setItem("sceneCode:" + newKey, localStorage.getItem("sceneCode:" + oldKey));
																	localStorage.setItem("sceneDate:" + newKey, localStorage.getItem("sceneDate:" + oldKey));
																	localStorage.setItem("sceneThumbnail:" + newKey, localStorage.getItem("sceneThumbnail:" + oldKey));

																	localStorage.removeItem("savedScene:" + oldKey);
																	localStorage.removeItem("sceneCode:" + oldKey);
																	localStorage.removeItem("sceneDate:" + oldKey);
																	localStorage.removeItem("sceneThumbnail:" + oldKey);
																}
															}.bind(sceneList[i]) );
					}
				)(entryTitle, entryTitleEdit);
			}
		}

	}

	function loadFromLocalStorage(sceneKey)
	{
		if (typeof (Storage) === "undefined")
			return false;

		var sceneCode = localStorage.getItem("sceneCode:" + sceneKey);

		if (sceneCode != undefined)
		{
			//objectList.style.display = "none";
			loadFromJavascript(sceneCode);
			//objectList.style.display = "inline";

			undoRedoBackupPos = -1;
			undoRedoUndoPos	= -1;
			backup();

			undoRedoLastSavePos = undoRedoUndoPos;

			updateWindowTitle();

			return true;
		}

		return false;
	}

	function loadTutorial()
	{
		var dirty = (undoRedoLastSavePos != undoRedoUndoPos);

		if (dirty)
		{
			if (confirm("You have unsaved changes! Are you sure you want to open a different diagram?") == false)
			{
				return;
			}
		}

		loadTutorialScene(scene, camera);
	}

	function addTree()
	{
		var w1 = new Wall([new Vector(-2, 2), new Vector(-2, 7), new Vector(0, 7), new Vector(0, 2), new Vector(-2, 2)]);
		w1.roughness = 0.1;
		w1.metalness = 0;

		var w2 = new Wall([new Vector(-2, 7), new Vector(-5, 9), new Vector(-5, 11), new Vector(-6, 13), new Vector(-5, 15), new Vector(-5, 17), new Vector(-2.5131828247928443, 17.6149344555104), new Vector(-1, 19), new Vector(2.0701925996189092, 18.187856383561872), new Vector(2.881831997691824, 15.70519469533884), new Vector(4.6483412758505205, 13.699967947158697), new Vector(3.025062479704691, 11.503767222961393), new Vector(2.7386015156789565, 8.49592710069118), new Vector(0, 7), new Vector(-2, 7)]);
		w2.roughness = 0.6000000000000001;
		w2.metalness = 0;

		var g = new Group([w1, w2]);

		scene.addObject(g);
	}

	function addPerson()
	{
		var w = new Wall([new Vector(-2, 10), new Vector(0, 10), new Vector(2, 7), new Vector(0, 8), new Vector(0, 1), new Vector(-1, 5), new Vector(-2, 1), new Vector(-2, 8), new Vector(-4, 7), new Vector(-2, 10)]);
		w.roughness = 0;
		w.metalness = 0;

		var aw = new ArcWall(new Vector(-1, 11), 1, -90.00 * Math.PI/180, 270.00 * Math.PI/180);
		aw.convex = false;
		aw.roughness = 0;
		aw.metalness = 0;

		var g = new Group([w, aw]);

		scene.addObject(g);
	}

	function onSceneChange(caller, changeDetails)
	{
		if (changeDetails == undefined)
		{
			changeDetails = {};
		}

		if ( (tool != "modify" || mode != "move") && tool != "addHemisphere" && !undoRedoSuspendBackup)
		{
			layerDirty[1] = true;
			layerDirty[2] = true;

			if (changeDetails.refreshProperties == true)
			{
				var s = selectionList.slice(0);
				setSelection(s);
			}

			draw();

			updateObjectList();
		}

		if (scene.needsFrameTick)
		{
			if (frameTickTimer == undefined)
			{
				frameTickTimer = window.requestAnimationFrame(frameTick);
			}

		}
		else
		{
			if (frameTickTimer != undefined)
			{
				window.cancelAnimationFrame(frameTickTimer);
				frameTickTimer = undefined;
			}
		}

		backup();
	}

	function frameTick()
	{
		var currentTime = performance.now();
		var deltaTime = currentTime - lastFrameTickTime;

		var redrawNeeded = scene.onFrameTick(deltaTime);

		if (redrawNeeded)
		{
			layerDirty[1] = true;
			//layerDirty[2] = true;

			draw();
		}

		lastFrameTickTime = currentTime;

		frameTickTimer = window.requestAnimationFrame(frameTick);
	}

	function updateObjectList()
	{
		while (objectList.firstChild)
		{
			objectList.removeChild(objectList.firstChild);
		}

		for (var i=0; i!=scene.objects.length; ++i)
		{
			if (scene.objects[i] instanceof TransformRect)
				continue;

			var row = document.createElement('div');
			objectList.appendChild(row);

			row.style.background = scene.objects[i].isSelected() ? "#DDDDDD" : "#EEEEEE";
			row.style.padding = "1px 5px";
			row.style.margin = "2px 0";

			row.onmouseenter = function() { this.style.background = "#AAAAAA"; }.bind(row);
			
			( function(selectedColor, row) 
				{
					row.onmouseleave = function() { this.style.background = selectedColor; }.bind(row);
				}
			)(scene.objects[i].isSelected() ? "#DDDDDD" : "#EEEEEE", row);

			var nameCell = document.createElement('div');
			var visibilityCell = document.createElement('img');
			var frozenCell = document.createElement('img');

			row.appendChild(visibilityCell);
			row.appendChild(frozenCell);
			row.appendChild(nameCell);

			nameCell.style.overflow = "hidden";

			var str = scene.objects[i].constructor.name;

			if (scene.objects[i].isSelected())
				str = str.bold();

			nameCell.innerHTML = str;

			visibilityCell.style.cssFloat = "right";
			frozenCell.style.cssFloat = "right";

			visibilityCell.width = 20;
			visibilityCell.height = 20;
			visibilityCell.style.margin = "0 2px";

			frozenCell.width = 20;
			frozenCell.height = 20;
			frozenCell.style.margin = "0 5px";

			visibilityCell.src = scene.objects[i].isVisible() ? "images/show.svg" : "images/hide.svg";
			frozenCell.src = scene.objects[i].isFrozen() ? "images/freeze.svg" : "images/unfreeze.svg";

			var dblClickTimer = undefined;

			nameCell.ondblclick = function()
			{
				clearTimeout(dblClickTimer);
				setSelection([this]);
				zoomSelection();

			}.bind(scene.objects[i]);

			(	function(i) 
				{
					nameCell.onclick = function (evt)
					{
						dblClickTimer = setTimeout(	function()
													{
														onClickHandler(evt, scene.objects[i]) 
													}, 50);
					}
				})(i);

			function onClickHandler(evt, obj)
			{
				if (evt.shiftKey)
				{
					var index0 = obj.scene.getObjectIndex(selectionList[selectionList.length - 1]);
					var index1 = obj.scene.getObjectIndex(obj);

					var firstIndex = Math.min(index0, index1);
					var lastIndex = Math.max(index0, index1);

					for (var i=firstIndex; i<=lastIndex; ++i)
					{
						var obj = obj.scene.objects[i];

						if (selectionList.indexOf(obj) < 0)
						{
							var s = selectionList.concat(obj);
							setSelection(s);
						}
					}
				}
				else if (evt.ctrlKey)
				{
					var index = selectionList.indexOf(obj);

					if (index >= 0)
					{
						var s = selectionList.concat([]);
						s.splice(index, 1);
						setSelection(s);
					}
					else
					{
						var s = selectionList.concat(obj);
						setSelection(s);
					}
				}
				else
				{
					setSelection([obj]);
				}

			};

			visibilityCell.onmouseup =	function ()
										{
											if (selectionList.indexOf(this) >= 0)
											{
												setSelectionVisible(!this.isVisible());
											}
											else
											{
												this.toggleVisibility();
											}
										}.bind(scene.objects[i]);

			frozenCell.onmouseup =	function ()
									{
										if (selectionList.indexOf(this) >= 0)
										{
											setSelectionFrozen(!this.isFrozen())
										}
										else
										{
											this.toggleFrozen();
										}
									}.bind(scene.objects[i]);
		}
	}

	function updateTransformTool()
	{
		if (selectionList.length>0)
		{
			if (transformRect == undefined)
			{
				transformRect = new TransformRect(selectionList);
				scene.addObject(transformRect);
			}
			else
			{
				transformRect.setObjects(selectionList);
			}
		}
		else
		{
			if (transformRect != undefined)
			{
				scene.deleteObjects([transformRect]);
				transformRect = undefined;
			}
		}
	}

	function directionSnap(currentPos, startPos)
	{
		var snappedPoint = currentPos;

		var delta = sub(currentPos, startPos);
		var angle = toAngle(delta);

		angle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);

		var dir = fromAngle(angle);

		var radius = length(delta);
		snappedPoint = mad(dir, radius, startPos);

		layerDirty[2] = true;

		if (angle<0)
			angle = Math.PI*2 + angle;

		for (var a=0; a<Math.PI*2; a += Math.PI/4)
		{
			var dir = fromAngle(a);

			if (a == angle)
			{
				//camera.drawLine(mad(dir, radius, startPos), mad(dir, 100, startPos), "rgba(153,217,234,1)", 4, [5,5]); 
				camera.drawLine(startPos, mad(dir, 100, startPos), "rgba(153,217,234,1)", 4, [10,10]); 
			}
			else
			{
				camera.drawLine(startPos, mad(dir, 100, startPos), "rgba(0,0,0,0.1)", 2, [5,5]); 
			}
		}

		return snappedPoint;
	}

	function backup()
	{
		if (undoRedoSuspendBackup)
			return;

		// Making a change after an undo, we'll wipe some of the undo buffer
		if (undoRedoUndoPos < undoRedoBackupPos)
		{
			undoRedoBackupPos = undoRedoUndoPos+1;
		}
		else
		{
			undoRedoBackupPos = undoRedoBackupPos+1;
		}

		undoRedoUndoPos = undoRedoBackupPos;

		undoRedoBuffer[undoRedoBackupPos%undoRedoMaxCount] = scene.saveAsJavascript();

		updateWindowTitle();
	}
	
	function undo()
	{
		if (undoRedoUndoPos > 0)
		{
			undoRedoSuspendBackup = true;
			undoRedoUndoPos -= 1;
			loadFromJavascript(undoRedoBuffer[undoRedoUndoPos % undoRedoMaxCount]);
			draw();
			updateObjectList();
			undoRedoSuspendBackup = false;
			updateWindowTitle();
		}
	}

	function redo()
	{
		if (undoRedoUndoPos < undoRedoBackupPos)
		{
			undoRedoSuspendBackup = true;
			undoRedoUndoPos += 1;
			loadFromJavascript(undoRedoBuffer[undoRedoUndoPos % undoRedoMaxCount]);
			draw();
			updateObjectList();
			undoRedoSuspendBackup = false;
			updateWindowTitle();
		}
	}

	function selectAll()
	{
		var s = []

		for (var i = 0; i != scene.objects.length; ++i)
		{
			if (!scene.objects[i].isFrozen() && scene.objects[i].isVisible())
			{
				s.push(scene.objects[i]);
			}
		}

		setSelection(s);
	}

	function invertSelection()
	{
		var currentSelection = selectionList.concat([]);
		var s = []

		for (var i = 0; i != scene.objects.length; ++i)
		{
			if (!scene.objects[i].isFrozen() && scene.objects[i].isVisible())
			{
				if (currentSelection.indexOf(scene.objects[i])<0)
					s.push(scene.objects[i]);
			}
		}

		setSelection(s);
	}

	function alignObjects(direction)
	{
		if (selectionList.length<2)
			return;

		var minWeight;
		var maxWeight;

		if (direction == "left")
		{
			minWeight = new Vector(1,0);
			maxWeight = new Vector(0,0);
		}
		else if (direction == "right")
		{
			minWeight = new Vector(0,0);
			maxWeight = new Vector(1,0);
		}
		else if (direction == "top")
		{
			minWeight = new Vector(0,0);
			maxWeight = new Vector(0,1);
		}
		else if (direction == "bottom")
		{
			minWeight = new Vector(0,1);
			maxWeight = new Vector(0,0);
		}
		else if (direction == "centers-h")
		{
			minWeight = new Vector(0.5, 0);
			maxWeight = new Vector(0.5, 0);
		}
		else if (direction == "centers-v")
		{
			minWeight = new Vector(0, 0.5);
			maxWeight = new Vector(0, 0.5);
		}

		var anchor = add( mul(selectionList[0].getBoundsMin(), minWeight), mul(selectionList[0].getBoundsMax(), maxWeight) );

		undoRedoSuspendBackup = true;

		for (var i=0; i<selectionList.length; ++i)
		{
			var objectPos = add( mul(selectionList[i].getBoundsMin(), minWeight), mul(selectionList[i].getBoundsMax(), maxWeight) );
			var delta = sub(anchor, objectPos);

			delta = mul(delta, add(minWeight, maxWeight));

			selectionList[i].setOrigin(add(selectionList[i].getOrigin(), delta));
		}

		undoRedoSuspendBackup = false;

		onSceneChange();
	}

	function distributeObjects(direction)
	{
		if (selectionList.length<3)
			return;

		var objectList = [];

		var minCenter = new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
		var maxCenter = new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

		for (var i=0; i<selectionList.length; ++i)
		{
			var objCenter = avg(selectionList[i].getBoundsMin(), selectionList[i].getBoundsMax());

			objectList.push({center:objCenter, index:i});
			minCenter = min(minCenter, objCenter);
			maxCenter = max(maxCenter, objCenter);
		}

		var sortDir;

		if (direction == "horizontal")
			sortDir = new Vector(1,0);
		else if (direction == "vertical")
			sortDir = new Vector(0,1);

		objectList.sort(function(a,b) 
		{
			return dot(a.center, sortDir) - dot(b.center, sortDir);
		});

		undoRedoSuspendBackup = true;

		var step = div(sub(maxCenter, minCenter), selectionList.length-1);

		for (var i=0; i<selectionList.length; ++i)
		{
			var index = objectList[i].index;

			var currentPos = avg(selectionList[index].getBoundsMin(), selectionList[index].getBoundsMax());

			var targetPos = mad(step, i, minCenter);

			var newPos = lerp(currentPos, targetPos, sortDir);

			var delta = sub(selectionList[index].getOrigin(), currentPos);

			var newOrigin = add(newPos, delta);

			selectionList[index].setOrigin(newOrigin);
		}

		undoRedoSuspendBackup = false;

		onSceneChange();
	}
	
	function clipboardCopy()
	{
		clipboardText = "";

		for (var i=0; i<selectionList.length; ++i)
		{
			if (selectionList[i].saveAsJavascript === undefined)
				continue;

			clipboardText += selectionList[i].saveAsJavascript();

			clipboardText += "\n";
		}

		copyPasteDelta = new Vector(0,0);
	}

	function clipboardCut()
	{
		clipboardCopy();

		scene.deleteObjects(selectionList);
		setSelection([]);
	}

	function clipboardPaste()
	{
		var newSelectionList = [];

		var previousObjectCount = scene.objects.length;

		undoRedoSuspendBackup = true;

		eval(clipboardText);

		copyPasteDelta = add(copyPasteDelta, new Vector(1,-1));

		for (var i = previousObjectCount; i < scene.objects.length; ++i)
		{
			scene.objects[i].setOrigin(add(scene.objects[i].getOrigin(), copyPasteDelta));

			scene.objects[i].toggleFrozen(false);

			newSelectionList.push(scene.objects[i]);
		}

		undoRedoSuspendBackup = false;

		backup();

		setSelection(newSelectionList);

		draw();
	}

	function groupSelection()
	{
		if (selectionList.length <= 1)
			return;

		var index = scene.getObjectIndex(selectionList[0]);

		undoRedoSuspendBackup = true;

		var group = new Group(selectionList);

		scene.addObject(group, index);

		undoRedoSuspendBackup = false;

		backup();
		setSelection([group]);
	}

	function ungroupSelection()
	{
		if (selectionList.length == 0)
			return;

		undoRedoSuspendBackup = true;

		var objects = [];

		for (var i=0; i!=selectionList.length; ++i)
		{
			var obj = selectionList[i];

			if (obj.constructor.name == "Group")
			{
				objects = objects.concat(obj.objects);
				
				// Remove objects from group and add them back to the scene.
				selectionList[i].deleteAllObjects();
			}
		}

		setSelection(objects);

		undoRedoSuspendBackup = false;

		backup();
	}

	function moveUpSelection(evt)
	{
		if (selectionList.length == 0)
			return;

		selectionList.sort(function(a,b) { return scene.getObjectIndex(a)-scene.getObjectIndex(b); });

		for (var i=0; i!=selectionList.length; ++i)
		{
			var obj = selectionList[i];

			var index = scene.getObjectIndex(obj);

			if (index>0)
			{
				if (evt != undefined && evt.ctrlKey)
				{
					scene.setObjectIndex(obj, i);
				}
				else
				{
					scene.setObjectIndex(obj, index-1);
				}
			}
		}
	}

	function moveDownSelection(evt)
	{
		if (selectionList.length == 0)
			return;

		if (evt != undefined && evt.ctrlKey)
		{
			selectionList.sort(function(a,b) { return scene.getObjectIndex(a)-scene.getObjectIndex(b); });
		}
		else
		{
			selectionList.sort(function(a,b) { return scene.getObjectIndex(b)-scene.getObjectIndex(a); });
		}

		for (var i = 0; i != selectionList.length; ++i)
		{
			var obj = selectionList[i];

			var index = scene.getObjectIndex(obj);

			if (index<scene.objects.length-1)
			{
				if (evt != undefined && evt.ctrlKey)
				{
					scene.setObjectIndex(obj, scene.objects.length-1);
				}
				else
				{
					scene.setObjectIndex(obj, index+1);
				}
			}
		}
	}

	function modifyObjects(selectedOnly, changeVisibility, value)
	{
		var objectList;

		for (var i = 0; i != scene.objects.length; ++i)
		{
			if (scene.objects[i].isSelected() == selectedOnly)
			{
				if (changeVisibility)
					scene.objects[i].toggleVisibility(value);
				else
					scene.objects[i].toggleFrozen(value);
			}
		}
	}

	function setSelectionVisible(vis)
	{
		modifyObjects(true, true, vis);
	}

	function setSelectionFrozen(freeze)
	{
		modifyObjects(true, false, freeze);
	}

	function cancelScreenshot()
	{
		setSelection([]);

		for (var i = 0; i != scene.objects.length; ++i)
		{
			if (scene.objects[i] instanceof ScreenshotArea)
			{
				scene.deleteObjects([scene.objects[i]]);
				break;
			}
		}
	}

	function updateWindowTitle()
	{
		var dirty = (undoRedoLastSavePos != undoRedoUndoPos);
		document.title = scene.name + (dirty ? "*" : "") + " - renderdiagrams.org Editor" + undoRedoBackupPos + " - " + undoRedoUndoPos + " - " + undoRedoLastSavePos;
	}

	setup();
	updateObjectList();
	draw();
}
