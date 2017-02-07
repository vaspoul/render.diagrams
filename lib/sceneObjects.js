// ----------------------------------------------------------------------------------------------------------------
// Straight wall
// ----------------------------------------------------------------------------------------------------------------
function Wall(_points)
{
	this.points = _points;
	this.selected = false;
	this.roughness = 0;
	this.onChangeListeners	= [];

	this.addChangeListener = function(listener)
	{
		this.onChangeListeners.push(listener);
	}

	this.onChange = function()
	{
		for (var i=0; i!=this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this);
		}
	}
	
	this.draw = function(camera)
	{
		var width = this.selected ? 4 : 1;

		var lastRand = (pseudoRandom.random(0)-0.5) * this.roughness;

		for (var i = 0; i != this.points.length - 1; ++i)
		{
			var steps = 10;
			var L = sub(this.points[i+1], this.points[i]);
			var l = div(L, steps);
			var t = transpose(l)
			var t0 = t.unit().neg();

			if (this.roughness == 0)
			{
				camera.drawLine(this.points[i], this.points[i + 1], "#000000", width);
			}
			else
			{
				var l0 = div(L, 60);

				for (var j=0; j<60; ++j)
				{
					var newRand = (pseudoRandom.random(j)-0.5) * this.roughness;
					camera.drawLine(add(add(this.points[i], mul(l0, j)), mul(t0,lastRand)), add(add(this.points[i], mul(l0, j + 1)), mul(t0,newRand)), "#000000", width);
					lastRand = newRand;
				}
			}

			for (var j=0; j<steps; ++j)
			{
				var newRand = (pseudoRandom.random(j*6)-0.5) * this.roughness;
				camera.drawLine(add(add(this.points[i], mul(l,j)),t), add(add(this.points[i], mul(l,j+1)), mul(t0,newRand)), "#000000", width);
			}
		}
	}
	
	this.hitTest = function(a, b)
	{
		for (var i = 0; i != this.points.length - 1; ++i)
		{
			var L = sub(this.points[i+1], this.points[i]);
			var l = L.length();
			L  = div(L, l);
			var C = avg(a, b);
			var AC = sub(C, this.points[i]);
			var d = dot(AC, L);

			d = Math.max(0, Math.min(l, d));

			var p = add(this.points[i], mul(L, d));

			if (	p.x < Math.min(a.x, b.x) ||
					p.y < Math.min(a.y, b.y) ||
					p.x > Math.max(a.x, b.x) ||
					p.y > Math.max(a.y, b.y) )
			{
				continue;
			}
		
			return true;
		}

		return false;
	}
	
	this.rayHitTest = function(rayPos, rayDir)
	{
		var results = [];

		for (var i = 0; i != this.points.length - 1; ++i)
		{
			var hitResult = intersectRayLine(rayPos, rayDir, this.points[i], this.points[i + 1]);

			if (hitResult.hit)
			{
				results.push(hitResult);
			}
		}

		return results;
	}

	this.getSnapPoints = function()
	{
		var snaps = [];

		for (var i = 0; i != this.points.length - 1; ++i)
		{
			snaps.push(this.points[i]);
			snaps.push(avg(this.points[i], this.points[i+1]));
		}

		snaps.push(this.points[this.points.length-1]);

		return snaps;
	}

	this.getDragPoints = function(localSpace)
	{
		var points = [];

		for (var i = 0; i != this.points.length; ++i)
		{
			if (localSpace)
			{
				if (i==0)
				{
					var index0 = 0;
					var index1 = 1;
					points.push( add(this.points[index0], div(sub(this.points[index1], this.points[index0]), 20)) );
				}
				else if (i==this.points.length-1)
				{
					var index0 = this.points.length-1;
					var index1 = index0-1;
					points.push( add(this.points[index0], div(sub(this.points[index1], this.points[index0]), 20)) );
				}
				else
				{
					points.push( add(this.points[i], div(sub(this.points[i-1], this.points[i]), 20)) );
					points.push( add(this.points[i], div(sub(this.points[i+1], this.points[i]), 20)) );
				}
			}
			else
			{
				points.push(this.points[i]);
			}
		}

		return points;
	}

	this.drawDragPoint = function(camera, index, localSpace)
	{
		if (localSpace)
		{
			var index0 = Math.floor(index/2) + (index%2);
			var index1 = (index % 2) > 0 ? (index0 - 1) : (index0 + 1);

			var L = div(sub(this.points[index1], this.points[index0]), 10);

			camera.drawLine(this.points[index0], add(this.points[index0], L), "#ff0000", 4);
		}
		else
		{
			camera.drawRectangle(this.points[index], camera.invScale(10), "#ff0000", 2);
		}
	}

	this.setDragPointPos = function(index, p, localSpace)
	{
		if (localSpace)
		{
			var index0 = Math.floor(index/2) + (index%2);
			var index1 = (index % 2) > 0 ? (index0 - 1) : (index0 + 1);

			var L = sub(this.points[index0], this.points[index1]).unit();

			this.points[index0] = add(this.points[index1], mul(dot(sub(p, this.points[index1]), L), L));
		}
		else
		{
			this.points[index] = p;
		}
	}

	this.getOrigin = function()
	{
		return this.points[0];
	}
	
	this.setOrigin = function(p)
	{
		var delta = sub(p, this.points[0]);

		for (var i = 0; i != this.points.length; ++i)
		{
			this.points[i] = add(this.points[i], delta);
		}
	}

	var properties =
	[
		{name: "Roughness", control:new Slider(0, 1, this.roughness, 0.1, function(value){ this.roughness = value; this.onChange(); }.bind(this) )}
	];

	this.getProperties = function()
	{
		return properties;
	}
}

