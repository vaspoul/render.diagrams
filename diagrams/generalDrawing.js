function GeneralDrawingTest(docTag)
{
	var canvas;
	var scene;
	var camera;
	var a;
	var b;
	
	function setup()
	{
		var root = document.getElementById(docTag);
		
		canvas = document.createElement('canvas');
		canvas.width  = 700;
		canvas.height = 700;
		canvas.style.border   = "2px solid black";
		canvas.style.marginLeft = "auto";
		canvas.style.marginRight = "auto";
		canvas.style.display = "block";
		canvas.addEventListener('mousemove', onMouseMove, false);
		canvas.addEventListener('mousedown', onMouseDown, false);
			
		root.appendChild(canvas);

		scene = new Scene();
		camera = new Camera(canvas);
		
		scene.addObject(new Wall(new Vector(-1,0), new Vector(1,0)));
		
		camera.setUnitScale(100);
	}
	
	function onMouseMove(evt)
	{
		if (evt.buttons & 1)
		{
		}
		
		if (evt.buttons & 2)
		{
		}
	}

	function onMouseDown(evt)
	{
		if (evt.buttons & 1)
		{
		}
		
		if (evt.buttons & 2)
		{
		}
	}
	
	function draw()
	{
		scene.draw(camera);
	}
	
	setup();
	draw();
}
