// ----------------------------------------------------------------------------------------------------------------
// Straight wall
// ----------------------------------------------------------------------------------------------------------------
function Wall(_points)
{
	this.scene				= null;
	this.points				= _points;
	this.closed				= false;
	this.selected			= false;
	this.visible			= true;
	this.frozen				= false;
	this.color				= "#000000";
	this.roughness			= 0;
	this.metalness			= 0;
	this.onChangeListeners	= [];
	this.boundsMin			= new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
	this.boundsMax			= new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

	this.getBoundsMin = function ()
	{
		return this.boundsMin;
	}

	this.getBoundsMax = function()
	{
		return this.boundsMax;
	}

	this.saveAsJavascript = function ()
	{
		var str = "var w = new Wall([";

		for (var i = 0; i != this.points.length; ++i)
		{
			if (i > 0)
			{
				str += ", ";
			}

			str += "new Vector(" + this.points[i].x + ", " + this.points[i].y + ")";
		}

		str += "]);\n";

		str += "w.closed = " + this.closed + ";\n";
		str += "w.roughness = " + this.roughness + ";\n";
		str += "w.metalness = " + this.metalness + ";\n";
		str += "w.color = \"" + this.color + "\";\n";
		str += "w.visible = " + this.visible + ";\n";
		str += "w.frozen = " + this.frozen + ";\n";

		str += "scene.addObject(w);\n";
		return str;
	}

	this.addChangeListener = function(listener)
	{
		this.onChangeListeners.push(listener);
	}

	this.onChange = function()
	{
		this.boundsMin = new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
		this.boundsMax = new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

		for (var i = 0; i != this.points.length; ++i)
		{
			this.boundsMin = min(this.boundsMin, this.points[i]);
			this.boundsMax = max(this.boundsMax, this.points[i]);
		}

		for (var i=0; i!=this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this);
		}
	}
	
	this.addPoint = function(point)
	{
		this.points.push(point);

		this.onChange();
	}

	this.draw = function(camera)
	{
		if (this.visible == false)
			return;

		if (this.points.length < 2)
			return;

		var width = this.selected ? 4 : 1;

		var lastRand = (pseudoRandom.random(0)-0.5) * this.roughness;

		var count = this.closed ? this.points.length : this.points.length - 1;

		var linePoints = [];
		var hatchingPoints = [];

		for (var i = 0; i != count; ++i)
		{
			var steps = 10;
			var L = sub(this.points[(i+1)%this.points.length], this.points[i]);

			if (L.length() == 0)
				continue;

			var l = L.unit();
			var t = transpose(l)
			var t0 = t.unit().neg();

			if (this.roughness == 0)
			{
				linePoints.push(this.points[i]);
				linePoints.push(this.points[(i+1)%this.points.length]);

			}
			else
			{
				var l0 = div(L, 60);

				for (var j=0; j<60; ++j)
				{
					var newRand = (pseudoRandom.random(j)-0.5) * this.roughness;
					linePoints.push(add(add(this.points[i], mul(l0, j)), mul(t0,lastRand)));
					linePoints.push(add(add(this.points[i], mul(l0, j + 1)), mul(t0,newRand)));

					lastRand = newRand;
				}
			}

			// Hatching
			{
				var lengthPixels = L.length() * camera.getUnitScale();
				var stepPixels = lengthPixels / Math.floor(lengthPixels / 15);
				var stepUnits = stepPixels / camera.getUnitScale();
				var stepCount = lengthPixels / stepPixels;

				for (var j=1; j<=stepCount; ++j)
				{
					hatchingPoints.push(add(add(this.points[i], mul(l, j * stepUnits)), mul(t, 0)));
					hatchingPoints.push(add(add(this.points[i], mul(l, (j - 1) * stepUnits)), mul(t, stepUnits)));
				}
			}
		}

		camera.drawLines(linePoints, this.color, width, [], undefined, this);
		camera.drawLines(hatchingPoints, this.color, width, [], undefined);
	}
	
	this.hitTest = function(a, b)
	{
		var count = this.closed ? this.points.length : this.points.length - 1;

		for (var i = 0; i != count; ++i)
		{
			if (intersectRectLine(a, b, this.points[i], this.points[(i+1)%this.points.length]))
				return true;
		}

		return false;
	}
	
	this.rayHitTest = function(rayPos, rayDir)
	{
		var results = [];

		var count = this.closed ? this.points.length : this.points.length - 1;

		for (var i = 0; i != count; ++i)
		{
			var hitResult = intersectRayLine(rayPos, rayDir, this.points[i], this.points[(i+1)%this.points.length]);

			if (hitResult.hit)
			{
				if (dot(hitResult.N, rayDir)>=0)
					continue;

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
			snaps.push({ type: "node", p: this.points[i]});
			snaps.push({ type: "midpoint", p: avg(this.points[i], this.points[i+1])});
		}

		snaps.push({ type: "node", p: this.points[this.points.length-1]});

		return snaps;
	}

	this.getDragPoints = function(localSpace, camera)
	{
		if (this.isFrozen())
			return [];

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

		this.onChange();
	}

	this.deleteDragPoint = function(index)
	{
		this.points.splice(index, 1);
		this.onChange();
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

		this.onChange();
	}

	this.transform = function(currentRect, newRect)
	{
		for (var i = 0; i != this.points.length; ++i)
		{
			var localCoord = new Vector(	dot(sub(this.points[i], currentRect.center), currentRect.scaledXAxis),
											dot(sub(this.points[i], currentRect.center), currentRect.scaledYAxis) );

			localCoord.x /= currentRect.scaledXAxis.lengthSqr();
			localCoord.y /= currentRect.scaledYAxis.lengthSqr();

			this.points[i] = add(mad(localCoord.x, newRect.scaledXAxis, newRect.center), mul(localCoord.y, newRect.scaledYAxis));
		}

		this.onChange();
	}

	this.getProperties = function()
	{
		return	[
					{ name: "Color", control:new ColorPicker(this.color, function(value){ this.color = value; this.onChange(); }.bind(this) )},
					{ name: "Normals", control: new Button("Flip", function() { this.points.reverse(); this.onChange(); }.bind(this)) },
					{ name: "Roughness", control: new Slider(0, 1, this.roughness, 0.1, function (value) { this.roughness = value; this.onChange(); }.bind(this)) },
					{ name: "Metalness", control: new Slider(0, 1, this.metalness, 0.1, function (value) { this.metalness = value; this.onChange(); }.bind(this)) },
				];
	}

	this.toggleVisibility = function(v)
	{
		this.visible = (v!==undefined) ? v : !this.visible;
		this.onChange();
	}

	this.isVisible = function()
	{
		return this.visible;
	}

	this.toggleFrozen = function(f)
	{
		this.frozen = (f!==undefined) ? f : !this.frozen;
		this.onChange();
	}

	this.isFrozen = function()
	{
		return this.frozen;
	}

	this.onChange();
}

// ----------------------------------------------------------------------------------------------------------------
// Arc wall
// ----------------------------------------------------------------------------------------------------------------
function ArcWall(centerPos, radius, startAngle, endAngle)
{
	this.scene				= null;
	this.center				= centerPos;
	this.radius				= radius;
	this.startAngle			= startAngle;
	this.endAngle			= endAngle;
	this.selected			= false;
	this.visible			= true;
	this.frozen				= false;
	this.convex				= true;
	this.color				= "#000000";
	this.roughness			= 0;
	this.metalness			= 0;
	this.onChangeListeners	= [];
	this.boundsMin			= new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
	this.boundsMax			= new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

	this.getBoundsMin = function()
	{
		return this.boundsMin;
	}

	this.getBoundsMax = function()
	{
		return this.boundsMax;
	}

	this.saveAsJavascript = function()
	{
		var str = "var aw = new ArcWall(";

		str += "new Vector(" + this.center.x + ", " + this.center.y + ")";
		str += ", " + this.radius;
		str += ", " + (this.startAngle * 180 / Math.PI).toFixed(2) + " * Math.PI/180";
		str += ", " + (this.endAngle * 180 / Math.PI).toFixed(2) + " * Math.PI/180";
		str += ");\n";

		str += "aw.convex = " + this.convex + ";\n";
		str += "aw.roughness = " + this.roughness + ";\n";
		str += "aw.metalness = " + this.metalness + ";\n";
		str += "aw.color = \"" + this.color + "\";\n";
		str += "aw.visible = " + this.visible + ";\n";
		str += "aw.frozen = " + this.frozen + ";\n";

		str += "scene.addObject(aw);\n";
		return str;
	}

	this.addChangeListener = function(listener)
	{
		this.onChangeListeners.push(listener);
	}

	this.onChange = function()
	{
		this.boundsMin = new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
		this.boundsMax = new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

		var p0 = add(this.center, mul(fromAngle(this.startAngle), this.radius));
		var p1 = add(this.center, mul(fromAngle(this.endAngle), this.radius));

		this.boundsMin = min(this.boundsMin, p0);
		this.boundsMin = min(this.boundsMin, p1);
		this.boundsMax = max(this.boundsMax, p0);
		this.boundsMax = max(this.boundsMax, p1);

		var a90 = Math.ceil(this.startAngle/(Math.PI/2)) * Math.PI/2;
		for (var a = a90; a <= this.endAngle; a += Math.PI/2)
		{
			var p = add(this.center, mul(fromAngle(a), this.radius));
			this.boundsMin = min(this.boundsMin, p);
			this.boundsMax = max(this.boundsMax, p);
		}

		for (var i=0; i!=this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this);
		}
	}
	
	this.draw = function(camera)
	{
		if (this.visible == false)
			return;

		if (this.radius <= 0)
			return;

		var width = this.selected ? 4 : 1;
		camera.drawArc(this.center, this.radius, this.startAngle, this.endAngle, this.color, width);
		
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

		var hatchPoints = [];

		for (var a = this.startAngle + stepAngle; a <= this.endAngle; a += stepAngle)
		{
			var p0 = add(this.center, mul(fromAngle(a), this.radius));
			var p1 = add(this.center, mul(fromAngle(a - stepAngle), this.radius + delta));
			hatchPoints.push(p0);
			hatchPoints.push(p1);
		}

		camera.drawLines(hatchPoints, this.color, width);

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
		var points = [	{ type: "center", p: this.center },
						{ type: "node", p: add(this.center, mul(fromAngle(this.startAngle), this.radius)) },
						{ type: "node", p: add(this.center, mul(fromAngle(this.endAngle), this.radius))} ];

		var angleStep = 45 * Math.PI / 180;

		for (var a=Math.ceil(this.startAngle/angleStep)*angleStep; a<=Math.floor(this.endAngle/angleStep)*angleStep; a+=angleStep)
		{
			points.push({ type: "node", p: add(this.center, mul(fromAngle(a), this.radius))});
		}

		return points;
	}

	this.getDragPoints = function(localSpace, camera)
	{
		if (this.isFrozen())
			return [];

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
			this.startAngle -= Math.PI * 2;

		this.onChange();
	}

	this.getOrigin = function()
	{
		return this.center;
	}
	
	this.setOrigin = function(p)
	{
		this.center = p;
		this.onChange();
	}

	this.transform = function(currentRect, newRect)
	{
		var localCoord = new Vector(	dot(sub(this.getOrigin(), currentRect.center), currentRect.scaledXAxis),
										dot(sub(this.getOrigin(), currentRect.center), currentRect.scaledYAxis) );

		localCoord.x /= currentRect.scaledXAxis.lengthSqr();
		localCoord.y /= currentRect.scaledYAxis.lengthSqr();

		this.setOrigin( add(mad(localCoord.x, newRect.scaledXAxis, newRect.center), mul(localCoord.y, newRect.scaledYAxis)) );

		if (newRect.scaledXAxis.lengthSqr() > newRect.scaledYAxis.lengthSqr())
		{
			this.radius *= Math.sqrt(newRect.scaledYAxis.lengthSqr() / currentRect.scaledYAxis.lengthSqr());
		}
		else
		{
			this.radius *= Math.sqrt(newRect.scaledXAxis.lengthSqr() / currentRect.scaledXAxis.lengthSqr());
		}

		this.startAngle += toAngle(newRect.scaledXAxis) - toAngle(currentRect.scaledXAxis);
		this.endAngle += toAngle(newRect.scaledXAxis) - toAngle(currentRect.scaledXAxis);

		this.onChange();
	}

	this.getProperties = function()
	{
		return	[
					{ name: "Color", control:new ColorPicker(this.color, function(value){ this.color = value; this.onChange(); }.bind(this) )},
					{ name: "Normals", control: new Button("Flip", function (value) { this.convex = !this.convex; this.onChange(); }.bind(this)) },
					{ name: "Roughness", control: new Slider(0, 1, this.roughness, 0.1, function (value) { this.roughness = value; this.onChange(); }.bind(this)) },
					{ name: "Metalness", control: new Slider(0, 1, this.metalness, 0.1, function (value) { this.metalness = value; this.onChange(); }.bind(this)) },
				];
	}

	this.toggleVisibility = function(v)
	{
		this.visible = (v!==undefined) ? v : !this.visible;
		this.onChange();
	}

	this.isVisible = function()
	{
		return this.visible;
	}

	this.toggleFrozen = function(f)
	{
		this.frozen = (f!==undefined) ? f : !this.frozen;
		this.onChange();
	}

	this.isFrozen = function()
	{
		return this.frozen;
	}

	this.onChange();
}


// ----------------------------------------------------------------------------------------------------------------
// BRDF Ray
// ----------------------------------------------------------------------------------------------------------------
var lastBRDFColor = "#000000";

