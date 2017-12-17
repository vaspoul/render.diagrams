function EmbeddedDrawing(docTag)
{
	var parent;
	var canvas;
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

	var dragPoint				= null;
	var lastKeyPress;

	window.addEventListener("resize", onResize);

	function onResize()
	{
		if (camera != undefined)
		{
			canvas.width = parent.offsetWidth;
			canvas.height = parent.offsetHeight;

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
		parent = document.getElementById(docTag);

		// Main canvas
		{
			canvas = document.createElement('canvas');
			parent.appendChild(canvas);

			canvas.style.width ='100%';
			canvas.style.height='100%';
			canvas.width  = canvas.offsetWidth;
			canvas.height = canvas.offsetHeight;

			canvas.addEventListener('mousemove', onMouseMove, false);
			canvas.addEventListener('mousedown', onMouseDown, false);
			canvas.addEventListener('mouseup', onMouseUp, false);
			canvas.addEventListener('keydown', onKeyDown, false);
			canvas.addEventListener('keyup', onKeyUp, false);
			canvas.oncontextmenu = onContextMenu;
			canvas.onwheel = onMouseWheel;
			canvas.tabIndex = -1;
			canvas.focus();
		}

		scene = new Scene();
		camera = new Camera(canvas);
		
		grid.spacing = 1;

		camera.setViewPosition(0, 0);
	}
	
	function onKeyDown(evt)
	{
		if (evt.keyCode == lastKeyPress)
			return;

		var handled = true;

		//if (evt.ctrlKey && evt.keyCode==67) // Ctrl+C
		//{
		//	clipboardCopy();
		//}
		//else
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
		if (evt.keyCode == 115) // F4
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

		draw();
	}

	function onMouseUp(evt)
	{
		lastMouseUpPos = lastMousePos;
	}

	function onMouseMove(evt)
	{
		var newMousePos = getMousePos(evt, canvas);

		if (lastMousePosPixels.x == newMousePos.x && lastMousePosPixels.y == newMousePos.y)
		{
			return;
		}

		canvas.style.cursor = "default";
		canvas.focus();

		draw();

		lastMousePos = camera.getMousePos(evt);
		lastMousePosPixels = getMousePos(evt, canvas);

		if (evt.buttons & 4) // camera pan
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

		var uniScaleX = parent.offsetWidth / extents.x;
		var uniScaleY = parent.offsetHeight / extents.y;

		camera.setViewPosition(center.x, center.y);
		camera.setUnitScale(Math.min(uniScaleX, uniScaleY) * 0.9);

		if (camera.scale(grid.spacing) < 10)
			grid.spacing *= 10;
		else if (camera.scale(grid.spacing) > 100)
			grid.spacing /= 10;

		draw();
	}

	function draw()
	{
		{
			camera.setLayer(0);
			camera.clear("rgba(255,255,255,1)");

			grid.draw(camera);
		}

		{
			camera.setLayer(1);
			camera.clear("rgba(255,255,255,0)");
			scene.draw(camera);
		}
	}
	
	function loadFromJavascript(str)
	{
		if (str != null)
		{
			scene.deleteAllObjects();
			eval(str);
			draw();
		}
	}

	this.getScene = function()
	{
		return scene;
	}

	this.zoomExtents = zoomExtents;

	setup();
	draw();
}
