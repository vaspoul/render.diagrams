
function Wall(pointA, pointB)
{
	var pointA = pointA;
	var pointB = pointB;
	
	function draw(camera)
	{
		camera.drawLine(pointA, pointB);
		
		var steps = 10;
		var L = sub(pointB, pointA);
		var l = div(L, steps);
		var t = transpose(l)

		for (var i=0; i<10; ++i)
		{
				camera.drawLine(add(add(pointA, mul(l,i)),t), add(pointA, mul(l,i+1)));
		}
	}
	
	this.draw = draw;
}


function Grid(O, spacing, color, width, dash)
{
	var O 		= O;
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
}