function BRDFRay(O, dir)
{
	this.scene				= null;
	this.O					= O;
	this.dir				= dir;
	this.selected			= false;
	this.visible			= true;
	this.frozen				= false;
	this.color				= lastBRDFColor;
	this.bounceCount		= 3;
	this.showBRDF			= true;
	this.onChangeListeners	= [];
	this.BRDF				= Phong;
	this.intersectionPoints = [];
	this.boundsMin			= new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
	this.boundsMax			= new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

	this.getBoundsMin = function()
	{
		return this.boundsMin;
	}

	this.getBoundsMax = function()
	{
		return this.boundsMax;
	}

	this.saveAsJavascript = function()
	{
		var str = "var ray = new BRDFRay(";

		str += "new Vector(" + this.O.x + ", " + this.O.y + ")";
		str += ", new Vector(" + this.dir.x + ", " + this.dir.y + ")";
		str += ");\n";

		str += "ray.showBRDF = " + this.showBRDF + ";\n";
		str += "ray.bounceCount = " + this.bounceCount + ";\n";
		str += "ray.color = \"" + this.color + "\";\n";
		str += "ray.visible = " + this.visible + ";\n";
		str += "ray.frozen = " + this.frozen + ";\n";

		str += "scene.addObject(ray);\n";
		return str;
	}

	this.addChangeListener = function (listener)
	{
		this.onChangeListeners.push(listener);
	}

	this.onChange = function()
	{
		this.boundsMin = new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
		this.boundsMax = new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

		this.boundsMin = min(this.boundsMin, this.O);
		this.boundsMax = max(this.boundsMax, this.O);

		for (var i = 0; i != this.intersectionPoints.length; ++i)
		{
			this.boundsMin = min(this.boundsMin, this.intersectionPoints[i]);
			this.boundsMax = max(this.boundsMax, this.intersectionPoints[i]);
		}

		for (var i=0; i!=this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this);
		}
	}

	this.draw = function(camera)
	{
		if (this.visible == false)
			return;

		var width = this.selected ? 4 : 2;

		var rays = [{ start: this.O, dir: this.dir }];

		this.intersectionPoints = [];

		for (var r=0; r<rays.length; ++r)
		{
			var ray = rays[r];
			
			var bestHit = this.scene.rayHitTest(ray.start, ray.dir);

			if (bestHit.tRay<1000)
			{
				var F0 = (bestHit.metalness !== undefined) ? bestHit.metalness : 0.04;
				var roughness = (bestHit.roughness !== undefined) ? bestHit.roughness : 0;

				camera.drawLine(ray.start, bestHit.P, this.color, 2, [5,5], this);
				//camera.drawArrow(ray.start, ray.dir, 0.3, "#00FF00", 3);

				if (this.showBRDF)
				{
					camera.drawBRDFGraph(this.BRDF, ray.dir.unit().neg(), bestHit.N, F0, roughness, bestHit.P);
				}

				this.intersectionPoints.push(bestHit.P);

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

		camera.drawArrow(this.O, add(this.O, this.dir), "#000000", width);
	}
	
	this.hitTest = function(a, b)
	{
		return intersectRectLine(a,b,this.O, add(this.O, this.dir));
	}
	
	this.getSnapPoints = function()
	{
		var points = []

		for (var i = 0; i != this.intersectionPoints.length; ++i)
		{
			points.push( { type: "intersection", p: this.intersectionPoints[i] } );
		}

		points.push({ type: "node", p: this.O});

		return points;
	}

	this.getDragPoints = function(localSpace, camera)
	{
		if (this.isFrozen())
			return [];

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

		this.onChange();
	}

	this.getOrigin = function()
	{
		return this.O;
	}
	
	this.setOrigin = function(p)
	{
		this.O = p;

		this.onChange();
	}

	this.getProperties = function()
	{
		return	[
					{name: "Color", control:new ColorPicker(this.color, function(value){ this.color = value; lastBRDFColor = this.color; this.onChange(); }.bind(this) )},
					{name: "Bounce Count", control:new Slider(0, 10, this.bounceCount, 1, function(value){ this.bounceCount = value; this.onChange(); }.bind(this) )},
					{name: "Show BRDF", control: new TickBox(this.showBRDF, function (value) { this.showBRDF = value; this.onChange(); }.bind(this)) }
				];
	}

	this.toggleVisibility = function(v)
	{
		this.visible = (v!==undefined) ? v : !this.visible;
		this.onChange();
	}

	this.isVisible = function()
	{
		return this.visible;
	}

	this.toggleFrozen = function(f)
	{
		this.frozen = (f!==undefined) ? f : !this.frozen;
		this.onChange();
	}

	this.isFrozen = function()
	{
		return this.frozen;
	}

	this.onChange();
}

// ----------------------------------------------------------------------------------------------------------------
// Point Light
// ----------------------------------------------------------------------------------------------------------------
function PointLight(O, radius)
{
	this.scene				= null;
	this.O					= O;
	this.bulbRadius			= 1;
	this.radius				= radius;
	this.collisionOutline	= true;
	this.selected			= false;
	this.visible			= true;
	this.frozen				= false;
	this.color				= "#FFC000";
	this.onChangeListeners	= [];
	this.boundsMin			= new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
	this.boundsMax			= new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

	this.getBoundsMin = function()
	{
		return this.boundsMin;
	}

	this.getBoundsMax = function()
	{
		return this.boundsMax;
	}

	this.saveAsJavascript = function()
	{
		var str = "var light = new PointLight(";

		str += "new Vector(" + this.O.x + ", " + this.O.y + ")";
		str += ", " + this.radius;
		str += ");\n";

		str += "light.bulbRadius = " + this.bulbRadius + ";\n";
		str += "light.collisionOutline = " + this.collisionOutline + ";\n";
		str += "light.color = \"" + this.color + "\";\n";
		str += "light.visible = " + this.visible + ";\n";
		str += "light.frozen = " + this.frozen + ";\n";

		str += "scene.addObject(light);\n";
		return str;
	}

	this.addChangeListener = function (listener)
	{
		this.onChangeListeners.push(listener);
	}

	this.onChange = function()
	{
		this.boundsMin = sub(this.O, new Vector(this.radius, this.radius));
		this.boundsMax = add(this.O, new Vector(this.radius, this.radius));

		for (var i=0; i!=this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this);
		}
	}

	this.draw = function(camera)
	{
		if (this.visible == false)
			return;

		var width = this.selected ? 4 : 2;

		camera.drawStar(this.O, 7, this.bulbRadius, 0.5, 0, this.color, width, "rgba(255,255,0,0.8)");
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
			}

			if (points.length>1)
			{
				camera.drawLineStrip(points, false, this.color, width);
			}
		}
		else
		{
			camera.drawArc(this.O, this.radius, 0, Math.PI * 2, this.color, 1, "rgba(0,0,0,0)");
		}
	}
	
	this.hitTest = function(a, b)
	{
		if (	b.x>=this.O.x &&
				a.x<=this.O.x &&
				b.y>=this.O.y &&
				a.y<=this.O.y)
		{
			return true;
		}

		var p = min(max(this.O, a), b);

		var d = sub(p, this.O).length();

		return (d<=this.bulbRadius);
	}
	
	this.getSnapPoints = function()
	{
		return [{ type: "node", p: this.O}];
	}

	this.getDragPoints = function(localSpace, camera)
	{
		if (this.isFrozen())
			return [];

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

		this.onChange();
	}

	this.getOrigin = function()
	{
		return this.O;
	}
	
	this.setOrigin = function(p)
	{
		this.O = p;

		this.onChange();
	}

	this.getProperties = function()
	{
		return	[
					{ name: "Bulb Radius", control: new Slider(0, 5, this.bulbRadius, 0.1, function (value) { this.bulbRadius = value; this.onChange(); }.bind(this)) },
					{ name: "Outer Radius", control: new Slider(0, 100, this.radius, 1, function (value) { this.radius = value; this.onChange(); }.bind(this)) },
					{ name: "Collision Outline", control: new TickBox(this.collisionOutline, function (value) { this.collisionOutline = value; this.onChange(); }.bind(this)) }
				];
	}

	this.toggleVisibility = function(v)
	{
		this.visible = (v!==undefined) ? v : !this.visible;
		this.onChange();
	}

	this.isVisible = function()
	{
		return this.visible;
	}

	this.toggleFrozen = function(f)
	{
		this.frozen = (f!==undefined) ? f : !this.frozen;
		this.onChange();
	}

	this.isFrozen = function()
	{
		return this.frozen;
	}

	this.onChange();
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
	this.visible			= true;
	this.frozen				= false;
	this.color				= "#10FF00";
	this.onChangeListeners	= [];
	this.boundsMin			= new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
	this.boundsMax			= new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

	this.getBoundsMin = function()
	{
		return this.boundsMin;
	}

	this.getBoundsMax = function()
	{
		return this.boundsMax;
	}

	this.saveAsJavascript = function()
	{
		var str = "var light = new SpotLight(";

		str += "new Vector(" + this.O.x + ", " + this.O.y + ")";
		str += ", new Vector(" + this.target.x + ", " + this.target.y + ")";
		str += ", 10";
		str += ");\n";

		str += "light.nearWidth = " + this.nearWidth + ";\n";
		str += "light.farWidth = " + this.farWidth + ";\n";
		str += "light.collisionOutline = " + this.collisionOutline + ";\n";
		str += "light.color = \"" + this.color + "\";\n";
		str += "light.visible = " + this.visible + ";\n";
		str += "light.frozen = " + this.frozen + ";\n";
		str += "light.onChange();\n";

		str += "scene.addObject(light);\n";
		return str;
	}

	this.addChangeListener = function (listener)
	{
		this.onChangeListeners.push(listener);
	}

	this.onChange = function()
	{
		this.boundsMin = new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
		this.boundsMax = new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

		var dir = sub(this.target, this.O).unit();
		var tan = transpose(dir);

		var points = [];
		points.push(add(this.O, mul(tan, this.nearWidth/2)));
		points.push(add(this.target, mul(tan, this.farWidth/2)));
		points.push(add(this.target, mul(tan, -this.farWidth/2)));
		points.push(add(this.O, mul(tan, -this.nearWidth/2)));

		for (var i=0; i!=points.length; ++i)
		{
			this.boundsMin = min(this.boundsMin, points[i]);
			this.boundsMax = max(this.boundsMax, points[i]);
		}

		for (var i=0; i!=this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this);
		}
	}

	this.draw = function(camera)
	{
		if (this.visible == false)
			return;

		var width = this.selected ? 4 : 2;

		var dir = sub(this.target, this.O).unit();
		var tan = transpose(dir);

		if (this.collisionOutline)
		{
			camera.drawLine(add(this.O, mul(tan, this.nearWidth/2)), add(this.O, mul(tan, -this.nearWidth/2)), this.color, width, [5,5], this);
			camera.drawLine(add(this.target, mul(tan, this.farWidth/2)), add(this.target, mul(tan, -this.farWidth/2)), this.color, width, [5,5], this);

			camera.drawLine(add(this.O, mul(tan, this.nearWidth/2)), add(this.target, mul(tan, this.farWidth/2)), this.color, width, [5,5], this);
			camera.drawLine(add(this.O, mul(tan, -this.nearWidth/2)), add(this.target, mul(tan, -this.farWidth/2)), this.color, width, [5,5], this);

			var points = [];

			var farStepCount = Math.round(this.farWidth / 0.5);
			var farStep = this.farWidth / farStepCount;
			var nearStep = this.nearWidth / farStepCount;

			points.push(add(this.O, mul(tan, -this.nearWidth/2)));

			for (var fc=0, fx=-this.farWidth/2, nx = -this.nearWidth/2; fc<=farStepCount; ++fc, fx+=farStep, nx+=nearStep)
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

			}

			points.push(add(this.O, mul(tan, this.nearWidth / 2)));

			camera.drawLineStrip(points, true, this.color, width, []);
		}
		else
		{
			camera.drawLine(add(this.O, mul(tan, this.nearWidth/2)), add(this.O, mul(tan, -this.nearWidth/2)), this.color, width, [], this);
			camera.drawLine(add(this.target, mul(tan, this.farWidth/2)), add(this.target, mul(tan, -this.farWidth/2)), this.color, width, [], this);

			camera.drawLine(add(this.O, mul(tan, this.nearWidth/2)), add(this.target, mul(tan, this.farWidth/2)), this.color, width, [], this);
			camera.drawLine(add(this.O, mul(tan, -this.nearWidth/2)), add(this.target, mul(tan, -this.farWidth/2)), this.color, width, [], this);
		}

		camera.drawStar(this.O, 7, 0.5, 0.5, 0, this.color, width, "rgba(255,255,0,0.8)");
	}
	
	this.hitTest = function(a, b)
	{
		var dir = sub(this.target, this.O).unit();
		var tan = transpose(dir);

		var points = [];
		points.push(add(this.O, mul(tan, this.nearWidth/2)));
		points.push(add(this.target, mul(tan, this.farWidth/2)));
		points.push(add(this.target, mul(tan, -this.farWidth/2)));
		points.push(add(this.O, mul(tan, -this.nearWidth/2)));

		if (intersectRectLine(a, b, points[0], points[1]))	return true;
		if (intersectRectLine(a, b, points[1], points[2]))	return true;
		if (intersectRectLine(a, b, points[2], points[3]))	return true;
		if (intersectRectLine(a, b, points[3], points[0]))	return true;

		return false;
	}
	
	this.getSnapPoints = function()
	{
		var dir = sub(this.target, this.O).unit();
		var tan = transpose(dir);

		return [	{ type: "node", p: this.O },
					{ type: "node", p: this.target },
					{ type: "node", p: add(this.O, mul(tan, this.nearWidth/2))},
					{ type: "node", p: add(this.target, mul(tan, this.farWidth/2))},
					{ type: "node", p: add(this.target, mul(tan, -this.farWidth/2))},
					{ type: "node", p: add(this.O, mul(tan, -this.nearWidth/2))}
				];
	}

	this.getDragPoints = function(localSpace, camera)
	{
		if (this.isFrozen())
			return [];

		var points = [];
		
		var dir = sub(this.target, this.O).unit();
		var tan = transpose(dir);

		if (localSpace)
		{
			points.push( mad(dir, 0.5, this.O) );
			points.push( mad(dir, -0.5, this.target) );
		}
		else
		{
			points.push(this.O);
			points.push(this.target);
			points.push(add(this.O, mul(tan, this.nearWidth/2)));
			points.push(add(this.O, mul(tan, -this.nearWidth/2)));
			points.push(add(this.target, mul(tan, this.farWidth/2)));
			points.push(add(this.target, mul(tan, -this.farWidth/2)));
		}

		return points;
	}

	this.drawDragPoint = function(camera, index, localSpace)
	{
		var dir = sub(this.target, this.O).unit();
		var tan = transpose(dir);

		if (localSpace)
		{
			if (index == 0)
			{
				camera.drawLine(this.O, mad(dir, 1, this.O), "#ff0000", 4);
			}
			else if (index==1)
			{
				camera.drawLine(this.target, mad(dir, -1, this.target), "#ff0000", 4);
			}
		}
		else
		{
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
	}

	this.setDragPointPos = function(index, p, localSpace)
	{
		if (localSpace)
		{
			var dir = sub(this.target, this.O).unit();

			if (index==0)
			{
				this.O = add(this.target, mul(dot(sub(p, this.target), dir), dir));
			}
			else if (index==1)
			{
				this.target = add(this.O, mul(dot(sub(p, this.O), dir), dir));
			}
		}
		else
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

		this.onChange();
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

		this.onChange();
	}

	this.getProperties = function()
	{
		return	[
					{ name: "Collision Outline", control: new TickBox(this.collisionOutline, function (value) { this.collisionOutline = value; this.onChange(); }.bind(this)) }
				];
	}

	this.toggleVisibility = function(v)
	{
		this.visible = (v!==undefined) ? v : !this.visible;
		this.onChange();
	}

	this.isVisible = function()
	{
		return this.visible;
	}

	this.toggleFrozen = function(f)
	{
		this.frozen = (f!==undefined) ? f : !this.frozen;
		this.onChange();
	}

	this.isFrozen = function()
	{
		return this.frozen;
	}

	this.onChange();
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
	this.visible			= true;
	this.frozen				= false;
	this.color				= "#00C0FF";
	this.onChangeListeners	= [];
	this.boundsMin			= new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
	this.boundsMax			= new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

	this.getBoundsMin = function()
	{
		return this.boundsMin;
	}

	this.getBoundsMax = function()
	{
		return this.boundsMax;
	}

	this.saveAsJavascript = function()
	{
		var str = "var light = new ParallelLight(";

		str += "new Vector(" + this.O.x + ", " + this.O.y + ")";
		str += ", new Vector(" + this.dir.x + ", " + this.dir.y + ")";
		str += ");\n";

		str += "light.width = " + this.width + ";\n";
		str += "light.collisionOutline = " + this.collisionOutline + ";\n";
		str += "light.color = \"" + this.color + "\";\n";
		str += "light.visible = " + this.visible + ";\n";
		str += "light.frozen = " + this.frozen + ";\n";

		str += "scene.addObject(light);\n";
		return str;
	}

	this.addChangeListener = function(listener)
	{
		this.onChangeListeners.push(listener);
	}

	this.onChange = function()
	{
		this.boundsMin = new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
		this.boundsMax = new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

		var points = [this.O, add(this.O, mul(this.dir, 3))];

		var tan = transpose(this.dir);

		points.push(add(this.O, mul(tan, this.width/2)));
		points.push(add(this.O, mul(tan, -this.width/2)));

		for (var i = 0; i != points.length; ++i)
		{
			this.boundsMin = min(this.boundsMin, points[i]);
			this.boundsMax = max(this.boundsMax, points[i]);
		}

		for (var i = 0; i != this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this);
		}
	}

	this.draw = function(camera)
	{
		if (this.visible == false)
			return;

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
			}

			points.push(add(this.O, mul(tan, this.width / 2)));

			camera.drawLineStrip(points, points.length>1, this.color, width);
		}
		else
		{
			camera.drawLine(add(this.O, mul(tan, this.width/2)), add(this.O, mul(tan, -this.width/2)), this.color, width);
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

				camera.drawArrow(point, mad(this.dir, 2, point), this.color, 2);
			}

			camera.drawArrow(this.O, mad(this.dir, 3, this.O), this.color, 2);
		}

		camera.drawStar(this.O, 7, 0.5, 0.5, 0, this.color, width, "rgba(255,255,0,0.8)");
	}
	
	this.hitTest = function(a, b)
	{
		var p = min(max(this.O, a), b);

		var d = sub(p, this.O).length();

		return (d<=0.5);
	}
	
	this.getSnapPoints = function()
	{
		return [{ type: "node", p: this.O}];
	}

	this.getDragPoints = function(localSpace, camera)
	{
		if (this.isFrozen())
			return [];

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

		this.onChange();
	}

	this.getOrigin = function()
	{
		return this.O;
	}
	
	this.setOrigin = function(p)
	{
		this.O = p;

		this.onChange();
	}

	this.getProperties = function()
	{
		return	[
					{ name: "Collision Outline", control: new TickBox(this.collisionOutline, function (value) { this.collisionOutline = value; this.onChange(); }.bind(this)) }
				];
	}

	this.toggleVisibility = function(v)
	{
		this.visible = (v!==undefined) ? v : !this.visible;
		this.onChange();
	}

	this.isVisible = function()
	{
		return this.visible;
	}

	this.toggleFrozen = function(f)
	{
		this.frozen = (f!==undefined) ? f : !this.frozen;
		this.onChange();
	}

	this.isFrozen = function()
	{
		return this.frozen;
	}

	this.onChange();
}

