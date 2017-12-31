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
	var showGrid				= true;
	var redrawOnChange			= true;

	var dragPoint				= null;
	var lastKeyPress;

	var onScreen				= true;

	function setup(_this)
	{
		parent = document.getElementById(docTag);

		// Main canvas
		{
			canvas = document.createElement('canvas');

			canvas.width  = parent.clientWidth;
			canvas.height = parent.clientHeight;
			canvas.style.position = "absolute";
			canvas.style.webkitUserSelect = "none";

			canvas.addEventListener('dblclick', zoomExtents, false);
			canvas.addEventListener('mousemove', onMouseMove.bind(_this), false);
			canvas.addEventListener('mousedown', onMouseDown.bind(_this), false);
			canvas.addEventListener('mouseup', onMouseUp, false);
			canvas.addEventListener('keydown', onKeyDown, false);
			canvas.addEventListener('keyup', onKeyUp, false);
			window.addEventListener('scroll', onScroll, false);
			window.addEventListener("resize", onResize);

			canvas.oncontextmenu = onContextMenu;
			canvas.onwheel = onMouseWheel;

			canvas.tabIndex = -1;

			parent.appendChild(canvas);
		}

		scene = new Scene();
		camera = new Camera(canvas);

		grid.spacing = 1;

		camera.setViewPosition(0, 0);

		scene.addChangeListener(onSceneChange);
	}
	
	function onSceneChange()
	{
		if (redrawOnChange)
			draw();
	}

	function onResize()
	{
		if (camera != undefined)
		{
			canvas.width  = parent.clientWidth;
			canvas.height = parent.clientHeight;

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


	function onScroll(evt)
	{
		var visibleRect = canvas.getBoundingClientRect();

		onScreen = (visibleRect.bottom >= 0) && (visibleRect.top <= window.innerHeight);

		//if (onScreen)
		{
			//onResize();
			draw();
		}
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

		if (this.onMouseDown != undefined)
		{
			this.onMouseDown(lastMousePos, lastMousePosPixels, evt.buttons);
		}

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
		//canvas.focus();

		draw();

		lastMousePos = camera.getMousePos(evt);
		lastMousePosPixels = getMousePos(evt, canvas);

		if (evt.buttons & 1) // camera pan
		{
			var delta = div(sub(lastMousePosPixels, dragStartMousePosPixels), new Vector(-camera.getUnitScale(), camera.getUnitScale()));
			var P = add(dragStartCamPos, delta);
			camera.setViewPosition(P.x, P.y);
		}

		if (this.onMouseMove != undefined)
		{
			this.onMouseMove(lastMousePos, lastMousePosPixels, evt.buttons);
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
		if (onScreen)
		{
			// Set the topmost layer so that image can be copied		
			camera.setLayer(2);

			if (showGrid)
			{
				camera.clear("rgba(255,255,255,1)");
				grid.draw(camera);
			}
			else
			{
				camera.clear("rgba(255,255,255,0)");
			}

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

	setup(this);
	draw();

	this.draw = draw;
	this.parent = parent;
	this.showGrid = showGrid;
	this.onMouseMove = undefined;
	this.onMouseDown = undefined;
	this.camera = camera;
	this.setRedrawOnChange = function (value) { redrawOnChange = value; }
}
