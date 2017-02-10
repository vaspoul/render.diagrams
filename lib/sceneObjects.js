// ----------------------------------------------------------------------------------------------------------------
// Straight wall
// ----------------------------------------------------------------------------------------------------------------
function Wall(_points)
{
	this.scene	= null;
	this.points = _points;
	this.selected = false;
	this.roughness = 0;
	this.metalness = 0;
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
	
	this.addPoint = function(point)
	{
		this.points.push(point);
	}

	this.draw = function(camera)
	{
		if (this.points.length < 2)
			return;

		var width = this.selected ? 4 : 1;

		var lastRand = (pseudoRandom.random(0)-0.5) * this.roughness;

		for (var i = 0; i != this.points.length - 1; ++i)
		{
			var steps = 10;
			var L = sub(this.points[i + 1], this.points[i]);

			if (L.length() == 0)
				continue;

			var l = L.unit();
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

			var lengthPixels = L.length() * camera.getUnitScale();
			var stepPixels = lengthPixels / Math.floor(lengthPixels / 15);
			var stepUnits = stepPixels / camera.getUnitScale();
			var stepCount = lengthPixels / stepPixels;

			for (var j=1; j<=stepCount+1; ++j)
			{
				camera.drawLine(	add(add(this.points[i], mul(l, j * stepUnits)), mul(t, 0)),
									add(add(this.points[i], mul(l, (j - 1) * stepUnits)), mul(t, stepUnits)), "#000000", width);
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
				hitResult.roughness = this.roughness;
				hitResult.metalness = this.metalness;
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

	this.deleteDragPoint = function(index)
	{
		this.points.splice(index, 1);
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
		{ name: "Normals", control: new Button("Flip", function() { this.points.reverse(); this.onChange(); }.bind(this)) },
		{ name: "Roughness", control: new Slider(0, 1, this.roughness, 0.1, function (value) { this.roughness = value; this.onChange(); }.bind(this)) },
		{ name: "Metalness", control: new Slider(0, 1, this.metalness, 0.1, function (value) { this.metalness = value; this.onChange(); }.bind(this)) },
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
	this.scene			= null;
	this.center			= centerPos;
	this.radius			= radius;
	this.startAngle		= startAngle;
	this.endAngle		= endAngle;
	this.selected		= false;
	this.convex			= true;
	this.roughness		= 0;
	this.metalness		= 0;
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
		if (this.radius <= 0)
			return;

		var width = this.selected ? 4 : 1;
		camera.drawArc(this.center, this.radius, this.startAngle, this.endAngle, "#000000", width);
		
		var angleStep = 10 * Math.PI / 180;

		if ((this.endAngle - this.startAngle) > 0)
		{
			angleStep = (this.endAngle - this.startAngle) / Math.round( Math.abs(this.endAngle - this.startAngle) / angleStep );
		}

		var arcLength = (this.endAngle-this.startAngle) * this.radius;
		var arcLengthPixels = arcLength * camera.getUnitScale();
		var stepPixels = arcLengthPixels / Math.floor(arcLengthPixels / 15);
		var stepUnits = stepPixels / camera.getUnitScale();
		var stepAngle = stepUnits / this.radius;

		var delta = stepUnits;

		if (!this.convex)
			delta = -delta;

		for (var a = this.startAngle + stepAngle; a <= this.endAngle; a += stepAngle)
		{
			var p0 = add(this.center, mul(fromAngle(a), this.radius));
			var p1 = add(this.center, mul(fromAngle(a-stepAngle), this.radius+delta));
			camera.drawLine(p0, p1, "#000000", width);
		}

		//camera.drawArc(add(this.center, mul(fromAngle(this.startAngle), this.radius)), 0.1, 0, 2 * Math.PI);
		//camera.drawText(add(this.center, mul(fromAngle(this.startAngle), this.radius)), (this.startAngle * 180 / Math.PI).toFixed(1));
		//camera.drawText(add(this.center, mul(fromAngle(this.endAngle), this.radius)), (this.endAngle * 180 / Math.PI).toFixed(1));
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

			if (OPAngle < 0)
				OPAngle	+= Math.PI*2;

			var midAngle = (this.startAngle + this.endAngle) * 0.5;

			if (Math.cos(OPAngle - midAngle) < Math.cos(this.startAngle - midAngle))
				return results;

			results[0].hit = true;
			results[0].N = OP.unit().neg();
			results[0].tRay = (midPoint+delta)/rayDirL;
			results[0].P = P;
			results[0].roughness = this.roughness;
			results[0].metalness = this.metalness;
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
			}
			else if (index==1 || index==3)
			{
				this.radius = distance(p, this.center);
			}
			else if (index==2)
			{
				this.endAngle = toAngle(sub(p, this.center));
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

				this.endAngle = toAngle(sub(pointB, this.center));

				this.radius = distance(pointA, this.center);
			}
			else if (index==2)
			{
				this.center = p;
			}
		}

		if (this.startAngle < 0)
			this.startAngle += Math.PI*2;

		if (this.endAngle < 0)
			this.endAngle += Math.PI*2;

		if (this.endAngle<=this.startAngle)
			this.startAngle -= Math.PI*2;
	}

	this.getOrigin = function()
	{
		return this.center;
	}
	
	this.setOrigin = function(p)
	{
		this.center = p;
	}

	var properties =
	[
		{ name: "Normals", control: new Button("Flip", function (value) { this.convex = !this.convex; this.onChange(); }.bind(this)) },
		{ name: "Roughness", control: new Slider(0, 1, this.roughness, 0.1, function (value) { this.roughness = value; this.onChange(); }.bind(this)) },
		{ name: "Metalness", control: new Slider(0, 1, this.metalness, 0.1, function (value) { this.metalness = value; this.onChange(); }.bind(this)) },
	];

	this.getProperties = function()
	{
		return properties;
	}
}


// ----------------------------------------------------------------------------------------------------------------
// BRDF Ray
// ----------------------------------------------------------------------------------------------------------------
function BRDFRay(O, dir)
{
	this.scene				= null;
	this.O					= O;
	this.dir				= dir;
	this.selected			= false;
	this.bounceCount		= 3;
	this.onChangeListeners	= [];
	this.BRDF				= Phong;

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
		var width = this.selected ? 4 : 2;

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
				var F0 = (bestHit.metalness !== undefined) ? bestHit.metalness : 0.04;
				var roughness = (bestHit.roughness !== undefined) ? bestHit.roughness : 0;

				camera.drawLine(ray.start, bestHit.P, "#000000", 2, [5,5]);
				//camera.drawArrow(ray.start, ray.dir, 0.3, "#00FF00", 3);
				camera.drawBRDFGraph(this.BRDF, ray.dir.unit().neg(), bestHit.N, F0, roughness, bestHit.P);
				
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

		camera.drawArrow(this.O, this.dir, this.dir.length(), "#000000", width);
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
// Point Light
// ----------------------------------------------------------------------------------------------------------------
function PointLight(O, radius)
{
	this.scene				= null;
	this.O					= O;
	this.bulbRadius			= 1;
	this.radius = radius;
	this.collisionOutline	= true;
	this.selected			= false;
	this.color				= "#FFC000";
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
		var width = this.selected ? 4 : 2;

		camera.drawStar(this.O, 7, this.bulbRadius, 0.5, this.color, width, "rgba(255,255,0,0.8)");
		camera.drawArc(this.O, this.bulbRadius*0.5, 0, Math.PI*2, this.color, width, "rgba(255,255,0,1)");

		if (this.collisionOutline)
		{
			var points = [];

			var angleStep = 2 * Math.PI / 180;

			for (var a=0; a<=Math.PI*2; a+=angleStep)
			{
				var dir = fromAngle(a);

				var bestHit = {tRay:1000};
			
				for (var o=0; o<this.scene.objects.length; ++o)
				{
					if (this.scene.objects[o].rayHitTest === undefined)
						continue;

					var hits = this.scene.objects[o].rayHitTest(this.O, dir);
				
					for (var h = 0; h != hits.length; ++h)
					{
						if (hits[h].hit && hits[h].tRay<bestHit.tRay)
						{
							bestHit = hits[h];
						}
					}
				}

				if (bestHit.tRay<this.radius)
				{
					points.push(bestHit.P);
				}
				else
				{
					points.push(add(this.O, mul(dir, this.radius)));
				}

				if (points.length>1)
				{
					camera.drawLine(points[points.length-2], points[points.length-1], this.color, width);
				}
			}

			if (points.length>1)
			{
				camera.drawLine(points[points.length-1], points[0], this.color, width);
			}
		}
		else
		{
			camera.drawArc(this.O, this.radius, 0, Math.PI * 2, this.color, 1, "rgba(0,0,0,0)");
		}
	}
	
	this.hitTest = function(a, b)
	{
		var p = min(max(this.O, a), b);

		var d = sub(p, this.O).length();

		return (d<=this.bulbRadius);
	}
	
	this.getSnapPoints = function()
	{
		return [this.O];
	}

	this.getDragPoints = function(localSpace)
	{
		var points = [this.O];

		var angleStep = 15 * Math.PI / 180;

		for (var a=0; a<=Math.PI*2; a+=angleStep)
		{
			points.push(add(this.O, mul(fromAngle(a), this.radius)));
		}

		return points;
	}

	this.drawDragPoint = function(camera, index, localSpace)
	{
		if (index==0)
		{
			camera.drawRectangle(this.O, camera.invScale(10), "#ff0000", 2);
		}
		else
		{
			var angleStep = 15 * Math.PI / 180;

			var p = add(this.O, mul(fromAngle((index - 1) * angleStep), this.radius));

			camera.drawRectangle(p, camera.invScale(10), "#ff0000", 2);
		}
	}

	this.setDragPointPos = function(index, p, localSpace)
	{
		if (index==0)
		{
			this.O = p;
		}
		else
		{
			this.radius = sub(p, this.O).length();
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
		{ name: "Bulb Radius", control: new Slider(0, 5, 1, 0.1, function (value) { this.bulbRadius = value; this.onChange(); }.bind(this)) },
		{ name: "Outer Radius", control: new Slider(0, 100, 5, 1, function (value) { this.radius = value; this.onChange(); }.bind(this)) },
		{ name: "Collision Outline", control: new TickBox(function (value) { this.collisionOutline = value; this.onChange(); }.bind(this)) }

	];

	this.getProperties = function()
	{
		return this.properties;
	}
}

// ----------------------------------------------------------------------------------------------------------------
// Spot Light
// ----------------------------------------------------------------------------------------------------------------
function SpotLight(O, target, fovDegrees)
{
	this.scene				= null;
	this.O					= O;
	this.target				= target;
	this.nearWidth			= 3;
	this.farWidth			= this.nearWidth + Math.tan(fovDegrees/2*Math.PI/180) * sub(target, O).length() * 2;
	this.collisionOutline	= true;
	this.selected			= false;
	this.color				= "#10FF00";
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
		var width = this.selected ? 4 : 2;

		var dir = sub(this.target, this.O).unit();
		var tan = transpose(dir);

		if (this.collisionOutline)
		{
			var points = [];

			var farStepCount = this.farWidth / 0.5;
			var farStep = this.farWidth / farStepCount;
			var nearStep = this.nearWidth / farStepCount;

			points.push(add(this.O, mul(tan, -this.nearWidth/2)));

			for (var fx=-this.farWidth/2, nx = -this.nearWidth/2; fx<=this.farWidth/2; fx+=farStep, nx+=nearStep)
			{
				var pointNear = add(this.O, mul(tan, nx));
				var pointFar = add(this.target, mul(tan, fx));

				var rayDir = sub(pointFar, pointNear);
				var maxRayLength = rayDir.length();
				rayDir = div(rayDir, maxRayLength);

				var bestHit = {tRay:1000};
			
				for (var o=0; o<this.scene.objects.length; ++o)
				{
					if (this.scene.objects[o].rayHitTest === undefined)
						continue;

					var hits = this.scene.objects[o].rayHitTest(pointNear, rayDir);
				
					for (var h = 0; h != hits.length; ++h)
					{
						if (hits[h].hit && hits[h].tRay<bestHit.tRay)
						{
							bestHit = hits[h];
						}
					}
				}

				if (bestHit.tRay<maxRayLength)
				{
					points.push(bestHit.P);
				}
				else
				{
					points.push(pointFar);
				}

				if (points.length>1)
				{
					camera.drawLine(points[points.length-2], points[points.length-1], this.color, width);
				}
			}

			points.push(add(this.O, mul(tan, this.nearWidth / 2)));
			camera.drawLine(points[points.length-2], points[points.length-1], this.color, width);


			if (points.length>1)
			{
				camera.drawLine(points[points.length-1], points[0], this.color, width);
			}
		}
		else
		{
			camera.drawLine(add(this.O, mul(tan, this.nearWidth/2)), add(this.O, mul(tan, -this.nearWidth/2)), this.color, width);
			camera.drawLine(add(this.target, mul(tan, this.farWidth/2)), add(this.target, mul(tan, -this.farWidth/2)), this.color, width);

			camera.drawLine(add(this.O, mul(tan, this.nearWidth/2)), add(this.target, mul(tan, this.farWidth/2)), this.color, width);
			camera.drawLine(add(this.O, mul(tan, -this.nearWidth/2)), add(this.target, mul(tan, -this.farWidth/2)), this.color, width);
		}

		camera.drawStar(this.O, 7, 0.5, 0.5, this.color, width, "rgba(255,255,0,0.8)");
	}
	
	this.hitTest = function(a, b)
	{
		var p = min(max(this.O, a), b);

		var d = sub(p, this.O).length();

		return (d<=0.5);
	}
	
	this.getSnapPoints = function()
	{
		return [this.O];
	}

	this.getDragPoints = function(localSpace)
	{
		var points = [this.O, this.target];
		
		var dir = sub(this.target, this.O).unit();
		var tan = transpose(dir);

		points.push(add(this.O, mul(tan, this.nearWidth/2)));
		points.push(add(this.O, mul(tan, -this.nearWidth/2)));
		points.push(add(this.target, mul(tan, this.farWidth/2)));
		points.push(add(this.target, mul(tan, -this.farWidth/2)));

		return points;
	}

	this.drawDragPoint = function(camera, index, localSpace)
	{
		var dir = sub(this.target, this.O).unit();
		var tan = transpose(dir);

		if (index == 0)
		{
			camera.drawRectangle(this.O, camera.invScale(10), "#ff0000", 2);
		}
		else if (index==1)
		{
			camera.drawRectangle(this.target, camera.invScale(10), "#ff0000", 2);
		}
		else if (index==2)
		{
			camera.drawRectangle(add(this.O, mul(tan, this.nearWidth / 2)), camera.invScale(10), "#ff0000", 2);
		}
		else if (index==3)
		{
			camera.drawRectangle(add(this.O, mul(tan, -this.nearWidth/2)), camera.invScale(10), "#ff0000", 2);
		}
		else if (index==4)
		{
			camera.drawRectangle(add(this.target, mul(tan, this.farWidth / 2)), camera.invScale(10), "#ff0000", 2);
		}
		else if (index==5)
		{
			camera.drawRectangle(add(this.target, mul(tan, -this.farWidth/2)), camera.invScale(10), "#ff0000", 2);
		}
	}

	this.setDragPointPos = function(index, p, localSpace)
	{
		if (index==0)
		{
			this.O = p;
		}
		else if (index==1)
		{
			this.target = p;
		}
		else if (index==2 || index==3)
		{
			var dir = sub(this.target, this.O).unit();
			var tan = transpose(dir);

			this.nearWidth = Math.abs(dot(sub(p, this.O), tan))*2;
		}
		else if (index==4 || index==5)
		{
			var dir = sub(this.target, this.O).unit();
			var tan = transpose(dir);

			this.farWidth = Math.abs(dot(sub(p, this.target), tan))*2;
		}
	}

	this.getOrigin = function()
	{
		return this.O;
	}
	
	this.setOrigin = function(p)
	{
		var delta = sub(p, this.O);

		this.O = add(this.O, delta);
		this.target = add(this.target, delta);
	}

	this.properties =
	[
		{ name: "Collision Outline", control: new TickBox(function (value) { this.collisionOutline = value; this.onChange(); }.bind(this)) }

	];

	this.getProperties = function()
	{
		return this.properties;
	}
}

// ----------------------------------------------------------------------------------------------------------------
// Parallel Light
// ----------------------------------------------------------------------------------------------------------------
function ParallelLight(O, dir)
{
	this.scene				= null;
	this.O					= O;
	this.dir				= dir;
	this.width				= 10;
	this.collisionOutline	= true;
	this.selected			= false;
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
		var width = this.selected ? 4 : 2;

		var tan = transpose(this.dir);

		if (this.collisionOutline)
		{
			var points = [];

			var stepCount = this.width / 0.25;
			var step = this.width / stepCount;

			points.push(add(this.O, mul(tan, -this.width / 2)));

			for (var x=-this.width/2; x<=this.width/2; x+=step)
			{
				var point = add(this.O, mul(tan, x));

				var bestHit = {tRay:1000};
			
				for (var o=0; o<this.scene.objects.length; ++o)
				{
					if (this.scene.objects[o].rayHitTest === undefined)
						continue;

					var hits = this.scene.objects[o].rayHitTest(point, this.dir);
				
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
					points.push(bestHit.P);
				}
				else
				{
					points.push(add(point, mul(this.dir, 1000)));
				}

				if (points.length>1)
				{
					camera.drawLine(points[points.length-2], points[points.length-1], "#00C0FF", width);
				}
			}

			points.push(add(this.O, mul(tan, this.width / 2)));
			camera.drawLine(points[points.length-2], points[points.length-1], "#00C0FF", width);


			if (points.length>1)
			{
				camera.drawLine(points[points.length-1], points[0], "#00C0FF", width);
			}
		}
		else
		{
			camera.drawLine(add(this.O, mul(tan, this.width/2)), add(this.O, mul(tan, -this.width/2)), "#00C0FF", width);
		}

		// Draw arrows
		{
			var stepCount = Math.floor(this.width / 0.8);
			var step = this.width / stepCount;

			for (var x=0; x<=stepCount; ++x)
			{
				var point = add(this.O, mul(tan, x*step-this.width/2));

				if (x == stepCount/2)
					continue;

				camera.drawArrow(point, this.dir, 2, "#00C0FF", 2);
			}

			camera.drawArrow(this.O, this.dir, 3, "#00C0FF", 2);
		}

		camera.drawStar(this.O, 7, 0.5, 0.5, "#00C0FF", width, "rgba(255,255,0,0.8)");
	}
	
	this.hitTest = function(a, b)
	{
		var p = min(max(this.O, a), b);

		var d = sub(p, this.O).length();

		return (d<=0.5);
	}
	
	this.getSnapPoints = function()
	{
		return [this.O];
	}

	this.getDragPoints = function(localSpace)
	{
		var points = [this.O, add(this.O, mul(this.dir, 3))];

		var tan = transpose(this.dir);

		points.push(add(this.O, mul(tan, this.width/2)));
		points.push(add(this.O, mul(tan, -this.width/2)));

		return points;
	}

	this.drawDragPoint = function(camera, index, localSpace)
	{
		var tan = transpose(this.dir);

		if (index == 0)
		{
			camera.drawRectangle(this.O, camera.invScale(10), "#ff0000", 2);
		}
		else if (index==1)
		{
			camera.drawRectangle(add(this.O, mul(this.dir, 3)), camera.invScale(10), "#ff0000", 2);
		}
		else if (index==2)
		{
			camera.drawRectangle(add(this.O, mul(tan, this.width/2)), camera.invScale(10), "#ff0000", 2);
		}
		else if (index==3)
		{
			camera.drawRectangle(add(this.O, mul(tan, -this.width/2)), camera.invScale(10), "#ff0000", 2);
		}
	}

	this.setDragPointPos = function(index, p, localSpace)
	{
		if (index==0)
		{
			this.O = p;
		}
		else if (index==1)
		{
			this.dir = sub(p, this.O).unit();
		}
		else if (index==2 || index==3)
		{
			this.width = sub(p, this.O).length()*2;
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
		{ name: "Collision Outline", control: new TickBox(function (value) { this.collisionOutline = value; this.onChange(); }.bind(this)) }

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