// ----------------------------------------------------------------------------------------------------------------
// CameraObject
// ----------------------------------------------------------------------------------------------------------------
function CameraObject(O, target, fovDegrees)
{
	this.scene				= null;
	this.O					= O;
	this.target				= target;
	this.nearWidth			= 3;
	this.farWidth			= this.nearWidth + Math.tan(fovDegrees/2*Math.PI/180) * sub(target, O).length() * 2;
	this.fovDegrees			= fovDegrees;
	this.collisionOutline = false;
	this.selected			= false;
	this.visible			= true;
	this.frozen				= false;
	this.color				= "rgb(57,244,255)";
	this.pixelCount			= 4;
	this.showZBuffer		= false;
	this.showMinZBuffer		= false;
	this.showCenterLines	= true;
	this.onChangeListeners	= [];
	this.boundsMin			= new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
	this.boundsMax			= new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

	this.getBoundsMin = function()
	{
		return this.boundsMin;
	}

	this.getBoundsMax = function()
	{
		return this.boundsMax;
	}

	this.saveAsJavascript = function()
	{
		var str = "var cam = new CameraObject(";

		str += "new Vector(" + this.O.x + ", " + this.O.y + ")";
		str += ", new Vector(" + this.target.x + ", " + this.target.y + ")";
		str += ", 10";
		str += ");\n";

		str += "cam.nearWidth = " + this.nearWidth + ";\n";
		str += "cam.farWidth = " + this.farWidth + ";\n";
		str += "cam.fovDegrees = " + this.fovDegrees + ";\n";
		str += "cam.collisionOutline = " + this.collisionOutline + ";\n";
		str += "cam.color = \"" + this.color + "\";\n";
		str += "cam.pixelCount = " + this.pixelCount + ";\n";
		str += "cam.showZBuffer = " + this.showZBuffer + ";\n";
		str += "cam.showMinZBuffer = " + this.showMinZBuffer + ";\n";
		str += "cam.showCenterLines = " + this.showCenterLines + ";\n";
		str += "cam.visible = " + this.visible + ";\n";
		str += "cam.frozen = " + this.frozen + ";\n";
		str += "cam.onChange();\n";

		str += "scene.addObject(cam);\n";
		return str;
	}

	this.addChangeListener = function (listener)
	{
		this.onChangeListeners.push(listener);
	}

	this.onChange = function()
	{
		this.boundsMin = new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
		this.boundsMax = new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

		var tanFOV = (this.farWidth - this.nearWidth) / 2 / distance(this.O, this.target);

		this.fovDegrees = Math.atan(tanFOV) * 2 * 180 / Math.PI;

		var dir = sub(this.target, this.O).unit();
		var tan = transpose(dir);

		var points = [];
		points.push(add(this.O, mul(tan, this.nearWidth/2)));
		points.push(add(this.target, mul(tan, this.farWidth/2)));
		points.push(add(this.target, mul(tan, -this.farWidth/2)));
		points.push(add(this.O, mul(tan, -this.nearWidth/2)));

		for (var i = 0; i != points.length; ++i)
		{
			this.boundsMin = min(this.boundsMin, points[i]);
			this.boundsMax = max(this.boundsMax, points[i]);
		}

		for (var i=0; i!=this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this);
		}
	}

	this.draw = function(camera)
	{
		if (this.visible == false)
			return;

		var width = this.selected ? 4 : 2;

		var dir = sub(this.target, this.O).unit();
		var tan = transpose(dir);

		var tanFOV = (this.farWidth - this.nearWidth) / 2 / distance(this.O, this.target);

		var apexDistance = this.nearWidth / tanFOV / 2;

		var apexPoint = mad(dir, -apexDistance, this.O);

		var minZValues = Array(this.pixelCount).fill(Number.MAX_VALUE);
		var pixelSizeFar = this.farWidth / this.pixelCount;

		if (this.collisionOutline || this.showMinZBuffer)
		{
			var points = [];

			var farStepCount = Math.round(this.farWidth / 0.5);
			var farStep = this.farWidth / farStepCount;
			var nearStep = this.nearWidth / farStepCount;

			points.push(add(this.O, mul(tan, -this.nearWidth/2)));

			for (var fc=0, fx=-this.farWidth/2, nx = -this.nearWidth/2; fc<=farStepCount; ++fc, fx+=farStep, nx+=nearStep)
			{
				var pointNear = add(this.O, mul(tan, nx));
				var pointFar = add(this.target, mul(tan, fx));

				var rayDir = sub(pointFar, pointNear);
				var maxRayLength = rayDir.length();
				rayDir = div(rayDir, maxRayLength);

				var bestHit = {tRay:Number.MAX_VALUE};
			
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

					var pixelIndex = Math.floor((fx - (-this.farWidth/2)) / pixelSizeFar);
					var zValue = dot(sub(bestHit.P, pointNear), dir);  // distance from near plane, so that we can cope with parallel cameras
					minZValues[pixelIndex] = Math.min(minZValues[pixelIndex], zValue);
				}
				else
				{
					points.push(pointFar);
				}
			}

			points.push(add(this.O, mul(tan, this.nearWidth / 2)));

			if (this.collisionOutline)
			{
				camera.drawLine(add(this.O, mul(tan, this.nearWidth/2)), add(this.O, mul(tan, -this.nearWidth/2)), this.color, width, [5,5], this);
				camera.drawLine(add(this.target, mul(tan, this.farWidth/2)), add(this.target, mul(tan, -this.farWidth/2)), this.color, width, [5,5], this);

				camera.drawLine(add(this.O, mul(tan, this.nearWidth/2)), add(this.target, mul(tan, this.farWidth/2)), this.color, width, [5,5], this);
				camera.drawLine(add(this.O, mul(tan, -this.nearWidth/2)), add(this.target, mul(tan, -this.farWidth/2)), this.color, width, [5,5], this);

				camera.drawLineStrip(points, true, this.color, width, []);
			}
		}
		
		if (!this.collisionOutline)
		{
			camera.drawLine(add(this.O, mul(tan, this.nearWidth/2)), add(this.O, mul(tan, -this.nearWidth/2)), this.color, width, [], this);
			camera.drawLine(add(this.target, mul(tan, this.farWidth/2)), add(this.target, mul(tan, -this.farWidth/2)), this.color, width, [], this);

			camera.drawLine(add(this.O, mul(tan, this.nearWidth/2)), add(this.target, mul(tan, this.farWidth/2)), this.color, width, [], this);
			camera.drawLine(add(this.O, mul(tan, -this.nearWidth/2)), add(this.target, mul(tan, -this.farWidth/2)), this.color, width, [], this);
		}

		if (this.pixelCount > 0)
		{
			var farStep = this.farWidth / this.pixelCount / 2;
			var nearStep = this.nearWidth / this.pixelCount / 2;

			for (var fc=1, fx=-this.farWidth/2+farStep, nx = -this.nearWidth/2+nearStep; fc<this.pixelCount*2; ++fc, fx+=farStep, nx+=nearStep)
			{
				var pointNear = add(this.O, mul(tan, nx));
				var pointFar = add(this.target, mul(tan, fx));

				if (fc % 2)
				{
					if (this.showCenterLines || this.showZBuffer)
					{
						camera.drawLine(pointNear, pointFar, "rgba(0,0,0,0.2)", width, [10, 5, 2, 5], this);

						if (this.showZBuffer)
						{
							var bestHit = this.scene.rayHitTest(pointNear, sub(pointFar,pointNear).unit());

							if (bestHit.tRay<distance(pointFar, pointNear))
							{
								var result0 = intersectRayLine(bestHit.P, tan, add(this.O, mul(tan, nx + nearStep)), add(this.target, mul(tan, fx + farStep)));
								var result1 = intersectRayLine(bestHit.P, tan.neg(), add(this.O, mul(tan, nx - nearStep)), add(this.target, mul(tan, fx - farStep)));

								camera.drawLine(result0.P, result1.P, "#FF0000", width, [], this);
							}
						}
					}

					if (this.showMinZBuffer)
					{
						var pixelIndex = fc/2-0.5;
						var minZ = minZValues[pixelIndex];

						//if (minZ<zFar)
						{
							var pixelDir = sub(pointFar, pointNear).unit();

							var P = mad(pixelDir, minZ / dot(pixelDir, dir), pointNear);
							var result0 = intersectRayLine(P, tan, add(this.O, mul(tan, nx + nearStep)), add(this.target, mul(tan, fx + farStep)));
							var result1 = intersectRayLine(P, tan.neg(), add(this.O, mul(tan, nx - nearStep)), add(this.target, mul(tan, fx - farStep)));

							camera.drawLine(result0.P, result1.P, "#00FF00", width, [], this);
						}
					}
				}
				else
				{
					camera.drawLine(pointNear, pointFar, this.color, width, [], this);
				}
			}
		}

		camera.drawCross(apexPoint, camera.invScale(10), 0, this.color, width);
	}
	
	this.hitTest = function(a, b)
	{
		var dir = sub(this.target, this.O).unit();
		var tan = transpose(dir);

		var points = [];
		points.push(add(this.O, mul(tan, this.nearWidth/2)));
		points.push(add(this.target, mul(tan, this.farWidth/2)));
		points.push(add(this.target, mul(tan, -this.farWidth/2)));
		points.push(add(this.O, mul(tan, -this.nearWidth/2)));

		if (intersectRectLine(a, b, points[0], points[1]))	return true;
		if (intersectRectLine(a, b, points[1], points[2]))	return true;
		if (intersectRectLine(a, b, points[2], points[3]))	return true;
		if (intersectRectLine(a, b, points[3], points[0]))	return true;

		return false;
	}
	
	this.getSnapPoints = function()
	{
		var dir = sub(this.target, this.O).unit();
		var tan = transpose(dir);

		var tanFOV = (this.farWidth - this.nearWidth) / 2 / distance(this.O, this.target);

		var apexDistance = this.nearWidth / tanFOV / 2;

		var apexPoint = mad(dir, -apexDistance, this.O);

		var points = [	{ type: "node", p: this.O },
						{ type: "node", p: apexPoint },
						{ type: "node", p: this.O },
						{ type: "node", p: add(this.O, mul(tan, this.nearWidth/2))},
						{ type: "node", p: add(this.target, mul(tan, this.farWidth/2))},
						{ type: "node", p: add(this.target, mul(tan, -this.farWidth/2))},
						{ type: "node", p: add(this.O, mul(tan, -this.nearWidth/2))}
					];


		if (this.pixelCount > 0)
		{
			var farStep = this.farWidth / this.pixelCount / 2;
			var nearStep = this.nearWidth / this.pixelCount / 2;

			for (var fc=1, fx=-this.farWidth/2+farStep, nx = -this.nearWidth/2+nearStep; fc<this.pixelCount*2; ++fc, fx+=farStep, nx+=nearStep)
			{
				var pointNear = add(this.O, mul(tan, nx));
				var pointFar = add(this.target, mul(tan, fx));

				points.push({ type: "node", p: pointNear});
				points.push({ type: "node", p: pointFar});
			}
		}

		return points;
	}

	this.getDragPoints = function(localSpace, camera)
	{
		if (this.isFrozen())
			return [];

		var points = [];
		
		var dir = sub(this.target, this.O).unit();
		var tan = transpose(dir);


		if (localSpace)
		{
			points.push( mad(dir, 0.5, this.O) );
			points.push( mad(dir, -0.5, this.target) );
		}
		else
		{
			points.push(this.O);
			points.push(this.target);
			points.push(add(this.O, mul(tan, this.nearWidth / 2)));
			points.push(add(this.O, mul(tan, -this.nearWidth/2)));
			points.push(add(this.target, mul(tan, this.farWidth/2)));
			points.push(add(this.target, mul(tan, -this.farWidth/2)));
		}

		return points;
	}

	this.drawDragPoint = function(camera, index, localSpace)
	{
		var dir = sub(this.target, this.O).unit();
		var tan = transpose(dir);

		if (localSpace)
		{
			if (index == 0)
			{
				camera.drawLine(this.O, mad(dir, 1, this.O), "#ff0000", 4);
			}
			else if (index==1)
			{
				camera.drawLine(this.target, mad(dir, -1, this.target), "#ff0000", 4);
			}
		}
		else
		{
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
	}

	this.setDragPointPos = function(index, p, localSpace)
	{
		if (localSpace)
		{
			var dir = sub(this.target, this.O).unit();

			if (index==0)
			{
				this.O = add(this.target, mul(dot(sub(p, this.target), dir), dir));
			}
			else if (index==1)
			{
				this.target = add(this.O, mul(dot(sub(p, this.O), dir), dir));
			}
		}
		else
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

		this.onChange();
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

		this.onChange();
	}


	this.getProperties = function()
	{
		return	[
					{ name: "FOV", control: new Slider(0, 180, this.fovDegrees, 5,	function (value) 
																					{
																						this.fovDegrees = value;
																						var tanFOV = Math.tan(this.fovDegrees * 0.5 * Math.PI / 180);
																						this.farWidth = this.nearWidth + 2 * tanFOV * distance(this.O, this.target);
																						this.onChange();
																					}.bind(this))
					},

					{ name: "Collision Outline", control: new TickBox(this.collisionOutline, function (value) { this.collisionOutline = value; this.onChange(); }.bind(this)) },
					{ name: "Pixel Count", control: new Slider(0, 20, this.pixelCount, 1, function (value) { this.pixelCount = value; this.onChange(); }.bind(this)) },
					{ name: "Show Center Lines", control: new TickBox(this.showCenterLines, function (value) { this.showCenterLines = value; this.onChange(); }.bind(this)) },
					{ name: "Show Z Buffer", control: new TickBox(this.showZBuffer, function (value) { this.showZBuffer = value; this.onChange(); }.bind(this)) },
					{ name: "Show Min Z Buffer", control: new TickBox(this.showMinZBuffer, function (value) { this.showMinZBuffer = value; this.onChange(); }.bind(this)) },
				];
	}

	this.toggleVisibility = function(v)
	{
		this.visible = (v!==undefined) ? v : !this.visible;
		this.onChange();
	}

	this.isVisible = function()
	{
		return this.visible;
	}

	this.toggleFrozen = function(f)
	{
		this.frozen = (f!==undefined) ? f : !this.frozen;
		this.onChange();
	}

	this.isFrozen = function()
	{
		return this.frozen;
	}

	this.onChange();
}

// ----------------------------------------------------------------------------------------------------------------
// Line
// ----------------------------------------------------------------------------------------------------------------
var lastLineColor = "#900090";
var lastLineFillColor = "#000000";
var lastLineAlpha = 0.2;

