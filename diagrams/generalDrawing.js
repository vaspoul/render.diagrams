function GeneralDrawingTest(docTag)
{
	var canvas;
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
	
	function setup()
	{
		var root = document.getElementById(docTag);
		
		canvas = document.createElement('canvas');
		canvas.width  = 1200;
		canvas.height = 700;
		canvas.style.border   = "2px solid black";//#99D9EA";
		canvas.style.marginLeft = "auto";
		canvas.style.marginRight = "auto";
		canvas.style.display = "block";
		canvas.style.cursor = "none";
		canvas.addEventListener('mousemove', onMouseMove, false);
		canvas.addEventListener('mousedown', onMouseDown, false);
		canvas.addEventListener('mouseup', onMouseUp, false);
		document.addEventListener('keydown', onKeyDown, false);
		canvas.onwheel = onMouseWheel;
			
		root.appendChild(canvas);

		scene = new Scene();
		camera = new Camera(canvas);
		
		scene.addObject(grid);
		scene.addObject(new Wall(new Vector(-5, 0), new Vector(5, 0)));
		scene.addObject(new Wall(new Vector(-5, 10), new Vector(-5, 0)));
		scene.addObject(new Wall(new Vector(5, 0), new Vector(5, 10)));
		scene.addObject(new ArcWall(new Vector(0, 10), 5, 0, Math.PI));
		scene.addObject(mouseCursor);

		camera.setViewPosition(0, 5);
	}
	
	function onKeyDown(evt)
	{
		if (evt.keyCode==27)
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

			draw();
		}
		else if (evt.keyCode==81) // q
		{
			if (tool != "select")
			{
				mode = null;
			}

			tool = "select";
			mouseCursor.setShape("cross");
		}
		else if (evt.keyCode==87) // w
		{
			if (tool != "modify")
			{
				mode = null;
			}

			tool = "modify";
			mouseCursor.setShape("angle");
		}
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
				dragPoint = scene.getDragPoint(lastMousePos, camera.invScale(30));

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
				mode = null;
			}
		}
	}

	function onMouseMove(evt)
	{
		draw();
		
		lastMousePos = camera.getMousePos(evt);
		lastMousePosPixels = getMousePos(evt, canvas);
		
		mouseCursor.setPos(camera.getMousePos(evt));
	
		if (evt.buttons == 0)
		{
			if (tool == "select")
			{
				var snapPoint = scene.getSnapPoint(lastMousePos, camera.invScale(30));
				camera.drawRectangle(snapPoint, camera.invScale(10), "#0084e0", 2);
			}
			else if (tool == "modify")
			{
				var newDragPoint = scene.getDragPoint(lastMousePos, camera.invScale(30));

				if (newDragPoint.point !== null)
				{
					camera.drawRectangle(newDragPoint.point, camera.invScale(10), "#ff0000", 2);
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

				if (evt.ctrlKey)
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
					camera.drawRectangle(lastMousePos, camera.invScale(10), "#ff0000", 2);
					dragPoint.object.setDragPointPos(dragPoint.index, lastMousePos);
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

		draw();
	}
	
	function draw()
	{
		scene.draw(camera);
	}
	
	setup();
	draw();
}
