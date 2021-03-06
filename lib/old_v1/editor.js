function GeneralDrawing(docTag)
{
	var canvas;
	var propertyGrid;
	var buttonList;
	var objectList;
	var groupButton;
	var ungroupButton;
	var moveUpButton;
	var moveDownButton;
	var statusBar;
	var codeBoxDock;
	var codeBox;
	var fileManagerDock;
	var toolPaletteDock;
	var propertyGridDock;
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

			// To stop some page elements being draged on Chrome during marquee selection after a double click!
			canvas.ondragstart = function(evt) 
			{
				evt.preventDefault();
				return false;
			};
		}

		// Property grid
		{
			propertyGridDock = document.getElementById("propertyGridDock");
			var propertyGridList = document.getElementById("propertyGridList");
			propertyGrid = new PropertyGrid(propertyGridList);

			var propertyGridResizeGrip = document.getElementById("propertyGridResizeGrip");
			propertyGridResizeGrip.onmousedown = function()
			{
				window.addEventListener('mousemove', propertyGridResizeGrip_Resize, false);
				window.addEventListener('mouseup', propertyGridResizeGrip_StopResize, false);
				buttonArea.style.pointerEvents = "none";
			}

			function propertyGridResizeGrip_Resize(evt)
			{
				var bottom = propertyGridDock.offsetTop + propertyGridDock.offsetHeight;

				propertyGridDock.style.top = evt.clientY + 'px';
				//propertyGridDock.style.height = (bottom - evt.clientY) + 'px';
			}

			function propertyGridResizeGrip_StopResize(evt)
			{
				window.removeEventListener('mousemove', propertyGridResizeGrip_Resize, false);
				window.removeEventListener('mouseup', propertyGridResizeGrip_StopResize, false);
				buttonArea.style.pointerEvents = "auto";

				preferences.propertyGridDockTop = propertyGridDock.style.top;
				savePreferences();
			};
		}

		// Object list
		{
			objectList = document.getElementById("objectList");

			var buttonArea = document.getElementById("objectListButtonArea");
			var buttonAreaTop = document.getElementById("objectListButtonAreaTop");

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

			var objectListResizeGrip = document.getElementById("objectListResizeGrip");
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
		}


		// File controls
		{
			var fileControlsDock = document.getElementById("fileControlsDock");

			var popoutMenuButton = new MenuPopoutButton("images/menu.svg", [24,24], undefined);
			popoutMenuButton.addControl(new Button("images/new_drawing.svg", [24,24],				"New Diagram (Ctrl+Alt+N)",			undefined, function () { newDrawing(); }));
			popoutMenuButton.addControl(new Button("images/save_drawing_localstorage.svg", [24,24], "Save to LocalStorage (Ctrl+S)",	undefined, function () { saveToLocalStorage();				}));
			popoutMenuButton.addControl(new Button("images/load_drawing_localstorage.svg", [24,24], "Load from LocalStorage (Ctrl+O)",	undefined, function () { openLocalStorage();				}));
			popoutMenuButton.addControl(new Button("images/export_drawing_image.svg", [24,24],		"Save as Image",					undefined, function () { setTool("takeScreenshot");			}));
			popoutMenuButton.addControl(new Button("images/export_drawing_embed.svg", [24,24],		"Export Embeddable",				undefined, function () { saveAsEmbeddableJavascript();		}));
			popoutMenuButton.addControl(new Button("images/export_drawing_js.svg", [24,24],			"Export as JavaScript",				undefined, function () { saveAsJavascript();				}));
			popoutMenuButton.addControl(new Button("images/import_drawing_js.svg", [24,24],			"Import from JavaScript",			undefined, function () { loadFromJavascriptPanel();			}));
			popoutMenuButton.addControl(new Button("images/open_example.svg", [24,24],				"Open Tutorial",					undefined, function () { loadTutorial();					}));
			popoutMenuButton.addControl(new Divider());
			popoutMenuButton.addControl(new Button("images/wipe_preferences.svg",	[18,18],		"Reset Preferences",				undefined, function () { clearPreferences(); })); 
			popoutMenuButton.addControl(new Divider());
			popoutMenuButton.addControl(new Button("images/help_about.svg", [24,24],				"About",							undefined, function () { alert("COMING SOON!"); }));
			popoutMenuButton.addControl(new Button("images/report_issue.svg", [24,24],				"Report Issue",						undefined, function () { window.open("https://github.com/vaspoul/render.diagrams/issues", "_blank"); }));

			popoutMenuButton.addControls(fileControlsDock);
		}

		// Tool palette
		{
			toolPaletteDock = document.getElementById("toolPaletteDock");
			var toolPalette = document.getElementById("toolPalette");

			(new Button("images/tool_move.svg",		[18,18], "Select/Move (Q)", "Move objects, without modifying them.",	function(){setTool("select");} )).addControls(toolPalette);
			(new Button("images/tool_transform.svg",[18,18], "Transform (T)",	"Scale/Rotate objects.",					function(){setTool("transform");} )).addControls(toolPalette);
			(new Button("images/tool_modify.svg",	[18,18], "Modify (V)",		"Modify object nodes.",						function(){setTool("modify");} )).addControls(toolPalette);

			(new Divider()).addControls(toolPalette);

			(new Button("images/tool_wall.svg",		[18,18], "Wall (W)", "Rigid straight wall, multiple segments. Use this to contruct walls, rooms, objects, etc. Can bounce rays.", function () { setTool("addWall");} )).addControls(toolPalette);
			(new Button("images/tool_arc_wall.svg",	[18,18], "Arc Wall", "Circular rigid wall. ", function () { setTool("addArcWall");} )).addControls(toolPalette);
			(new Button("images/tool_ray.svg",		[18,18], "BRDF Ray (B)", "Ray that bounces off rigid walls.", function () { setTool("addRay"); } )).addControls(toolPalette);

			var popout = new MultiToolButton([18,18]);
			popout.addButton("images/tool_light_point.svg",		"Point Light",		"Omni-directional light.<p>Can 'collide' with rigid walls to cast shadows.",		function() { setTool("addPointLight");		} );
			popout.addButton("images/tool_light_spot.svg",		"Spot Light",		"Frustum-like light.<p>Can 'collide' with rigid walls to cast shadows.",			function() { setTool("addSpotLight");		} );
			popout.addButton("images/tool_light_parallel.svg",	"Parallel Light",	"Parallel / directional light.<p>Can 'collide' with rigid walls to cast shadows.",	function() { setTool("addParallelLight");	} );
			popout.addControls(toolPalette);

			(new Button("images/tool_camera.svg",			[18,18],	"Camera (C)",			"Camera fustrum outline.<p>Can 'collide' with rigid walls.<p>Has pixel & Z Buffer functionality.",		function () { setTool("addCamera"); }		)).addControls(toolPalette);
			(new Button("images/tool_hemisphere.svg",		[18,18],	"BRDF Hemisphere",		"Draws a hemisphere with a BRDF lobe.",																	function () { setTool("addHemisphere"); }	)).addControls(toolPalette);
			(new Button("images/tool_line.svg",				[18,18],	"Line (L)",				"Multi-line, non-collidable.<p>Can draw arrows.<p>Has 'pixelation' mode.",								function () { setTool("addLine"); }			)).addControls(toolPalette);
			(new Button("images/tool_rectangle.svg",		[18,18],	"Rectangle (R)",		"Axis aligned rectangle.<p>Can be sub-divided into rows & columns to form a grid.",						function () { setTool("addRect"); }			)).addControls(toolPalette);
			(new Button("images/tool_ngon.svg",				[18,18],	"Circle / NGon (N)",	"Circle or regular polygon.",																			function () { setTool("addNGon"); }			)).addControls(toolPalette);
			(new Button("images/tool_bar_chart.svg",		[18,18],	"Bar Chart",			"function based Bar Chart.<p>Has mip-map support.",														function () { setTool("addBarChart"); }		)).addControls(toolPalette);
			(new Button("images/tool_function_graph.svg",	[18,18],	"Function Graph",		"Plot a graph of a user-supplied function.<p>COMING SOON!",												function () { alert("missing functionality"); setTool("addFunctionGraph"); }		)).addControls(toolPalette);
			(new Button("images/tool_dimension.svg",		[18,18],	"Dimension (D)",		"Adds a dimension.",																					function () { setTool("addDimension"); }	)).addControls(toolPalette);
			(new Button("images/tool_text.svg",				[18,18],	"Text (X)",				"Adds text object.",																					function () { setTool("addText");}			)).addControls(toolPalette);
			(new Button("images/tool_axis.svg",				[18,18],	"Axis",					"Adds an axis-aligned axis object.",																	function () { setTool("addAxis"); }			)).addControls(toolPalette);
			(new Button("images/tool_page_outline.svg",		[18,18],	"Page Outline",			"Adds a standard page outline.",																		function () { setTool("addPageOutline"); }	)).addControls(toolPalette);

			var popout = new MultiToolButton([18,18]);
			popout.addButton("images/tool_tree.svg",		"Tree",		"Adds a Tree prefab.",			function() { addTree();		} );
			popout.addButton("images/tool_person.svg",		"Person",	"Adds a Person prefab.",		function() { addPerson();	} );
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
			popoutMenuButton.addControl(new Tickbox("images/snaps_grid.svg",			[18,18], "Grid (G)", undefined,				enableSnap["grid"],				function (value) { enableSnap["grid"] = value; }) );
			popoutMenuButton.addControl(new Tickbox("images/snaps_node.svg",			[18,18], "Node", undefined,					enableSnap["node"],				function (value) { enableSnap["node"] = value; }) );
			popoutMenuButton.addControl(new Tickbox("images/snaps_intersection.svg",	[18,18], "Intersection", undefined,			enableSnap["intersection"],		function (value) { enableSnap["intersection"] = value; }) );
			popoutMenuButton.addControl(new Tickbox("images/snaps_midpoint.svg",		[18,18], "Midpoint", undefined,				enableSnap["midpoint"],			function (value) { enableSnap["midpoint"] = value; }) );
			popoutMenuButton.addControl(new Tickbox("images/snaps_coincident.svg",		[18,18], "Coincident (O)", undefined,		enableSnap["coincident"],		function (value) { enableSnap["coincident"] = value; }) );
			popoutMenuButton.addControl(new Tickbox("images/snaps_perpendicular.svg",	[18,18], "Perpendicular (P)", undefined,	enableSnap["perpendicular"],	function (value) { enableSnap["perpendicular"] = value; }) );
			popoutMenuButton.addControl(new Tickbox("images/snaps_extend.svg",			[18,18], "Extend To (E)", undefined,		enableSnap["extendTo"],			function (value) { enableSnap["extendTo"] = value; }) );
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

		// Status bar
		{
			statusBar = document.createElement('div');
			statusBar.id = "statusBar";
			statusBar.style.position = "fixed";
			statusBar.style.left = "0";
			statusBar.style.bottom = "5";
			statusBar.style.width  = window.innerWidth;
			statusBar.style.height = 30;
			statusBar.style.fontFamily = "Verdana,sans-serif";
			statusBar.style.fontSize = "small";
			statusBar.style.padding = "4px";
			statusBar.style.pointerEvents = "none";
			statusBar.style.visibility = "hidden";
			//statusBar.style.display = "none";
			root.appendChild(statusBar);
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
			//scene.addObject(new Wall( [new Vector(-10, 10), new Vector(-10, 0), new Vector(10, 0), new Vector(10, 10)] ));
			//scene.addObject(new ArcWall(new Vector(0, 10), 10,  0*Math.PI/180, 180*Math.PI/180));
			//scene.addObject(new BRDFRay(new Vector(0, 10), new Vector(-3, -5)));
			//scene.addObject(new SpotLight(new Vector(0, 10), new Vector(10, 0), 35));

			//camera.setViewPosition(0, 10);
			loadTutorial();
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
		var closeButton = globalHint.querySelector("#closeButton");

		if (title != undefined || hintText != undefined)
		{
			titleElement.innerHTML = title;
			contentElement.innerHTML = hintText;
		}

		if (preferences.showHint != undefined && preferences.showHint == false)
		{
			globalHint.className = "subtleHint";
		}
		else
		{
			globalHint.className = "hint";
		}

		closeButton.onmouseup = function()
		{
			globalHint.className = "subtleHint";

			if (preferences.showHint == undefined)
				preferences.showHint = false;
			else
				preferences.showHint = !preferences.showHint;

			if (preferences.showHint)
			{
				globalHint.className = "hint";
			}
			else
			{
				globalHint.className = "subtleHint";
			}

			savePreferences();
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
			else if (tool == "addArcWall" || tool == "addRay" || tool == "addPointLight" || tool == "addSpotLight" || tool == "addParallelLight" || tool == "addCamera" || tool == "addRect" || tool == "addHemisphere" || tool == "addNGon" || tool == "addDimension" || tool == "addBarChart" || tool == "takeScreenshot" || tool == "addText" || tool == "addAxis" || tool == "addPageOutline")
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

		if (newTool == "select")
		{
			if (tool != "select")
			{
				mode = null;
			}

			tool = "select";
			mouseCursor.shape = "cross";
			statusBar.innerHTML = "SELECT: Click to select and move objects. Ctrl restricts movement to X/Y axis. Snaps are ON by default. Use Alt to move freely.";
			ShowGlobalHint("SELECT", "Click to select and move objects. <p>Ctrl restricts movement to X/Y axis. <p>Snaps are ON by default. <p>Use Alt to move freely.");

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
			statusBar.innerHTML = "TRANSFORM: Ctrl: rotates, Shift: Symmetrical, Alt: No aspect ratio lock.";
			ShowGlobalHint("TRANSFORM", "Ctrl: rotates, Shift: Symmetrical, Alt: No aspect ratio lock");

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
			statusBar.innerHTML = "MODIFY: Click to select and move drag points. Ctrl restricts movement to object local space. Snaps are ON by default. Use Alt to move freely. Shift to delete nodes.";
			ShowGlobalHint("MODIFY", "Click to select and move drag points. <p>Ctrl restricts movement to object local space. <p>Snaps are ON by default. <p>Use Alt to move freely. <p>Shift to delete nodes.");

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
			statusBar.innerHTML = newTool + ": Click to add points. ESC to terminate. Snaps are ON by default. Use Alt to move freely.";
			ShowGlobalHint(newTool, "Click to add points. <p>ESC to terminate. <p>Snaps are ON by default. <p>Use Alt to move freely");
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
			statusBar.innerHTML = newTool + ": Click to set direction. ESC to terminate. Snaps are ON by default. Use Alt to move freely.";
			ShowGlobalHint(newTool, "Click to set direction. <p>ESC to terminate. <p>Snaps are ON by default. <p>Use Alt to move freely.");

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
			statusBar.innerHTML = "Add Arc Wall: Click to add points. ESC to terminate. Snaps are ON by default. Use Alt to move freely.";
			ShowGlobalHint("Add Arc Wall", "Click to set direction. <p>ESC to terminate. <p>Snaps are ON by default. <p>Use Alt to move freely.");

			setSelection([]);
			draw();
		}
		else if (newTool == "addPointLight"  || newTool == "addRect" || newTool == "addHemisphere" || newTool == "addNGon" || newTool == "addDimension" || newTool == "takeScreenshot" || newTool == "addPageOutline")
		{
			if (tool != newTool)
			{
				mode = null;
			}

			tool = newTool;
			mouseCursor.shape = "cross";
			statusBar.innerHTML = newTool + " : Click to add. ESC to terminate. Snaps are ON by default. Use Alt to move freely.";
			ShowGlobalHint(newTool, "Click to add. <p>ESC to terminate. <p>Snaps are ON by default. <p>Use Alt to move freely.");

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
			return;

		//if (evt.keyCode == lastKeyPress)
		//	return;


		var handled = true;

		if (evt.keyCode == 16 && tool == "modify") // shift
		{
			mouseCursor.shape = "angle";
			draw();
		}
		else if (evt.keyCode == 115) // F4
		{
			zoomExtents();
		}
		else if ((evt.keyCode == 70 && evt.ctrlKey == 0) || evt.keyCode == 113) // F or F2
		{
			zoomSelection();
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
		else if (evt.ctrlKey)
		{
			if (evt.keyCode==65) // Ctrl+A
			{
				evt.preventDefault();
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
			else if (evt.keyCode==67) // Ctrl+C
			{
				clipboardCopy();
			}
			else if (evt.keyCode==86) // Ctrl+V
			{
				clipboardPaste();
			}
			else if (evt.keyCode==71 && evt.shiftKey==0) // Ctrl+G
			{
				groupSelection();
			}
			else if (evt.keyCode==71 && evt.shiftKey==1) // Ctrl+Shift+G
			{
				ungroupSelection();
			}
			else if (evt.keyCode == 79) // Ctrl + O
			{
				openLocalStorage();
			}
			else if (evt.keyCode == 83) // Ctrl + S
			{
				saveToLocalStorage();
			}
			else if (evt.keyCode == 78) // Ctrl + N
			{
				newDrawing();
			}
			else if (evt.keyCode==72 && evt.shiftKey == 0 && evt.altKey == 0) // Ctrl+H
			{
				// hide selection
				modifyObjects(true, true, false);
			}
			else if (evt.keyCode==72 && evt.shiftKey == 1 && evt.altKey == 0) // Ctrl+Shift+H
			{
				// hide unselected
				modifyObjects(false, true, false);
			}
			else if (evt.keyCode==72 && evt.shiftKey == 0 && evt.altKey == 1) // Ctrl+Alt+H
			{
				// unhide all
				modifyObjects(false, true, true);
				modifyObjects(true, true, true);
			}
			else if (evt.keyCode==70 && evt.shiftKey == 0 && evt.altKey == 0) // Ctrl+F
			{
				// freeze selection
				modifyObjects(true, false, true);
			}
			else if (evt.keyCode==70 && evt.shiftKey == 1 && evt.altKey == 0) // Ctrl+Shift+F
			{
				// freeze unselected
				modifyObjects(false, false, true);
			}
			else if (evt.keyCode==70 && evt.shiftKey == 0 && evt.altKey == 1) // Ctrl+Alt+F
			{
				// unfreeze all
				modifyObjects(false, false, false);
				modifyObjects(true, false, false);
			}
			else if (evt.keyCode==33 && evt.altKey) // Ctrl+Alt+PgUp (Ctrl+PgUp doesn't work in either Firefox or Chrome)
			{
				moveUpSelection();
			}
			else if (evt.keyCode==34 && evt.altKey) // Ctrl+Alt+PgDown  (Ctrl+PgDown doesn't work in either Firefox or Chrome)
			{
				moveDownSelection();
			}
			else if (evt.keyCode == 90 && evt.shiftKey == 0) // Ctrl + Z
			{
				undo();
			}
			else if (evt.keyCode == 90 && evt.shiftKey == 1) // Ctrl + Shift + Z
			{
				redo();
			}
			else if (evt.keyCode == 89) // Ctrl + Y
			{
				redo();
			}
			else
			{
				handled = false;
			}
		}
		else if (evt.keyCode==81) // q
		{
			setTool("select");
		}
		else if (evt.keyCode==84) // t
		{
			setTool("transform");
		}
		else if (evt.keyCode==86) // v
		{
			setTool("modify");
		}
		else if (evt.keyCode==76) // L
		{
			setTool("addLine");
		}
		else if (evt.keyCode==68) // D
		{
			setTool("addDimension");
		}
		else if (evt.keyCode==71) // G
		{
			enableSnap["grid"] = !enableSnap["grid"];
			propertyGrid.setProperties(getCanvasProperties());
		}
		else if (evt.keyCode==79) // O
		{
			enableSnap["coincident"] = !enableSnap["coincident"];
			propertyGrid.setProperties(getCanvasProperties());
		}
		else if (evt.keyCode==80) // P
		{
			enableSnap["perpendicular"] = !enableSnap["perpendicular"];
			propertyGrid.setProperties(getCanvasProperties());
		}
		else if (evt.keyCode==69) // E
		{
			enableSnap["extendTo"] = !enableSnap["extendTo"];
			propertyGrid.setProperties(getCanvasProperties());
		}
		else if (evt.keyCode==82) // R
		{
			setTool("addRect");
		}
		else if (evt.keyCode==67) // C
		{
			setTool("addCamera");
		}
		else if (evt.keyCode==78) // N
		{
			setTool("addNGon");
		}
		else if (evt.keyCode==87) // W
		{
			setTool("addWall");
		}
		else if (evt.keyCode==88) // W
		{
			setTool("addText");
		}
		else if (evt.keyCode==66) // B
		{
			setTool("addRay");
		}
		else if (evt.keyCode==46) // del
		{
			if (tool == "select" || tool == "transform")
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
		//else if ( (evt.keyCode == 16 || evt.keyCode == 17 || evt.keyCode == 18) && tool == "transform") // shift/ctrl/alt
		//{
		//}
		else
		{
			handled = false;
		}
	
		if (handled)
			evt.preventDefault();
	
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
				var s = scene.hitTest(sub(lastMousePos, threshold), add(lastMousePos, threshold));

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
					var s = scene.hitTest(sub(lastMousePos, threshold), add(lastMousePos, threshold));

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
					setSelection([dragPoint.object]);

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

						s = scene.hitTest(pMin, pMax);

						setSelection(s, evt.ctrlKey, evt.shiftKey);
					}
				}
				else if (mode == "move")
				{
					backup();
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
						s = scene.hitTest(sub(lastMousePos, threshold), add(lastMousePos, threshold));

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

						s = scene.hitTest(pMin, pMax);
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
				}

				backup();
				mode = null;
			}
			else if (tool == "addWall" || tool == "addArcWall" || tool == "addRay" || tool == "addPointLight" || tool == "addSpotLight" || tool == "addParallelLight" || tool == "addCamera" || tool == "addLine" || tool == "addRect" || tool == "addHemisphere" || tool == "addNGon" || tool == "addDimension" || tool == "addBarChart" || tool == "takeScreenshot" || tool == "addText" || tool == "addAxis" || tool == "addPageOutline")
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
					var absDelta = abs(delta);

					if (absDelta.x > absDelta.y)
					{
						lastMousePos.y = lastMouseUpPos.y;
					}
					else
					{
						lastMousePos.x = lastMouseUpPos.x;
					}
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
						objectBeingMade.setDragPointPos(0, newPoint);
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
						objectBeingMade = new Dimension(newPoint.copy(), undefined);
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
							newDragPoint.object.drawDragPoint(camera, newDragPoint.index, evt.ctrlKey);
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
				var newDragPoint = scene.getDragPoint(lastMousePos, camera, evt.ctrlKey);

				if (newDragPoint.point !== null)
				{
					if (newDragPoint.object.drawDragPoint !== undefined)
					{
						newDragPoint.object.drawDragPoint(camera, newDragPoint.index, evt.ctrlKey);
					}
					else
					{
						camera.drawRectangle(newDragPoint.point, camera.invScale(10), "#ff0000", 2);
					}
				}
			}
			else if (tool == "addWall" || tool == "addArcWall" || tool == "addRay" || tool == "addPointLight" || tool == "addSpotLight" || tool == "addParallelLight" || tool == "addCamera" || tool == "addLine" || tool == "addRect" || tool == "addHemisphere" || tool == "addNGon" || tool == "addDimension" || tool == "addBarChart" || tool == "takeScreenshot" || tool == "addText" || tool == "addAxis" || tool == "addPageOutline")
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
					var delta = sub(lastMousePos, lastMouseUpPos);
					var absDelta = abs(delta);

					if (absDelta.x > absDelta.y)
					{
						newPoint.y = lastMouseUpPos.y;
					}
					else
					{
						newPoint.x = lastMouseUpPos.x;
					}
				}

				if (tool == "addWall" || tool == "addLine")
				{
					if (objectBeingMade !== undefined)
					{
						objectBeingMade.points[objectBeingMade.points.length - 1] = newPoint;

						{
							var p0 = objectBeingMade.points[objectBeingMade.points.length - 2].copy();
							var p1 = objectBeingMade.points[objectBeingMade.points.length - 1].copy();

							var delta = sub(p1, p0);

							var lx = delta.unit();
							var ly = transpose(lx).neg();

							var p = mad(lx, ((p1.x < p0.x) ? +1 : -1) * camera.invScale(10), newPoint);
							p = mad(ly, ((p1.x < p0.x) ? -1 : +1) * camera.invScale(10), p);

							var angle = toAngle(delta);

							if (p1.x < p0.x)
								angle += Math.PI;

							camera.drawText(p, "dx: " + delta.x.toFixed(1) + " dy: " + delta.y.toFixed(1) + " L: " + delta.length().toFixed(1), "#000000", (p1.x < p0.x) ? "left" : "right", angle, "12px Arial");
						}
					}
				}
				else if (tool == "addArcWall" || tool == "addPageOutline")
				{
					if (objectBeingMade !== undefined)
					{
						objectBeingMade.setDragPointPos(0, newPoint);
					}
				}
				else if (tool == "addRay" || tool == "addSpotLight" || tool == "addParallelLight" || tool == "addCamera" || tool == "addBarChart" || tool == "addText" || tool == "addAxis")
				{
					if (objectBeingMade !== undefined)
					{
						objectBeingMade.setDragPointPos(1, newPoint);
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
						objectBeingMade.setDragPointPos(2, newPoint);

						{
							var p0 = objectBeingMade.points[0].copy();
							var p1 = objectBeingMade.points[2].copy();

							var delta = sub(p1, p0);

							var p = p1.copy();
							p.x += ((p1.x < p0.x) ? +1 : -1) * camera.invScale(10);
							p.y += camera.invScale(10);

							camera.drawText(p, "dx: " + delta.x.toFixed(1) + " dy: " + delta.y.toFixed(1), "#000000", (p1.x < p0.x) ? "left" : "right", 0, "12px Arial");
						}
					}
				}
				else if (tool == "takeScreenshot")
				{
					if (objectBeingMade !== undefined)
					{
						objectBeingMade.setDragPointPos(2, newPoint);

						{
							var p0 = objectBeingMade.points[0].copy();
							var p1 = objectBeingMade.points[2].copy();

							var delta = sub(p1, p0);

							var p = p1.copy();
							p.x += ((p1.x < p0.x) ? +1 : -1) * camera.invScale(10);
							p.y += camera.invScale(10);

							camera.drawText(p, "dx: " + delta.x.toFixed(1) + " dy: " + delta.y.toFixed(1), "#000000", (p1.x < p0.x) ? "left" : "right", 0, "12px Arial");
						}
					}
				}
				else if (tool == "addNGon" || tool == "addPointLight")
				{
					if (objectBeingMade !== undefined)
					{
						objectBeingMade.setDragPointPos(-1, newPoint);

						{
							var p = newPoint.copy();
							p.x += ((newPoint.x < objectBeingMade.center.x) ? +1 : -1) * camera.invScale(10);
							p.y += camera.invScale(10);

							camera.drawText(p, "R: " + objectBeingMade.radius.toFixed(1), "#000000", (newPoint.x < objectBeingMade.center.x) ? "left" : "right", 0, "12px Arial");
						}
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
					var delta = sub(lastMousePos, dragStartMousePos);
					var absDelta = abs(delta);

					if (absDelta.x > absDelta.y)
					{
						lastMousePos.y = dragStartMousePos.y;
					}
					else
					{
						lastMousePos.x = dragStartMousePos.x;
					}
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

					dragPoint.object.setDragPointPos(dragPoint.index, lastMousePos, evt.ctrlKey);

					if (dragPoint.object instanceof Wall || dragPoint.object instanceof Line)
					{
						if (!dragPoint.local && dragPoint.index>0)
						{
							var p0 = dragPoint.object.points[dragPoint.index-1].copy();
							var p1 = dragPoint.object.points[dragPoint.index].copy();

							var delta = sub(p1, p0);
							var lx = delta.unit();
							var ly = transpose(lx).neg();

							var p = mad(lx, ((p1.x < p0.x) ? +1 : -1) * camera.invScale(10), lastMousePos);
							p = mad(ly, ((p1.x < p0.x) ? -1 : +1) * camera.invScale(10), p);

							var angle = toAngle(delta);

							if (p1.x < p0.x)
								angle += Math.PI;

							camera.drawText(p, "dx: " + delta.x.toFixed(1) + " dy: " + delta.y.toFixed(1) + " L: " + delta.length().toFixed(1), "#000000", (p1.x < p0.x) ? "left" : "right", angle, "12px Arial");
						}
					}
					else if (dragPoint.object instanceof Rectangle || dragPoint.object instanceof ScreenshotArea)
					{
						var p0 = dragPoint.object.points[0].copy();
						var p1 = dragPoint.object.points[2].copy();

						var delta = sub(p1, p0);
						var lx = delta.unit();
						var ly = transpose(lx).neg();

						var p = lastMousePos.copy();
						p.x += ((p1.x < p0.x) ? +1 : -1) * camera.invScale(10);
						p.y += camera.invScale(10);

						camera.drawText(p, "dx: " + delta.x.toFixed(1) + " dy: " + delta.y.toFixed(1), "#000000", (p1.x < p0.x) ? "left" : "right", 0, "12px Arial");
					}
					else if (dragPoint.object instanceof NGon && dragPoint.index>0)
					{
						var p = lastMousePos.copy();
						p.x += ((lastMousePos.x < dragPoint.object.center.x) ? +1 : -1) * camera.invScale(10);
						p.y += camera.invScale(10);

						camera.drawText(p, "R: " + dragPoint.object.radius.toFixed(1), "#000000", (lastMousePos.x < dragPoint.object.center.x) ? "left" : "right", 0, "12px Arial");
					}
					else if (dragPoint.object instanceof BRDFHemisphere && dragPoint.index==0)
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

	function zoomExtents()
	{
		layerDirty[0] = true;
		layerDirty[1] = true;
		layerDirty[2] = true;

		var center = avg(scene.getBoundsMin(), scene.getBoundsMax());
		var extents = sub(scene.getBoundsMax(), scene.getBoundsMin());

		var uniScaleX = window.innerWidth / extents.x;
		var uniScaleY = window.innerHeight / extents.y;

		camera.setViewPosition(center.x, center.y);
		camera.setUnitScale(Math.min(uniScaleX, uniScaleY) * 0.9);

		grid.spacing = Math.pow(10, Math.ceil(Math.log10(camera.invScale(10))));

		draw();
	}

	function zoomSelection()
	{
		if (selectionList.length==0)
			return;

		layerDirty[0] = true;
		layerDirty[1] = true;
		layerDirty[2] = true;

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

		camera.setViewPosition(center.x, center.y);
		camera.setUnitScale(Math.min(uniScaleX, uniScaleY) * 0.9);

		grid.spacing = Math.pow(10, Math.ceil(Math.log10(camera.invScale(10))));

		draw();
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
			if (selectionList[i].selected !== undefined)
			{
				selectionList[i].selected = false;
			}
		}
	
		selectionList = [];

		for (var i = 0; i < s.length; ++i)
		{
			selectionList.push(s[i]);
		}
		
		for (var i=0; i<selectionList.length; ++i)
		{
			if (selectionList[i].selected !== undefined)
			{
				selectionList[i].selected = true;
			}
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
			scene.draw(camera);

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

		//camera.getGraphics().drawText(new Vector(5, window.innerHeight - 40), (1000 / (t1 - t0)).toFixed(0) + " FPS", "#909090", "left");
		camera.getGraphics().drawText(new Vector(window.innerWidth/2, 18), lastMousePos.x.toFixed(2) + " ", "#AAAAAA", "right");
		camera.getGraphics().drawText(new Vector(window.innerWidth/2, 18), ",", "#AAAAAA", "center");
		camera.getGraphics().drawText(new Vector(window.innerWidth/2, 18), " " + lastMousePos.y.toFixed(2), "#AAAAAA", "left");
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
		popupHeader += "<script type=\"text/javascript\" src=\"lib/scene.js\"></script>\n";
		popupHeader += "<script type=\"text/javascript\" src=\"lib/sceneObjects.js\"></script>\n";
		popupHeader += "<script type=\"text/javascript\" src=\"lib/brdf.js\"></script>\n";
		popupHeader += "<script type=\"text/javascript\" src=\"lib/ui.js\"></script>\n";
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
		propertyGridDock.style.top	= preferences.propertyGridDockTop	|| 'auto';
		
		if (preferences.objectListDockHeight)
			objectListDock.style.height = preferences.objectListDockHeight;

		ShowGlobalHint(undefined, undefined);
	}

	function clearPreferences()
	{
		if (typeof (Storage) === "undefined")
			return;

		localStorage.removeItem('userPreferences');
		loadPreferences();
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

	function onSceneChange()
	{
		if ( (tool != "modify" || mode != "move") && tool != "addHemisphere" && !undoRedoSuspendBackup)
		{
			layerDirty[1] = true;
			layerDirty[2] = true;

			//var s = selectionList.concat([]);
			//setSelection(s);
			draw();
			updateObjectList();
		}

		backup();
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

			row.style.background = scene.objects[i].selected ? "#DDDDDD" : "#EEEEEE";
			row.style.padding = "1px 5px";
			row.style.margin = "2px 0";

			row.onmouseenter = function() { this.style.background = "#AAAAAA"; }.bind(row);
			
			( function(selectedColor, row) 
				{
					row.onmouseleave = function() { this.style.background = selectedColor; }.bind(row);
				}
			)(scene.objects[i].selected ? "#DDDDDD" : "#EEEEEE", row);

			var nameCell = document.createElement('div');
			var visibilityCell = document.createElement('img');
			var frozenCell = document.createElement('img');

			row.appendChild(visibilityCell);
			row.appendChild(frozenCell);
			row.appendChild(nameCell);

			nameCell.style.overflow = "hidden";

			var str = scene.objects[i].constructor.name;

			if (scene.objects[i].selected)
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
	}

	function clipboardPaste()
	{
		var newSelectionList = [];

		var previousObjectCount = scene.objects.length;

		undoRedoSuspendBackup = true;

		eval(clipboardText);

		var delta = new Vector(1, -1);

		for (var i = previousObjectCount; i < scene.objects.length; ++i)
		{
			scene.objects[i].setOrigin(add(scene.objects[i].getOrigin(), delta));

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
			if (scene.objects[i].selected == selectedOnly)
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