function Line(_points)
{
	this.scene				= null;
	this.points				= _points;
	this.closed				= false;
	this.selected			= false;
	this.visible			= true;
	this.frozen				= false;
	this.dashed				= false;
	this.color				= lastLineColor;
	this.fillColor			= lastLineFillColor;
	this.fillAlpha			= lastLineAlpha;
	this.pixelMip			= -1;
	this.arrowStart			= false;
	this.arrowEnd			= false;
	this.handDrawn			= false;
	this.width				= 2;
	this.onChangeListeners	= [];
	this.boundsMin			= new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
	this.boundsMax			= new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

	this.getBoundsMin = function()
	{
		return this.boundsMin;
	}

	this.getBoundsMax = function()
	{
		return this.boundsMax;
	}

	this.saveAsJavascript = function()
	{
		var str = "var lineObject = new Line([";

		for (var i = 0; i != this.points.length; ++i)
		{
			if (i > 0)
			{
				str += ", ";
			}

			str += "new Vector(" + this.points[i].x + ", " + this.points[i].y + ")";
		}

		str += "]);\n";

		str += "lineObject.closed = " + this.closed + ";\n";
		str += "lineObject.color = \"" + this.color + "\";\n";
		str += "lineObject.fillColor = \"" + this.fillColor + "\";\n";
		str += "lineObject.fillAlpha = " + this.fillAlpha + ";\n";
		str += "lineObject.pixelMip = " + this.pixelMip + ";\n";
		str += "lineObject.arrowStart = " + this.arrowStart + ";\n";
		str += "lineObject.arrowEnd = " + this.arrowEnd + ";\n";
		str += "lineObject.handDrawn = " + this.handDrawn + ";\n";
		str += "lineObject.dashed = " + this.dashed + ";\n";
		str += "lineObject.width = " + this.width + ";\n";
		str += "lineObject.visible = " + this.visible + ";\n";
		str += "lineObject.frozen = " + this.frozen + ";\n";

		str += "scene.addObject(lineObject);\n";
		return str;
	}

	this.addChangeListener = function (listener)
	{
		this.onChangeListeners.push(listener);
	}

	this.onChange = function()
	{
		this.boundsMin = new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
		this.boundsMax = new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

		for (var i = 0; i != this.points.length; ++i)
		{
			this.boundsMin = min(this.boundsMin, this.points[i]);
			this.boundsMax = max(this.boundsMax, this.points[i]);
		}

		for (var i = 0; i != this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this);
		}
	}

	this.addPoint = function(point)
	{
		this.points.push(point);

		this.onChange();
	}

	this.draw = function (camera)
	{
		if (this.visible == false)
			return;

		if (this.points.length < 2)
			return;

		var dash = this.dashed? [10,5] : [];

		var width = this.width * (this.selected ? 2 : 1);

		var lastRand = (pseudoRandom.random(0)-0.5);

		for (var mip=0; mip<=this.pixelMip; ++mip)
		{
			var points = this.points.slice();

			if (this.closed)
				points.push(this.points[0]);

			var cellSize = Math.pow(2, mip);

			var fillColorRGB = hexToRgb(this.fillColor);
			var fillColorRGBA = "rgba(" + fillColorRGB.r + ", " + fillColorRGB.g + ", " + fillColorRGB.b + ", " + this.fillAlpha + ")";

			for (var i = 0; i < points.length - 1; ++i)
			{
				var p0 = points[i];
				var p1 = points[i+1];
				var L = sub(p1, p0);

				var t = 0;

				while (t < 1)
				{
					var p = lerp(p0, p1, t);
					var index = div(p, cellSize);
					var index0 = floor(index);
					var index1 = add(index0, 1);
					var r0 = mul(index0, cellSize);
					var r1 = mul(index1, cellSize);

					camera.drawRectangle(r0, r1, "#000000", 1, [], fillColorRGBA);

					// Advance
					var boundary = new Vector(0, 0);

					boundary.x = (L.x>0) ? r1.x : r0.x;
					boundary.y = (L.y>0) ? r1.y : r0.y;

					var stepsToBoundaryXY = new Vector(0, 0);

					stepsToBoundaryXY.x = Math.abs(L.x)>0 ? div(sub(boundary, p).x, L.x) : Number.MAX_VALUE;
					stepsToBoundaryXY.y = Math.abs(L.y)>0 ? div(sub(boundary, p).y, L.y) : Number.MAX_VALUE;

					var stepsToBoundary = Math.min(stepsToBoundaryXY.x, stepsToBoundaryXY.y);

					stepsToBoundary += 0.0001;

					t += stepsToBoundary;
				}
			}
		}

		if (this.arrowStart && this.arrowEnd && this.points.length==2)
		{
			// Trully lazy!
			camera.drawArrow(avg(this.points[0], this.points[1]), this.points[1], this.color, width, dash, this);
			camera.drawArrow(avg(this.points[0], this.points[1]), this.points[0], this.color, width, dash, this);
		}
		else
		{
			var points = this.points.slice();

			if (this.closed)
				points.push(this.points[0]);

			var fillColorRGB = undefined;
			var fillColorRGBA = undefined;

			if (this.closed)
			{
				fillColorRGB = hexToRgb(this.fillColor);
				fillColorRGBA = "rgba(" + fillColorRGB.r + ", " + fillColorRGB.g + ", " + fillColorRGB.b + ", " + this.fillAlpha + ")";
			}

			if (this.handDrawn)
			{
				var divisions = 5;

				for (var i=0; i<points.length-1; ++i)
				{
					var L = sub(points[i + 1], points[i]);
					var Lm = L.length();
					var l = div(L, divisions);

					var t = mul(transpose(l), 0.5);

					for (var j=1; j<divisions; ++j)
					{
						var newRand = (pseudoRandom.random(j) - 0.5);

						points.splice(i+j, 0, add(add(points[i], mul(l, j)), mul(t, lastRand)));
						
						lastRand = newRand;
					}

					i+=divisions-1;
				}
			}

			if (this.arrowEnd)
			{
				camera.drawArrow(points[points.length-2], points[points.length-1], this.color, width, dash, this);
			}

			if (this.arrowStart)
			{
				camera.drawArrow(points[1], points[0], this.color, width, dash, this);
			}

			if (this.arrowEnd)
			{
				points.splice(-1, 1);
			}

			if (this.arrowStart)
			{
				points.splice(0, 1);
			}

			camera.drawLineStrip(points, false, this.color, width, dash, fillColorRGBA, this);
		}
	}
	
	this.hitTest = function(a, b)
	{
		var count = this.closed ? this.points.length : this.points.length - 1;

		for (var i = 0; i != count; ++i)
		{
			if (intersectRectLine(a, b, this.points[i], this.points[(i+1)%this.points.length]))
				return true;
		}

		return false;
	}
	
	this.getSnapPoints = function()
	{
		var snaps = [];

		for (var i = 0; i != this.points.length - 1; ++i)
		{
			snaps.push({ type: "node", p: this.points[i]});
			snaps.push({ type: "midpoint", p: avg(this.points[i], this.points[i+1])});
		}

		snaps.push({ type: "node", p: this.points[this.points.length-1]});

		return snaps;
	}

	this.getDragPoints = function(localSpace, camera)
	{
		if (this.isFrozen())
			return [];

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

		this.onChange();
	}

	this.deleteDragPoint = function(index)
	{
		this.points.splice(index, 1);
		this.onChange();
	}

	this.getOrigin = function ()
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

		this.onChange();
	}

	this.transform = function(currentRect, newRect)
	{
		for (var i = 0; i != this.points.length; ++i)
		{
			var localCoord = new Vector(	dot(sub(this.points[i], currentRect.center), currentRect.scaledXAxis),
											dot(sub(this.points[i], currentRect.center), currentRect.scaledYAxis) );

			localCoord.x /= currentRect.scaledXAxis.lengthSqr();
			localCoord.y /= currentRect.scaledYAxis.lengthSqr();

			this.points[i] = add(mad(localCoord.x, newRect.scaledXAxis, newRect.center), mul(localCoord.y, newRect.scaledYAxis));
		}

		this.onChange();
	}

	this.getProperties = function()
	{
		return	[
					{name: "Color", control:new ColorPicker(this.color, function(value){ this.color = value; lastLineColor = this.color; this.onChange(); }.bind(this) )},
					{name: "Fill Color", control:new ColorPicker(this.fillColor, function(value){ this.fillColor = value; lastRectFillColor = this.fillColor; this.onChange(); }.bind(this) )},
					{name: "Fill Alpha", control: new Slider(0, 1, this.fillAlpha, 0.1, function (value) { this.fillAlpha = value; lastRectAlpha = this.fillAlpha; this.onChange(); }.bind(this)) },
					{name: "Width", control: new Slider(0, 5, this.width, 1, function (value) { this.width = value; this.onChange(); }.bind(this)) },
					{name: "Arrow Start", control: new TickBox(this.arrowStart, function (value) { this.arrowStart = value; this.onChange(); }.bind(this)) },
					{name: "Arrow End", control: new TickBox(this.arrowEnd, function (value) { this.arrowEnd = value; this.onChange(); }.bind(this)) },
					{name: "Hand Drawn", control: new TickBox(this.handDrawn, function (value) { this.handDrawn = value; this.onChange(); }.bind(this)) },
					{name: "Dashed", control: new TickBox(this.dashed, function (value) { this.dashed = value; this.onChange(); }.bind(this)) },
					{name: "Pixelate Mip", control: new Slider(-1, 5, this.pixelMip, 1, function (value) { this.pixelMip = value; this.onChange(); }.bind(this)) },
  				];
	}

	this.toggleVisibility = function(v)
	{
		this.visible = (v!==undefined) ? v : !this.visible;
		this.onChange();
	}

	this.isVisible = function()
	{
		return this.visible;
	}

	this.toggleFrozen = function(f)
	{
		this.frozen = (f!==undefined) ? f : !this.frozen;
		this.onChange();
	}

	this.isFrozen = function()
	{
		return this.frozen;
	}

	this.onChange();
}

// ----------------------------------------------------------------------------------------------------------------
// Rectangle
// ----------------------------------------------------------------------------------------------------------------
var lastRectLineColor = "#900090";
var lastRectFillColor = "#000000";
var lastRectAlpha = 0;

function Rectangle(center)
{
	this.scene				= null;
	this.points				= [ center.copy(), center.copy(), center.copy(), center.copy() ];
	this.rows				= 1;
	this.columns			= 1;
	this.selected			= false;
	this.visible			= true;
	this.frozen				= false;
	this.color				= lastRectLineColor;
	this.fillColor			= lastRectFillColor;
	this.fillAlpha			= lastRectAlpha;
	this.width				= 2;
	this.centerPoints		= false;
	this.onChangeListeners	= [];
	this.boundsMin			= new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
	this.boundsMax			= new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

	this.getBoundsMin = function()
	{
		return this.boundsMin;
	}

	this.getBoundsMax = function()
	{
		return this.boundsMax;
	}

	this.saveAsJavascript = function()
	{
		var str = "var rectObj = new Rectangle(";

		str += "new Vector(0,0)";
		str += ");\n";

		str += "rectObj.points[0] = new Vector(" + this.points[0].x + ", " + this.points[0].y + ");\n";
		str += "rectObj.points[1] = new Vector(" + this.points[1].x + ", " + this.points[1].y + ");\n";
		str += "rectObj.points[2] = new Vector(" + this.points[2].x + ", " + this.points[2].y + ");\n";
		str += "rectObj.points[3] = new Vector(" + this.points[3].x + ", " + this.points[3].y + ");\n";
		str += "rectObj.color = \"" + this.color + "\";\n";
		str += "rectObj.fillColor = \"" + this.fillColor + "\";\n";
		str += "rectObj.fillAlpha = " + this.fillAlpha + ";\n";
		str += "rectObj.width = " + this.width + ";\n";
		str += "rectObj.rows = " + this.rows + ";\n";
		str += "rectObj.columns = " + this.columns + ";\n";
		str += "rectObj.centerPoints = " + this.centerPoints + ";\n";
		str += "rectObj.visible = " + this.visible + ";\n";
		str += "rectObj.frozen = " + this.frozen + ";\n";
		str += "rectObj.onChange();\n";

		str += "scene.addObject(rectObj);\n";
		return str;
	}

	this.addChangeListener = function (listener)
	{
		this.onChangeListeners.push(listener);
	}

	this.onChange = function()
	{
		var center = avg(this.points[0], this.points[2]);
		var halfSize = abs(sub(this.points[0], center));

		this.boundsMin = sub(center, halfSize);
		this.boundsMax = add(center, halfSize);

		for (var i = 0; i != this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this);
		}
	}

	this.draw = function(camera)
	{
		if (this.visible == false)
			return;

		var width = this.width * (this.selected ? 2 : 1);

		var fillColorRGB = hexToRgb(this.fillColor);
		var fillColorRGBA = "rgba(" + fillColorRGB.r + ", " + fillColorRGB.g + ", " + fillColorRGB.b + ", " + this.fillAlpha + ")";

		camera.drawLineStrip(this.points, true, this.color, width, [], fillColorRGBA, this);

		if (this.rows > 1 || this.columns > 1)
		{
			var deltaX0 = div(sub(this.points[1], this.points[0]), this.columns);
			var deltaX1 = div(sub(this.points[2], this.points[3]), this.columns);
			var deltaY0 = div(sub(this.points[3], this.points[0]), this.rows);
			var deltaY1 = div(sub(this.points[2], this.points[1]), this.rows);

			var points = [];

			for (var i = 1; i <= this.columns - 1; ++i)
			{
				var pX0 = mad(deltaX0, i, this.points[0]);
				var pX1 = mad(deltaX1, i, this.points[3]);

				points.push(pX0);
				points.push(pX1);
			}

			for (var i = 1; i <= this.rows - 1; ++i)
			{
				var pY0 = mad(deltaY0, i, this.points[0]);
				var pY1 = mad(deltaY1, i, this.points[1]);

				points.push(pY0);
				points.push(pY1);
			}

			camera.drawLines(points, this.color, width, [], fillColorRGBA, this);
		}

		if (this.centerPoints)
		{
			var deltaX0 = div(sub(this.points[1], this.points[0]), this.columns);
			var deltaY0 = div(sub(this.points[3], this.points[0]), this.rows);

			for (var i = 0.5; i <= this.columns; i += 1)
			{
				var pX = mad(deltaX0, i, this.points[0]);

				for (var j = 0.5; j <= this.rows; j += 1)
				{
					var pY = mad(deltaY0, j, pX);

					camera.drawCross(pY, camera.invScale(5), 0, "#808080", 2);
				}
			}
		}
	}
	
	this.hitTest = function(a, b)
	{
		if (	intersectRectLine(a, b, this.points[0], this.points[1]) ||
				intersectRectLine(a, b, this.points[1], this.points[2]) ||
				intersectRectLine(a, b, this.points[2], this.points[3]) ||
				intersectRectLine(a, b, this.points[3], this.points[0]))
		{
			return true;
		}

		if (this.rows > 1 || this.columns > 1)
		{
			var deltaX0 = div(sub(this.points[1], this.points[0]), this.columns);
			var deltaX1 = div(sub(this.points[2], this.points[3]), this.columns);
			var deltaY0 = div(sub(this.points[3], this.points[0]), this.rows);
			var deltaY1 = div(sub(this.points[2], this.points[1]), this.rows);

			for (var i = 1; i <= this.columns - 1; ++i)
			{
				var pX0 = mad(deltaX0, i, this.points[0]);
				var pX1 = mad(deltaX1, i, this.points[3]);

				if (intersectRectLine(a, b, pX0, pX1))
					return true;
			}

			for (var i = 1; i <= this.rows - 1; ++i)
			{
				var pY0 = mad(deltaY0, i, this.points[0]);
				var pY1 = mad(deltaY1, i, this.points[1]);

				if (intersectRectLine(a, b, pY0, pY1))
					return true;
			}
		}

		if (this.fillAlpha > 0)
		{
			if (	b.x<this.points[0].x ||
					a.x>this.points[2].x ||
					b.y<this.points[2].y ||
					a.y>this.points[0].y)
			{
				return false;
			}

			return true;
		}

		return false;
	}
	
	this.getSnapPoints = function()
	{
		var points = [	{ type: "node", p: this.points[0] },
						{ type: "node", p: this.points[1] },
						{ type: "node", p: this.points[2] },
						{ type: "node", p: this.points[3] },
						{ type: "midpoint", p: avg(this.points[0], this.points[1]) },
						{ type: "midpoint", p: avg(this.points[1], this.points[2]) },
						{ type: "midpoint", p: avg(this.points[2], this.points[3]) },
						{ type: "midpoint", p: avg(this.points[3], this.points[0]) } ];

		if (this.rows > 1 || this.columns > 1)
		{
			var deltaX0 = div(sub(this.points[1], this.points[0]), this.columns);
			var deltaY0 = div(sub(this.points[3], this.points[0]), this.rows);

			for (var i = 0; i <= this.columns; ++i)
			{
				var pX = mad(deltaX0, i, this.points[0]);

				for (var j = 0; j <= this.rows; ++j)
				{
					var pY = mad(deltaY0, j, pX);

					if (	((i == 0 || i == (this.columns)) && (j>0 && j<this.rows)) ||
							((j == 0 || j == (this.rows)) && (i>0 && i<this.columns)) )
					{
						points.push({type: "node", p: pY });
					}
					else if ( (i>0 && i<this.columns) && (j>0 && j<this.rows) )
					{
						points.push({type: "intersection", p: pY });
					}
				}
			}
		}


		if (this.centerPoints)
		{
			var deltaX0 = div(sub(this.points[1], this.points[0]), this.columns);
			var deltaY0 = div(sub(this.points[3], this.points[0]), this.rows);

			for (var i = 0.5; i <= this.columns; i += 1)
			{
				var pX = mad(deltaX0, i, this.points[0]);

				for (var j = 0.5; j <= this.rows; j += 1)
				{
					var pY = mad(deltaY0, j, pX);

					points.push({type: "node", p: pY });
				}
			}
		}

		return points;
	}

	this.getDragPoints = function(localSpace, camera)
	{
		if (this.isFrozen())
			return [];

		var points = [	this.points[0],
						this.points[1],
						this.points[2],
						this.points[3],
						avg(this.points[0], this.points[1]),
						avg(this.points[1], this.points[2]),
						avg(this.points[2], this.points[3]),
						avg(this.points[3], this.points[0])];

		return points;
	}

	this.drawDragPoint = function(camera, index, localSpace)
	{
		var points = [	this.points[0],
						this.points[1],
						this.points[2],
						this.points[3],
						avg(this.points[0], this.points[1]),
						avg(this.points[1], this.points[2]),
						avg(this.points[2], this.points[3]),
						avg(this.points[3], this.points[0])];

		camera.drawRectangle(points[index], camera.invScale(10), "#ff0000", 2);
	}

	this.setDragPointPos = function(index, p, localSpace)
	{
		var points = [	this.points[0],
						this.points[1],
						this.points[2],
						this.points[3],
						avg(this.points[0], this.points[1]),
						avg(this.points[1], this.points[2]),
						avg(this.points[2], this.points[3]),
						avg(this.points[3], this.points[0])];

		if (index < 4)
		{
			if (localSpace)
			{
				var center = avg(this.points[0], this.points[2]);
				var halfSize = abs(sub(p, center));

				this.points[0] = sub(center, halfSize);
				this.points[2] = add(center, halfSize);
				this.points[1].x = this.points[2].x;
				this.points[1].y = this.points[0].y;
				this.points[3].x = this.points[0].x;
				this.points[3].y = this.points[2].y;
			}
			else
			{
				this.points[index] = p;

				if (index==0)
				{
					this.points[3].x = p.x;
					this.points[1].y = p.y;
				}
				else if (index==1)
				{
					this.points[2].x = p.x;
					this.points[0].y = p.y;
				}
				else if (index==2)
				{
					this.points[1].x = p.x;
					this.points[3].y = p.y;
				}
				else if (index==3)
				{
					this.points[0].x = p.x;
					this.points[2].y = p.y;
				}
			}
		}
		else if (index < 8)
		{
			if (index==4)
			{
				this.points[0].y = p.y;
				this.points[1].y = p.y;
			}
			else if (index==5)
			{
				this.points[1].x = p.x;
				this.points[2].x = p.x;
			}
			else if (index==6)
			{
				this.points[2].y = p.y;
				this.points[3].y = p.y;
			}
			else if (index==7)
			{
				this.points[0].x = p.x;
				this.points[3].x = p.x;
			}
		}
		else
		{ }

		this.onChange();
	}

	this.getOrigin = function()
	{
		return this.points[0];
	}
	
	this.setOrigin = function(p)
	{
		var delta = sub(p, this.points[0]);

		for (var i = 0; i != 4; ++i)
		{
			this.points[i] = add(this.points[i], delta);
		}

		this.onChange();
	}

	this.getProperties = function()
	{
		return	[
					{name: "Outline Color", control:new ColorPicker(this.color, function(value){ this.color = value; lastRectLineColor = this.color; this.onChange(); }.bind(this) )},
					{name: "Fill Color", control:new ColorPicker(this.fillColor, function(value){ this.fillColor = value; lastRectFillColor = this.fillColor; this.onChange(); }.bind(this) )},
					{name: "Fill Alpha", control: new Slider(0, 1, this.fillAlpha, 0.1, function (value) { this.fillAlpha = value; lastRectAlpha = this.fillAlpha; this.onChange(); }.bind(this)) },
					{name: "Width", control: new Slider(0, 5, this.width, 1, function (value) { this.width = value; this.onChange(); }.bind(this)) },
					{name: "Rows", control: new Slider(1, 16, this.rows, 1, function (value) { this.rows = value; this.onChange(); }.bind(this)) },
					{name: "Columns", control: new Slider(1, 16, this.columns, 1, function (value) { this.columns = value; this.onChange(); }.bind(this)) },
					{name: "Center Points", control: new TickBox(this.centerPoints, function (value) { this.centerPoints = value; this.onChange(); }.bind(this)) }
  				];
	}

	this.toggleVisibility = function(v)
	{
		this.visible = (v!==undefined) ? v : !this.visible;
		this.onChange();
	}

	this.isVisible = function()
	{
		return this.visible;
	}

	this.toggleFrozen = function(f)
	{
		this.frozen = (f!==undefined) ? f : !this.frozen;
		this.onChange();
	}

	this.isFrozen = function()
	{
		return this.frozen;
	}

	this.onChange();
}

