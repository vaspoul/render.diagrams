function GeneralDrawingTest(docTag)
{
	var canvas;
	var scene;
	var camera;

	var dragStartMousePos = {x:-1, y:-1};
	var dragStartCamPos = {x:-1, y:-1};
	var dragOffset = new Vector(0,0);
	var lastMousePos = {x:0, y:0}
	
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
		canvas.addEventListener('mousemove', onMouseMove, false);
		canvas.addEventListener('mousedown', onMouseDown, false);
		canvas.addEventListener('wheel', onMouseWheel, false);
			
		root.appendChild(canvas);

		scene = new Scene();
		camera = new Camera(canvas);
		
		scene.addObject(new Grid(new Vector(0,0), 1));
		scene.addObject(new Wall(new Vector(-5,0), new Vector(5,0)));
	}
	
	function onMouseDown(evt)
	{
		lastMousePos = getMousePos(evt, canvas);
		
		dragStartMousePos.x = lastMousePos.x;
		dragStartMousePos.y = lastMousePos.y;
		dragStartCamPos.x = camera.getViewPosition().x;
		dragStartCamPos.y = camera.getViewPosition().y;
	}

	function onMouseUp(evt)
	{
	}

	function onMouseMove(evt)
	{
		lastMousePos = getMousePos(evt, canvas);
		
		if (evt.buttons & 1)
		{
			var delta = div(sub(lastMousePos, dragStartMousePos), new Vector(-camera.getUnitScale(), camera.getUnitScale()));
			var P = add(dragStartCamPos, delta);
			camera.setViewPosition(P.x, P.y);
		}

		draw();
	}

	function onMouseWheel(evt)
	{
		lastMousePos = camera.getMousePos(evt);

		var zoomCenter = lastMousePos;

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
	}

	function draw()
	{
		scene.draw(camera);
	}
	
	setup();
	draw();
}
