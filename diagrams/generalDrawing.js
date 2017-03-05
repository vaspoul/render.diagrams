function GeneralDrawingTest(docTag)
{
	var canvas;
	var propertyGrid;
	var buttonList;
	var objectList;
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
	
	var canvasProperties		= [];
	var showGrid				= true;

	var undoRedoBuffer			= [];
	var undoRedoMaxCount		= 64;
	var undoRedoBackupPos		= 0;
	var undoRedoUndoPos			= 0;
	var undoRedoSuspendBackup	= false;

	function setup()
	{
		var root = document.getElementById(docTag);

		// Main canvas
		canvas = document.createElement('canvas');
		canvas.width  = window.innerWidth;
		canvas.height = window.innerHeight;
		//canvas.style.border = "2px solid black";
		//canvas.style.marginLeft = 20;
		//canvas.style.marginRight = 20;
		canvas.style.position = "fixed";
		canvas.style.left = "0";
		canvas.style.top = "0";
		canvas.style.cursor = "none";
		canvas.addEventListener('mousemove', onMouseMove, false);
		canvas.addEventListener('mousedown', onMouseDown, false);
		canvas.addEventListener('mouseup', onMouseUp, false);
		document.addEventListener('keydown', onKeyDown, false);
		document.addEventListener('keyup', onKeyUp, false);
		canvas.onwheel = onMouseWheel;
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
		objectListDock.style.fontFamily = "Verdana,sans-serif";
		objectListDock.style.fontSize = "large";

		root.appendChild(objectListDock);

		objectList = new PropertyGrid(objectListDock);


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
		buttonListdDock.style.left = "5";
		buttonListdDock.style.top = "5";
		buttonListdDock.style.width  = 180;
		buttonListdDock.style.height = 700;
		root.appendChild(buttonListdDock);

		buttonList = new PropertyGrid(buttonListdDock);
		buttonList.addProperty(undefined, new Button("Select (Q)", function(){setTool("select");}));
		buttonList.addProperty(undefined, new Button("Modify (V)", function(){setTool("modify");}));
		buttonList.addProperty(undefined, new Button("Add Wall (W)", function(){setTool("addWall");}));
		buttonList.addProperty(undefined, new Button("Add Arc Wall", function(){setTool("addArcWall");}));
		buttonList.addProperty(undefined, new Button("Add BRDF Ray", function () { setTool("addRay"); }));
		buttonList.addProperty(undefined, new Button("Add Point Light", function () { setTool("addPointLight"); }));
		buttonList.addProperty(undefined, new Button("Add Spot Light", function () { setTool("addSpotLight"); }));
		buttonList.addProperty(undefined, new Button("Add Parallel Light", function () { setTool("addParallelLight"); }));
		buttonList.addProperty(undefined, new Button("Add Camera", function () { setTool("addCamera"); }));
		buttonList.addProperty(undefined, new Divider());
		buttonList.addProperty(undefined, new Button("Add Line (L)", function () { setTool("addLine"); }));
		buttonList.addProperty(undefined, new Button("Add Tree", function () { addTree(); }));
		buttonList.addProperty(undefined, new Button("Add Person", function () { addPerson(); }));
		buttonList.addProperty(undefined, new Divider());
		//buttonList.addProperty(undefined, new Button("Save as Image", function () { saveAsImage(); }));
		buttonList.addProperty(undefined, new Button("Save as JavaScript", function () { saveAsJavascript(); }));
		buttonList.addProperty(undefined, new Button("Load from JavaScript", function () { loadFromJavascript(); }));


		// Status bar
		statusBar = document.createElement('div');
		statusBar.id = "statusBar";
		//statusBar.style.border = "2px solid black";
		//statusBar.style.backgroundColor = "white";
		statusBar.style.position = "fixed";
		statusBar.style.left = "0";
		statusBar.style.bottom = "5";
		statusBar.style.width  = window.innerWidth;
		statusBar.style.height = 30;
		statusBar.style.fontFamily = "Verdana,sans-serif";
		statusBar.style.fontSize = "small";
		statusBar.style.padding = "4px";
		root.appendChild(statusBar);

		canvasProperties =
		[
			{name: "Show Grid", control: new TickBox(showGrid, function (value) { showGrid = value; draw(); }) }
		];

		scene = new Scene();
		camera = new Camera(canvas);
		
		grid.spacing = 1;
		scene.addObject(new Wall( [new Vector(-10, 10), new Vector(-10, 0), new Vector(10, 0), new Vector(10, 10)] ));
		scene.addObject(new ArcWall(new Vector(0, 10), 10,  0*Math.PI/180, 180*Math.PI/180));
		scene.addObject(new BRDFRay(new Vector(0, 10), new Vector(-3,-5)));
		scene.addObject(new SpotLight(new Vector(0, 10), new Vector(10, 0), 35));

		scene.addChangeListener(onSceneChange);

		camera.setViewPosition(0, 10);

		setSelection([]);
	}
	
	function setTool(newTool)
	{
		if (newTool == "cancel")
		{
			if (tool == "addWall")
			{
				if (objectBeingMade !== undefined && objectBeingMade instanceof Wall)
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
			else if (tool == "addArcWall" || tool == "addRay" || tool == "addPointLight" || tool == "addSpotLight" || tool == "addParallelLight" || tool == "addCamera" || tool == "addLine")
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
		else if (newTool == "addWall")
		{
			if (tool != "addWall")
			{
				mode = null;
			}

			tool = "addWall";
			mouseCursor.shape = "cross";
			statusBar.innerHTML = "Add Wall: Click to add points. ESC to terminate. Snaps are ON by default. Use Alt to move freely.";
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
		else if (newTool == "addPointLight" || newTool == "addSpotLight" || newTool == "addParallelLight" || newTool == "addCamera" || newTool == "addLine")
		{
			if (tool != newTool)
			{
				mode = null;
			}

			tool = newTool;
			mouseCursor.shape = "cross";
			statusBar.innerHTML = newTool + " : Click to add. ESC to terminate. Snaps are ON by default. Use Alt to move freely.";
			setSelection([]);
			draw();
		}

		objectBeingMade = undefined;
	}

	function onKeyDown(evt)
	{
		if (evt.keyCode == lastKeyPress)
			return;

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
		else if (evt.keyCode==87) // W
		{
			setTool("addWall");
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

		lastKeyPress = evt.keyCode;
	}
	
	function onKeyUp(evt)
	{
		if (evt.keyCode == 16 && tool == "modify") // shift
		{
			mouseCursor.shape = "angle";
			draw();
		}
		else if (evt.keyCode == 90 && evt.ctrlKey == 1 && evt.shiftKey == 0)
		{
			undo();
		}
		else if (evt.keyCode == 90 && evt.ctrlKey == 1 && evt.shiftKey == 1)
		{
			redo();
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
						var snapPoint = scene.getSnapPoint(lastMousePos, camera.getSnapPoints(), camera.invScale(30));

						if (snapPoint !== null)
						{
							dragStartMousePos = snapPoint.p;
						}
						else
						{
							dragStartMousePos = mul(round(div(dragStartMousePos, grid.spacing)), grid.spacing);
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
			else if (tool == "addWall" || tool == "addArcWall" || tool == "addRay" || tool == "addPointLight" || tool == "addSpotLight" || tool == "addParallelLight" || tool == "addCamera" || tool == "addLine")
			{
				if (evt.altKey == 0)
				{
					var snapPoint = scene.getSnapPoint(lastMousePos, camera.getSnapPoints(), camera.invScale(30), [objectBeingMade]);

					var snapPos;

					if (snapPoint !== null)
					{
						snapPos = snapPoint.p;
					}
					else
					{
						snapPos = mul(round(div(lastMousePos, grid.spacing)), grid.spacing);
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

				if (tool == "addWall")
				{
					if (objectBeingMade === undefined)
					{
						objectBeingMade = new Wall([newPoint.copy()]);
						scene.addObject(objectBeingMade);
					}
					else
					{
						objectBeingMade.points[objectBeingMade.points.length - 1] = newPoint;
					}

					// Add the next point as well, this is the one that moves with the cursor
					objectBeingMade.addPoint(lastMousePos.copy());
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
				else if (tool == "addLine")
				{
					if (objectBeingMade === undefined)
					{
						objectBeingMade = new Line(newPoint.copy(), newPoint);
						scene.addObject(objectBeingMade);
					}
					else
					{
						objectBeingMade.setDragPointPos(1, newPoint);
						setTool("select");
						setTool("addLine");
						setSelection([scene.objects[scene.objects.length-1]]);
					}
				}

				backup();
			}
		}

		lastMouseUpPos = lastMousePos;
	}

	function onMouseMove(evt)
	{
		draw();

		lastMousePos = camera.getMousePos(evt);
		lastMousePosPixels = getMousePos(evt, canvas);

		mouseCursor.pos = camera.getMousePos(evt);
	
		if (evt.buttons == 0)
		{
			if (tool == "select")
			{
				var snapPoint = scene.getSnapPoint(lastMousePos, camera.getSnapPoints(), camera.invScale(30));

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
			else if (tool == "addWall" || tool == "addArcWall" || tool == "addRay" || tool == "addSpotLight" || tool == "addParallelLight" || tool == "addCamera" || tool == "addLine")
			{
				var newPoint = lastMousePos;

				if (evt.altKey == 0)
				{
					var snapPoint = scene.getSnapPoint(lastMousePos, camera.getSnapPoints(), camera.invScale(30), [objectBeingMade]);

					if (snapPoint !== null)
					{
						newPoint = snapPoint.p;
						drawSnapPoint(snapPoint);
					}
					else
					{
						newPoint = mul(round(div(lastMousePos, grid.spacing)), grid.spacing);
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

				if (tool == "addWall")
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
				else if (tool == "addRay" || tool == "addSpotLight" || tool == "addParallelLight" || tool == "addCamera" || tool == "addLine")
				{
					if (objectBeingMade !== undefined)
					{
						objectBeingMade.setDragPointPos(1, newPoint);
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

					var snapPoint = scene.getSnapPoint(lastMousePos, camera.getSnapPoints(), camera.invScale(30), ignoreList);

					if (snapPoint !== null)
					{
						drawSnapPoint(snapPoint);
						lastMousePos = snapPoint.p;
					}
					else
					{
						lastMousePos = mul(round(div(lastMousePos, grid.spacing)), grid.spacing);
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
		camera.setUnitScale( camera.getUnitScale() / zoomFactor);
		draw();
		
		return false;
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
	
		selectionList = s;
		
		for (var i=0; i<selectionList.length; ++i)
		{
			if (selectionList[i].selected !== undefined)
			{
				selectionList[i].selected = true;
			}
		}

		if (selectionList.length > 0)
		{
			propertyGrid.setProperties(selectionList[0].getProperties());
		}
		else
		{
			propertyGrid.setProperties(canvasProperties);
		}

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

		var t1 = performance.now();

		camera.getGraphics().drawText(new Vector(5, window.innerHeight - 50), (1000 / (t1 - t0)).toFixed(0) + " FPS", "#909090", "left");
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
		else
		{
			camera.drawRectangle(snapPoint.p, camera.invScale(10), "#0084e0", 2);
		}
	}

	function saveAsImage()
	{
		mouseCursor.hide = true;
		draw();
		var img = canvas.toDataURL("image/png");
		mouseCursor.hide = false;
		var popup = window.open();
		popup.document.write('<img src="' + img + '"/>');
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

		if (str != null)
		{
			scene.deleteAllObjects();
			scene.addObject(grid);
			eval(str);
			draw();
		}
	}

	function addTree()
	{
		var w = new Wall([new Vector(-2, 2), new Vector(-2, 7), new Vector(0, 7), new Vector(0, 2), new Vector(-2, 2)]);
		w.roughness = 0.1;
		w.metalness = 0;
		scene.addObject(w);

		var w = new Wall([new Vector(-2, 7), new Vector(-5, 9), new Vector(-5, 11), new Vector(-6, 13), new Vector(-5, 15), new Vector(-5, 17), new Vector(-2.5131828247928443, 17.6149344555104), new Vector(-1, 19), new Vector(2.0701925996189092, 18.187856383561872), new Vector(2.881831997691824, 15.70519469533884), new Vector(4.6483412758505205, 13.699967947158697), new Vector(3.025062479704691, 11.503767222961393), new Vector(2.7386015156789565, 8.49592710069118), new Vector(0, 7), new Vector(-2, 7)]);
		w.roughness = 0.6000000000000001;
		w.metalness = 0;
		scene.addObject(w);
	}

	function addPerson()
	{
		var w = new Wall([new Vector(-2, 10), new Vector(0, 10), new Vector(2, 7), new Vector(0, 8), new Vector(0, 1), new Vector(-1, 5), new Vector(-2, 1), new Vector(-2, 8), new Vector(-4, 7), new Vector(-2, 10)]);
		w.roughness = 0;
		w.metalness = 0;
		scene.addObject(w);

		var aw = new ArcWall(new Vector(-1, 11), 1, -90.00 * Math.PI/180, 270.00 * Math.PI/180);
		aw.convex = false;
		aw.roughness = 0;
		aw.metalness = 0;
		scene.addObject(aw);
	}

	function onSceneChange()
	{
		draw();
		updateObjectList();
		backup();
	}

	function updateObjectList()
	{
		objectList.setProperties([]);

		for (var i=0; i!=scene.objects.length; ++i)
		{
			objectList.addProperty(scene.objects[i].constructor.name, new TickBox(true, function(value) {}));
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

	setup();
	onSceneChange();
	draw();
}