// ----------------------------------------------------------------------------------------------------------------
// Hemisphere
// ----------------------------------------------------------------------------------------------------------------
function Hemisphere(centerPos, radius, normal)
{
	this.scene				= null;
	this.center				= centerPos;
	this.normal				= normal;
	this.radius				= radius;
	this.BRDF				= Phong;
	this.metalness			= 0;
	this.roughness			= 0;
	this.showBRDF			= true;
	this.selected			= false;
	this.visible			= true;
	this.frozen				= false;
	this.onChangeListeners	= [];
	this.boundsMin			= new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
	this.boundsMax			= new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

	this.getBoundsMin = function()
	{
		return this.boundsMin;
	}

	this.getBoundsMax = function()
	{
		return this.boundsMax;
	}

	this.saveAsJavascript = function()
	{
		var str = "var hemi = new Hemisphere(";

		str += "new Vector(" + this.center.x + ", " + this.center.y + ")";
		str += ", " + this.radius;
		str += ", new Vector(" + this.normal.x + ", " + this.normal.y + ")";
		str += ");\n";

		str += "hemi.visible = " + this.visible + ";\n";
		str += "hemi.frozen = " + this.frozen + ";\n";
		str += "hemi.showBRDF = " + this.showBRDF + ";\n";
		str += "hemi.metalness = " + this.metalness + ";\n";
		str += "hemi.roughness = " + this.roughness + ";\n";

		str += "scene.addObject(hemi);\n";
		return str;
	}

	this.addChangeListener = function(listener)
	{
		this.onChangeListeners.push(listener);
	}

	this.onChange = function()
	{
		this.startAngle = toAngle(this.normal) - Math.PI/2;
		this.endAngle = toAngle(this.normal) + Math.PI/2;

		this.boundsMin = new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
		this.boundsMax = new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

		var p0 = add(this.center, mul(fromAngle(this.startAngle), this.radius));
		var p1 = add(this.center, mul(fromAngle(this.endAngle), this.radius));

		this.boundsMin = min(this.boundsMin, p0);
		this.boundsMin = min(this.boundsMin, p1);
		this.boundsMax = max(this.boundsMax, p0);
		this.boundsMax = max(this.boundsMax, p1);

		var a90 = Math.ceil(this.startAngle/(Math.PI/2)) * Math.PI/2;
		for (var a = a90; a <= this.endAngle; a += Math.PI/2)
		{
			var p = add(this.center, mul(fromAngle(a), this.radius));
			this.boundsMin = min(this.boundsMin, p);
			this.boundsMax = max(this.boundsMax, p);
		}

		for (var i=0; i!=this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this);
		}
	}
	
	this.draw = function(camera)
	{
		if (this.visible == false)
			return;

		if (this.radius <= 0)
			return;

		var width = this.selected ? 4 : 2;

		if (this.showBRDF)
		{
			var F0 = 0.04 + this.metalness * (1 - 0.04);
			camera.drawBRDFGraph(this.BRDF, this.normal, this.normal, F0, this.roughness, this.center);
		}

		camera.drawArc(this.center, this.radius, this.startAngle, this.endAngle, "#F08000", width);
		camera.drawArrow(this.center, mad(this.normal, this.radius * 0.5, this.center), "#000000", width);
		camera.drawText(mad(this.normal, this.radius * 0.5, this.center), "N", "#000000");
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
				p.y<rectMin.y)
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

	this.getSnapPoints = function ()
	{
		var points = [	{ type: "center", p: this.center } ];

		return points;
	}

	this.getDragPoints = function(localSpace, camera)
	{
		if (this.isFrozen())
			return [];

		var points = [ this.center ];

		return points;
	}

	this.drawDragPoint = function(camera, index, localSpace)
	{
		camera.drawRectangle(this.center, camera.invScale(10), "#ff0000", 2);
	}

	this.setDragPointPos = function(index, p, localSpace)
	{
		this.center = p;

		this.onChange();
	}

	this.getOrigin = function()
	{
		return this.center;
	}
	
	this.setOrigin = function(p)
	{
		this.center = p;
		this.onChange();
	}

	this.getProperties = function()
	{
		return	[
					{name: "Color", control:new ColorPicker(this.color, function(value){ this.color = value; this.onChange(); }.bind(this) )},
					{name: "Show BRDF", control: new TickBox(this.showBRDF, function (value) { this.showBRDF = value; this.onChange(); }.bind(this)) },
					{name: "Roughness", control: new Slider(0, 1, this.roughness, 0.1, function (value) { this.roughness = value; this.onChange(); }.bind(this)) },
					{name: "Metalness", control: new Slider(0, 1, this.metalness, 0.1, function (value) { this.metalness = value; this.onChange(); }.bind(this)) },
				];
	}

	this.toggleVisibility = function(v)
	{
		this.visible = (v!==undefined) ? v : !this.visible;
		this.onChange();
	}

	this.isVisible = function()
	{
		return this.visible;
	}

	this.toggleFrozen = function(f)
	{
		this.frozen = (f!==undefined) ? f : !this.frozen;
		this.onChange();
	}

	this.isFrozen = function()
	{
		return this.frozen;
	}

	this.onChange();
}

// ----------------------------------------------------------------------------------------------------------------
// NGon
// ----------------------------------------------------------------------------------------------------------------
var lastNGonColor = "#900090";
var lastNGonFillColor = "#000000";
var lastNGonAlpha = 0;

function NGon(centerPos, radius)
{
	this.scene				= null;
	this.center				= centerPos;
	this.radius				= radius;
	this.selected			= false;
	this.visible			= true;
	this.frozen				= false;
	this.sideCount			= 60;
	this.rotationAngle		= 0;
	this.dashed				= false;
	this.color				= lastNGonColor;
	this.fillColor			= lastNGonFillColor;
	this.fillAlpha			= lastNGonAlpha;
	this.width				= 2;
	this.onChangeListeners	= [];
	this.boundsMin			= new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
	this.boundsMax			= new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

	this.getBoundsMin = function()
	{
		return this.boundsMin;
	}

	this.getBoundsMax = function()
	{
		return this.boundsMax;
	}

	this.saveAsJavascript = function()
	{
		var str = "var ngon = new NGon(";

		str += "new Vector(" + this.center.x + ", " + this.center.y + ")";
		str += ", " + this.radius;
		str += ");\n";

		str += "ngon.sideCount = " + this.sideCount + ";\n";
		str += "ngon.rotationAngle = " + this.rotationAngle + ";\n";
		str += "ngon.color = \"" + this.color + "\";\n";
		str += "ngon.fillColor = \"" + this.fillColor + "\";\n";
		str += "ngon.fillAlpha = " + this.fillAlpha + ";\n";
		str += "ngon.dashed = " + this.dashed + ";\n";
		str += "ngon.width = " + this.width + ";\n";
		str += "ngon.visible = " + this.visible + ";\n";
		str += "ngon.frozen = " + this.frozen + ";\n";

		str += "scene.addObject(ngon);\n";
		return str;
	}

	this.addChangeListener = function(listener)
	{
		this.onChangeListeners.push(listener);
	}

	this.onChange = function()
	{
		this.boundsMin = sub(this.center, new Vector(this.radius, this.radius));
		this.boundsMax = add(this.center, new Vector(this.radius, this.radius));

		for (var i=0; i!=this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this);
		}
	}
	
	this.draw = function(camera)
	{
		if (this.visible == false)
			return;

		if (this.radius <= 0)
			return;

		var width = this.width * (this.selected ? 2 : 1);

		var dash = this.dashed ? [10, 5] : [];

		var points = [];

		var angleStep = Math.PI * 2 / this.sideCount;

		for (var a = 0; a <= Math.PI * 2; a += angleStep)
		{
			points.push(mad(fromAngle(a + this.rotationAngle), this.radius, this.center));
		}

		var fillColorRGB;
		var fillColorRGBA;

		if (this.fillAlpha > 0)
		{
			fillColorRGB = hexToRgb(this.fillColor);
			fillColorRGBA = "rgba(" + fillColorRGB.r + ", " + fillColorRGB.g + ", " + fillColorRGB.b + ", " + this.fillAlpha + ")";
		}

		camera.drawLineStrip(points, true, this.color, width, dash, fillColorRGBA, this);
	}
	
	this.hitTest = function(a, b)
	{
		var rectMin = min(a, b);
		var rectMax = max(a, b);
		var rectCenter = avg(a, b);

		if (	b.x>=this.center.x &&
				a.x<=this.center.x &&
				b.y>=this.center.y &&
				a.y<=this.center.y)
		{
			return true;
		}

		var p = add(this.center, mul(sub(rectCenter, this.center).unit(), this.radius));

		if (	p.x>rectMax.x ||
				p.x<rectMin.x ||
				p.y>rectMax.y ||
				p.y<rectMin.y)
		{
			return false;
		}

		return true;
	}

	this.getSnapPoints = function ()
	{
		var points = [	{ type: "center", p: this.center } ];

		var angleStep = Math.PI * 2 / this.sideCount;

		for (var a = 0; a <= Math.PI * 2; a += angleStep)
		{
			points.push( { type:"node", p: mad(fromAngle(a + this.rotationAngle), this.radius, this.center)} );
		}

		return points;
	}

	this.getDragPoints = function(localSpace, camera)
	{
		if (this.isFrozen())
			return [];

		var points = [ this.center ];

		var angleStep = Math.PI * 2 / this.sideCount;

		for (var a = 0; a <= Math.PI * 2; a += angleStep)
		{
			points.push( mad(fromAngle(a + this.rotationAngle), this.radius, this.center) );
		}

		return points;
	}

	this.drawDragPoint = function(camera, index, localSpace)
	{
		if (index == 0)
		{
			camera.drawRectangle(this.center, camera.invScale(10), "#ff0000", 2);
		}
		else
		{
			var angleStep = Math.PI * 2 / this.sideCount;

			var a = angleStep * (index-1);

			camera.drawRectangle( mad(fromAngle(a + this.rotationAngle), this.radius, this.center), camera.invScale(10), "#ff0000", 2);
		}
	}

	this.setDragPointPos = function(index, p, localSpace)
	{
		if (index == 0)
		{
			this.center = p;
		}
		else
		{
			this.radius = sub(p, this.center).length();

			var angleStep = Math.PI * 2 / this.sideCount;

			var dragPointAngle = angleStep * (index-1);

			var dragPoint = mad(fromAngle(dragPointAngle + this.rotationAngle), this.radius, this.center);

			var pointAngle = toAngle(sub(p, this.center));

			this.rotationAngle = pointAngle - dragPointAngle;
		}

		this.onChange();
	}

	this.getOrigin = function()
	{
		return this.center;
	}
	
	this.setOrigin = function(p)
	{
		this.center = p;
		this.onChange();
	}

	this.transform = function(currentRect, newRect)
	{
		var localCoord = new Vector(	dot(sub(this.getOrigin(), currentRect.center), currentRect.scaledXAxis),
										dot(sub(this.getOrigin(), currentRect.center), currentRect.scaledYAxis) );

		localCoord.x /= currentRect.scaledXAxis.lengthSqr();
		localCoord.y /= currentRect.scaledYAxis.lengthSqr();

		this.setOrigin( add(mad(localCoord.x, newRect.scaledXAxis, newRect.center), mul(localCoord.y, newRect.scaledYAxis)) );

		if (newRect.scaledXAxis.lengthSqr() > newRect.scaledYAxis.lengthSqr())
		{
			this.radius *= Math.sqrt(newRect.scaledYAxis.lengthSqr() / currentRect.scaledYAxis.lengthSqr());
		}
		else
		{
			this.radius *= Math.sqrt(newRect.scaledXAxis.lengthSqr() / currentRect.scaledXAxis.lengthSqr());
		}

		this.rotationAngle += toAngle(newRect.scaledXAxis) - toAngle(currentRect.scaledXAxis);

		this.onChange();
	}

	this.getProperties = function()
	{
		return	[
					{name: "Sides", control: new Slider(3, 60, this.sideCount, 1, function (value) { this.sideCount = value; this.onChange(); }.bind(this)) },
					{name: "Color", control:new ColorPicker(this.color, function(value){ this.color = value; lastLineColor = this.color; this.onChange(); }.bind(this) )},
					{name: "Fill Color", control:new ColorPicker(this.fillColor, function(value){ this.fillColor = value; lastRectFillColor = this.fillColor; this.onChange(); }.bind(this) )},
					{name: "Fill Alpha", control: new Slider(0, 1, this.fillAlpha, 0.1, function (value) { this.fillAlpha = value; lastRectAlpha = this.fillAlpha; this.onChange(); }.bind(this)) },
					{name: "Width", control: new Slider(0, 5, this.width, 1, function (value) { this.width = value; this.onChange(); }.bind(this)) },
					{name: "Dashed", control: new TickBox(this.dashed, function (value) { this.dashed = value; this.onChange(); }.bind(this)) },
				];
	}

	this.toggleVisibility = function(v)
	{
		this.visible = (v!==undefined) ? v : !this.visible;
		this.onChange();
	}

	this.isVisible = function()
	{
		return this.visible;
	}

	this.toggleFrozen = function(f)
	{
		this.frozen = (f!==undefined) ? f : !this.frozen;
		this.onChange();
	}

	this.isFrozen = function()
	{
		return this.frozen;
	}

	this.onChange();
}