// ----------------------------------------------------------------------------------------------------------------
// Arc wall
// ----------------------------------------------------------------------------------------------------------------
function ArcWall(centerPos, radius, startAngle, endAngle)
{
	this.center			= centerPos;
	this.radius			= radius;
	this.startAngle		= startAngle;
	this.endAngle		= endAngle;
	this.selected		= false;
	this.convex			= true;
	this.onChangeListeners	= [];

	this.addChangeListener = function(listener)
	{
		this.onChangeListeners.push(listener);
	}

	this.onChange = function()
	{
		for (var i=0; i!=this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this);
		}
	}
	
	this.draw = function(camera)
	{
		var width = this.selected ? 4 : 1;
		camera.drawArc(this.center, this.radius, this.startAngle, this.endAngle, "#000000", width);
		
		var angleStep = 10 * Math.PI / 180;

		if ((this.endAngle - this.startAngle) > 0)
		{
			angleStep = (this.endAngle - this.startAngle) / Math.round( Math.abs(this.endAngle - this.startAngle) / angleStep );
		}

		var delta = Math.sin(angleStep) * this.radius;

		if (!this.convex)
			delta = -delta;

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
	
	this.rayHitTest = function(rayPos, rayDir)
	{
		var results = [{N:rayDir, P:rayPos, hit:false, tRay:0}];

		var rayDirL = rayDir.length();

		var RO = sub(this.center, rayPos);

		var perpDist = Math.abs(dot(RO, transpose(rayDir))/rayDirL);

		if (perpDist >= this.radius)
			return results;

		var RONorm = RO.unit();

		var midPoint = dot(RO, rayDir)/rayDirL;

		if (perpDist < this.radius)
		{
			var delta = Math.sqrt(this.radius * this.radius - perpDist*perpDist);

			if (!this.convex)
				delta *= -1;

			if ((midPoint + delta) < 0)
				return results;

			var P = add(rayPos, mul(rayDir, (midPoint+delta)/rayDirL));
			var OP = sub(P, this.center);
			var OPAngle = toAngle(OP);

			if ((OPAngle < this.startAngle) || (OPAngle > this.endAngle))
				return results;

			results[0].hit = true;
			results[0].N = OP.unit().neg();
			results[0].tRay = (midPoint+delta)/rayDirL;
			results[0].P = P;
		}

		return results;
	}

	this.getSnapPoints = function ()
	{
		var points = [this.center, add(this.center, mul(fromAngle(this.startAngle), this.radius)), add(this.center, mul(fromAngle(this.endAngle), this.radius))];

		var angleStep = 45 * Math.PI / 180;

		for (var a=Math.ceil(this.startAngle/angleStep)*angleStep; a<=Math.floor(this.endAngle/angleStep)*angleStep; a+=angleStep)
		{
			points.push(add(this.center, mul(fromAngle(a), this.radius)));
		}

		return points;
	}

	this.getDragPoints = function(localSpace)
	{
		var points = [];

		if (localSpace)
		{
			points.push(add(this.center, mul(fromAngle(this.startAngle + (this.endAngle-this.startAngle)/20), this.radius)));
			points.push(add(this.center, mul(fromAngle(this.startAngle), this.radius*0.95)));

			points.push(add(this.center, mul(fromAngle(this.endAngle - (this.endAngle - this.startAngle) / 20), this.radius)));
			points.push(add(this.center, mul(fromAngle(this.endAngle), this.radius*0.95)));

			points.push(add(this.center, mul(fromAngle((this.startAngle + this.endAngle) / 2), this.radius)));
		}
		else
		{
			points.push(add(this.center, mul(fromAngle(this.startAngle), this.radius)));
			points.push(add(this.center, mul(fromAngle(this.endAngle), this.radius)));
			points.push(this.center);
		}

		return points;
	}

	this.drawDragPoint = function(camera, index, localSpace)
	{
		if (localSpace)
		{
			if (index == 0)
			{
				camera.drawArc(this.center, this.radius, this.startAngle, this.startAngle + (this.endAngle-this.startAngle)/10, "#ff0000", 4);
			}
			else if (index == 1)
			{
				camera.drawLine(add(this.center, mul(fromAngle(this.startAngle), this.radius)), add(this.center, mul(fromAngle(this.startAngle), this.radius*0.9)), "#ff0000", 4);
			}
			else if (index == 2)
			{
				camera.drawArc(this.center, this.radius, this.endAngle - (this.endAngle-this.startAngle)/10, this.endAngle, "#ff0000", 4);
			}
			else if (index == 3)
			{
				camera.drawLine(add(this.center, mul(fromAngle(this.endAngle), this.radius)), add(this.center, mul(fromAngle(this.endAngle), this.radius*0.9)), "#ff0000", 4);
			}
			else if (index == 4)
			{
				camera.drawRectangle(add(this.center, mul(fromAngle((this.startAngle + this.endAngle) / 2), this.radius)), camera.invScale(10), "#ff0000", 2);
			}
		}
		else
		{
			if (index == 0)
				camera.drawRectangle(add(this.center, mul(fromAngle(this.startAngle), this.radius)), camera.invScale(10), "#ff0000", 2);
			else if (index == 1)
				camera.drawRectangle(add(this.center, mul(fromAngle(this.endAngle), this.radius)), camera.invScale(10), "#ff0000", 2);
			else if (index == 2)
				camera.drawRectangle(this.center, camera.invScale(10), "#ff0000", 2);
		}
	}

	this.setDragPointPos = function(index, p, localSpace)
	{
		if (localSpace)
		{
			if (index==0)
			{
				this.startAngle = toAngle(sub(p, this.center));

				if (this.endAngle <= this.startAngle)
					this.startAngle -= Math.PI*2;
			}
			else if (index==1 || index==3)
			{
				this.radius = distance(p, this.center);
			}
			else if (index==2)
			{
				this.endAngle = toAngle(sub(p, this.center));

				if (this.endAngle<=this.startAngle)
					this.endAngle += Math.PI*2;
			}
			else if (index==4)
			{
				this.convex = distance(p, this.center)<this.radius;
			}
		}
		else
		{
			if (index==0 || index==1)
			{
				var pointA = (index==0) ? p : add(this.center, mul(fromAngle(this.startAngle), this.radius));
				var pointB = (index==1) ? p : add(this.center, mul(fromAngle(this.endAngle), this.radius));

				this.center = avg(pointA, pointB);

				this.startAngle = toAngle(sub(pointA, this.center));

				if (this.endAngle <= this.startAngle)
					this.startAngle -= Math.PI*2;

				this.endAngle = toAngle(sub(pointB, this.center));

				if (this.endAngle<=this.startAngle)
					this.endAngle += Math.PI*2;

				this.radius = distance(pointA, this.center);
			}
			else if (index==2)
			{
				this.center = p;
			}
		}
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

// ----------------------------------------------------------------------------------------------------------------
// BRDF Ray
// ----------------------------------------------------------------------------------------------------------------
function BRDFRay(O, dir, scene)
{
	this.O					= O;
	this.dir				= dir;
	this.scene				= scene;
	this.selected			= false;
	this.bounceCount		= 3;
	this.onChangeListeners	= [];

	this.addChangeListener = function(listener)
	{
		this.onChangeListeners.push(listener);
	}

	this.onChange = function()
	{
		for (var i=0; i!=this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this);
		}
	}

	this.draw = function(camera)
	{
		var width = this.selected ? 4 : 1;

		camera.drawArrow(this.O, this.dir, this.dir.length(), "#000000", width);


		var rays = [{ start: this.O, dir: this.dir }];

		for (var r=0; r<rays.length; ++r)
		{
			var ray = rays[r];
			
			var bestHit = {tRay:1000};
			
			for (var o=0; o<this.scene.objects.length; ++o)
			{
				if (this.scene.objects[o].rayHitTest === undefined)
					continue;

				var hits = this.scene.objects[o].rayHitTest(ray.start, ray.dir);
				
				for (var h = 0; h != hits.length; ++h)
				{
					if (hits[h].hit && hits[h].tRay<bestHit.tRay)
					{
						bestHit = hits[h];
					}
				}
			}

			if (bestHit.tRay<1000)
			{
				camera.drawLine(ray.start, bestHit.P, "#000000", 2, [5,5]);
				//camera.drawArrow(ray.start, ray.dir, 0.3, "#00FF00", 3);
				//camera.drawBRDFGraph(BRDF, ray.dir.unit().neg(), bestHit.N, F0, roughness, bestHit.P);
				
				var newRay = { start:0, dir:0 };
				newRay.start = bestHit.P;
				newRay.dir = reflect(ray.dir, bestHit.N);
				rays.push(newRay);
			}
			
			if (rays.length>this.bounceCount+1)
			{
				break;
			}
		}

	}
	
	this.hitTest = function(a, b)
	{
		var pointB = add(this.O, this.dir);

		var L = this.dir;
		var l = L.length();
		L  = div(L, l);
		var C = avg(a, b);
		var AC = sub(C, this.O);
		var d = dot(AC, L);

		d = Math.max(0, Math.min(l, d));

		var p = add(this.O, mul(L, d));

		if (	p.x < Math.min(a.x, b.x) ||
				p.y < Math.min(a.y, b.y) ||
				p.x > Math.max(a.x, b.x) ||
				p.y > Math.max(a.y, b.y) )
		{
			return false;
		}
		
		return true;
	}
	
	this.getSnapPoints = function()
	{
		return [this.O];
	}

	this.getDragPoints = function(localSpace)
	{
		return [this.O, add(this.O, this.dir)];
	}

	this.drawDragPoint = function(camera, index, localSpace)
	{
		if (index==0)
		{
			camera.drawRectangle(this.O, camera.invScale(10), "#ff0000", 2);
		}
		else
		{
			if (localSpace)
			{
				var delta = mul(this.dir.unit(), camera.invScale(10));

				camera.drawLine(add(add(this.O, this.dir), delta), sub(add(this.O, this.dir), delta), "#ff0000", 4);
			}
			else
			{
				camera.drawRectangle(add(this.O, this.dir), camera.invScale(10), "#ff0000", 2);
			}
		}
	}

	this.setDragPointPos = function(index, p, localSpace)
	{
		if (index==0)
		{
			var pointB = add(this.O, this.dir);

			this.dir = sub(pointB, p)
			this.O = p;
		}
		else if (index==1)
		{
			if (localSpace)
			{
				var L = this.dir.unit();
				this.dir = mul(dot(sub(p, this.O), L), L);
			}
			else
			{
				this.dir = sub(p, this.O);
			}
		}
	}

	this.getOrigin = function()
	{
		return this.O;
	}
	
	this.setOrigin = function(p)
	{
		this.O = p;
	}

	this.properties =
	[
		{name: "Bounce Count", control:new Slider(0, 10, 3, 1, function(value){ this.bounceCount = value; this.onChange(); }.bind(this) )}
	];

	this.getProperties = function()
	{
		return this.properties;
	}
}


// ----------------------------------------------------------------------------------------------------------------
// Regular grid
// ----------------------------------------------------------------------------------------------------------------
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

// ----------------------------------------------------------------------------------------------------------------
// Mouse cursor
// ----------------------------------------------------------------------------------------------------------------
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
