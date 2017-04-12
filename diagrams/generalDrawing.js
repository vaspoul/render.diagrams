function GeneralDrawingTest(docTag)
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
	var moveOffsets				= [];
	var dragPoint				= null;
	var objectBeingMade			= undefined;
	var lastKeyPress;
	var enableSnap				= [];

	var showGrid				= true;

	var undoRedoBuffer			= [];
	var undoRedoMaxCount		= 64;
	var undoRedoBackupPos		= 0;
	var undoRedoUndoPos			= 0;
	var undoRedoSuspendBackup	= false;

	var clipboardText			= "";

	window.addEventListener("resize", onResize);

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

			draw();
		}
	}

	function setup()
	{
		var root = document.getElementById(docTag);

		// Main canvas
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
		canvas.onwheel = onMouseWheel;
		canvas.tabIndex = -1;
		canvas.focus();
		root.appendChild(canvas);

		// Property grid
		var propertyGridDock = document.createElement('div');
		propertyGridDock.id = "propertyGrid";
		propertyGridDock.style.border = "2px solid black";
		propertyGridDock.style.backgroundColor = "white";
		propertyGridDock.style.position = "fixed";
		propertyGridDock.style.right = "5";
		propertyGridDock.style.top = "5";
		propertyGridDock.style.width  = 400;
		propertyGridDock.style.height = 200;
		propertyGridDock.style.fontFamily = "Verdana,sans-serif";
		propertyGridDock.style.fontSize = "large";
		propertyGridDock.style.overflow = "auto";

		root.appendChild(propertyGridDock);

		propertyGrid = new PropertyGrid(propertyGridDock);

		// Object list
		var objectListDock = document.createElement('div');
		objectListDock.id = "objectList";
		objectListDock.style.border = "2px solid black";
		objectListDock.style.backgroundColor = "white";
		objectListDock.style.position = "fixed";
		objectListDock.style.right = "5";
		objectListDock.style.top = "215";
		objectListDock.style.width  = 400;
		objectListDock.style.height = 500;


		var objectListDockScrollable = document.createElement('div');
		objectListDockScrollable.style.position = "fixed";
		objectListDockScrollable.style.overflow = "auto";
		objectListDockScrollable.style.backgroundColor = "white";
		objectListDockScrollable.style.position = "fixed";
		objectListDockScrollable.style.width  = 400;
		objectListDockScrollable.style.height = 470;
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
		buttonArea.style.top = 470;
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


		// Code box
		codeBox = document.createElement('textarea');
		codeBox.id = "codeBox";
		codeBox.style.border = "2px solid black";
		codeBox.style.backgroundColor = "white";
		codeBox.style.position = "fixed";
		codeBox.style.right = 5;
		codeBox.style.bottom = 5;
		codeBox.style.width  = 404;
		codeBox.style.height = 250;
		codeBox.style.fontFamily = "Verdana,sans-serif";
		codeBox.style.fontSize = "small";
		root.appendChild(codeBox);

		// Button list
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
		buttonListdDock.style.height = 740;
		root.appendChild(buttonListdDock);

		buttonList = new PropertyGrid(buttonListdDock);
		buttonList.addProperty(undefined, new Button("Select (Q)", function(){setTool("select");}));
		buttonList.addProperty(undefined, new Button("Zoom Extents (F4)", function(){zoomExtents();}));
		buttonList.addProperty(undefined, new Button("Modify (V)", function(){setTool("modify");}));
		buttonList.addProperty(undefined, new Button("Add Wall (W)", function(){setTool("addWall");}));
		buttonList.addProperty(undefined, new Button("Add Arc Wall", function(){setTool("addArcWall");}));
		buttonList.addProperty(undefined, new Button("Add BRDF Ray (B)", function () { setTool("addRay"); }));
		buttonList.addProperty(undefined, new Button("Add Point Light", function () { setTool("addPointLight"); }));
		buttonList.addProperty(undefined, new Button("Add Spot Light", function () { setTool("addSpotLight"); }));
		buttonList.addProperty(undefined, new Button("Add Parallel Light", function () { setTool("addParallelLight"); }));
		buttonList.addProperty(undefined, new Button("Add Camera", function () { setTool("addCamera"); }));
		buttonList.addProperty(undefined, new Button("Add Hemisphere", function () { setTool("addHemisphere"); }));
		buttonList.addProperty(undefined, new Divider());
		buttonList.addProperty(undefined, new Button("Add Line (L)", function () { setTool("addLine"); }));
		buttonList.addProperty(undefined, new Button("Add Rectangle (R)", function () { setTool("addRect"); }));
		buttonList.addProperty(undefined, new Button("Add Circle / NGon (C)", function () { setTool("addNGon"); }));
		buttonList.addProperty(undefined, new Button("Add Bar Chart", function () { setTool("addBarChart"); }));
		buttonList.addProperty(undefined, new Button("Add Dimension (D)", function () { setTool("addDimension"); }));
		buttonList.addProperty(undefined, new Button("Add Tree", function () { addTree(); }));
		buttonList.addProperty(undefined, new Button("Add Person", function () { addPerson(); }));
		buttonList.addProperty(undefined, new Divider());
		//buttonList.addProperty(undefined, new Button("Save as Image", function () { saveAsImage(); }));
		buttonList.addProperty(undefined, new Button("Save as JavaScript", function () { saveAsJavascript(); }));
		buttonList.addProperty(undefined, new Button("Load from JavaScript", function () { loadFromJavascript(); }));


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
	}
	
	function getCanvasProperties()
	{
		var canvasProperties =
		[
			{name: "Show Grid", control: new TickBox(showGrid, function (value) { showGrid = value; draw(); }) },
			{name: "Grid Type", control: new Dropdown(["cartesian", "isometric", "radial"], "cartesian", function (value) { grid.type = value; draw(); }) },
			{name: "", control: new Divider() },
			{name: "Snap: Grid", control: new TickBox(enableSnap["grid"], function (value) { enableSnap["grid"] = value; }) },
			{name: "Snap: Node", control: new TickBox(enableSnap["node"], function (value) { enableSnap["node"] = value; }) },
			{name: "Snap: Intersection", control: new TickBox(enableSnap["intersection"], function (value) { enableSnap["intersection"] = value; }) },
			{name: "Snap: Midpoint", control: new TickBox(enableSnap["midpoint"], function (value) { enableSnap["midpoint"] = value; }) },
			{name: "Snap: Coincident (O)", control: new TickBox(enableSnap["coincident"], function (value) { enableSnap["coincident"] = value; }) },
			{name: "Snap: Perpendicular (P)", control: new TickBox(enableSnap["perpendicular"], function (value) { enableSnap["perpendicular"] = value; }) }
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
			else if (tool == "addArcWall" || tool == "addRay" || tool == "addPointLight" || tool == "addSpotLight" || tool == "addParallelLight" || tool == "addCamera" || tool == "addRect" || tool == "addHemisphere" || tool == "addNGon" || tool == "addDimension" || tool == "addBarChart")
			{
				if (objectBeingMade !== undefined)
				{
					scene.deleteObjects([objectBeingMade]);
					delete objectBeingMade;
					setSelection([]);
				}
			}

			newTool = "select";
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
		else if (newTool == "addRay")
		{
			if (tool != "addRay")
			{
				mode = null;
			}

			tool = "addRay";
			mouseCursor.shape = "cross";
			statusBar.innerHTML = "Add Ray: Click to add points. ESC to terminate. Snaps are ON by default. Use Alt to move freely.";
			setSelection([]);
			draw();
		}
		else if (newTool == "addPointLight" || newTool == "addSpotLight" || newTool == "addParallelLight" || newTool == "addCamera" || newTool == "addRect" || newTool == "addHemisphere" || newTool == "addNGon" || newTool == "addDimension" || newTool == "addBarChart")
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
			else
			{
				setSelection([]);
			}

			setTool("cancel");
			draw();
		}
		else if (evt.ctrlKey && evt.keyCode==65) // Ctrl+A
		{
			evt.preventDefault();
			var s = []

			for (var i = 0; i != scene.objects.length; ++i)
			{
				if (!scene.objects[i].isFrozen())
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
		else if (evt.keyCode==81) // q
		{
			setTool("select");
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
		else if (evt.keyCode==82) // R
		{
			setTool("addRect");
		}
		else if (evt.keyCode==67) // C
		{
			setTool("addNGon");
		}
		else if (evt.keyCode==87) // W
		{
			setTool("addWall");
		}
		else if (evt.keyCode==66) // B
		{
			setTool("addRay");
		}
		else if (evt.keyCode==46) // del
		{
			if (tool == "select")
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
		else
		{
			handled = false;
		}

		if (handled)
			evt.preventDefault();

		lastKeyPress = evt.keyCode;
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
			else if (tool == "modify")
			{
				dragPoint = scene.getDragPoint(lastMousePos, camera.invScale(30), evt.ctrlKey);

				mode = null;

				if (dragPoint.point !== null)
				{
					mode = "move";
					dragStartMousePos = dragPoint.point;
				}
			}
		}

		draw();
	}

	function onMouseUp(evt)
	{
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
					dragPoint = scene.getDragPoint(lastMousePos, camera.invScale(30), evt.ctrlKey);

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

				backup();
				mode = null;
			}
			else if (tool == "addWall" || tool == "addArcWall" || tool == "addRay" || tool == "addPointLight" || tool == "addSpotLight" || tool == "addParallelLight" || tool == "addCamera" || tool == "addLine" || tool == "addRect" || tool == "addHemisphere" || tool == "addNGon" || tool == "addDimension" || tool == "addBarChart")
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
				else if (tool == "addPointLight")
				{
					objectBeingMade = new PointLight(newPoint.copy(), 5);
					scene.addObject(objectBeingMade);
					setTool("select");
					setSelection([scene.objects[scene.objects.length-1]]);
				}
				else if (tool == "addHemisphere")
				{
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
					}
					else
					{
						objectBeingMade.setDragPointPos(1, newPoint);
						setTool("select");
						setSelection([scene.objects[scene.objects.length-1]]);
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

				backup();
			}
		}

		lastMouseUpPos = lastMousePos;
	}

	function onMouseMove(evt)
	{
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
			else if (tool == "modify")
			{
				var newDragPoint = scene.getDragPoint(lastMousePos, camera.invScale(30), evt.ctrlKey);

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
			else if (tool == "addWall" || tool == "addArcWall" || tool == "addRay" || tool == "addSpotLight" || tool == "addParallelLight" || tool == "addCamera" || tool == "addLine" || tool == "addRect" || tool == "addHemisphere" || tool == "addNGon" || tool == "addDimension" || tool == "addBarChart")
			{
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
					}
				}
				else if (tool == "addArcWall")
				{
					if (objectBeingMade !== undefined)
					{
						objectBeingMade.setDragPointPos(0, newPoint);
					}
				}
				else if (tool == "addRay" || tool == "addSpotLight" || tool == "addParallelLight" || tool == "addCamera" || tool == "addDimension" || tool == "addBarChart")
				{
					if (objectBeingMade !== undefined)
					{
						objectBeingMade.setDragPointPos(1, newPoint);
					}
				}
				else if (tool == "addRect")
				{
					if (objectBeingMade !== undefined)
					{
						objectBeingMade.setDragPointPos(2, newPoint);
					}
				}
				else if (tool == "addNGon")
				{
					if (objectBeingMade !== undefined)
					{
						objectBeingMade.setDragPointPos(-1, newPoint);
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
				if (evt.altKey == 0)
				{
					var ignoreList;

					if (tool == "select")
						ignoreList = selectionList.concat([]);
					else
						ignoreList = [dragPoint.object];

					var snapPoint = scene.getSnapPoint(lastMousePos, camera.getSnapPoints(lastMousePos), camera.invScale(30), ignoreList, enableSnap);

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
					camera.drawRectangle(dragStartMousePos, lastMousePos, "#000000", 1, [5,5]);
				}
				else if (mode == "selection" || mode == "move" ) // object move
				{
					mode = "move";
				
		    		for (var i = 0; i < selectionList.length; ++i)
		    		{
		    			if (selectionList[i].getOrigin !== undefined)
		    			{
		    				selectionList[i].setOrigin(add(lastMousePos, moveOffsets[i]));
		    			}
					}
				}
			}
			else if (tool == "modify")
			{
				if (mode === "move")
				{
					dragPoint.object.setDragPointPos(dragPoint.index, lastMousePos, evt.ctrlKey);
				}
			}
		}
		else if (evt.buttons & 4) // camera pan
		{
			var delta = div(sub(lastMousePosPixels, dragStartMousePosPixels), new Vector(-camera.getUnitScale(), camera.getUnitScale()));
			var P = add(dragStartCamPos, delta);
			camera.setViewPosition(P.x, P.y);
		}

		undoRedoSuspendBackup = false;
	}

	function onMouseWheel(evt)
	{
		lastMousePosPixels = camera.getMousePos(evt);

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

		updateObjectList();
		draw();
	}
	
	function draw()
	{
		var t0 = performance.now();

		camera.clear();

		if (showGrid)
		{
			grid.draw(camera);
		}

		scene.draw(camera);
		mouseCursor.draw(camera);

		// Selection bounding box
		if (selectionList.length>0)
		{
			var boundsMin = new Vector(100000,100000);
			var boundsMax = new Vector(-100000,-100000);

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

		var t1 = performance.now();

		camera.getGraphics().drawText(new Vector(5, window.innerHeight - 50), (1000 / (t1 - t0)).toFixed(0) + " FPS", "#909090", "left");
		camera.getGraphics().drawText(new Vector(5, window.innerHeight - 75), "xy: " + lastMousePos.x.toFixed(2) + ", " + lastMousePos.y.toFixed(2), "#909090", "left");
		//camera.getGraphics().drawText(new Vector(5, window.innerHeight - 100), "UndoPos: " + undoRedoUndoPos + ", BackupPos: " + undoRedoBackupPos, "#909090", "left");
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
			points.push( points[0] );

			camera.drawLineStrip(points, "#0084e0", 2);
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
			//points.push( points[0] );

			//camera.drawLineStrip(points, "#0084e0", 2);
			//camera.drawRectangle(p, camera.invScale(1), "#0084e0", 1);
		}
		else
		{
			camera.drawRectangle(snapPoint.p, camera.invScale(10), "#0084e0", 2);
		}
	}

	function saveAsImage()
	{
		//mouseCursor.hide = true;
		//draw();
		//var img = canvas.toDataURL("image/png");
		//mouseCursor.hide = false;
		//var popup = window.open();
		//popup.document.write('<img src="' + img + '"/>');

		//var popup = window.open("", "", "width=512, height=512, resizable=0, menubar=0, scrollbars=0, status=0, titlebar=0, toolbar=0, location=0", false);
		var popup = window.open();

		popup.blur();
		window.focus();

		popup.document.write('<body><div id=\"drawingImage\"/></body>');

		var popupRoot = popup.document.getElementById("drawingImage");

		var popoutCanvas = popup.document.createElement('canvas');
		popoutCanvas.width = popup.innerWidth;
		popoutCanvas.height = popup.innerHeight;
		popoutCanvas.style.position = "fixed";
		popoutCanvas.style.left = "0";
		popoutCanvas.style.top = "0";
		popupRoot.appendChild(popoutCanvas);
		
		var popoutGrid = new Grid()
		popoutGrid.spacing = grid.spacing;

		var popoutCamera = new Camera(popoutCanvas);
		popoutCamera.setViewPosition(0, 0);

		// draw
		{
			popoutCamera.clear();

			if (showGrid)
			{
				popoutGrid.draw(popoutCamera);
			}

			scene.draw(popoutCamera);
		}
	}

	function saveAsJavascript()
	{
		var str = "";

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
			//scene.addObject(grid);
			eval(str);
			draw();
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


			visibilityCell.onmouseup = function() { this.toggleVisibility(); }.bind(scene.objects[i]);
			frozenCell.onmouseup = function() { this.toggleFrozen(); }.bind(scene.objects[i]);

			var str = scene.objects[i].constructor.name;

			if (scene.objects[i].selected)
				str = str.bold();

			nameCell.innerHTML = str;
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

	setup();
	updateObjectList();
	draw();
}