// ----------------------------------------------------------------------------------------------------------------
// Dimension
// ----------------------------------------------------------------------------------------------------------------
function Dimension(A, B, center)
{
	this.scene				= null;
	this.selected			= false;
	this.A					= A;
	this.B					= B;
	this.center				= center;
	this.offset				= 1;
	this.offsetX			= 0.5;
	this.decimals			= 2;
	this.visible			= true;
	this.frozen				= false;
	this.onChangeListeners	= [];
	this.boundsMin			= new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
	this.boundsMax			= new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

	this.getBoundsMin = function()
	{
		return this.boundsMin;
	}

	this.getBoundsMax = function()
	{
		return this.boundsMax;
	}

	this.saveAsJavascript = function()
	{
		var str = "var dim = new Dimension(";

		str += "new Vector(" + this.A.x + ", " + this.A.y + ")";
		str += ", new Vector(" + this.B.x + ", " + this.B.y + ")";
		if (this.center !== undefined)
		{
			str += ", new Vector(" + this.center.x + ", " + this.center.y + ")";
		}
		str += ");\n";

		str += "dim.offset = " + this.offset + ";\n";
		str += "dim.offsetX = " + this.offsetX + ";\n";
		str += "dim.decimals = " + this.decimals + ";\n";
		str += "dim.visible = " + this.visible + ";\n";
		str += "dim.frozen = " + this.frozen + ";\n";

		str += "scene.addObject(dim);\n";
		return str;
	}

	this.addChangeListener = function(listener)
	{
		this.onChangeListeners.push(listener);
	}

	this.onChange = function()
	{
		this.boundsMin = this.A;
		this.boundsMax = this.A;

		this.boundsMin = min(this.B, this.boundsMin);
		this.boundsMax = max(this.B, this.boundsMax);

		var tan = transpose(sub(this.B, this.A).unit());

		var offsetA0 = mad(tan, this.offset, this.A);
		var offsetB0 = mad(tan, this.offset, this.B);
		var textAnchor = lerp(offsetA0, offsetB0, this.offsetX);

		this.boundsMin = min(offsetA0, this.boundsMin);
		this.boundsMax = max(offsetA0, this.boundsMax);

		this.boundsMin = min(offsetB0, this.boundsMin);
		this.boundsMax = max(offsetB0, this.boundsMax);

		this.boundsMin = min(textAnchor, this.boundsMin);
		this.boundsMax = max(textAnchor, this.boundsMax);

		if (this.center !== undefined)
		{
			this.boundsMin = min(this.center, this.boundsMin);
			this.boundsMax = max(this.center, this.boundsMax);
		}

		for (var i=0; i!=this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this);
		}
	}
	
	this.draw = function(camera)
	{
		if (this.visible == false)
			return;

		if (this.A == undefined || this.B == undefined)
			return;

		var width = this.selected ? 2 : 1;

		if (this.center !== undefined)
		{
			var points = [this.A, this.center, this.B];

			camera.drawLineStrip(points, false, "#000000", width);
		}
		else
		{
			var tan = transpose(sub(this.B, this.A).unit());

			var offsetA0 = mad(tan, this.offset, this.A);
			var offsetA1 = mad(tan, this.offset + Math.sign(this.offset) * camera.invScale(5), this.A);

			var offsetB0 = mad(tan, this.offset, this.B);
			var offsetB1 = mad(tan, this.offset + Math.sign(this.offset) * camera.invScale(5), this.B);

			var textAngle = toAngle(sub(this.B, this.A));
			var factor = 1;

			if (textAngle > Math.PI / 2 || textAngle <= -Math.PI / 2)
			{
				textAngle -= Math.PI;
				factor = -1;
			}

			var textAnchor = lerp(offsetA0, offsetB0, this.offsetX);
			textAnchor = mad(tan.neg(), factor * camera.invScale(5), textAnchor);

			var textAlign = "center";

			camera.drawLine(this.A, offsetA1, "#000000", width);
			camera.drawLine(this.B, offsetB1, "#000000", width);

			if (this.offsetX >= 0 && this.offsetX <= 1)
			{
				camera.drawArrow(avg(offsetA0, offsetB0), offsetA0, "#000000", width);
				camera.drawArrow(avg(offsetA0, offsetB0), offsetB0, "#000000", width);
			}
			else if (this.offsetX < 0)
			{
				camera.drawArrow(lerp(offsetA0, offsetB0, this.offsetX), offsetA0, "#000000", width);
				camera.drawLine(offsetA0, offsetB0, "#000000", width);
				camera.drawArrow(mad(sub(offsetB0, offsetA0).unit(), camera.invScale(30), offsetB0), offsetB0, "#000000", width);

				textAlign = "left";
			}
			else if (this.offsetX > 1)
			{
				camera.drawArrow(lerp(offsetA0, offsetB0, this.offsetX), offsetB0, "#000000", width);
				camera.drawLine(offsetA0, offsetB0, "#000000", width);
				camera.drawArrow(mad(sub(offsetA0, offsetB0).unit(), camera.invScale(30), offsetA0), offsetA0, "#000000", width);

				textAlign = "right";
			}


			camera.drawText(textAnchor, distance(this.A, this.B).toFixed(this.decimals), "#000000", textAlign, textAngle);
		}
	}
	
	this.hitTest = function(a, b)
	{
		if (this.center !== undefined)
		{
			var points = [this.A, this.center, this.B];

			if (	intersectRectLine(a, b, this.A, this.center) ||
					intersectRectLine(a, b, this.center, this.B) )
				return true;
		}
		else
		{
			var tan = transpose(sub(this.B, this.A).unit());

			var offsetA0 = mad(tan, this.offset, this.A);
			var offsetB0 = mad(tan, this.offset, this.B);

			if (	intersectRectLine(a, b, offsetA0, offsetB0) ||
					intersectRectLine(a, b, offsetA0, this.A) ||
					intersectRectLine(a, b, offsetB0, this.B) )
				return true;
		}

		return false;
	}

	this.getSnapPoints = function ()
	{
		var points = [];

		if (this.center !== undefined)
		{
			points.push( { type: "node", p: this.center } );
		}
		else
		{
			var tan = transpose(sub(this.B, this.A).unit());

			var offsetA0 = mad(tan, this.offset, this.A);
			var offsetB0 = mad(tan, this.offset, this.B);

			points.push( { type: "node", p: this.A} );
			points.push( { type: "node", p: this.B} );
			points.push( { type: "node", p: lerp(offsetA0, offsetB0, this.offsetX)} );
		}

		return points;
	}

	this.getDragPoints = function(localSpace, camera)
	{
		if (this.isFrozen())
			return [];

		var points = [ ];

		if (this.center !== undefined)
		{
			//points.push( { type: "node", p: this.center } );
		}
		else
		{
			var tan = transpose(sub(this.B, this.A).unit());

			var offsetA0 = mad(tan, this.offset, this.A);
			var offsetB0 = mad(tan, this.offset, this.B);

			points.push( this.A );
			points.push( this.B );
			points.push( lerp(offsetA0, offsetB0, this.offsetX) );
		}

		return points;
	}

	this.drawDragPoint = function(camera, index, localSpace)
	{
		if (this.center !== undefined)
		{
			//points.push( { type: "node", p: this.center } );
		}
		else
		{
			var tan = transpose(sub(this.B, this.A).unit());

			var offsetA0 = mad(tan, this.offset, this.A);
			var offsetB0 = mad(tan, this.offset, this.B);

			if (index == 0)
			{
				camera.drawRectangle(this.A, camera.invScale(10), "#ff0000", 2);
			}
			else if (index == 1)
			{
				camera.drawRectangle(this.B, camera.invScale(10), "#ff0000", 2);
			}
			else if (index == 2)
			{
				camera.drawRectangle(lerp(offsetA0, offsetB0, this.offsetX), camera.invScale(10), "#ff0000", 2);
			}
		}
	}

	this.setDragPointPos = function(index, p, localSpace)
	{
		if (index == 0)
		{
			this.A = p;
		}
		else if (index == 1)
		{
			this.B = p;
		}
		else if (index == 2)
		{
			var tan = transpose(sub(this.B, this.A).unit());

			this.offset = dot(sub(p, this.A), tan);
			this.offsetX = dot(sub(p, this.A), sub(this.B, this.A)) / distance(this.B, this.A) / distance(this.B, this.A);
		}
		else if (index == 3)
		{
			this.center = p;
		}

		this.onChange();
	}

	this.getOrigin = function()
	{
		return this.A;
	}
	
	this.setOrigin = function(p)
	{
		var delta = sub(p, this.A);

		this.A = add(this.A, delta);
		this.B = add(this.B, delta);

		if (this.center !== undefined)
		{
			this.center = add(this.center, delta);
		}

		this.onChange();
	}

	this.getProperties = function()
	{
		return	[
					{ name: "Decimals", control: new Slider(0, 5, this.decimals, 1, function (value) { this.decimals = value; this.onChange(); }.bind(this)) },
				];
	}

	this.toggleVisibility = function(v)
	{
		this.visible = (v!==undefined) ? v : !this.visible;
		this.onChange();
	}

	this.isVisible = function()
	{
		return this.visible;
	}

	this.toggleFrozen = function(f)
	{
		this.frozen = (f!==undefined) ? f : !this.frozen;
		this.onChange();
	}

	this.isFrozen = function()
	{
		return this.frozen;
	}

	this.onChange();
}

// ----------------------------------------------------------------------------------------------------------------
// BarChart
// ----------------------------------------------------------------------------------------------------------------
var lastBarChartLineColor = "#900090";
var lastBarChartFillColor = "#FFFFFF";
var lastBarChartAlpha = 1;

function BarChart(A, B)
{
	this.scene				= null;
	this.selected			= false;
	this.A					= A;
	this.B					= B;
	this.values				= [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
	this.userValues			= [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined];
	this.valuesFunctionStr	= "return Math.sin(index)*10;";
	this.showMip			= 1;
	this.visible			= true;
	this.frozen				= false;
	this.width				= 1;
	this.color				= lastBarChartLineColor;
	this.fillColor			= lastBarChartFillColor;
	this.fillAlpha			= lastBarChartAlpha;
	this.onChangeListeners	= [];
	this.boundsMin			= new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
	this.boundsMax			= new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

	this.getBoundsMin = function()
	{
		return this.boundsMin;
	}

	this.getBoundsMax = function()
	{
		return this.boundsMax;
	}

	this.saveAsJavascript = function()
	{
		var str = "var bar = new BarChart(";

		str += "new Vector(" + this.A.x + ", " + this.A.y + ")";
		str += ", new Vector(" + this.B.x + ", " + this.B.y + ")";
		str += ");\n";

		str += "bar.color = \"" + this.color + "\";\n";
		str += "bar.fillColor = \"" + this.fillColor + "\";\n";
		str += "bar.fillAlpha = " + this.fillAlpha + ";\n";
		str += "bar.valuesFunctionStr = \"" + this.valuesFunctionStr + "\";\n";

		str += "bar.values = [";

		for (var i = 0; i != this.values.length; ++i)
			str += ((i > 0) ? ", " : "") + this.values[i];

		str += "];\n";

		str += "bar.userValues = [";

		for (var i = 0; i != this.values.length; ++i)
			str += ((i > 0) ? ", " : "") + this.userValues[i];

		str += "];\n";

		str += "bar.showMip = " + this.showMip + ";\n";
		str += "bar.width = " + this.width + ";\n";

		str += "bar.visible = " + this.visible + ";\n";
		str += "bar.frozen = " + this.frozen + ";\n";

		str += "bar.onChange();\n";

		str += "scene.addObject(bar);\n";
		return str;
	}

	this.addChangeListener = function(listener)
	{
		this.onChangeListeners.push(listener);
	}

	this.onChange = function()
	{
		var unit = sub(this.B, this.A).unit();
		var tan = transpose(unit).neg();
		var delta = distance(this.A, this.B)/this.values.length;

		var minVal = Number.MAX_VALUE;
		var maxVal = -Number.MAX_VALUE;

		// Update values
		{
			var valuesFunction = Function("index", this.valuesFunctionStr);

			for (var i = 0; i != this.values.length; ++i)
			{
				this.values[i] = (this.userValues[i] != undefined) ? this.userValues[i] : valuesFunction(i);

				minVal = Math.min(minVal, this.values[i]);
				maxVal = Math.max(maxVal, this.values[i]);
			}
		}

		this.boundsMin = this.A;
		this.boundsMax = this.A;

		this.boundsMin = min(this.B, this.boundsMin);
		this.boundsMax = max(this.B, this.boundsMax);

		var p0 = mad(tan, minVal, this.A);
		var p1 = mad(tan, maxVal, this.A);
		var p2 = mad(tan, minVal, this.B);
		var p3 = mad(tan, maxVal, this.B);

		this.boundsMin = min(p0, this.boundsMin);
		this.boundsMin = min(p1, this.boundsMin);
		this.boundsMin = min(p2, this.boundsMin);
		this.boundsMin = min(p3, this.boundsMin);

		this.boundsMax = max(p0, this.boundsMax);
		this.boundsMax = max(p1, this.boundsMax);
		this.boundsMax = max(p2, this.boundsMax);
		this.boundsMax = max(p3, this.boundsMax);

		for (var i=0; i!=this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this);
		}
	}
	
	this.draw = function(camera)
	{
		if (this.visible == false)
			return;

		var fillColorRGB = hexToRgb(this.fillColor);
		var fillColorRGBA = "rgba(" + fillColorRGB.r + ", " + fillColorRGB.g + ", " + fillColorRGB.b + ", " + this.fillAlpha + ")";

		var width = this.width * (this.selected ? 2 : 1);

		var unit = sub(this.B, this.A).unit();
		var tan = transpose(unit).neg();

		// Mip N
		//if (this.showMip>0)
		//for (var mip=0; mip<=this.showMip; ++mip)
		{
			var mip = this.showMip;

			var mip0count = Math.pow(2, mip);
			var delta = distance(this.A, this.B) / this.values.length * mip0count;

			var count = this.values.length / mip0count;
			count = Math.floor(count);

			for (var i=0; i!=count; ++i)
			{
				var mip0index = Math.floor(i * mip0count);

				var minVal = Number.MAX_VALUE;
				var maxVal = -Number.MAX_VALUE;
				var avgVal = 0;

				for (var j=0; j!=mip0count; ++j)
				{
					var value = this.values[mip0index + j];

					minVal = Math.min(minVal, value);
					maxVal = Math.max(maxVal, value);
					avgVal += value;
				}

				avgVal /= mip0count;

				var min1 = mad(tan, minVal, mad(unit, i*delta, this.A));
				var min2 = mad(tan, minVal, mad(unit, (i+1)*delta, this.A));
				var max1 = mad(tan, maxVal, mad(unit, i*delta, this.A));
				var max2 = mad(tan, maxVal, mad(unit, (i+1)*delta, this.A));
				var avg1 = mad(tan, avgVal, mad(unit, i*delta, this.A));
				var avg2 = mad(tan, avgVal, mad(unit, (i+1)*delta, this.A));

				camera.drawLineStrip([min1, max1, max2, min2], true, this.color, width, [], "rgba(0,0,0,0.2)", this);
			}
		}

		// Mip 0
		{
			var delta = distance(this.A, this.B)/this.values.length;

			var points = [this.B, this.A];

			for (var i = 0; i != this.values.length; ++i)
			{
				var p0 = mad(unit, i*delta, this.A);
				var p1 = mad(tan, this.values[i], mad(unit, i*delta, this.A));
				var p2 = mad(tan, this.values[i], mad(unit, (i+1)*delta, this.A));
				var p3 = mad(unit, (i+1)*delta, this.A);

				points.push(p0);
				points.push(p1);
				points.push(p2);
				points.push(p3);
			}

			camera.drawLineStrip(points, false, this.color, width, [], fillColorRGBA, this);
		}
	}
	
	this.hitTest = function(a, b)
	{
		if (intersectRectLine(a, b, this.A, this.B))
			return true;

		var unit = sub(this.B, this.A).unit();
		var tan = transpose(unit).neg();
		var delta = distance(this.A, this.B)/this.values.length;

		for (var i = 0; i != this.values.length; ++i)
		{
			var p0 = mad(unit, i*delta, this.A);
			var p1 = mad(tan, this.values[i], mad(unit, i*delta, this.A));
			var p2 = mad(tan, this.values[i], mad(unit, (i+1)*delta, this.A));
			var p3 = mad(unit, (i + 1) * delta, this.A);

			if (intersectRectLine(a, b, p0, p1))
				return true;

			if (intersectRectLine(a, b, p1, p2))
				return true;

			if (intersectRectLine(a, b, p2, p3))
				return true;
		}

		return false;
	}

	this.getSnapPoints = function ()
	{
		var points = [];

		points.push( { type: "node", p: this.A} );
		points.push( { type: "node", p: this.B} );

		var unit = sub(this.B, this.A).unit();
		var tan = transpose(unit).neg();
		var delta = distance(this.A, this.B)/this.values.length;

		for (var i = 0; i != this.values.length; ++i)
		{
			var p0 = mad(unit, i*delta, this.A);
			var p1 = mad(tan, this.values[i], mad(unit, i*delta, this.A));
			var p2 = mad(tan, this.values[i], mad(unit, (i+1)*delta, this.A));
			var p3 = mad(unit, (i + 1) * delta, this.A);

			points.push( { type: "node", p: p1} );
			points.push( { type: "node", p: avg(p1,p2)} );
			points.push( { type: "node", p: p2} );
		}

		return points;
	}

	this.getDragPoints = function(localSpace, camera)
	{
		if (this.isFrozen())
			return [];

		var points = [this.A, this.B];

		var unit = sub(this.B, this.A).unit();
		var tan = transpose(unit).neg();
		var delta = distance(this.A, this.B)/this.values.length;

		for (var i = 0; i != this.values.length; ++i)
		{
			var p = mad(tan, this.values[i], mad(unit, (i+0.5)*delta, this.A));

			points.push(p);
		}

		return points;
	}

	this.drawDragPoint = function(camera, index, localSpace)
	{
		var unit = sub(this.B, this.A).unit();
		var tan = transpose(unit).neg();
		var delta = distance(this.A, this.B)/this.values.length;

		if (index == 0)
		{
			camera.drawRectangle(this.A, camera.invScale(10), "#ff0000", 2);
		}
		else if (index == 1)
		{
			camera.drawRectangle(this.B, camera.invScale(10), "#ff0000", 2);
		}
		else
		{
			var p = mad(tan, this.values[index-2], mad(unit, (index-2 + 0.5) * delta, this.A))

			camera.drawRectangle(p, camera.invScale(10), "#ff0000", 2);
		}
	}

	this.setDragPointPos = function(index, p, localSpace)
	{
		if (index == 0)
		{
			this.A = p;
		}
		else if (index == 1)
		{
			this.B = p;
		}
		else
		{
			var unit = sub(this.B, this.A).unit();
			var tan = transpose(unit).neg();
			var delta = distance(this.A, this.B) / this.count;

			this.userValues[index - 2] = dot(sub(p, this.A), tan);
		}

		this.onChange();
	}

	this.getOrigin = function()
	{
		return this.A;
	}
	
	this.setOrigin = function(p)
	{
		var delta = sub(p, this.A);

		this.A = add(this.A, delta);
		this.B = add(this.B, delta);

		this.onChange();
	}

	this.setBarCount = function(count)
	{
		if (count == this.values.length)
			return;

		if (count < this.values.length)
		{
			this.values = this.values.slice(0, count);
		}
		else
		{
			var val = this.values[this.values.length-1];

			for (var i=this.values.length; i!=count; ++i)
			{
				this.values.push(val);
			}
		}

		this.onChange();
	}

	this.getProperties = function()
	{
		return	[
					{name: "Outline Color", control:new ColorPicker(this.color, function(value){ this.color = value; lastRectLineColor = this.color; this.onChange(); }.bind(this) )},
					{name: "Width", control: new Slider(0, 5, this.width, 1, function (value) { this.width = value; this.onChange(); }.bind(this)) },
					{name: "Fill Color", control:new ColorPicker(this.fillColor, function(value){ this.fillColor = value; lastRectFillColor = this.fillColor; this.onChange(); }.bind(this) )},
					{name: "Fill Alpha", control: new Slider(0, 1, this.fillAlpha, 0.1, function (value) { this.fillAlpha = value; lastRectAlpha = this.fillAlpha; this.onChange(); }.bind(this)) },
					{name: "Columns", control: new Slider(1, 20, this.values.length, 1, function (value) { this.setBarCount(value); }.bind(this)) },
					{name: "Show Mip", control: new Slider(0, 4, this.showMip, 1, function (value) { this.showMip = value; this.onChange(); }.bind(this)) },
					{name: "Values Function", control: new TextBox(this.valuesFunctionStr, false, function (value) { this.valuesFunctionStr = value; this.onChange(); }.bind(this)) }
				];
	}

	this.toggleVisibility = function(v)
	{
		this.visible = (v!==undefined) ? v : !this.visible;
		this.onChange();
	}

	this.isVisible = function()
	{
		return this.visible;
	}

	this.toggleFrozen = function(f)
	{
		this.frozen = (f!==undefined) ? f : !this.frozen;
		this.onChange();
	}

	this.isFrozen = function()
	{
		return this.frozen;
	}

	this.onChange();
}

