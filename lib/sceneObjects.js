
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

	function getDragPoints()
	{
		return [pointA, pointB];
	}

	function setDragPointPos(index, p)
	{
		if (index==0)
		{
			pointA = p;
		}
		else if (index==1)
		{
			pointB = p;
		}
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
	
	this.draw 				= draw;
	this.hitTest			= hitTest;
	this.pointA 			= pointA;
	this.pointB 			= pointB;
	this.selected			= selected;
	this.getOrigin			= getOrigin;
	this.setOrigin			= setOrigin;
	this.getSnapPoints		= getSnapPoints;
	this.getDragPoints		= getDragPoints;
	this.setDragPointPos	= setDragPointPos;
}


function ArcWall(centerPos, radius, startAngle, endAngle)
{
	var center		= centerPos;
	var radius		= radius;
	var startAngle	= startAngle;
	var endAngle	= endAngle;
	var selected	= false;
	
	function draw(camera)
	{
		var width = this.selected ? 4 : 1;
		camera.drawArc(center, radius, startAngle, endAngle, "#000000", width);
		
		var angleStep = 10 * Math.PI / 180;
		angleStep = (endAngle - startAngle) / Math.round( (endAngle - startAngle) / angleStep );

		var delta = Math.sin(angleStep) * radius;

		for (var a=startAngle+angleStep; a<=endAngle; a += angleStep)
		{
			var p0 = add(center, mul(fromAngle(a), radius));
			var p1 = add(center, mul(fromAngle(a-angleStep), radius+delta));
			camera.drawLine(p0, p1, "#000000", width);
		}
	}
	
	function hitTest(a, b)
	{
		var rectMin = min(a, b);
		var rectMax = max(a, b);
		var rectCenter = avg(a, b);

		var p = add(center, mul(sub(rectCenter, center).unit(), radius));

		if (	p.x>rectMax.x ||
				p.x<rectMin.x ||
				p.y>rectMax.y ||
				p.y < rectMin.y)
		{
			return false;
		}

		var a = toAngle(sub(new Vector(rectMin.x, rectMin.y), center));
		if (a >= startAngle && a <= endAngle)
			return true;
		
		var a = toAngle(sub(new Vector(rectMin.x, rectMax.y), center));
		if (a >= startAngle && a <= endAngle)
			return true;

		var a = toAngle(sub(new Vector(rectMax.x, rectMin.y), center));
		if (a >= startAngle && a <= endAngle)
			return true;

		var a = toAngle(sub(new Vector(rectMax.x, rectMax.y), center));
		if (a >= startAngle && a <= endAngle)
			return true;

		return false;
	}
	
	function getSnapPoints()
	{
		var points = [center, add(center, mul(fromAngle(startAngle), radius)), add(center, mul(fromAngle(endAngle), radius))];

		var angleStep = 45 * Math.PI / 180;

		for (var a=Math.ceil(startAngle/angleStep)*angleStep; a<=Math.floor(endAngle/angleStep)*angleStep; a+=angleStep)
		{
			points.push(add(center, mul(fromAngle(a), radius)));
		}

		return points;
	}

	function getOrigin()
	{
		return center;
	}
	
	function setOrigin(p)
	{
		center = p;
	}
	
	this.draw 			= draw;
	this.hitTest		= hitTest;
	this.center			= center;
	this.radius			= radius;
	this.startAngle		= startAngle;
	this.endAngle		= endAngle;
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
	var shape = "cross";
	
	function draw(camera)
	{
		if (shape == "cross")
		{
			camera.drawCross(pos, camera.invScale(10), 45 * Math.PI/180);
		}
		else if (shape == "angle")
		{
			var delta = new Vector(15,0);
				
			delta = camera.invScale(delta);
			
			delta = rotate(delta, -20 * Math.PI/180);

			camera.drawLine(pos, add(pos, delta));

			delta = rotate(delta, -50 * Math.PI / 180);

			camera.drawLine(pos, add(pos, delta));
		}
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
	
	this.setShape = function(s)
	{
		shape = s;
	}

	this.draw = draw;
	this.snap = snap;
	this.setPos = setPos;
	this.pos = pos;
	//this.shape = shape;
}
