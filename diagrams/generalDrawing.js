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
		
	var mode					= "panzoom";
		
	var selectionList = [];
	var moveOffsets = [];
	
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
		scene.addObject(mouseCursor);
	}
	
	function onKeyDown(evt)
	{
		if (evt.keyCode==27)
		{
			if (mode == "move")
			{
		    	for (var i = 0; i < selectionList.length; ++i)
		    	{
		    		if (selectionList[i].getOrigin !== undefined)
		    		{
		    			selectionList[i].setOrigin(add(dragStartMousePos, moveOffsets[i]));
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
		    var s = scene.hitTest(sub(lastMousePos, threshold), add(lastMousePos, threshold));

		    if (s.length == 0)
		    {
				mode = "marquee";
		    }
		    else
		    {
		    	mode = "selection";

		    	if (selectionList.indexOf(s[0])==-1)
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
	}

	function onMouseUp(evt)
	{
		lastMousePos = camera.getMousePos(evt);
		lastMousePosPixels = getMousePos(evt, canvas);
		
		if (evt.button == 0) // object move or marquee
		{
			if (mode == "marquee") // marquee
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
			else if (mode == "selection")
			{
				var threshold = 10 / camera.getUnitScale();
				var s = scene.hitTest(sub(lastMousePos, threshold), add(lastMousePos, threshold));
				setSelection(s);
			}

			mode = null;
		}		
	}

	function onMouseMove(evt)
	{
		draw();
		
		lastMousePos = camera.getMousePos(evt);
		lastMousePosPixels = getMousePos(evt, canvas);
		
		mouseCursor.setPos(camera.getMousePos(evt));
		
		if (evt.buttons & 1) // object move or marquee
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