// ----------------------------------------------------------------------------------------------------------------
// Group object
// ----------------------------------------------------------------------------------------------------------------
function Group(objects)
{
	this.scene				= null;
	this.objects			= [];
	this.selected			= false;
	this.visible			= true;
	this.frozen				= false;
	this.onChangeListeners	= [];
	this.boundsMin			= new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
	this.boundsMax			= new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

	this.getBoundsMin = function ()
	{
		return this.boundsMin;
	}

	this.getBoundsMax = function()
	{
		return this.boundsMax;
	}

	this.addObject = function (object)
	{
		this.objects.push(object);

		var objectScene = object.scene;

		if (object.scene !== null)
		{
			object.scene.deleteObjects([object]);
		}

		this.objects[this.objects.length-1].scene = objectScene;

		if (object.addChangeListener !== null)
		{
			object.addChangeListener(this.onChange.bind(this));
		}

		this.onChange();
	}

	this.deleteObjects = function(objectList)
	{
		var index = this.scene.getObjectIndex(this);

		for (var i=0; i<this.objects.length; ++i)
		{
			if (objectList.indexOf(this.objects[i])>=0)
			{
				this.scene.addObject(this.objects[i], index);

				this.objects[i].selected = false;

				this.objects.splice(i, 1);
				--i;
				++index;
			}
		}

		if (this.objects.length == 0)
		{
			this.scene.deleteObjects([this]);
			return;
		}

		this.onChange();
	}

	this.deleteAllObjects = function()
	{
		this.deleteObjects(this.objects.slice(0));
	}

	this.saveAsJavascript = function ()
	{
		var str = "var g = new Group([]);\n";

		for (var i = 0; i != this.objects.length; ++i)
		{
			str += this.objects[i].saveAsJavascript();
			str += "g.addObject(scene.objects[scene.objects.length-1]);\n";
		}

		str += "g.visible = " + this.visible + ";\n";
		str += "g.frozen = " + this.frozen + ";\n";

		str += "scene.addObject(g);\n";
		return str;
	}

	this.addChangeListener = function(listener)
	{
		this.onChangeListeners.push(listener);
	}

	this.onChange = function()
	{
		this.boundsMin = new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
		this.boundsMax = new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

		for (var i=0; i<this.objects.length; ++i)
		{
			if (this.objects[i].getBoundsMin !== undefined)
			{
				this.boundsMin = min(this.boundsMin, this.objects[i].getBoundsMin());
				this.boundsMax = max(this.boundsMax, this.objects[i].getBoundsMax());
			}
		}

		for (var i=0; i!=this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this);
		}
	}
	
	this.draw = function(camera)
	{
		if (this.visible == false)
			return;

		for (var i=0; i<this.objects.length; ++i)
		{
			this.objects[i].selected = this.selected;
			this.objects[i].draw(camera);
		}
	}
	
	this.hitTest = function(a, b)
	{
		for (var i=0; i<this.objects.length; ++i)
		{
			if (this.objects[i].hitTest !== undefined && this.objects[i].hitTest(a,b) == true)
			{
				return true;
			}
		}
		
		return false;
	}
	
	this.rayHitTest = function(rayPos, rayDir)
	{
		var results = [];

		for (var i=0; i<this.objects.length; ++i)
		{
			if (this.objects[i].rayHitTest !== undefined)
			{
				results = results.concat( this.objects[i].rayHitTest(rayPos, rayDir) );
			}
		}

		return results;
	}

	this.getSnapPoints = function()
	{
		var snaps = [];

		for (var i=0; i<this.objects.length; ++i)
		{
			snaps = snaps.concat( this.objects[i].getSnapPoints() );
		}

		return snaps;
	}

	this.getDragPoints = function(localSpace, camera)
	{
		return [];
	}

	this.drawDragPoint = function(camera, index, localSpace)
	{
	}

	this.setDragPointPos = function(index, p, localSpace)
	{
	}

	this.getOrigin = function()
	{
		return this.objects[0].getOrigin();
	}
	
	this.setOrigin = function(p)
	{
		var delta = sub(p, this.objects[0].getOrigin());

		for (var i=0; i<this.objects.length; ++i)
		{
			this.objects[i].setOrigin(add(this.objects[i].getOrigin(), delta));
		}

		this.onChange();
	}

	this.transform = function(currentRect, newRect)
	{
		for (var i=0; i!=this.objects.length; ++i)
		{
			if (this.objects[i].transform != undefined)
			{
				this.objects[i].transform(currentRect, newRect);
			}
			else
			{
				var localCoord = new Vector(	dot(sub(this.objects[i].getOrigin(), currentRect.center), currentRect.scaledXAxis),
												dot(sub(this.objects[i].getOrigin(), currentRect.center), currentRect.scaledYAxis) );

				localCoord.x /= currentRect.scaledXAxis.lengthSqr();
				localCoord.y /= currentRect.scaledYAxis.lengthSqr();

				this.objects[i].setOrigin( add(mad(localCoord.x, newRect.scaledXAxis, newRect.center), mul(localCoord.y, newRect.scaledYAxis)) );
			}
		}

		this.onChange();
	}

	this.getProperties = function()
	{
		return [];
	}

	this.toggleVisibility = function(v)
	{
		this.visible = (v!==undefined) ? v : !this.visible;
		this.onChange();
	}

	this.isVisible = function()
	{
		return this.visible;
	}

	this.toggleFrozen = function(f)
	{
		this.frozen = (f!==undefined) ? f : !this.frozen;
		this.onChange();
	}

	this.isFrozen = function()
	{
		return this.frozen;
	}

	for (var i=0; i!=objects.length; ++i)
	{
		this.addObject(objects[i]);
	}
}

