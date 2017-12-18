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
	var codeBox;
	var fileManagerDock;
	var fileManagerBox;
	var scene;
	var camera;

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

	var layerDirty				= [true, true, true];

	var previousCoincidentEnabled;

	window.addEventListener("resize", onResize);

	window.addEventListener("beforeunload", function (evt)
	{
		var dirty = (undoRedoLastSavePos != undoRedoBackupPos);

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

			if (camera.scale(grid.spacing) < 10)
				grid.spacing *= 10;
			else if (camera.scale(grid.spacing) > 100)
				grid.spacing /= 10;

			layerDirty[0] = true;
			layerDirty[1] = true;
			layerDirty[2] = true;

			draw();
		}
	}

	function setup()
	{
		var root = document.getElementById(docTag);

		// Main canvas
		{
			canvas = document.createElement('canvas');

			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			canvas.style.position = "fixed";
			canvas.style.left = "0";
			canvas.style.top = "0";
			canvas.style.cursor = "none";
			canvas.addEventListener('mousemove', onMouseMove, false);
			canvas.addEventListener('mousedown', onMouseDown, false);
			canvas.addEventListener('mouseup', onMouseUp, false);
			canvas.addEventListener('keydown', onKeyDown, false);
			canvas.addEventListener('keyup', onKeyUp, false);
			canvas.oncontextmenu = onContextMenu;
			canvas.onwheel = onMouseWheel;
			canvas.tabIndex = -1;
			canvas.focus();
			root.appendChild(canvas);
		}

		// Property grid
		{
			var propertyGridDock = document.createElement('div');
			propertyGridDock.id = "propertyGrid";
			propertyGridDock.style.border = "2px solid black";
			propertyGridDock.style.backgroundColor = "white";
			propertyGridDock.style.position = "fixed";
			propertyGridDock.style.right = "5";
			propertyGridDock.style.top = "5";
			propertyGridDock.style.width  = 400;
			propertyGridDock.style.height = 250;
			propertyGridDock.style.fontFamily = "Verdana,sans-serif";
			propertyGridDock.style.fontSize = "large";
			propertyGridDock.style.overflow = "auto";

			root.appendChild(propertyGridDock);

			propertyGrid = new PropertyGrid(propertyGridDock);
		}

		// Object list
		{
			var objectListDock = document.createElement('div');
			objectListDock.id = "objectList";
			objectListDock.style.border = "2px solid black";
			objectListDock.style.backgroundColor = "white";
			objectListDock.style.position = "fixed";
			objectListDock.style.right = 5;
			objectListDock.style.top = 265;
			objectListDock.style.width  = 400;
			objectListDock.style.height = 520;


			var objectListDockScrollable = document.createElement('div');
			objectListDockScrollable.style.position = "fixed";
			objectListDockScrollable.style.overflow = "auto";
			objectListDockScrollable.style.backgroundColor = "white";
			objectListDockScrollable.style.position = "fixed";
			objectListDockScrollable.style.width  = 400;
			objectListDockScrollable.style.height = 420;
			objectListDockScrollable.style.fontFamily = "Verdana,sans-serif";
			objectListDockScrollable.style.fontSize = "large";

			objectListDock.appendChild(objectListDockScrollable);

			objectList = document.createElement('table');
			objectList.id = "objectList";
			objectList.style.width = "100%";
			objectList.style.padding = "0";
			objectList.style.spacing = "0";
			objectList.style.cellpadding = "0";
			objectList.style.cellspacing = "0";
			//objectList.style.border = "2px solid black";
			objectList.style.fontFamily = "Verdana,sans-serif";
			objectList.style.fontSize = "12px";
			//objectList.style.fontSize = "large";
			objectList.onmousedown = function(e)
			{
				if(e.preventDefault) e.preventDefault();
			}

			objectListDockScrollable.appendChild(objectList);

			var buttonArea = document.createElement("div");
			buttonArea.style.position = "relative";
			//buttonArea.style.display = "block";
			//buttonArea.style.margin = "auto";
			buttonArea.style.textAlign = "center";
			buttonArea.style.top = 490;
			buttonArea.style.bottom = 0;

			groupButton = document.createElement("button");
			groupButton.appendChild(document.createTextNode("Group"));
			groupButton.onclick = groupSelection;

			buttonArea.appendChild(groupButton);

			ungroupButton = document.createElement("button");
			ungroupButton.appendChild(document.createTextNode("Ungroup"));
			ungroupButton.onclick = ungroupSelection;
			buttonArea.appendChild(ungroupButton);

			moveUpButton = document.createElement("button");
			moveUpButton.appendChild(document.createTextNode("Up"));
			moveUpButton.onclick = moveUpSelection;
			buttonArea.appendChild(moveUpButton);

			moveDownButton = document.createElement("button");
			moveDownButton.appendChild(document.createTextNode("Down"));
			moveDownButton.onclick = moveDownSelection;
			buttonArea.appendChild(moveDownButton);

			objectListDock.appendChild(buttonArea);

			root.appendChild(objectListDock);
		}

		// Code box
		{
			codeBox = document.createElement('textarea');
			codeBox.id = "codeBox";
			codeBox.style.border = "2px solid black";
			codeBox.style.backgroundColor = "white";
			codeBox.style.position = "fixed";
			codeBox.style.right = 5;
			codeBox.style.bottom = 5;
			codeBox.style.width  = 404;
			codeBox.style.height = 175;
			codeBox.style.fontFamily = "Verdana,sans-serif";
			codeBox.style.fontSize = "small";
			root.appendChild(codeBox);
		}

		// Button list
		{
			var buttonListdDock = document.createElement('div');
			buttonListdDock.id = "buttonList";
			buttonListdDock.style.border = "2px solid black";
			buttonListdDock.style.backgroundColor = "white";
			buttonListdDock.style.position = "fixed";
			buttonListdDock.style.overflowY = "auto";
			buttonListdDock.style.overflowX = "hidden";
			buttonListdDock.style.left = "5";
			buttonListdDock.style.top = "5";
			buttonListdDock.style.width  = 180;
			buttonListdDock.style.height = 855;
			root.appendChild(buttonListdDock);

			buttonList = new PropertyGrid(buttonListdDock);
			buttonList.addProperty(undefined, new Button("Select/Move (Q)", function(){setTool("select");}));
			buttonList.addProperty(undefined, new Button("Transform (T)", function(){setTool("transform");}));
			buttonList.addProperty(undefined, new Button("Modify (V)", function(){setTool("modify");}));
			buttonList.addProperty(undefined, new Button("Zoom Extents (F4)", function(){zoomExtents();}));
			buttonList.addProperty(undefined, new Divider());
			buttonList.addProperty(undefined, new Button("Add Wall (W)", function(){setTool("addWall");}));
			buttonList.addProperty(undefined, new Button("Add Arc Wall", function(){setTool("addArcWall");}));
			buttonList.addProperty(undefined, new Button("Add BRDF Ray (B)", function () { setTool("addRay"); }));
			buttonList.addProperty(undefined, new Button("Add Point Light", function () { setTool("addPointLight"); }));
			buttonList.addProperty(undefined, new Button("Add Spot Light", function () { setTool("addSpotLight"); }));
			buttonList.addProperty(undefined, new Button("Add Parallel Light", function () { setTool("addParallelLight"); }));
			buttonList.addProperty(undefined, new Button("Add Camera (C)", function () { setTool("addCamera"); }));
			buttonList.addProperty(undefined, new Button("Add Hemisphere", function () { setTool("addHemisphere"); }));
			buttonList.addProperty(undefined, new Button("Add Line (L)", function () { setTool("addLine"); }));
			buttonList.addProperty(undefined, new Button("Add Rectangle (R)", function () { setTool("addRect"); }));
			buttonList.addProperty(undefined, new Button("Add Circle / NGon (N)", function () { setTool("addNGon"); }));
			buttonList.addProperty(undefined, new Button("Add Bar Chart", function () { setTool("addBarChart"); }));
			buttonList.addProperty(undefined, new Button("Add Dimension (D)", function () { setTool("addDimension"); }));
			buttonList.addProperty(undefined, new Button("Add Text (X)", function(){setTool("addText");}));
			buttonList.addProperty(undefined, new Button("Add Tree", function () { addTree(); }));
			buttonList.addProperty(undefined, new Button("Add Person", function () { addPerson(); }));
			buttonList.addProperty(undefined, new Divider());
			buttonList.addProperty(undefined, new Button("Save to LocalStorage", function () { saveToLocalStorage(); }));
			buttonList.addProperty(undefined, new Button("Load from LocalStorage", function () { loadFromLocalStorage(); }));
			buttonList.addProperty(undefined, new Divider());
			buttonList.addProperty(undefined, new Button("Save as Image", function () { setTool("takeScreenshot"); }));
			buttonList.addProperty(undefined, new Button("Export as JavaScript", function () { saveAsJavascript(); }));
			buttonList.addProperty(undefined, new Button("Export Embeddable", function () { saveAsEmbeddableJavascript(); }));
			buttonList.addProperty(undefined, new Button("Import from JavaScript", function () { loadFromJavascript(); }));
		}

		// File manager
		{
			fileManagerDock = document.createElement('div');
			fileManagerDock.id = "fileManagerDock";
			fileManagerDock.style.border = "2px solid black";
			fileManagerDock.style.backgroundColor = "white";
			fileManagerDock.style.position = "fixed";
			fileManagerDock.style.top = "250";
			fileManagerDock.style.width  = 800;
			fileManagerDock.style.height = 500;
			fileManagerDock.style.left = (window.innerWidth - 800) / 2;
			fileManagerDock.style.overflow = "auto";
			fileManagerDock.style.fontFamily = "Verdana,sans-serif";
			fileManagerDock.style.fontSize = "large";
			fileManagerDock.style.display = "none";
			fileManagerDock.tabIndex = 0;

			fileManagerBox = document.createElement('table');
			fileManagerBox.id = "fileManagerBox";
			fileManagerBox.style.width = "100%";
			fileManagerBox.style.padding = "0";
			fileManagerBox.style.spacing = "0";
			fileManagerBox.style.cellpadding = "0";
			fileManagerBox.style.cellspacing = "0";
			fileManagerBox.style.fontFamily = "Verdana,sans-serif";
			fileManagerBox.style.fontSize = "12px";
			fileManagerBox.onmousedown = function(e)
			{
				if(e.preventDefault) e.preventDefault();
			}

			fileManagerDock.addEventListener('keyup', function(evt)
														{
															if (evt.keyCode==27) // ESC
															{
																fileManagerDock.style.display = "none";
																canvas.focus();
															}
														}, false);

			fileManagerDock.appendChild(fileManagerBox);

			root.appendChild(fileManagerDock);
		}

		// Status bar
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
		root.appendChild(statusBar);

		enableSnap["grid"] = true;
		enableSnap["node"] = true;
		enableSnap["midpoint"] = true;
		enableSnap["intersection"] = true;
		enableSnap["coincident"] = false;
		enableSnap["perpendicular"] = false;
		enableSnap["extendTo"] = false;
		
		scene = new Scene();
		camera = new Camera(canvas);
		
		grid.spacing = 1;
		scene.addObject(new Wall( [new Vector(-10, 10), new Vector(-10, 0), new Vector(10, 0), new Vector(10, 10)] ));
		scene.addObject(new ArcWall(new Vector(0, 10), 10,  0*Math.PI/180, 180*Math.PI/180));
		scene.addObject(new BRDFRay(new Vector(0, 10), new Vector(-3, -5)));
		scene.addObject(new SpotLight(new Vector(0, 10), new Vector(10, 0), 35));

		scene.addChangeListener(onSceneChange);

		camera.setViewPosition(0, 10);

		setSelection([]);

		undoRedoBackupPos = -1;
		undoRedoUndoPos	= -1;
		backup();

		setTool("select");

		setInterval(function () { saveToLocalStorage(true); }, 5000);
	}
	
	function getCanvasProperties()
	{
		var canvasProperties =
		[
			{name: "Scene Name", control: new TextBox(scene.name, true, function (value) { scene.name = value; }) },
			{name: "Show Grid", control: new TickBox(showGrid, function (value) { showGrid = value; layerDirty[0] = true; draw(); }) },
			{name: "Grid Type", control: new Dropdown(["cartesian", "isometric", "radial"], "cartesian", function (value) { grid.type = value; layerDirty[0] = true; draw(); }) },
			{name: "", control: new Divider() },
			{name: "Snap: Grid", control: new TickBox(enableSnap["grid"], function (value) { enableSnap["grid"] = value; }) },
			{name: "Snap: Node", control: new TickBox(enableSnap["node"], function (value) { enableSnap["node"] = value; }) },
			{name: "Snap: Intersection", control: new TickBox(enableSnap["intersection"], function (value) { enableSnap["intersection"] = value; }) },
			{name: "Snap: Midpoint", control: new TickBox(enableSnap["midpoint"], function (value) { enableSnap["midpoint"] = value; }) },
			{name: "Snap: Coincident (O)", control: new TickBox(enableSnap["coincident"], function (value) { enableSnap["coincident"] = value; }) },
			{name: "Snap: Perpendicular (P)", control: new TickBox(enableSnap["perpendicular"], function (value) { enableSnap["perpendicular"] = value; }) },
			{name: "Snap: Extend To (E)", control: new TickBox(enableSnap["extendTo"], function (value) { enableSnap["extendTo"] = value; }) }
		];

		return canvasProperties;
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
			else if (tool == "addArcWall" || tool == "addRay" || tool == "addPointLight" || tool == "addSpotLight" || tool == "addParallelLight" || tool == "addCamera" || tool == "addRect" || tool == "addHemisphere" || tool == "addNGon" || tool == "addDimension" || tool == "addBarChart" || tool == "takeScreenshot" || tool == "addText")
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
			statusBar.innerHTML = "MODIFY: Click to select and move drag points. Ctrl restricts movement to object local space. Snaps are ON by default. Use Alt to move freely.";
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
			setSelection([]);
			draw();
		}
		else if (newTool == "addRay" || newTool == "addSpotLight" || newTool == "addParallelLight" || newTool == "addCamera" || newTool == "addBarChart" || newTool == "addText")
		{
			if (tool != newTool)
			{
				mode = null;
			}

			tool = newTool;
			mouseCursor.shape = "cross";
			statusBar.innerHTML = newTool + ": Click to set direction. ESC to terminate. Snaps are ON by default. Use Alt to move freely.";
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
			setSelection([]);
			draw();
		}
		else if (newTool == "addPointLight"  || newTool == "addRect" || newTool == "addHemisphere" || newTool == "addNGon" || newTool == "addDimension" || newTool == "takeScreenshot")
		{
			if (tool != newTool)
			{
				mode = null;
			}

			tool = newTool;
			mouseCursor.shape = "cross";
			statusBar.innerHTML = newTool + " : Click to add. ESC to terminate. Snaps are ON by default. Use Alt to move freely.";
			setSelection([]);

			if (newTool == "addHemisphere")
			{
				previousCoincidentEnabled = enableSnap["coincident"];
				enableSnap["coincident"] = true;
				undoRedoSuspendBackup = true;
				objectBeingMade = new Hemisphere(new Vector(1000, 1000), 5, new Vector(0,1));
				scene.addObject(objectBeingMade);
				undoRedoSuspendBackup = false;
			}

			draw();
		}
	}

	function onKeyDown(evt)
	{
		if (evt.keyCode == lastKeyPress)
			return;

		var handled = true;

		if (evt.keyCode==27) // ESC
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

			setTool("cancel");
			draw();
		}
		else if (evt.keyCode==13) // Enter
		{
			if (selectionList[0] instanceof ScreenshotArea)
			{
				saveAsImage();
				setTool("cancel");
				draw();
			}
		}
		else if (evt.ctrlKey && evt.keyCode==65) // Ctrl+A
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
		else if (evt.ctrlKey && evt.keyCode==67) // Ctrl+C
		{
			clipboardCopy();
		}
		else if (evt.ctrlKey && evt.keyCode==86) // Ctrl+V
		{
			clipboardPaste();
		}
		else if (evt.ctrlKey && evt.keyCode==71) // Ctrl+G
		{
			groupSelection();
		}
		else if (evt.keyCode == 79 && evt.ctrlKey == 1) // Ctrl + O
		{
			loadFromLocalStorage();
		}
		else if (evt.keyCode == 83 && evt.ctrlKey == 1) // Ctrl + S
		{
			saveToLocalStorage();
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
	
	function onContextMenu(evt)
	{
		//if (tool == "transform")
		//	return false;

		return true;
	}

	function onKeyUp(evt)
	{
		if (evt.keyCode == 16 && tool == "modify") // shift
		{
			mouseCursor.shape = "angle";
			draw();
		}
		else if (evt.keyCode == 90 && evt.ctrlKey == 1 && evt.shiftKey == 0) // Ctrl + Z
		{
			undo();
		}
		else if (evt.keyCode == 90 && evt.ctrlKey == 1 && evt.shiftKey == 1) // Ctrl + Shift + Z
		{
			redo();
		}
		else if (evt.keyCode == 89 && evt.ctrlKey == 1) // Ctrl + Y
		{
			redo();
		}
		else if (evt.keyCode == 115) // F4
		{
			zoomExtents();
		}
	
		lastKeyPress = undefined;
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

				if (s.length == 0)
				{
					var snapPoint = scene.getSnapPoint(lastMousePos, [], camera.invScale(30), [objectBeingMade], enableSnap);

					if (snapPoint !== null && snapPoint.object != undefined)
					{
						if (!snapPoint.object.isFrozen() && snapPoint.object.isVisible())
						{
							s.push(snapPoint.object);
						}
					}
				}

				if (s.length == 0)
				{
					mode = "marquee";
				}
				else
				{
		    		mode = "selection";

					if (evt.altKey == 0)
					{
						var snapPoint = scene.getSnapPoint(lastMousePos, camera.getSnapPoints(lastMousePos), camera.invScale(30), [], enableSnap);

						if (snapPoint !== null)
						{
							dragStartMousePos = snapPoint.p.copy();
						}
						else
						{
							dragStartMousePos = grid.getSnapPoint(dragStartMousePos);
						}
					}

		    		if (selectionList.indexOf(s[0])==-1 && evt.ctrlKey==0)
					{
						setSelection(s);
		    		}

		    		moveOffsets = [];

		    		for (var i = 0; i < selectionList.length; ++i)
		    		{
		    			if (selectionList[i].getOrigin !== undefined)
						{
		    				moveOffsets.push(sub(selectionList[i].getOrigin(), dragStartMousePos));
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

					if (dragPoint.object instanceof Hemisphere && dragPoint.index==0)
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

	function onMouseUp(evt)
	{
		if (showingModal)
		{
			if (evt.button == 0) // object move or marquee
			{
				fileManagerDock.style.display = "none";
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

					if ((sub(dragStartMousePos, lastMousePos)).length() < threshold)
					{
						s = scene.hitTest(sub(lastMousePos, threshold), add(lastMousePos, threshold));

						if (s.length == 0)
						{
							var snapPoint = scene.getSnapPoint(lastMousePos, [], camera.invScale(30), [objectBeingMade], enableSnap);

							if (snapPoint !== null && snapPoint.object != undefined)
							{
								if (!snapPoint.object.isFrozen() && snapPoint.object.isVisible())
								{
									s.push(snapPoint.object);
								}
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

							if (dragPoint.object instanceof Wall)
							{
								if (dragPoint.object.getDragPoints(false).length < 2)
								{
									scene.deleteObjects([dragPoint.object]);
								}
							}

							draw();
						}
					}
				}
				else
				{
					if (dragPoint.point !== null && dragPoint.object instanceof Hemisphere && dragPoint.index==0)
					{
						enableSnap["coincident"] = previousCoincidentEnabled;
					}
				}

				backup();
				mode = null;
			}
			else if (tool == "addWall" || tool == "addArcWall" || tool == "addRay" || tool == "addPointLight" || tool == "addSpotLight" || tool == "addParallelLight" || tool == "addCamera" || tool == "addLine" || tool == "addRect" || tool == "addHemisphere" || tool == "addNGon" || tool == "addDimension" || tool == "addBarChart" || tool == "takeScreenshot" || tool == "addText")
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
						snapPos = grid.getSnapPoint(lastMousePos);
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
				else if (tool == "addPointLight")
				{
					objectBeingMade = new PointLight(newPoint.copy(), 5);
					scene.addObject(objectBeingMade);
					setTool("select");
					setSelection([scene.objects[scene.objects.length-1]]);
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

		canvas.focus();
		undoRedoSuspendBackup = true;

		draw();

		lastMousePos = camera.getMousePos(evt);
		lastMousePosPixels = getMousePos(evt, canvas);

		mouseCursor.pos = camera.getMousePos(evt);
	
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
			else if (tool == "addWall" || tool == "addArcWall" || tool == "addRay" || tool == "addSpotLight" || tool == "addParallelLight" || tool == "addCamera" || tool == "addLine" || tool == "addRect" || tool == "addHemisphere" || tool == "addNGon" || tool == "addDimension" || tool == "addBarChart" || tool == "takeScreenshot" || tool == "addText")
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
						newPoint = grid.getSnapPoint(lastMousePos);
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
				else if (tool == "addArcWall")
				{
					if (objectBeingMade !== undefined)
					{
						objectBeingMade.setDragPointPos(0, newPoint);
					}
				}
				else if (tool == "addRay" || tool == "addSpotLight" || tool == "addParallelLight" || tool == "addCamera" || tool == "addBarChart" || tool == "addText")
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
				else if (tool == "addNGon")
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
							}
						}
					}

					snapPoint = scene.getSnapPoint(lastMousePos, camera.getSnapPoints(lastMousePos, previousMousePos, mouseDir), camera.invScale(30), ignoreList, enableSnap);

					if (snapPoint !== null)
					{
						drawSnapPoint(snapPoint);
						lastMousePos = snapPoint.p.copy();
					}
					else
					{
						lastMousePos = grid.getSnapPoint(lastMousePos);
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
					else if (dragPoint.object instanceof Hemisphere && dragPoint.index==0)
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
		else if (evt.buttons & 4) // camera pan
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

		if (camera.scale(grid.spacing) < 10)
			grid.spacing *= 10;
		else if (camera.scale(grid.spacing) > 100)
			grid.spacing /= 10;


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

		if (camera.scale(grid.spacing) < 10)
			grid.spacing *= 10;
		else if (camera.scale(grid.spacing) > 100)
			grid.spacing /= 10;

		draw();
	}

	function setSelection(s)
	{
		layerDirty[1] = true;
		layerDirty[2] = true;

		if (s.length == 1 && s[0] instanceof TransformRect)
		{
			return;
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

		camera.getGraphics().drawText(new Vector(5, window.innerHeight - 50), (1000 / (t1 - t0)).toFixed(0) + " FPS", "#909090", "left");
		camera.getGraphics().drawText(new Vector(5, window.innerHeight - 75), "xy: " + lastMousePos.x.toFixed(2) + ", " + lastMousePos.y.toFixed(2), "#909090", "left");
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

	function saveAsImage()
	{
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

		var popoutCamera = new Camera(popoutCanvas1);
		popoutCamera.setViewPosition(cameraPos.x, cameraPos.y);
		popoutCamera.setUnitScale(unitToCm * cmToInches * DPI);

		// draw
		{
			popoutCamera.clear();

			if (showGrid)
			{
				popoutGrid.draw(popoutCamera);
			}

			scene.draw(popoutCamera);
		}

		var popoutCanvas = popoutCanvas1;

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

		var img = popoutCanvas.toDataURL("image/png");
		var popup = window.open();
		popup.document.write("<style>@media print { @page { margin: 0; } }</style>");
		popup.document.write("<div style=\"text-align: center; margin: 2cm auto auto auto\">");
		popup.document.write("<div style=\"display: inline-block;\">");
		popup.document.write("<img style=\"width: " + imgWidthCm * screenshotObj.copiesColumns + "cm; height: " + imgHeightCm * screenshotObj.copiesRows + "cm\" src=\"" + img + "\"/>");
		popup.document.write("</div>");
		popup.document.write("</div>");
	}

	function saveAsEmbeddableJavascript()
	{
		var popup = window.open();

		var center = avg(scene.getBoundsMin(), scene.getBoundsMax());
		var extents = sub(scene.getBoundsMax(), scene.getBoundsMin());

		var divWidth = 800;
		var divHeight = 800 * extents.y / extents.x;

		popup.document.write("<body>\n");
		popup.document.write("\n");
		popup.document.write("<script type=\"text/javascript\" src=\"lib/maths.js\"></script>\n");
		popup.document.write("<script type=\"text/javascript\" src=\"lib/graphics.js\"></script>\n");
		popup.document.write("<script type=\"text/javascript\" src=\"lib/camera.js\"></script>\n");
		popup.document.write("<script type=\"text/javascript\" src=\"lib/scene.js\"></script>\n");
		popup.document.write("<script type=\"text/javascript\" src=\"lib/sceneObjects.js\"></script>\n");
		popup.document.write("<script type=\"text/javascript\" src=\"lib/brdf.js\"></script>\n");
		popup.document.write("<script type=\"text/javascript\" src=\"lib/ui.js\"></script>\n");
		popup.document.write("\n");
		popup.document.write("<script type=\"text/javascript\" src=\"diagrams/embeddedDrawing.js\"></script>\n");
		popup.document.write("\n");
		popup.document.write("<div id=\"embeddedDrawing\" style=\"width: " + divWidth + "px; height: " + divHeight + "px; margin:0 auto; border:1px solid black;\"/>\n");
		popup.document.write("\n");
		popup.document.write("<script>\n");
		popup.document.write("var embeddedObj = new EmbeddedDrawing(\"embeddedDrawing\");\n");
		popup.document.write("\n");
		popup.document.write("var scene = embeddedObj.getScene();\n");
		popup.document.write("\n");
		popup.document.write(scene.saveAsJavascript());
		popup.document.write("embeddedObj.zoomExtents();\n");
		popup.document.write("</script>\n");
		popup.document.write("\n");
		popup.document.write("</body>\n");
	}

	function saveAsJavascript()
	{
		var str = "";

		str += "scene.name = \"" + scene.name + "\";\n";
		str += camera.saveAsJavascript();
		str += "\n\n";
		str += scene.saveAsJavascript();

		codeBox.value = str;
	}

	function loadFromJavascript(str)
	{
		if (str === undefined)
			str = codeBox.value;

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
		}
	}

	function saveToLocalStorage(autoSave)
	{
		if (typeof (Storage) === "undefined")
			return;

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

		var str = "";


		str += "scene.name = \"" + sceneName + "\";\n";
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
				popoutCamera.clear();

				if (showGrid)
				{
					popoutGrid.draw(popoutCamera);
				}

				scene.draw(popoutCamera);
			}

			thumbnailData = popoutCanvas.toDataURL("image/png");
		}

		localStorage.setItem("savedScene:" + sceneName, sceneName);
		localStorage.setItem("sceneCode:" + sceneName, str);
		localStorage.setItem("sceneDate:" + sceneName, (new Date()).toString());
		localStorage.setItem("sceneThumbnail:" + sceneName, thumbnailData);

		if (!autoSave)
		{
			undoRedoLastSavePos	= undoRedoBackupPos;
		}
	}

	function loadFromLocalStorage()
	{
		if (typeof (Storage) === "undefined")
			return;

		showingModal = true;

		canvas.blur();
		fileManagerDock.style.display = "block";
		fileManagerDock.focus();

		// populate list
		{
			while(fileManagerBox.rows[0]) fileManagerBox.deleteRow(0);

			var sceneList = [];

			for (var i = 0; i != localStorage.length; ++i)
			{
				var key = localStorage.key(i);

				if (key.startsWith("savedScene:"))
				{
					sceneList.push( localStorage.getItem(key) );
				}
			}

			for (var i=0; i!=sceneList.length; ++i)
			{
				var row = fileManagerBox.insertRow();
				var imageCell = row.insertCell();
				var detailsCell = row.insertCell();

				detailsCell.style.verticalAlign = "top";
				var detailsName = document.createElement("div");
				var detailsNameEdit = document.createElement("input");
				var detailsDate = document.createElement("div");
				var detailsButtons = document.createElement("div");
				detailsCell.appendChild(detailsName);
				detailsCell.appendChild(detailsNameEdit);
				detailsCell.appendChild(detailsDate);
				detailsCell.appendChild(detailsButtons);

				detailsName.style.fontFamily = "Verdana,sans-serif";
				detailsName.style.fontSize = "large";
				detailsName.style.textAlign = "center";
				detailsName.style.display = "block";
				detailsName.innerHTML = sceneList[i];
				detailsName.ondblclick = function()
											{
												detailsName.style.display = "none";
												detailsNameEdit.style.display = "block";
												detailsNameEdit.focus();
											}

				detailsNameEdit.type = "text";
				detailsNameEdit.style.display = "none";
				detailsNameEdit.style.fontFamily = "Verdana,sans-serif";
				detailsNameEdit.style.fontSize = "large";
				detailsNameEdit.style.textAlign = "center";
				detailsNameEdit.value = sceneList[i];

				detailsNameEdit.addEventListener('blur', function ()
															{
																detailsName.style.display = "block";
																detailsNameEdit.style.display = "none";
																fileManagerDock.focus();
															});

				detailsNameEdit.addEventListener('keypress', function (evt)
															{
																if (evt.keyCode == 13)
																{
																	detailsName.style.display = "block";
																	detailsNameEdit.style.display = "none";

																	var oldName = this;
																	var newName = detailsNameEdit.value;

																	detailsName.innerHTML = newName;

																	localStorage.setItem("savedScene:" + newName, newName);
																	localStorage.setItem("sceneCode:" + newName, localStorage.getItem("sceneCode:" + oldName));
																	localStorage.setItem("sceneDate:" + newName, localStorage.getItem("sceneDate:" + oldName));
																	localStorage.setItem("sceneThumbnail:" + newName, localStorage.getItem("sceneThumbnail:" + oldName));

																	localStorage.removeItem("savedScene:" + oldName);
																	localStorage.removeItem("sceneCode:" + oldName);
																	localStorage.removeItem("sceneDate:" + oldName);
																	localStorage.removeItem("sceneThumbnail:" + oldName);
																}
															}.bind(sceneList[i]) );

				var dateStr = localStorage.getItem( "sceneDate:" + sceneList[i] );
				var sceneDate = new Date(dateStr);
				detailsDate.innerHTML = sceneDate.toLocaleString();
				detailsDate.style.textAlign = "center";

				var deleteIcon = document.createElement("div");
				detailsButtons.appendChild(deleteIcon);

				deleteIcon.innerHTML = "Delete";
				deleteIcon.style.width = 50;
				deleteIcon.style.height = 15;
				deleteIcon.style.border = "1px solid black";
				deleteIcon.style.backgroundColor = "#FF0000";
				deleteIcon.onmouseup = function ()
					{
						var sceneName = this;

						if (confirm("Are you sure you want to delete '" + sceneName + "'") == true)
						{
							
							localStorage.removeItem("savedScene:" + sceneName);
							localStorage.removeItem("sceneCode:" + sceneName);
							localStorage.removeItem("sceneDate:" + sceneName);
							localStorage.removeItem("sceneThumbnail:" + sceneName);
						}

						fileManagerDock.style.display = "none";
						showingModal = false;
						loadFromLocalStorage();

					}.bind(sceneList[i]);

				imageCell.style.width = 256;
				imageCell.style.border = "1px solid black";
				imageCell.ondblclick = function()
					{
						var sceneName = this;
						
						var sceneCode = localStorage.getItem("sceneCode:" + sceneName);
						loadFromJavascript(sceneCode);

						fileManagerDock.style.display = "none";
						showingModal = false;

					}.bind(sceneList[i]);

				var thumbnail = document.createElement("img");

				thumbnail.src = localStorage.getItem( "sceneThumbnail:" + sceneList[i] );

				imageCell.appendChild(thumbnail);
			}
		}
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
		while(objectList.rows[0]) objectList.deleteRow(0);

		for (var i=0; i!=scene.objects.length; ++i)
		{
			if (scene.objects[i] instanceof TransformRect)
				continue;

			var row = objectList.insertRow();
			var nameCell = row.insertCell();
			var visibilityCell = row.insertCell();
			var frozenCell = row.insertCell();

			visibilityCell.style.width = 15;
			frozenCell.style.width = 15;

			visibilityCell.style.border = "1px solid black";
			frozenCell.style.border = "1px solid black";

			visibilityCell.style.backgroundColor = scene.objects[i].isVisible() ? "#00C0FF" : "#FFFFFF";
			frozenCell.style.backgroundColor = scene.objects[i].isFrozen() ? "#606060" : "#FFFFFF";

			nameCell.style.cursor = "pointer";

			nameCell.onmouseup = function (evt)
			{
				if (evt.shiftKey)
				{
					var index0 = this.scene.getObjectIndex(selectionList[selectionList.length - 1]);
					var index1 = this.scene.getObjectIndex(this);

					var firstIndex = Math.min(index0, index1);
					var lastIndex = Math.max(index0, index1);

					for (var i=firstIndex; i<=lastIndex; ++i)
					{
						var obj = this.scene.objects[i];

						if (selectionList.indexOf(obj) < 0)
						{
							var s = selectionList.concat(obj);
							setSelection(s);
						}
					}
				}
				else if (evt.ctrlKey)
				{
					var index = selectionList.indexOf(this);

					if (index >= 0)
					{
						var s = selectionList.concat([]);
						s.splice(index, 1);
						setSelection(s);
					}
					else
					{
						var s = selectionList.concat(this);
						setSelection(s);
					}
				}
				else
				{
					setSelection([this]);
				}

			}.bind(scene.objects[i]);

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

			var str = scene.objects[i].constructor.name;

			if (scene.objects[i].selected)
				str = str.bold();

			nameCell.innerHTML = str;
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
				if (evt.ctrlKey)
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

		if (evt.ctrlKey)
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
				if (evt.ctrlKey)
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

	function setSelectionVisible(vis)
	{
		for (var i = 0; i != selectionList.length; ++i)
		{
			var obj = selectionList[i];
			obj.toggleVisibility(vis);
		}
	}

	function setSelectionFrozen(freeze)
	{
		for (var i = 0; i != selectionList.length; ++i)
		{
			var obj = selectionList[i];
			obj.toggleFrozen(freeze);
		}
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

	setup();
	updateObjectList();
	draw();
}
