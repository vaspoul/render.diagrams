function EmbeddedDrawing(docTag)
{
	var parent;
	var canvas;
	var scene;
	var camera;

	var contextMenuDock;
	var contextMenuBox;
	var showingModal			= false;

	var dragStartMousePos		= {x:-1, y:-1};
	var dragStartMousePosPixels	= {x:-1, y:-1};
	var dragStartCamPos 		= {x:-1, y:-1};
	var dragOffset 				= new Vector(0,0);
	var lastMousePosPixels 		= {x:0, y:0}
	var lastMousePos	 		= {x:0, y:0}
	var lastMouseUpPos	 		= {x:0, y:0}
	var pinchStartLength		= 0;
	var pinchStartUnitScale		= 0;

	var grid 					= new Grid()
	var showGrid				= true;
	var redrawOnChange			= true;
	var dragUsingCtrl			= false;
	var clearColor				= undefined;

	var dragPoint				= null;
	var lastKeyPress;

	var frameTickTimer			= undefined;
	var lastFrameTickTime		= 0;
	var accumulatedTime			= 0;

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
			canvas.style.outline = "none";
			canvas.style.borderLeft = "1px solid #DDDDDD";
			canvas.style.borderTop = "1px solid #DDDDDD";
			canvas.style.boxShadow = "3px 3px 5px #999999";
			canvas.style.touchAction = "none";

			canvas.addEventListener('dblclick', onDoubleClick.bind(_this), false);
			canvas.addEventListener('mousemove', onMouseMove.bind(_this), false);
			canvas.addEventListener('mousedown', onMouseDown.bind(_this), false);
			canvas.addEventListener('mouseleave', onMouseLeave.bind(_this), false);
			canvas.addEventListener('mouseup', onMouseUp.bind(_this), false);
			canvas.addEventListener('keydown', onKeyDown.bind(_this), false);
			canvas.addEventListener('keyup', onKeyUp.bind(_this), false);
			canvas.addEventListener('touchstart', onTouchStart.bind(_this), false);
			canvas.addEventListener('touchmove', onTouchMove.bind(_this), false);
			canvas.addEventListener('touchend', onTouchEnd.bind(_this), false);

			window.addEventListener('scroll', onScroll.bind(_this), false);
			window.addEventListener("resize", onResize.bind(_this));

			canvas.oncontextmenu = onContextMenu;
			canvas.onwheel = onMouseWheel.bind(_this);

			canvas.tabIndex = -1;

			parent.appendChild(canvas);
		}

		// Context menu
		{
			contextMenuDock = document.createElement('div');
			contextMenuDock.id = "contextMenuDock";
			contextMenuDock.style.border = "1px solid #aaaaaa";
			contextMenuDock.style.backgroundColor = "white";
			contextMenuDock.style.boxShadow = "3px 3px 5px #999999";
			contextMenuDock.style.position = "fixed";
			contextMenuDock.style.top = 0;
			contextMenuDock.style.left = 0;
			contextMenuDock.style.minWidth = "150px";
			contextMenuDock.style.overflow = "auto";
			contextMenuDock.style.fontFamily = "Verdana,sans-serif";
			contextMenuDock.style.fontSize = "large";
			contextMenuDock.style.display = "none";
			contextMenuDock.style.outline = "none";
			contextMenuDock.tabIndex = 0;

			contextMenuBox = document.createElement('table');
			contextMenuBox.className = "contextMenuTable";
			contextMenuBox.style.cursor = "default";
			contextMenuBox.style.width = "100%";
			contextMenuBox.style.margin = "0 0 0 0";
			contextMenuBox.style.padding = "3px 3px 3px 3px";
			contextMenuBox.style.spacing = "0";
			contextMenuBox.style.cellpadding = "0";
			contextMenuBox.style.cellspacing = "0";
			contextMenuBox.style.fontFamily = "Verdana,sans-serif";
			contextMenuBox.style.fontSize = "12px";
			contextMenuBox.onmousedown = function(e)
			{
				if(e.preventDefault) e.preventDefault();
			}

			contextMenuDock.addEventListener('keyup', function(evt)
														{
															if (evt.keyCode==27) // ESC
															{
																contextMenuDock.style.display = "none";
																canvas.focus();
																showingModal = false;
															}
														}, false);

			contextMenuDock.appendChild(contextMenuBox);

			parent.appendChild(contextMenuDock);
		}

		scene = new Scene();
		camera = new Camera(canvas);

		grid.spacing = 1;

		camera.setViewPosition(0, 0);

		scene.addChangeListener(onSceneChange.bind(_this));
	}
	
	function onSceneChange()
	{
		if (scene.needsFrameTick || this.onFrameTick != undefined)
		{
			if (frameTickTimer == undefined)
			{
				frameTickTimer = window.requestAnimationFrame(frameTick.bind(this));
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

		if (redrawOnChange)
			this.draw();
	}

	function frameTick()
	{
		var currentTime = performance.now();
		var deltaTime = currentTime - lastFrameTickTime;
		accumulatedTime += deltaTime;

		var redrawNeeded = scene.onFrameTick(deltaTime, accumulatedTime);

		if (this.onFrameTick != undefined)
		{
			redrawNeeded |= this.onFrameTick(deltaTime, accumulatedTime);
		}

		if (redrawNeeded)
		{
			draw();
		}

		lastFrameTickTime = currentTime;

		frameTickTimer = window.requestAnimationFrame(frameTick.bind(this));
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

			this.draw();
		}
	}


	function onScroll(evt)
	{
		var visibleRect = canvas.getBoundingClientRect();

		onScreen = (visibleRect.bottom >= 0) && (visibleRect.top <= window.innerHeight);
		
		//if (onScreen)
		{
			//onResize();
			this.draw();
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
		showingModal = true;

		canvas.blur();
		contextMenuDock.style.display = "block";
		contextMenuDock.style.left = evt.x + 'px';
		contextMenuDock.style.top = evt.y + 'px';
		contextMenuDock.focus();

		while(contextMenuBox.rows[0]) contextMenuBox.deleteRow(0);

		var row = contextMenuBox.insertRow();

		row.onclick = function()
		{
			openInEditor();
			contextMenuDock.style.display = "none";
			showingModal = false;
		};

		row.innerHTML = "Edit local copy";

		var row = contextMenuBox.insertRow();

		row.onclick = function()
		{
			var img = canvas.toDataURL("image/png");
			var popup = window.open();

			popup.document.open();
			popup.document.write("<img src=\"" + img + "\"/>");
			popup.document.close();

			contextMenuDock.style.display = "none";
			showingModal = false;
		};

		row.innerHTML = "Save as PNG";

		return false;
	}

	function onKeyUp(evt)
	{
		if (evt.keyCode == 115) // F4
		{
			this.zoomExtents();
		}
	
		lastKeyPress = undefined;
	}

	function onMouseDown(evt)
	{
		if (showingModal)
		{
			contextMenuDock.style.display = "none";
			showingModal = false;
			return;
		}


		lastMousePos = camera.getMousePos(evt);
		lastMousePosPixels = getMousePosPixels(evt, canvas);
		
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

		this.draw();
	}

	function onMouseLeave(evt)
	{
		if (this.onMouseLeave != undefined)
		{
			this.onMouseLeave();
		}
	}

	function onMouseUp(evt)
	{
		lastMouseUpPos = lastMousePos;
	}

	function onDoubleClick(evt)
	{
		this.zoomExtents();
	}

	function onMouseMove(evt)
	{
		var newMousePosPixels = getMousePosPixels(evt, canvas);

		if (lastMousePosPixels.x == newMousePosPixels.x && lastMousePosPixels.y == newMousePosPixels.y)
		{
			evt.preventDefault();
			return;
		}

		canvas.style.cursor = "default";
		//canvas.focus();

		this.draw();

		lastMousePos = camera.getMousePos(evt);
		lastMousePosPixels = getMousePosPixels(evt, canvas);

		var handled = false;

		if (this.onMouseMove != undefined)
		{
			handled = this.onMouseMove(lastMousePos, lastMousePosPixels, evt.buttons, evt.ctrlKey, evt.shiftKey) == true;
		}

		if (!handled && (evt.buttons & 1) && !evt.shiftKey) // camera pan
		{
			if ( (dragUsingCtrl && evt.ctrlKey) || (!dragUsingCtrl && !evt.ctrlKey ) )
			{
				var delta = div(sub(lastMousePosPixels, dragStartMousePosPixels), new Vector(-camera.getUnitScale(), camera.getUnitScale()));
				var P = add(dragStartCamPos, delta);
				camera.setViewPosition(P.x, P.y);
			}
		}

		evt.preventDefault();
	}

	function onTouchStart(evt)
	{
		if (showingModal)
		{
			contextMenuDock.style.display = "none";
			showingModal = false;
			return;
		}

		var touchPositions = camera.getTouchPositions(evt);
		var touchPositionsPixels = getTouchPositionsPixels(evt, canvas);

		if (touchPositions.length == 1)
		{
			lastMousePos = touchPositions[0];
			lastMousePosPixels = touchPositionsPixels[0];
		}
		else if (touchPositions.length == 2)
		{
			lastMousePos = avg(touchPositions[0], touchPositions[1]);
			lastMousePosPixels = avg(touchPositionsPixels[0], touchPositionsPixels[1]);

			pinchStartLength = distance(touchPositionsPixels[0], touchPositionsPixels[1]);
			pinchStartUnitScale = camera.getUnitScale();
		}

		dragStartMousePos.x	= lastMousePos.x;
		dragStartMousePos.y	= lastMousePos.y;
		dragStartMousePosPixels.x = lastMousePosPixels.x;
		dragStartMousePosPixels.y = lastMousePosPixels.y;
		dragStartCamPos.x = camera.getViewPosition().x;
		dragStartCamPos.y = camera.getViewPosition().y;

		if (this.onMouseDown != undefined)
		{
			this.onMouseDown(lastMousePos, lastMousePosPixels, 1);
		}

		this.draw();
	}

	function onTouchMove(evt)
	{
		canvas.style.cursor = "default";

		var touchPositions = camera.getTouchPositions(evt);
		var touchPositionsPixels = getTouchPositionsPixels(evt, canvas);

		if (touchPositions.length == 1)
		{
			lastMousePos = touchPositions[0];
			lastMousePosPixels = touchPositionsPixels[0];

			var handled = false;

			if (this.onMouseMove != undefined)
			{
				handled = this.onMouseMove(lastMousePos, lastMousePosPixels, 1, false, false) == true;
			}

			if (!handled) // camera pan
			{
				var delta = div(sub(lastMousePosPixels, dragStartMousePosPixels), new Vector(-camera.getUnitScale(), camera.getUnitScale()));
				var P = add(dragStartCamPos, delta);
				camera.setViewPosition(P.x, P.y);
			}
		}
		else if (touchPositions.length == 2) // pan & zoom
		{
			lastMousePos = avg(touchPositions[0], touchPositions[1]);
			lastMousePosPixels = avg(touchPositionsPixels[0], touchPositionsPixels[1]);

			var delta = div(sub(lastMousePosPixels, dragStartMousePosPixels), new Vector(-camera.getUnitScale(), camera.getUnitScale()));
			var P = add(dragStartCamPos, delta);
			camera.setViewPosition(P.x, P.y);

			var pinchLength = distance(touchPositionsPixels[0], touchPositionsPixels[1]);
			var zoomFactor = pinchLength / pinchStartLength;
			camera.setUnitScale(pinchStartUnitScale * zoomFactor);

			if (camera.scale(grid.spacing) < 10)
				grid.spacing *= 10;
			else if (camera.scale(grid.spacing) > 100)
				grid.spacing /= 10;
		}

		this.draw();
	}

	function onTouchEnd(evt)
	{
		lastMouseUpPos = lastMousePos;
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

		this.draw();
		
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

		this.draw();
	}

	function isOnScreen()
	{
		return onScreen;
	}

	function draw()
	{
		var visibleRect = canvas.getBoundingClientRect();

		onScreen = (visibleRect.bottom >= 0) && (visibleRect.top <= window.innerHeight);

		if (onScreen)
		{
			// Set the topmost layer so that image can be copied		
			camera.setLayer(2);

			if (clearColor != undefined)
			{
				camera.clear(clearColor);
			}
			else if (showGrid)
			{
				camera.clear("rgba(255,255,255,1)");
			}
			else
			{
				camera.clear("rgba(255,255,255,0)");
			}


			if (showGrid)
			{
				grid.draw(camera);
			}

			scene.draw(camera);

			if (this.onDraw != undefined)
			{
				this.onDraw();
			}
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

	function saveToLocalStorage()
	{
		if (typeof (Storage) === "undefined")
			return null;

		var sceneName = scene.name + "_" + Math.floor(Math.random() * 16777216).toString();

		sceneName = sanitizeString(sceneName);

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

		localStorage.setItem("savedScene:" + sceneName, sceneName);
		localStorage.setItem("sceneCode:" + sceneName, str);
		localStorage.setItem("sceneDate:" + sceneName, (new Date()).toString());
		localStorage.setItem("sceneThumbnail:" + sceneName, thumbnailData);
	
		return sceneName;
	}

	function openInEditor()
	{
		var sceneName = saveToLocalStorage();

		if (sceneName)
		{
			window.open("/editor.html?loadLocal=" + sceneName);
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
	this.SetShowGrid = function(show) { showGrid = show; }
	this.onMouseMove = undefined;
	this.onMouseDown = undefined;
	this.onMouseLeave = undefined;
	this.onFrameTick = undefined;
	this.onDraw = undefined;
	this.isOnScreen = isOnScreen;
	this.SetClearColor = function(color) { clearColor = color; }
	this.camera = camera;
	this.onSceneChange = onSceneChange;
	this.setDragUsingCtrl = function() { dragUsingCtrl = true; }
	this.enableGridSnap = function(enable) { grid.allowSnap = enable; }
	this.setRedrawOnChange = function (value) { redrawOnChange = value; }
}