// ----------------------------------------------------------------------------------------------------------------
// Regular grid
// ----------------------------------------------------------------------------------------------------------------
function Grid()
{
	this.O 			= new Vector(0,0);
	this.spacing	= 1;
	this.color		= "rgba(153,217,234,0.5)";
	this.width		= 1;
	this.type		= "cartesian";
	
	//this.saveAsJavascript = function()
	//{
	//	var str = "var grid = new Grid(";

	//	str += "new Vector(" + this.O.x + ", " + this.O.y + ")";
	//	str += ", " + this.spacing;
	//	str += ", \"" + this.color + "\"";
	//	str += ", " + this.width;
	//	str += ", [" + this.dash + "]";
	//	str += ");\n";

	//	str += "scene.addObject(grid);\n";
	//	return str;
	//}

	this.getSnapPoint = function(p)
	{
		if (this.type == "cartesian")
		{
			return mul(round(div(p, this.spacing)), this.spacing);
		}
		else if (this.type == "isometric")
		{
			var axis1 = fromAngle(30 * Math.PI / 180);
			var axis2 = fromAngle(150 * Math.PI / 180);
			var dotAxis1 = fromAngle(60 * Math.PI / 180);
			var dotAxis2 = fromAngle(120 * Math.PI / 180);
			var dotSpacing = this.spacing * Math.cos(30 * Math.PI / 180);

			var result = new Vector(0, 0);

			result = mad(axis1, Math.round(dot(p, dotAxis1) / dotSpacing) * this.spacing, result);
			result = mad(axis2, Math.round(dot(p, dotAxis2) / dotSpacing) * this.spacing, result);

			return result;
		}
		else if (this.type == "radial")
		{
			var radius = Math.round(length(p) / this.spacing) * this.spacing;

			var angleStep = Math.min(5, 20 / this.spacing);

			var angle = toAngle(p) * 180 / Math.PI;

			angle = Math.round(angle / angleStep) * angleStep;

			var result = mad(fromAngle(angle * Math.PI / 180), radius, this.O);

			return result;
		}
	}

	this.draw = function(camera)
	{
		camera.setLayer(0);

		var l = Math.floor( (this.O.x + camera.getViewPosition().x - camera.getViewSize().x/2) / this.spacing ) * this.spacing;
		var r = Math.floor( (this.O.x + camera.getViewPosition().x + camera.getViewSize().x/2) / this.spacing + 1) * this.spacing;
		var b = Math.floor( (this.O.y + camera.getViewPosition().y - camera.getViewSize().y/2) / this.spacing ) * this.spacing;
		var t = Math.floor( (this.O.y + camera.getViewPosition().y + camera.getViewSize().y/2) / this.spacing + 1) * this.spacing;

		if (this.type == "cartesian")
		{
			var points = [];

			for (var x=l; x<=r; x+=this.spacing)
			{
				points.push(new Vector(x, b));
				points.push(new Vector(x, t));
			}
	
			for (var y=b; y<=t; y+=this.spacing)
			{
				points.push(new Vector(l, y));
				points.push(new Vector(r, y));
			}

			camera.drawLines(points, this.color, this.width);
			camera.drawLine(new Vector(l, this.O.y), new Vector(r, this.O.y), this.color, this.width*2);
			camera.drawLine(new Vector(this.O.x, b), new Vector(this.O.x, t), this.color, this.width*2);
		}
		else if (this.type == "isometric")
		{
			var axis = fromAngle(30 * Math.PI / 180);

			var TL = new Vector(l, t);
			var TR = new Vector(r, t);
			var BL = new Vector(l, b);
			var BR = new Vector(r, b);

			var count = Math.ceil(dot(sub(TR, BL), axis) / this.spacing);
			var stepX = 2 * this.spacing * Math.cos(30 * Math.PI / 180);
			var stepY = 2 * this.spacing * Math.sin(30 * Math.PI / 180);

			var points = [];

			for (var i = 0; i < count; ++i)
			{
				points.push(new Vector(Math.floor(l/stepX)*stepX, Math.floor(b/stepY)*stepY+i*stepY));
				points.push(new Vector(Math.floor(l/stepX)*stepX+i*stepX, Math.floor(b/stepY)*stepY));
			}

			for (var i = 0; i < count; ++i)
			{
				points.push(new Vector(Math.ceil(r/stepX)*stepX, Math.floor(b/stepY)*stepY+i*stepY));
				points.push(new Vector(Math.ceil(r/stepX)*stepX-i*stepX, Math.floor(b/stepY)*stepY));
			}

			camera.drawLines(points, this.color, this.width);

			axis = fromAngle(60 * Math.PI / 180);

			camera.drawLine(new Vector(this.O.x + (this.O.y - Math.floor(b / stepY) * stepY) / axis.x * axis.y, Math.floor(b / stepY) * stepY),
								new Vector(Math.floor(l/stepX)*stepX, this.O.y + (this.O.x-Math.floor(l/stepX)*stepX)/axis.y*axis.x), 
								this.color, this.width*2);

			camera.drawLine(	new Vector(this.O.x - (this.O.y-Math.floor(b/stepY)*stepY)/axis.x*axis.y, Math.floor(b/stepY)*stepY),
								new Vector(Math.ceil(r/stepX)*stepX, this.O.y + (Math.ceil(r/stepX)*stepX-this.O.x)/axis.y*axis.x), 
								this.color, this.width*2);
		}
		else if (this.type == "radial")
		{
			var TL = new Vector(l, t);
			var TR = new Vector(r, t);
			var BL = new Vector(l, b);
			var BR = new Vector(r, b);

			var maxRadius = Math.max(Math.max(length(TL), length(TR)), Math.max(length(BL), length(BR)));

			maxRadius = Math.round(maxRadius / this.spacing) * this.spacing;

			for (var r=this.spacing; r<=maxRadius; r+=this.spacing)
			{
				camera.drawArc(this.O, r, 0, Math.PI*2, this.color, this.width);
			}

			var angleStep = Math.min(5, 20 / this.spacing);

			var points = [];

			for (var a = 0; a <= 360; a += angleStep)
			{
				points.push(this.O);
				points.push(mad(fromAngle(a*Math.PI/180), maxRadius, this.O));
			}

			camera.drawLines(points, this.color, this.width);

			camera.drawCross(this.O, camera.invScale(10), 0, this.color, this.width*2);
		}

		camera.setLayer(1);
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
	this.hide = false;
	
	this.draw = function(camera)
	{
		if (this.hide)
			return;

		camera.setLayer(2);

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

		camera.setLayer(1);
	}
}

// ----------------------------------------------------------------------------------------------------------------
// ScreenshotArea
// ----------------------------------------------------------------------------------------------------------------
function ScreenshotArea(p, okCallback, cancelCallback)
{
	this.points			= [p.copy(), p.copy(), p.copy(), p.copy()];
	this.scene			= null;
	this.selected		= false;
	this.DPI			= 96;
	this.CMperUnit		= 0.5;
	this.copiesRows		= 1;
	this.copiesColumns	= 1;

	this.draw = function(camera)
	{
		var width = 2;

		var l = camera.getViewPosition().x - camera.getViewSize().x/2;
		var r = camera.getViewPosition().x + camera.getViewSize().x/2;
		var b = camera.getViewPosition().y - camera.getViewSize().y/2;
		var t = camera.getViewPosition().y + camera.getViewSize().y/2;

		var pmax = max(this.points[0], this.points[2]);
		var pmin = min(this.points[0], this.points[2]);

		var ra = new Vector(pmin.x, pmax.y);
		var rb = new Vector(pmax.x, pmin.y);

		camera.drawRectangle(new Vector(l,t), new Vector(ra.x, ra.y), "rgba(0,0,0,0.5)", 1, [], "rgba(0,0,0,0.5)");
		camera.drawRectangle(new Vector(ra.x,t), new Vector(rb.x, ra.y), "rgba(0,0,0,0.5)", 1, [], "rgba(0,0,0,0.5)");
		camera.drawRectangle(new Vector(rb.x,t), new Vector(r, ra.y), "rgba(0,0,0,0.5)", 1, [], "rgba(0,0,0,0.5)");

		camera.drawRectangle(new Vector(l,ra.y), new Vector(ra.x, rb.y), "rgba(0,0,0,0.5)", 1, [], "rgba(0,0,0,0.5)");
		camera.drawRectangle(new Vector(rb.x,ra.y), new Vector(r, rb.y), "rgba(0,0,0,0.5)", 1, [], "rgba(0,0,0,0.5)");

		camera.drawRectangle(new Vector(l,b), new Vector(ra.x, rb.y), "rgba(0,0,0,0.5)", 1, [], "rgba(0,0,0,0.5)");
		camera.drawRectangle(new Vector(ra.x,b), new Vector(rb.x, rb.y), "rgba(0,0,0,0.5)", 1, [], "rgba(0,0,0,0.5)");
		camera.drawRectangle(new Vector(rb.x,b), new Vector(r, rb.y), "rgba(0,0,0,0.5)", 1, [], "rgba(0,0,0,0.5)");

		camera.drawLineStrip(this.points, true, "#FF0000", width, []);
	}

	this.hitTest = function(a, b)
	{
		if (	intersectRectLine(a, b, this.points[0], this.points[1]) ||
				intersectRectLine(a, b, this.points[1], this.points[2]) ||
				intersectRectLine(a, b, this.points[2], this.points[3]) ||
				intersectRectLine(a, b, this.points[3], this.points[0]))
		{
			return true;
		}
	}

	this.getDragPoints = function(localSpace, camera)
	{
		var points = [	this.points[0],
						this.points[1],
						this.points[2],
						this.points[3],
						avg(this.points[0], this.points[1]),
						avg(this.points[1], this.points[2]),
						avg(this.points[2], this.points[3]),
						avg(this.points[3], this.points[0])];

		return points;
	}

	this.drawDragPoint = function(camera, index, localSpace)
	{
		var points = [	this.points[0],
						this.points[1],
						this.points[2],
						this.points[3],
						avg(this.points[0], this.points[1]),
						avg(this.points[1], this.points[2]),
						avg(this.points[2], this.points[3]),
						avg(this.points[3], this.points[0])];

		camera.drawRectangle(points[index], camera.invScale(10), "#ff0000", 2);
	}

	this.setDragPointPos = function(index, p, localSpace)
	{
		var points = [	this.points[0],
						this.points[1],
						this.points[2],
						this.points[3],
						avg(this.points[0], this.points[1]),
						avg(this.points[1], this.points[2]),
						avg(this.points[2], this.points[3]),
						avg(this.points[3], this.points[0])];

		if (index < 4)
		{
			if (localSpace)
			{
				var center = avg(this.points[0], this.points[2]);
				var halfSize = abs(sub(p, center));

				this.points[0] = sub(center, halfSize);
				this.points[2] = add(center, halfSize);
				this.points[1].x = this.points[2].x;
				this.points[1].y = this.points[0].y;
				this.points[3].x = this.points[0].x;
				this.points[3].y = this.points[2].y;
			}
			else
			{
				this.points[index] = p;

				if (index==0)
				{
					this.points[3].x = p.x;
					this.points[1].y = p.y;
				}
				else if (index==1)
				{
					this.points[2].x = p.x;
					this.points[0].y = p.y;
				}
				else if (index==2)
				{
					this.points[1].x = p.x;
					this.points[3].y = p.y;
				}
				else if (index==3)
				{
					this.points[0].x = p.x;
					this.points[2].y = p.y;
				}
			}
		}
		else if (index < 8)
		{
			if (index==4)
			{
				this.points[0].y = p.y;
				this.points[1].y = p.y;
			}
			else if (index==5)
			{
				this.points[1].x = p.x;
				this.points[2].x = p.x;
			}
			else if (index==6)
			{
				this.points[2].y = p.y;
				this.points[3].y = p.y;
			}
			else if (index==7)
			{
				this.points[0].x = p.x;
				this.points[3].x = p.x;
			}
		}
		else
		{ }
	}

	this.getOrigin = function()
	{
		return this.points[0];
	}
	
	this.setOrigin = function(p)
	{
		var delta = sub(p, this.points[0]);

		for (var i = 0; i != 4; ++i)
		{
			this.points[i] = add(this.points[i], delta);
		}
	}

	this.getProperties = function()
	{
		return	[
					{ name: "DPI", control: new Slider(40, 256, this.DPI, 8, function (value) { this.DPI = value; }.bind(this)) },
					{ name: "cm per Unit", control: new Slider(0.25, 4, this.CMperUnit, 0.25, function (value) { this.CMperUnit = value; }.bind(this)) },
					{ name: "Copies - Rows", control: new Slider(1, 4, this.copiesRows, 1, function (value) { this.copiesRows = value; }.bind(this)) },
					{ name: "Copies - Columns", control: new Slider(1, 4, this.copiesColumns, 1, function (value) { this.copiesColumns = value; }.bind(this)) },
					{ name: undefined, control: new Divider() },
					{ name: undefined, control: new Button("OK", okCallback) },
					{ name: undefined, control: new Button("Cancel", cancelCallback) },
  				];
	}

	this.toggleVisibility = function(v)
	{}

	this.isVisible = function()
	{
		return true;
	}

	this.toggleFrozen = function(f)
	{}

	this.isFrozen = function()
	{
		return false;
	}
}

// ----------------------------------------------------------------------------------------------------------------
//	TransformRect
// ----------------------------------------------------------------------------------------------------------------
function TransformRect(objects)
{
	this.boundsMin;
	this.boundsMax;
	this.angle			= 0;
	this.points			= [];
	this.pivot;
	this.scene			= null;
	this.objects		= objects;
	this.dragStartRect;

	this.updateExtents = function(updatePivot)
	{
		if (updatePivot == undefined)
		{
			updatePivot = false;
		}

		this.boundsMin = new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
		this.boundsMax = new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

		var rotMtxCol0 = new Vector( Math.cos(this.angle * Math.PI / 180), Math.sin(this.angle * Math.PI / 180));
		var rotMtxCol1 = new Vector(-Math.sin(this.angle * Math.PI / 180), Math.cos(this.angle * Math.PI / 180));
		
		var rotMtxCol0abs = abs(rotMtxCol0); 
		var rotMtxCol1abs = abs(rotMtxCol1); 

		for (var i=0; i<this.objects.length; ++i)
		{
			if (this.objects[i].getBoundsMin !== undefined)
			{
				var objCenter = avg(this.objects[i].getBoundsMin(), this.objects[i].getBoundsMax());
				var objExtents = sub(this.objects[i].getBoundsMax(), this.objects[i].getBoundsMin());

				objCenter = new Vector(dot(objCenter, rotMtxCol0), dot(objCenter, rotMtxCol1));
				objExtents = new Vector(dot(objExtents, rotMtxCol0abs), dot(objExtents, rotMtxCol1abs));

				this.boundsMin = min(this.boundsMin, mad(objExtents, -0.5, objCenter));
				this.boundsMax = max(this.boundsMax, mad(objExtents, +0.5, objCenter));
			}
		}
			
		this.points	= [ new Vector(this.boundsMin.x, this.boundsMax.y), new Vector(this.boundsMax.x, this.boundsMax.y), new Vector(this.boundsMax.x, this.boundsMin.y), new Vector(this.boundsMin.x, this.boundsMin.y) ];

		for (var i = 0; i != this.points.length; ++i)
		{
			this.points[i] = rotate(this.points[i], this.angle * Math.PI / 180);
		}

		if (updatePivot)
		{
			this.pivot = avg(this.points[0], this.points[2]);
		}
	}

	this.setObjects = function(objects)
	{
		this.objects = objects;
		this.updateExtents();
	}

	this.startDrag = function()
	{
		this.dragStartRect = this.getRect();
	}

	this.getRect = function()
	{
		var result = 
		{
			center : this.points[3],
			scaledXAxis : sub(this.points[2], this.points[3]),
			scaledYAxis : sub(this.points[0], this.points[3])
		};

		return result;
	}

	this.draw = function(camera)
	{
		camera.drawLineStrip(this.points, true, "#0084e0", 1, [5,5]);

		camera.drawArrow(this.pivot, add(this.pivot, rotate(new Vector(camera.invScale(70), 0), this.angle * Math.PI / 180)), "#FF0000", 2);
		camera.drawArrow(this.pivot, add(this.pivot, rotate(new Vector(0, camera.invScale(70)), this.angle * Math.PI / 180)), "#00FF00", 2);
	}


	this.getSnapPoints = function()
	{
		var snaps = [];

		snaps.push({ type: "node", p: avg(this.points[0], this.points[2]) });

		return snaps;
	}

	this.getDragPoints = function(localSpace, camera)
	{
		var points = [	this.points[0],
						this.points[1],
						this.points[2],
						this.points[3],
						avg(this.points[0], this.points[1]),
						avg(this.points[1], this.points[2]),
						avg(this.points[2], this.points[3]),
						avg(this.points[3], this.points[0]),
						this.pivot];

		for (var i = 0; i < 8; ++i)
		{
			points.push(add(this.pivot, rotate(new Vector(camera.invScale(70), 0), (this.angle + i*360/8) * Math.PI / 180)));
		}

		// Copy the drag points of all contained objects as well. They can be used for rotation.
		for (var i=0; i<this.objects.length; ++i)
		{
			if (this.objects[i].getDragPoints !== undefined)
			{
				points = points.concat(this.objects[i].getDragPoints(localSpace, camera));
			}
		}

		return points;
	}

	this.drawDragPoint = function(camera, index, localSpace)
	{
		var points = this.getDragPoints(localSpace, camera);

		camera.drawRectangle(points[index], camera.invScale(10), "#ff0000", 2);

		if (index>=9 && index<17)
		{
			camera.drawArc(this.pivot, camera.invScale(70), 0, Math.PI*2, "#ff0000", 2, undefined, [5,5]);
		}
	}

	this.setDragPointPos = function(index, p, localSpace, alt, ctrl, shift)
	{
		// corners
		if (index < 4)
		{
			if (ctrl)	// rotate
			{
				var oldAngle = this.angle;

				var pointAngle1 = toAngle(sub(this.points[index], this.pivot)) * 180 / Math.PI
				var pointAngle2 = toAngle(sub(avg(this.points[1], this.points[2]), this.pivot)) * 180 / Math.PI;
				
				var pointAngle = pointAngle1 - pointAngle2;

				this.angle = toAngle(sub(p, this.pivot)) * 180 / Math.PI;;
				this.angle -= pointAngle;

				for (var i=0; i!=4; ++i)
				{
					this.points[i] = add(this.pivot, rotate(sub(this.points[i], this.pivot), (this.angle-oldAngle) * Math.PI / 180));
				}
			}
			else // scale
			{
				var xAxis = rotate(new Vector(1, 0), this.angle * Math.PI / 180);
				var yAxis = rotate(new Vector(0, 1), this.angle * Math.PI / 180);

				var keepAspect = !alt;
				var symmetrical = shift;

				if (keepAspect)
				{
					var u = sub(this.points[index], this.pivot).unit();
					var t = dot(sub(p, this.pivot), u);
					p = mad(u, t, this.pivot);
				}

				if (symmetrical)
				{
					this.points[index] = p;

					this.points[(index+2)%4] = sub(this.pivot, sub(p, this.pivot));

					if (index==0 || index==2)
					{
						this.points[(index+1)%4] = sub(this.pivot, reflect(sub(p, this.pivot), yAxis));
						this.points[(index+3)%4] = sub(this.pivot, reflect(sub(p, this.pivot), xAxis));
					}
					else if (index==1 || index==3)
					{
						this.points[index-1] = sub(this.pivot, reflect(sub(p, this.pivot), yAxis));
						this.points[(index+1)%4] = sub(this.pivot, reflect(sub(p, this.pivot), xAxis));
					}
				}
				else
				{
					this.points[index] = p;
					this.pivot = avg(this.points[index], this.points[(index+2)%4]);

					if (index==0 || index==2)
					{
						this.points[(index+1)%4] = sub(this.pivot, reflect(sub(p, this.pivot), yAxis));
						this.points[(index+3)%4] = sub(this.pivot, reflect(sub(p, this.pivot), xAxis));
					}
					else if (index==1 || index==3)
					{
						this.points[index-1] = sub(this.pivot, reflect(sub(p, this.pivot), yAxis));
						this.points[(index+1)%4] = sub(this.pivot, reflect(sub(p, this.pivot), xAxis));
					}
				}
			}

			this.transformObjects();
		}
		else if (index < 8)	// edges
		{
			var xAxis = rotate(new Vector(1, 0), this.angle * Math.PI / 180);
			var yAxis = rotate(new Vector(0, 1), this.angle * Math.PI / 180);

			var keepAspect = !alt;
			var symmetrical = shift;

			if (symmetrical)
			{
				if (index==4 || index==6)
				{
					var deltaX = mul(dot(sub(this.points[1], this.pivot), xAxis), xAxis);

					var sign = (index==4) ? 1 : -1;

					this.points[0] = sub(mad(sign * dot(sub(p, this.pivot), yAxis), yAxis, this.pivot), deltaX);
					this.points[1] = add(mad(sign * dot(sub(p, this.pivot), yAxis), yAxis, this.pivot), deltaX);
					this.points[2] = add(mad(-sign * dot(sub(p, this.pivot), yAxis), yAxis, this.pivot), deltaX);
					this.points[3] = sub(mad(-sign * dot(sub(p, this.pivot), yAxis), yAxis, this.pivot), deltaX);
				}
				else if (index==5 || index==7)
				{
					var deltaY = mul(dot(sub(this.points[1], this.pivot), yAxis), yAxis);

					var sign = (index==5) ? 1 : -1;

					this.points[0] = add(mad(-sign * dot(sub(p, this.pivot), xAxis), xAxis, this.pivot), deltaY);
					this.points[1] = add(mad(sign * dot(sub(p, this.pivot), xAxis), xAxis, this.pivot), deltaY);
					this.points[2] = sub(mad(sign * dot(sub(p, this.pivot), xAxis), xAxis, this.pivot), deltaY);
					this.points[3] = sub(mad(-sign * dot(sub(p, this.pivot), xAxis), xAxis, this.pivot), deltaY);
				}
			}
			else
			{
				if (index==4)
				{
					this.points[0] = mad(dot(sub(p, this.points[3]), yAxis), yAxis, this.points[3]);
					this.points[1] = mad(dot(sub(p, this.points[3]), yAxis), yAxis, this.points[2]);
				}
				else if (index==5)
				{
					this.points[1] = mad(dot(sub(p, this.points[3]), xAxis), xAxis, this.points[0]);
					this.points[2] = mad(dot(sub(p, this.points[3]), xAxis), xAxis, this.points[3]);
				}
				else if (index==6)
				{
					this.points[2] = mad(dot(sub(p, this.points[0]), yAxis), yAxis, this.points[1]);
					this.points[3] = mad(dot(sub(p, this.points[0]), yAxis), yAxis, this.points[0]);
				}
				else if (index==7)
				{
					this.points[0] = mad(dot(sub(p, this.points[1]), xAxis), xAxis, this.points[1]);
					this.points[3] = mad(dot(sub(p, this.points[1]), xAxis), xAxis, this.points[2]);
				}

				this.pivot = avg(this.points[0], this.points[2]);
			}

			this.transformObjects();
		}
		else if (index==8) // pivot
		{
			this.setOrigin(p);
		}
		else if (index>=9 && index<17) // pivot rotation
		{
			this.angle = toAngle(sub(p, this.pivot)) * 180 / Math.PI;

			this.angle -= (index-9)*360/8;

			this.updateExtents(false);
		}
		else // rotation via object drag point
		{}
	}

	this.transformObjects = function()
	{
		var newRect = this.getRect();

		for (var i=0; i!=this.objects.length; ++i)
		{
			if (this.objects[i].transform != undefined)
			{
				this.objects[i].transform(this.dragStartRect, newRect);
			}
			else
			{
				var localCoord = new Vector(	dot(sub(this.objects[i].getOrigin(), this.dragStartRect.center), this.dragStartRect.scaledXAxis),
												dot(sub(this.objects[i].getOrigin(), this.dragStartRect.center), this.dragStartRect.scaledYAxis) );

				localCoord.x /= this.dragStartRect.scaledXAxis.lengthSqr();
				localCoord.y /= this.dragStartRect.scaledYAxis.lengthSqr();

				this.objects[i].setOrigin( add(mad(localCoord.x, newRect.scaledXAxis, newRect.center), mul(localCoord.y, newRect.scaledYAxis)) );
			}
		}

		this.dragStartRect = newRect;
	}

	this.getOrigin = function()
	{
		return this.pivot;
	}
	
	this.setOrigin = function(p)
	{
		this.pivot = p;
	}

	this.getProperties = function()
	{
		return [];
	}

	this.toggleVisibility = function(v)
	{}

	this.isVisible = function()
	{
		return true;
	}

	this.toggleFrozen = function(f)
	{}

	this.isFrozen = function()
	{
		return false;
	}


	this.updateExtents(true);
}
