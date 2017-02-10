function GeneralDrawingTest(docTag)
{
	var canvas;
	var propertyGrid;
	var buttonList;
	var statusBar;
	var scene;
	var camera;

	var dragStartMousePos		= {x:-1, y:-1};
	var dragStartMousePosPixels	= {x:-1, y:-1};
	var dragStartCamPos 		= {x:-1, y:-1};
	var dragOffset 				= new Vector(0,0);
	var lastMousePosPixels 		= {x:0, y:0}
	var lastMousePos	 		= {x:0, y:0}
		
	var grid 					= new Grid()
	var mouseCursor 			= new MouseCursor(grid);
		
	var tool					= "select";
	var mode					= "";
		
	var selectionList = [];
	var moveOffsets = [];
	var dragPoint = null;
	var objectBeingMade = undefined;
	var lastKeyPress;
	
	function setup()
	{
		var root = document.getElementById(docTag);
		
		// Main canvas
		canvas = document.createElement('canvas');
		canvas.width  = 1250;
		canvas.height = 700;
		canvas.style.border = "2px solid black";
		canvas.style.marginLeft = 20;
		canvas.style.marginRight = 20;
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
		propertyGridDock.style.width  = 400;
		propertyGridDock.style.height = 700;
		propertyGridDock.style.cssFloat = "right";
		propertyGridDock.style.fontFamily = "Verdana,sans-serif";
		propertyGridDock.style.fontSize = "large";

		root.appendChild(propertyGridDock);

		propertyGrid = new PropertyGrid(propertyGridDock);

		// Button list
		var buttonListdDock = document.createElement('div');
		buttonListdDock.id = "buttonList";
		buttonListdDock.style.border = "2px solid black";
		buttonListdDock.style.width  = 180;
		buttonListdDock.style.height = 700;
		buttonListdDock.style.cssFloat = "left";
		root.appendChild(buttonListdDock);

		buttonList = new PropertyGrid(buttonListdDock);
		buttonList.addProperty(undefined, new Button("Select (Q)", function(){setTool("select");}));
		buttonList.addProperty(undefined, new Button("Modify (V)", function(){setTool("modify");}));
		buttonList.addProperty(undefined, new Button("Add Wall (L)", function(){setTool("addWall");}));
		buttonList.addProperty(undefined, new Button("Add Arc Wall (C)", function(){setTool("addArcWall");}));
		buttonList.addProperty(undefined, new Button("Add Ray (R)", function () { setTool("addRay"); }));
		buttonList.addProperty(undefined, new Button("Add Point Light", function () { setTool("addPointLight"); }));
		buttonList.addProperty(undefined, new Button("Add Spot Light", function () { setTool("addSpotLight"); }));
		buttonList.addProperty(undefined, new Button("Add Parallel Light", function () { setTool("addParallelLight"); }));
		buttonList.addProperty(undefined, new Divider());
		buttonList.addProperty(undefined, new Button("Add Camera", function () { window.alert("Not implemented!"); }));
		buttonList.addProperty(undefined, new Button("Add Box", function () { window.alert("Not implemented!"); }));
		buttonList.addProperty(undefined, new Button("Add Tree", function () { window.alert("Not implemented!"); }));
		buttonList.addProperty(undefined, new Button("Add Person", function () { window.alert("Not implemented!"); }));
		buttonList.addProperty(undefined, new Divider());
		buttonList.addProperty(undefined, new Button("Save as Image", function () { window.alert("Not implemented!"); }));
		buttonList.addProperty(undefined, new Button("Save as JavaScript", function () { window.alert("Not implemented!"); }));
		buttonList.addProperty(undefined, new Button("Load from JavaScript", function () { window.alert("Not implemented!"); }));


		// Status bar
		statusBar = document.createElement('div');
		statusBar.id = "statusBar";
		statusBar.style.border = "2px solid black";
		statusBar.style.width  = 1250-8;
		statusBar.style.height = 30;
		statusBar.style.marginLeft = 204;
		statusBar.style.marginTop = 5;
		statusBar.style.fontFamily = "Verdana,sans-serif";
		statusBar.style.fontSize = "small";
		statusBar.style.padding = "4px";
		root.appendChild(statusBar);

		scene = new Scene();
		camera = new Camera(canvas);
		
		grid.spacing = 1;
		scene.addObject(grid);
		scene.addObject(new Wall( [new Vector(-10, 10), new Vector(-10, 0), new Vector(10, 0), new Vector(10, 10)] ));
		scene.addObject(new ArcWall(new Vector(0, 10), 10,  0*Math.PI/180, 180*Math.PI/180));
		scene.addObject(new BRDFRay(new Vector(0, 10), new Vector(-3,-5)));
		//scene.addObject(new PointLight(new Vector(0, 10), 5));
		scene.addObject(new SpotLight(new Vector(0, 10), new Vector(10, 0), 35));

		scene.addChangeListener(draw);

		camera.setViewPosition(0, 10);
	}
	
	function setTool(newTool)
	{
		if (newTool != "addWall" && tool == "addWall")
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
		else if (newTool == "addPointLight" || newTool == "addSpotLight" || newTool == "addParallelLight")
		{
			if (tool != newTool)
			{
				mode = null;
			}

			tool = newTool;
			mouseCursor.shape = "cross";
			statusBar.innerHTML = "Add Light: Click to add. ESC to terminate. Snaps are ON by default. Use Alt to move freely.";
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

			setTool("select");
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
			setTool("addWall");
		}
		else if (evt.keyCode==67) // C
		{
			setTool("addArcWall");
		}
		else if (evt.keyCode==82) // R
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
		else if (evt.keyCode == 16 && tool == "modify")
		{
			mouseCursor.shape = "cross";
			draw();
		}

		lastKeyPress = evt.keyCode;
	}
	
	function onKeyUp(evt)
	{
		if (evt.keyCode == 16 && tool == "modify")
		{
			mouseCursor.shape = "angle";
			draw();
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
						var snapPoint = scene.getSnapPoint(lastMousePos, camera.invScale(30));

						if (snapPoint !== null)
						{
							dragStartMousePos = snapPoint;
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
				//else if (mode == "selection")
				//{
				//	var threshold = 10 / camera.getUnitScale();
				//	var s = scene.hitTest(sub(lastMousePos, threshold), add(lastMousePos, threshold));

				//	if (evt.ctrlKey)
				//	{
				//		s = selectionList.concat(s);
				//	}
				//	else if (evt.shiftKey)
				//	{

				//	setSelection(s);
				//}

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

				mode = null;
			}
			else if (tool == "addWall" || tool == "addArcWall" || tool == "addRay" || tool == "addPointLight" || tool == "addSpotLight" || tool == "addParallelLight")
			{
				var newPoint = lastMousePos;

				if (evt.altKey == 0)
				{
					newPoint = scene.getSnapPoint(lastMousePos, camera.invScale(30), [objectBeingMade]);

					if (newPoint === null)
					{
						newPoint = mul(round(div(lastMousePos, grid.spacing)), grid.spacing);
					}
				}

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
			}
		}
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
				var snapPoint = scene.getSnapPoint(lastMousePos, camera.invScale(30));

				if (snapPoint !== null)
				{
					camera.drawRectangle(snapPoint, camera.invScale(10), "#0084e0", 2);
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
			else if (tool == "addWall" || tool == "addArcWall" || tool == "addRay" || tool == "addSpotLight" || tool == "addParallelLight")
			{
				var newPoint = lastMousePos;

				if (evt.altKey == 0)
				{
					newPoint = scene.getSnapPoint(lastMousePos, camera.invScale(30), [objectBeingMade]);

					if (newPoint !== null)
					{
						camera.drawRectangle(newPoint, camera.invScale(10), "#0084e0", 2);
					}
					else
					{
						newPoint = mul(round(div(lastMousePos, grid.spacing)), grid.spacing);
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
				else if (tool == "addRay" || tool == "addSpotLight" || tool == "addParallelLight")
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

					var snapPoint = scene.getSnapPoint(lastMousePos, camera.invScale(30), ignoreList);

					if (snapPoint !== null)
					{
						camera.drawRectangle(snapPoint, camera.invScale(10), "#0084e0", 2);
						lastMousePos = snapPoint;
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
			propertyGrid.setProperties([]);
		}

		draw();
	}
	
	function draw()
	{
		scene.draw(camera);
		mouseCursor.draw(camera);
	}
	
	setup();
	draw();
}
