
function Wall(pointA, pointB)
{
	var pointA = pointA;
	var pointB = pointB;
	var selected = false;
	
	function draw(camera)
	{
		var width = this.selected ? 4 : 1;
		camera.drawLine(pointA, pointB, "#000000", width);
		
		var steps = 10;
		var L = sub(pointB, pointA);
		var l = div(L, steps);
		var t = transpose(l)

		for (var i=0; i<10; ++i)
		{
			camera.drawLine(add(add(pointA, mul(l,i)),t), add(pointA, mul(l,i+1)), "#000000", width);
		}
	}
	
	function hitTest(a, b)
	{
		if (	Math.max(pointA.x, pointB.x) < Math.min(a.x, b.x) ||
				Math.max(pointA.y, pointB.y) < Math.min(a.y, b.y) ||
				Math.min(pointA.x, pointB.x) > Math.max(a.x, b.x) ||
				Math.min(pointA.y, pointB.y) > Math.max(a.y, b.y) )
		{
			return false;
		}
		
		return true;
	}
	
	function getSnapPoints()
	{
		return [pointA, pointB, mul(add(pointA, pointB), 0.5)];
	}

	function getOrigin()
	{
		return pointA;
	}
	
	function setOrigin(p)
	{
		var delta = sub(p, pointA);
		pointA = add(pointA, delta);
		pointB = add(pointB, delta);
	}
	
	this.draw 			= draw;
	this.hitTest		= hitTest;
	this.pointA 		= pointA;
	this.pointB 		= pointB;
	this.selected		= selected;
	this.getOrigin		= getOrigin;
	this.setOrigin		= setOrigin;
	this.getSnapPoints	= getSnapPoints;
}


function Grid(O, spacing, color, width, dash)
{
	var O 		= (typeof(O) === "undefined") ? new Vector(0,0) : O;
	var spacing = (typeof(color) === "undefined") ? 1 : spacing;
	var color	= (typeof(color) === "undefined") ? "rgba(153,217,234,255)" : color;
	var width	= (typeof(width) === "undefined") ? 1 : width;
	var dash	= (typeof(dash) === "undefined") ? [5,5] : dash;
	
	function draw(camera)
	{
		var l = Math.floor( (O.x + camera.getViewPosition().x - camera.getViewSize().x/2) / spacing ) * spacing;
		var r = Math.floor( (O.x + camera.getViewPosition().x + camera.getViewSize().x/2) / spacing + 1) * spacing;
		var b = Math.floor( (O.y + camera.getViewPosition().y - camera.getViewSize().y/2) / spacing ) * spacing;
		var t = Math.floor( (O.y + camera.getViewPosition().y + camera.getViewSize().y/2) / spacing + 1) * spacing;
		
		for (var x=l; x<=r; x+=spacing)
		{
			camera.drawLine(new Vector(x, b), new Vector(x, t), color, width, dash);
		}
	
		for (var y=b; y<=t; y+=spacing)
		{
			camera.drawLine(new Vector(l, y), new Vector(r, y), color, width, dash);
		}
	}
	
	this.draw = draw;
	this.spacing = spacing;
}


function MouseCursor(grid)
{
	var grid = grid;
	var pos = new Vector(0,0);
	var snap = false;
	
	function draw(camera)
	{
		var delta = new Vector(-10,-10);
		
		var pixelPos = camera.transformP(pos);
		
		camera.getGraphics().drawLine(sub(pixelPos, delta), add(pixelPos, delta));
		delta = transpose(delta);
		camera.getGraphics().drawLine(sub(pixelPos, delta), add(pixelPos, delta));
	}

	function setPos(p)
	{
		if (snap && typeof(grid) != "undefined")
		{
			pos = mul(round(div(p, grid.spacing)), grid.spacing);
		}
		else
		{
			pos = p;
		}
	}
	
	this.draw = draw;
	this.snap = snap;
	this.setPos = setPos;
}
