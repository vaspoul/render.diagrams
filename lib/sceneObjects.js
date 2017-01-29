
function Wall(pointA, pointB)
{
	this.pointA = pointA;
	this.pointB = pointB;
	this.selected = false;
	
	this.draw = function(camera)
	{
		var width = this.selected ? 4 : 1;
		camera.drawLine(this.pointA, this.pointB, "#000000", width);
		
		var steps = 10;
		var L = sub(this.pointB, this.pointA);
		var l = div(L, steps);
		var t = transpose(l)

		for (var i=0; i<10; ++i)
		{
			camera.drawLine(add(add(this.pointA, mul(l,i)),t), add(this.pointA, mul(l,i+1)), "#000000", width);
		}
	}
	
	this.hitTest = function(a, b)
	{
		if (	Math.max(this.pointA.x, this.pointB.x) < Math.min(a.x, b.x) ||
				Math.max(this.pointA.y, this.pointB.y) < Math.min(a.y, b.y) ||
				Math.min(this.pointA.x, this.pointB.x) > Math.max(a.x, b.x) ||
				Math.min(this.pointA.y, this.pointB.y) > Math.max(a.y, b.y) )
		{
			return false;
		}
		
		return true;
	}
	
	this.getSnapPoints = function()
	{
		return [this.pointA, this.pointB, mul(add(this.pointA, this.pointB), 0.5)];
	}

	this.getDragPoints = function()
	{
		return [this.pointA, this.pointB];
	}

	this.setDragPointPos = function(index, p)
	{
		if (index==0)
		{
			this.pointA = p;
		}
		else if (index==1)
		{
			this.pointB = p;
		}
	}

	this.getOrigin = function()
	{
		return this.pointA;
	}
	
	this.setOrigin = function(p)
	{
		var delta = sub(p, this.pointA);
		this.pointA = add(this.pointA, delta);
		this.pointB = add(this.pointB, delta);
	}
}


function ArcWall(centerPos, radius, startAngle, endAngle)
{
	this.center		= centerPos;
	this.radius		= radius;
	this.startAngle	= startAngle;
	this.endAngle	= endAngle;
	this.selected	= false;
	
	this.draw = function(camera)
	{
		var width = this.selected ? 4 : 1;
		camera.drawArc(this.center, this.radius, this.startAngle, this.endAngle, "#000000", width);
		
		var angleStep = 10 * Math.PI / 180;
		angleStep = (this.endAngle - this.startAngle) / Math.round( (this.endAngle - this.startAngle) / angleStep );

		var delta = Math.sin(angleStep) * this.radius;

		for (var a=this.startAngle+angleStep; a<=this.endAngle; a += angleStep)
		{
			var p0 = add(this.center, mul(fromAngle(a), this.radius));
			var p1 = add(this.center, mul(fromAngle(a-angleStep), this.radius+delta));
			camera.drawLine(p0, p1, "#000000", width);
		}
	}
	
	this.hitTest = function(a, b)
	{
		var rectMin = min(a, b);
		var rectMax = max(a, b);
		var rectCenter = avg(a, b);

		var p = add(this.center, mul(sub(rectCenter, this.center).unit(), this.radius));

		if (	p.x>rectMax.x ||
				p.x<rectMin.x ||
				p.y>rectMax.y ||
				p.y < rectMin.y)
		{
			return false;
		}

		var a = toAngle(sub(new Vector(rectMin.x, rectMin.y), this.center));
		if (a >= this.startAngle && a <= this.endAngle)
			return true;
		
		var a = toAngle(sub(new Vector(rectMin.x, rectMax.y), this.center));
		if (a >= this.startAngle && a <= this.endAngle)
			return true;

		var a = toAngle(sub(new Vector(rectMax.x, rectMin.y), this.center));
		if (a >= this.startAngle && a <= this.endAngle)
			return true;

		var a = toAngle(sub(new Vector(rectMax.x, rectMax.y), this.center));
		if (a >= this.startAngle && a <= this.endAngle)
			return true;

		return false;
	}
	
	this.getSnapPoints = function()
	{
		var points = [this.center, add(this.center, mul(fromAngle(this.startAngle), this.radius)), add(this.center, mul(fromAngle(this.endAngle), this.radius))];

		var angleStep = 45 * Math.PI / 180;

		for (var a=Math.ceil(this.startAngle/angleStep)*angleStep; a<=Math.floor(this.endAngle/angleStep)*angleStep; a+=angleStep)
		{
			points.push(add(this.center, mul(fromAngle(a), this.radius)));
		}

		return points;
	}

	this.getOrigin = function()
	{
		return this.center;
	}
	
	this.setOrigin = function(p)
	{
		this.center = p;
	}
}

function Grid(O, spacing, color, width, dash)
{
	this.O 			= (typeof(O) === "undefined") ? new Vector(0,0) : O;
	this.spacing	= (typeof(color) === "undefined") ? 1 : spacing;
	this.color		= (typeof(color) === "undefined") ? "rgba(153,217,234,255)" : color;
	this.width		= (typeof(width) === "undefined") ? 1 : width;
	this.dash		= (typeof(dash) === "undefined") ? [5,5] : dash;
	
	this.draw = function(camera)
	{
		var l = Math.floor( (this.O.x + camera.getViewPosition().x - camera.getViewSize().x/2) / this.spacing ) * this.spacing;
		var r = Math.floor( (this.O.x + camera.getViewPosition().x + camera.getViewSize().x/2) / this.spacing + 1) * this.spacing;
		var b = Math.floor( (this.O.y + camera.getViewPosition().y - camera.getViewSize().y/2) / this.spacing ) * this.spacing;
		var t = Math.floor( (this.O.y + camera.getViewPosition().y + camera.getViewSize().y/2) / this.spacing + 1) * this.spacing;
		
		for (var x=l; x<=r; x+=this.spacing)
		{
			camera.drawLine(new Vector(x, b), new Vector(x, t), this.color, this.width, this.dash);
		}
	
		for (var y=b; y<=t; y+=this.spacing)
		{
			camera.drawLine(new Vector(l, y), new Vector(r, y), this.color, this.width, this.dash);
		}
	}
}


function MouseCursor(grid)
{
	this.grid = grid;
	this.pos = new Vector(0,0);
	this.snap = false;
	this.shape = "cross";
	
	this.draw = function(camera)
	{
		if (this.shape == "cross")
		{
			camera.drawCross(this.pos, camera.invScale(10), 45 * Math.PI/180);
		}
		else if (this.shape == "angle")
		{
			var delta = new Vector(15,0);
				
			delta = camera.invScale(delta);
			
			delta = rotate(delta, -20 * Math.PI/180);

			camera.drawLine(this.pos, add(this.pos, delta));

			delta = rotate(delta, -50 * Math.PI / 180);

			camera.drawLine(this.pos, add(this.pos, delta));
		}
	}
}
