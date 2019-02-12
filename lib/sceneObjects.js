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
	this.appearance			= new Appearance();
	this.BRDF				= Phong;
	this.BRDFIndex			= 1;
	this.BRDFOptions		= [ Lambert, Phong ];
	this.roughness			= 0;
	this.metalness			= 0;
	this.intensity			= 1;
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
		str += "w.intensity = " + this.intensity + ";\n";
		str += "w.BRDFIndex = " + this.BRDFIndex + ";\n";
		str += this.appearance.saveAsJavascript("w");
		str += "w.visible = " + this.visible + ";\n";
		str += "w.frozen = " + this.frozen + ";\n";
		str += "w.onChange();\n";

		str += "scene.addObject(w);\n";
		return str;
	}

	this.addChangeListener = function(listener)
	{
		this.onChangeListeners.push(listener);
	}

	this.onChange = function(changeDetails)
	{
		// Backwards compatibility
		this.appearance.SetFromOldProperties(this);

		this.BRDF = this.BRDFOptions[this.BRDFIndex];

		this.boundsMin = new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
		this.boundsMax = new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

		for (var i = 0; i != this.points.length; ++i)
		{
			this.boundsMin = min(this.boundsMin, this.points[i]);
			this.boundsMax = max(this.boundsMax, this.points[i]);
		}

		for (var i=0; i!=this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this, changeDetails);
		}
	}
	
	this.addPoint = function(point)
	{
		this.points.push(point);

		this.onChange();
	}

	this.draw = function(camera)
	{
		if (this.points.length < 2)
			return;

		var lastRand = (pseudoRandom.random(0)-0.5) * this.roughness;

		var linePoints = this.points.slice();

		if (this.closed)
			linePoints.push(this.points[0]);

		if (this.roughness>0)
		{
			var divisions = 60;

			for (var i=0; i<linePoints.length-1; ++i)
			{
				var L = sub(linePoints[i + 1], linePoints[i]);
				var Lm = L.length();
				var l = div(L, divisions);

				var t = transpose(l).unit();

				for (var j=1; j<divisions; ++j)
				{
					var newRand = (pseudoRandom.random(j) - 0.5) * this.roughness * 0.3;

					linePoints.splice(i+j, 0, add(add(linePoints[i], mul(l, j)), mul(t, lastRand)));
						
					lastRand = newRand;
				}

				i+=divisions-1;
			}
		}

		var hatchingPoints = [];

		var count = this.closed ? this.points.length : this.points.length - 1;

		for (var i = 0; i != count; ++i)
		{
			var L = sub(this.points[(i+1)%this.points.length], this.points[i]);

			if (L.length() == 0)
				continue;

			var l = L.unit();
			var t = transpose(l)

			// Hatching
			{
				var size = sub(this.boundsMax, this.boundsMin).length();
				var sizePixels = Math.max(1, size * camera.getUnitScale());
				var lengthPixels = L.length() * camera.getUnitScale();
				var approxCount = Math.floor(lengthPixels / Math.min(sizePixels/15, 15));
				var stepPixels = lengthPixels / approxCount;
				var stepUnits = stepPixels / camera.getUnitScale();
				var stepCount = lengthPixels / stepPixels;

				for (var j=1; j<=stepCount; ++j)
				{
					hatchingPoints.push(add(add(this.points[i], mul(l, j * stepUnits)), mul(t, 0)));
					hatchingPoints.push(add(add(this.points[i], mul(l, (j - 1) * stepUnits)), mul(t, stepUnits)));
				}
			}
		}

		camera.drawLineStrip(linePoints, false, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), this.appearance.GetLineDash(), this.appearance.GetFillColor(), this);
		//camera.drawLines(linePoints, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), this.appearance.GetLineDash(), this.appearance.GetFillColor(), this);
		camera.drawLines(hatchingPoints, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), [], undefined);
	}
	
	this.hitTest = function(a, b, camera)
	{
		var count = this.closed ? this.points.length : this.points.length - 1;

		for (var i = 0; i != count; ++i)
		{
			if (overlapRectLine(a, b, this.points[i], this.points[(i+1)%this.points.length]))
				return true;
		}

		return false;
	}
	
	this.rayHitTest = function(rayPos, rayDir, rayRadius)
	{
		var results = [];

		var count = this.closed ? this.points.length : this.points.length - 1;

		for (var i = 0; i != count; ++i)
		{
			var hitResult = intersectRayLine(rayPos, rayDir, this.points[i], this.points[(i+1)%this.points.length], rayRadius);

			if (hitResult.hit)
			{
				if (dot(hitResult.N, rayDir)>=0)
					continue;

				hitResult.color = this.appearance.GetLineColorHex();
				hitResult.roughness = this.roughness;
				hitResult.metalness = this.metalness;
				hitResult.intensity = this.intensity;
				hitResult.BRDF = this.BRDF;
				results.push(hitResult);
			}
		}

		return results;
	}

	this.getSnapPoints = function()
	{
		var snaps = [];

		var count = this.closed ? this.points.length : this.points.length - 1;

		for (var i = 0; i != count; ++i)
		{
			snaps.push({ type: "node", p: this.points[i]});
			snaps.push({ type: "midpoint", p: avg(this.points[i], this.points[(i+1)%this.points.length])});
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

	this.drawDragPoint = function(camera, index, position, localSpace, alpha)
	{
		if (alpha == undefined)
			alpha = 1;

		if (localSpace)
		{
			var index0 = Math.floor(index/2) + (index%2);
			var index1 = (index % 2) > 0 ? (index0 - 1) : (index0 + 1);

			var L = sub(this.points[index1], this.points[index0]).unit()

			camera.drawArrow(this.points[index0], mad(L, camera.invScale(50), this.points[index0]), 13, "rgba(255,0,0," + alpha + ")", 5);
		}
		else
		{
			camera.drawRectangle(this.points[index], camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
		}
	}

	this.drawDebugAngle = function(index, camera)
	{
		if (index <= 0 || index >= this.points.length-1)
			return;

		var vNext = sub(this.points[index+1], this.points[index]);
		var angleNext = toAngle(vNext);

		if (angleNext<0)
			angleNext += Math.PI*2;

		var vPrevious = sub(this.points[index-1], this.points[index]);
		var anglePrevious = toAngle(vPrevious);

		if (anglePrevious<0)
			anglePrevious += Math.PI*2;

		var deltaAngle = anglePrevious - angleNext;

		var textPoint = add(this.points[index], mul(fromAngle((angleNext+anglePrevious) * 0.5), camera.invScale(60)));
		camera.drawArc(this.points[index], camera.invScale(50), Math.min(anglePrevious, angleNext), Math.max(anglePrevious, angleNext), "#000000", 1, undefined, [5,5]);
		camera.drawText(textPoint, (Math.abs(deltaAngle) * 180/Math.PI).toFixed(1) + "°", "#000000", "center", 0, "12px Arial");
	}

	this.drawDebugLineInfo = function(index, camera)
	{
		if (index < 0 || index >= this.points.length-1)
			return;

		var vNext = sub(this.points[index+1], this.points[index]);
		var angleNext = toAngle(vNext);

		if (angleNext<0)
			angleNext += Math.PI*2;

		var offsetSign = 1;

		if (angleNext>=Math.PI/2 && angleNext<Math.PI*3/2)
		{
			angleNext += Math.PI;
			offsetSign = -1;
		}

		var textPoint = addv(this.points[index], mul(vNext, 0.5), mul(transpose(vNext).unit().neg(), offsetSign * camera.invScale(10)));
		camera.drawText(textPoint, "dx: " + vNext.x.toFixed(1) + " dy: " + vNext.y.toFixed(1) + " L: " + vNext.length().toFixed(1), "#000000", "center", angleNext, "12px Arial");
	}

	this.setDragPointPos = function(index, p, localSpace, dragStartPoint, camera)
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

		if (camera != undefined)
		{
			this.drawDebugAngle(index, camera);
			this.drawDebugAngle(index-1, camera);
			this.drawDebugAngle(index+1, camera);
			
			this.drawDebugLineInfo(index, camera);
			this.drawDebugLineInfo(index-1, camera);
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
		var appearanceControl = new PopoutContainer(undefined, "images/color_wheel.svg");
		{
			appearanceControl.addControl("", new AppearanceControl(this.appearance, true, true, function(){ this.onChange(); }.bind(this)) );
		}

		return	[
					{ name: "Appearance", control:appearanceControl },
					{ name: "", control: new PlainButton("Flip Normals", function() { this.points.reverse(); this.onChange(); }.bind(this)) },
					{ name: "Roughness", control: new PopoutSlider(0, 1, this.roughness, 0.1, function (value) { this.roughness = value; this.onChange(); }.bind(this)) },
					{ name: "Metalness", control: new PopoutSlider(0, 1, this.metalness, 0.1, function (value) { this.metalness = value; this.onChange(); }.bind(this)) },
					{ name: "Intensity", control: new PopoutSlider(0, 10, this.intensity, 0.1, function (value) { this.intensity = value; this.onChange(); }.bind(this)) },
					{ name: "BRDF", control: new Dropdown(["Lambert", "Phong"], this.BRDFIndex, function (value) { this.BRDFIndex = value; this.onChange(); }.bind(this)) },
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

	this.setSelected = function(selected)
	{
		this.selected = selected;
	}

	this.isSelected = function()
	{
		return this.selected;
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
	this.convex				= false;
	this.appearance			= new Appearance();
	this.BRDF				= Phong;
	this.BRDFIndex			= 1;
	this.BRDFOptions		= [ Lambert, Phong ];
	this.roughness			= 0;
	this.metalness			= 0;
	this.intensity			= 1;
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
		str += this.appearance.saveAsJavascript("aw");
		str += "aw.intensity = " + this.intensity + ";\n";
		str += "aw.BRDFIndex = " + this.BRDFIndex + ";\n";
		str += "aw.visible = " + this.visible + ";\n";
		str += "aw.frozen = " + this.frozen + ";\n";
		str += "aw.onChange();\n";

		str += "scene.addObject(aw);\n";
		return str;
	}

	this.addChangeListener = function(listener)
	{
		this.onChangeListeners.push(listener);
	}

	this.onChange = function(changeDetails)
	{
		// Backwards compatibility
		this.appearance.SetFromOldProperties(this);

		this.BRDF = this.BRDFOptions[this.BRDFIndex];

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
			this.onChangeListeners[i](this, changeDetails);
		}
	}
	
	this.draw = function(camera)
	{
		if (this.radius <= 0)
			return;

		camera.drawArc(this.center, this.radius, this.startAngle, this.endAngle, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), undefined, undefined, this);
		
		var angleStep = 10 * Math.PI / 180;

		if ((this.endAngle - this.startAngle) > 0)
		{
			angleStep = (this.endAngle - this.startAngle) / Math.round( Math.abs(this.endAngle - this.startAngle) / angleStep );
		}

		var size = sub(this.boundsMax, this.boundsMin).length();
		var sizePixels = Math.max(1, size * camera.getUnitScale());
		var arcLength = (this.endAngle-this.startAngle) * this.radius;
		var arcLengthPixels = arcLength * camera.getUnitScale();
		var approxCount = Math.floor(arcLengthPixels / Math.min(sizePixels/15, 15));
		var stepPixels = arcLengthPixels / approxCount;
		var stepUnits = stepPixels / camera.getUnitScale();
		var stepAngle = stepUnits / this.radius;

		var delta = stepUnits;

		if (this.convex)
			delta = -delta;

		var hatchPoints = [];

		for (var a = this.startAngle + stepAngle; a <= this.endAngle; a += stepAngle)
		{
			var p0 = add(this.center, mul(fromAngle(a), this.radius));
			var p1 = add(this.center, mul(fromAngle(a - stepAngle), this.radius + delta));
			hatchPoints.push(p0);
			hatchPoints.push(p1);
		}

		camera.drawLines(hatchPoints, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected));

		//camera.drawArc(add(this.center, mul(fromAngle(this.startAngle), this.radius)), 0.1, 0, 2 * Math.PI);
		//camera.drawText(add(this.center, mul(fromAngle(this.startAngle), this.radius)), (this.startAngle * 180 / Math.PI).toFixed(1));
		//camera.drawText(add(this.center, mul(fromAngle(this.endAngle), this.radius)), (this.endAngle * 180 / Math.PI).toFixed(1));
	}
	
	this.hitTest = function(a, b, camera)
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

		var a = [	toAngle(sub(new Vector(rectMin.x, rectMin.y), this.center)),
					toAngle(sub(new Vector(rectMin.x, rectMax.y), this.center)),
					toAngle(sub(new Vector(rectMax.x, rectMin.y), this.center)),
					toAngle(sub(new Vector(rectMax.x, rectMax.y), this.center)) ];

		for (var i=0; i!=4; ++i)
		{
			if (a[i]>this.endAngle) 
				a[i] -= Math.PI*2;
			else if (a[i]<this.startAngle) 
				a[i] += Math.PI*2;

			if (a[i] >= this.startAngle && a[i] <= this.endAngle)
				return true;
		}		

		return false;
	}
	
	this.rayHitTest = function(rayPos, rayDir, rayRadius)
	{
		var results = [{N:rayDir, P:rayPos, hit:false, tRay:0}];

		var rayDirL = rayDir.length();

		var RO = sub(this.center, rayPos);

		var perpDist = Math.abs(dot(RO, transpose(rayDir))/rayDirL);

		// bail if we're too far away
		if (perpDist > (this.radius + rayRadius))
			return results;

		// Distance of arc center along ray. 
		var distanceToArcCenter = dot(RO, rayDir)/rayDirL;

		var effectiveArcRadius = this.radius;

		if (this.convex)
			effectiveArcRadius += rayRadius;
		else
			effectiveArcRadius -= rayRadius;

		// How far do we need to backtrack along the ray such that the distance between the point 
		// on the ray and the center is equal to arc radius?
		var delta = Math.sqrt(effectiveArcRadius*effectiveArcRadius - perpDist*perpDist);

		// For convex we move backwards, towards the ray origin. For concave, forwards.
		if (this.convex)
			delta *= -1;

		// Distance along the ray to the point of impact
		var distanceToImpact = distanceToArcCenter + delta;

		// if the ray starts inside a convex arc or outside a concave one, bail
		if (distanceToImpact < -rayRadius)
			return results;

		// impact point
		var P = add(rayPos, mul(rayDir, distanceToImpact/rayDirL));

		if (rayRadius>0)
		{
			P = add(P, mul(sub(this.center, P).unit(), this.convex ? rayRadius : -rayRadius));
		}

		// check if impact point is outside the (stand,end) angle range
		var OP = sub(P, this.center);
		var OPAngle = toAngle(OP);

		if (OPAngle < 0)
			OPAngle	+= Math.PI*2;

		var midAngle = (this.startAngle + this.endAngle) * 0.5;

		if (Math.cos(OPAngle - midAngle) < Math.cos(this.startAngle - midAngle))
			return results;

		results[0].hit = true;
		results[0].N = this.convex ? OP.unit() : OP.unit().neg();
		results[0].tRay = distanceToImpact/rayDirL;
		results[0].P = P;
		results[0].color = this.appearance.GetLineColorHex();
		results[0].roughness = this.roughness;
		results[0].metalness = this.metalness;
		results[0].intensity = this.intensity;
		results[0].BRDF = this.BRDF;

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

	this.drawDragPoint = function(camera, index, position, localSpace, alpha)
	{
		if (alpha == undefined)
			alpha = 1;

		if (localSpace)
		{
			if (index == 0)
			{
				camera.drawArc(this.center, this.radius, this.startAngle, this.startAngle + (this.endAngle-this.startAngle)/10, "rgba(255,0,0," + alpha + ")", 4);
			}
			else if (index == 1)
			{
				camera.drawArrow(	add(this.center, mul(fromAngle(this.startAngle), this.radius)), 
									add(this.center, mul(fromAngle(this.startAngle), this.radius - camera.invScale(50))), 13, "rgba(255,0,0," + alpha + ")", 5);
			}
			else if (index == 2)
			{
				camera.drawArc(this.center, this.radius, this.endAngle - (this.endAngle-this.startAngle)/10, this.endAngle, "rgba(255,0,0," + alpha + ")", 4);
			}
			else if (index == 3)
			{
				camera.drawArrow(	add(this.center, mul(fromAngle(this.endAngle), this.radius)), 
									add(this.center, mul(fromAngle(this.endAngle), this.radius - camera.invScale(50))), 13, "rgba(255,0,0," + alpha + ")", 5);
			}
		}
		else
		{
			if (index == 0)
				camera.drawRectangle(add(this.center, mul(fromAngle(this.startAngle), this.radius)), camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
			else if (index == 1)
				camera.drawRectangle(add(this.center, mul(fromAngle(this.endAngle), this.radius)), camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
			else if (index == 2)
				camera.drawRectangle(this.center, camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
		}
	}

	this.setDragPointPos = function(index, p, localSpace, dragStartPoint, camera)
	{
		var startAngleChanged = false;
		var endAngleChanged = false;
		var radiusChanged = false;

		if (localSpace)
		{
			if (index==0)
			{
				this.startAngle = toAngle(sub(p, this.center));
				startAngleChanged = true;
			}
			else if (index==1 || index==3)
			{
				this.radius = distance(p, this.center);
				radiusChanged = true;
			}
			else if (index==2)
			{
				this.endAngle = toAngle(sub(p, this.center));
				endAngleChanged = true;
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

				startAngleChanged = true;
				endAngleChanged = true;
				radiusChanged = true;
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

		if (camera != undefined)
		{
			var text = "";
		
			if (startAngleChanged)
				text += "Start Angle: " + (this.startAngle * 180 / Math.PI).toFixed(0) + "°";

			if (endAngleChanged)
				text += " End Angle: " + (this.endAngle * 180 / Math.PI).toFixed(0) + "°";

			if (radiusChanged)
				text += " Radius: " + this.radius.toFixed(1);

			camera.drawText(this.center, text, "#000000", "center", 0, "12px Arial");
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

		this.startAngle += toAngle(newRect.scaledXAxis) - toAngle(currentRect.scaledXAxis);
		this.endAngle += toAngle(newRect.scaledXAxis) - toAngle(currentRect.scaledXAxis);

		this.onChange();
	}

	this.getProperties = function()
	{
		var appearanceControl = new PopoutContainer(undefined, "images/color_wheel.svg");
		{
			appearanceControl.addControl("", new AppearanceControl(this.appearance, true, false, function(){ this.onChange(); }.bind(this)) );
		}

		return	[
					{ name: "Appearance", control:appearanceControl },
					{ name: "", control: new PlainButton("Flip Normals", function () { this.convex = !this.convex; this.onChange(); }.bind(this)) },
					{ name: "Roughness", control: new PopoutSlider(0, 1, this.roughness, 0.1, function (value) { this.roughness = value; this.onChange(); }.bind(this)) },
					{ name: "Metalness", control: new PopoutSlider(0, 1, this.metalness, 0.1, function (value) { this.metalness = value; this.onChange(); }.bind(this)) },
					{ name: "Intensity", control: new PopoutSlider(0, 10, this.intensity, 0.1, function (value) { this.intensity = value; this.onChange(); }.bind(this)) },
					{ name: "BRDF", control: new Dropdown(["Lambert", "Phong"], this.BRDFIndex, function (value) { this.BRDFIndex = value; this.onChange(); }.bind(this)) },
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

	this.setSelected = function(selected)
	{
		this.selected = selected;
	}

	this.isSelected = function()
	{
		return this.selected;
	}

	this.onChange();
}


// ----------------------------------------------------------------------------------------------------------------
// BRDF Ray
// ----------------------------------------------------------------------------------------------------------------
var lastBRDFAppearance = new Appearance("#000000", 1, 2);

function BRDFRay(O, dir)
{
	this.scene				= null;
	this.O					= O;
	this.dir				= dir;
	this.selected			= false;
	this.visible			= true;
	this.frozen				= false;
	this.appearance			= lastBRDFAppearance.copy();
	this.intensity			= 1;
	this.bounceCount		= 3;
	this.showBRDF			= true;
	this.originIsLight		= 1;
	this.onChangeListeners	= [];
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
		str += "ray.originIsLight = " + this.originIsLight + ";\n";
		str += "ray.bounceCount = " + this.bounceCount + ";\n";
		str += this.appearance.saveAsJavascript("ray");
		str += "ray.intensity = " + this.intensity + ";\n";
		str += "ray.visible = " + this.visible + ";\n";
		str += "ray.frozen = " + this.frozen + ";\n";

		str += "scene.addObject(ray);\n";
		return str;
	}

	this.addChangeListener = function (listener)
	{
		this.onChangeListeners.push(listener);
	}

	this.onChange = function(changeDetails)
	{
		// Backwards compatibility
		this.appearance.SetFromOldProperties(this);

		lastBRDFAppearance = this.appearance.copy();

		this.doRayCasting();

		this.boundsMin = new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
		this.boundsMax = new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

		this.boundsMin = min(this.boundsMin, this.O);
		this.boundsMax = max(this.boundsMax, this.O);

		for (var i = 0; i != this.intersectionPoints.length; ++i)
		{
			this.boundsMin = min(this.boundsMin, this.intersectionPoints[i].P);
			this.boundsMax = max(this.boundsMax, this.intersectionPoints[i].P);
		}

		for (var i=0; i!=this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this, changeDetails);
		}
	}

	this.doRayCasting = function()
	{
		this.intersectionPoints = [];

		if (this.scene == undefined)
			return;

		this.boundsMin = new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
		this.boundsMax = new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

		this.boundsMin = min(this.boundsMin, this.O);
		this.boundsMax = max(this.boundsMax, this.O);

		var rays = [{ start: this.O, dir: this.dir }];

		for (var r=0; r<rays.length; ++r)
		{
			var ray = rays[r];
			
			var bestHit = this.scene.rayHitTest(ray.start, ray.dir);

			if (bestHit.tRay<1000)
			{
				if (bestHit.metalness == undefined) 
					bestHit.metalness = 0.04;

				if (bestHit.roughness == undefined) 
					bestHit.roughness = 0;

				this.intersectionPoints.push(bestHit);

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

	this.draw = function(camera)
	{
		var rays = [{ start: this.O, dir: this.dir, level:0, color:this.appearance.GetLineColor(), intensity:this.intensity }];

		this.intersectionPoints = [];

		this.boundsMin = new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
		this.boundsMax = new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

		this.boundsMin = min(this.boundsMin, this.O);
		this.boundsMax = max(this.boundsMax, this.O);

		for (var r=0; r<rays.length; ++r)
		{
			var ray = rays[r];
			
			var bestHit = this.scene.rayHitTest(ray.start, ray.dir);

			if (bestHit.tRay<1000)
			{
				var BRDF = bestHit.BRDF;

				if (r==0)
				{
					// Don't draw over the arrow because it breaks AA
					var t = Math.min(1, distance(bestHit.P, ray.start)/this.dir.length());
					camera.drawLine(mad(this.dir, t, ray.start), bestHit.P, ray.color, 2, [5,5], this);
				}
				else
				{
					camera.drawLine(ray.start, bestHit.P, ray.color, 2, [5,5], this);
				}

				if (this.showBRDF)
				{
					var F0 = 0.04 + bestHit.metalness * (1 - 0.04);
					camera.drawBRDFGraph(BRDF, ray.dir.unit().neg(), bestHit.N, F0, this.originIsLight, bestHit.roughness, bestHit.P, bestHit.intensity * ray.intensity);
				}

				this.intersectionPoints.push(bestHit);

				this.boundsMin = min(this.boundsMin, this.intersectionPoints[this.intersectionPoints.length-1].P);
				this.boundsMax = max(this.boundsMax, this.intersectionPoints[this.intersectionPoints.length-1].P);

				var newRay = {};
				newRay.start = bestHit.P;
				newRay.dir = reflect(ray.dir, bestHit.N);
				newRay.intensity = bestHit.intensity * ray.intensity;
				newRay.level = ray.level+1;
				rays.push(newRay);
			}
			
			if (rays.length>this.bounceCount+1)
			{
				break;
			}
		}

		camera.drawArrow(this.O, add(this.O, this.dir), 20, "#000000", this.appearance.GetLineWidth(this.selected));
	}
	
	this.hitTest = function(a, b, camera)
	{
		return overlapRectLine(a,b,this.O, add(this.O, this.dir));
	}
	
	this.getSnapPoints = function()
	{
		var points = []

		for (var i = 0; i != this.intersectionPoints.length; ++i)
		{
			points.push( { type: "intersection", p: this.intersectionPoints[i].P } );
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

	this.drawDragPoint = function(camera, index, position, localSpace, alpha)
	{
		if (alpha == undefined)
			alpha = 1;

		if (index==0)
		{
			camera.drawRectangle(this.O, camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
		}
		else
		{
			if (localSpace)
			{
				var delta = mul(this.dir.unit(), camera.invScale(30));

				camera.drawArrow(add(this.O, this.dir), add(add(this.O, this.dir), delta), 8, "rgba(255,0,0," + alpha + ")", 4);
			}
			else
			{
				camera.drawRectangle(add(this.O, this.dir), camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
			}
		}
	}

	this.setDragPointPos = function(index, p, localSpace, dragStartPoint, camera)
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
		var appearanceControl = new PopoutContainer(undefined, "images/color_wheel.svg");
		{
			appearanceControl.addControl("", new AppearanceControl(this.appearance, true, false, function(){ this.onChange(); }.bind(this)) );
		}

		return	[
					{name: "Appearance", control:appearanceControl },
					{name: "Intensity", control:new PopoutSlider(0, 10, this.intensity, 0.1, function(value){ this.intensity = value; this.onChange(); }.bind(this) )},
					{name: "Bounce Count", control:new PopoutSlider(0, 10, this.bounceCount, 1, function(value){ this.bounceCount = value; this.onChange(); }.bind(this) )},
					{name: "Show BRDF", control: new TickBox(this.showBRDF, function (value) { this.showBRDF = value; this.onChange(); }.bind(this)) },
					{name: "Origin", control: new Dropdown(["Camera", "Light"], this.originIsLight, function (value) { this.originIsLight = value; this.onChange(); }.bind(this)) },
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

	this.setSelected = function(selected)
	{
		this.selected = selected;
	}

	this.isSelected = function()
	{
		return this.selected;
	}

	this.onChange();
}

// ----------------------------------------------------------------------------------------------------------------
// Point Light
// ----------------------------------------------------------------------------------------------------------------
function PointLight(O, radius)
{
	this.scene				= null;
	this.center				= O;
	this.bulbRadius			= 1;
	this.radius				= radius;
	this.collisionOutline	= true;
	this.selected			= false;
	this.visible			= true;
	this.frozen				= false;
	this.appearance			= new Appearance("#FFC000", 1, 2);
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

		str += "new Vector(" + this.center.x + ", " + this.center.y + ")";
		str += ", " + this.radius;
		str += ");\n";

		str += "light.bulbRadius = " + this.bulbRadius + ";\n";
		str += "light.collisionOutline = " + this.collisionOutline + ";\n";
		str += this.appearance.saveAsJavascript("light");
		str += "light.visible = " + this.visible + ";\n";
		str += "light.frozen = " + this.frozen + ";\n";

		str += "scene.addObject(light);\n";
		return str;
	}

	this.addChangeListener = function (listener)
	{
		this.onChangeListeners.push(listener);
	}

	this.onChange = function(changeDetails)
	{
		// Backwards compatibility
		this.appearance.SetFromOldProperties(this);

		this.boundsMin = sub(this.center, new Vector(this.radius, this.radius));
		this.boundsMax = add(this.center, new Vector(this.radius, this.radius));

		for (var i=0; i!=this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this, changeDetails);
		}
	}

	this.draw = function(camera)
	{
		camera.drawStar(this.center, 7, this.bulbRadius, 0.5, 0, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), "rgba(255,255,0,0.8)");
		camera.drawArc(this.center, this.bulbRadius*0.5, 0, Math.PI*2, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), "rgba(255,255,0,1)");

		if (this.collisionOutline)
		{
			this.boundsMin = new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
			this.boundsMax = new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

			var points = [];

			var angleStep = camera.invScale(20) / (2 * Math.PI * this.radius) * 360 * Math.PI / 180;

			for (var a=0; a<=Math.PI*2; a+=angleStep)
			{
				var dir = fromAngle(a);

				var bestHit = this.scene.rayHitTest(this.center, dir);

				if (bestHit.tRay<this.radius)
				{
					points.push(bestHit.P);
				}
				else
				{
					points.push(add(this.center, mul(dir, this.radius)));
				}

				this.boundsMin = min(this.boundsMin, points[points.length-1]);
				this.boundsMax = max(this.boundsMax, points[points.length-1]);
			}

			if (points.length>1)
			{
				camera.drawLineStrip(points, true, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected));
			}
		}
		else
		{
			camera.drawArc(this.center, this.radius, 0, Math.PI * 2, this.appearance.GetLineColor(), 1, "rgba(0,0,0,0)", undefined, this);
		}
	}
	
	this.hitTest = function(a, b, camera)
	{
		// Check bulb
		{
			var p = min(max(this.center, a), b);

			var d = sub(p, this.center).length();

			if (d<=this.bulbRadius)
				return true;
		}

		// Check outer radius
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
	
	this.getSnapPoints = function()
	{
		return [{ type: "node", p: this.center}];
	}

	this.getDragPoints = function(localSpace, camera)
	{
		if (this.isFrozen())
			return [];

		var points = [this.center];

		var angleStep = 5 * Math.PI / 180;

		for (var a=0; a<=Math.PI*2; a+=angleStep)
		{
			points.push(add(this.center, mul(fromAngle(a), this.radius)));
		}

		return points;
	}

	this.drawDragPoint = function(camera, index, position, localSpace, alpha)
	{
		if (alpha == undefined)
			alpha = 1;

		if (index==0)
		{
			camera.drawRectangle(this.center, camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
		}
		else
		{
			var angleStep = 5 * Math.PI / 180;

			var p = add(this.center, mul(fromAngle((index - 1) * angleStep), this.radius));

			camera.drawRectangle(p, camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
		}
	}

	this.setDragPointPos = function(index, p, localSpace, dragStartPoint, camera)
	{
		if (index==0)
		{
			this.center = p;
		}
		else
		{
			this.radius = sub(p, this.center).length();
		}

		if (camera != undefined)
		{
			var textPoint = p.copy();
			textPoint.x += ((p.x < this.center.x) ? +1 : -1) * camera.invScale(10);
			textPoint.y += camera.invScale(10);

			camera.drawText(textPoint, "R: " + this.radius.toFixed(1), "#000000", (p.x < this.center.x) ? "left" : "right", 0, "12px Arial");
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

	this.getProperties = function()
	{
		var appearanceControl = new PopoutContainer(undefined, "images/color_wheel.svg");
		{
			appearanceControl.addControl("", new AppearanceControl(this.appearance, true, false, function(){ this.onChange(); }.bind(this)) );
		}

		return	[
					{ name: "Appearance", control:appearanceControl },
					{ name: "Bulb Radius", control: new PopoutSlider(0, 5, this.bulbRadius, 0.1, function (value) { this.bulbRadius = value; this.onChange(); }.bind(this)) },
					{ name: "Outer Radius", control: new PopoutSlider(0, 100, this.radius, 1, function (value) { this.radius = value; this.onChange(); }.bind(this)) },
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

	this.setSelected = function(selected)
	{
		this.selected = selected;
	}

	this.isSelected = function()
	{
		return this.selected;
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
	this.fovDegrees			= fovDegrees;
	this.collisionOutline	= true;
	this.selected			= false;
	this.visible			= true;
	this.frozen				= false;
	this.appearance			= new Appearance("#10FF00", 1, 2);
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
		str += "light.fovDegrees = " + this.fovDegrees + ";\n";
		str += "light.collisionOutline = " + this.collisionOutline + ";\n";
		str += this.appearance.saveAsJavascript("light");
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

	this.onChange = function(changeDetails)
	{
		// Backwards compatibility
		this.appearance.SetFromOldProperties(this);

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
			this.onChangeListeners[i](this, changeDetails);
		}
	}

	this.draw = function(camera)
	{
		var dir = sub(this.target, this.O).unit();
		var tan = transpose(dir);

		if (this.collisionOutline)
		{
			this.boundsMin = new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
			this.boundsMax = new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

			camera.drawLine(add(this.O, mul(tan, this.nearWidth/2)), add(this.O, mul(tan, -this.nearWidth/2)), this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), [5,5], this);
			camera.drawLine(add(this.target, mul(tan, this.farWidth/2)), add(this.target, mul(tan, -this.farWidth/2)), this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), [5,5], this);

			camera.drawLine(add(this.O, mul(tan, this.nearWidth/2)), add(this.target, mul(tan, this.farWidth/2)), this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), [5,5], this);
			camera.drawLine(add(this.O, mul(tan, -this.nearWidth/2)), add(this.target, mul(tan, -this.farWidth/2)), this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), [5,5], this);

			var points = [];

			var farStepCount = Math.round(this.farWidth / camera.invScale(20));
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

				var bestHit = this.scene.rayHitTest(pointNear, rayDir);

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

			for (var i=0; i!=points.length; ++i)
			{
				this.boundsMin = min(this.boundsMin, points[i]);
				this.boundsMax = max(this.boundsMax, points[i]);
			}

			camera.drawLineStrip(points, true, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), []);
		}
		else
		{
			camera.drawLine(add(this.O, mul(tan, this.nearWidth/2)), add(this.O, mul(tan, -this.nearWidth/2)), this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), [], this);
			camera.drawLine(add(this.target, mul(tan, this.farWidth/2)), add(this.target, mul(tan, -this.farWidth/2)), this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), [], this);

			camera.drawLine(add(this.O, mul(tan, this.nearWidth/2)), add(this.target, mul(tan, this.farWidth/2)), this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), [], this);
			camera.drawLine(add(this.O, mul(tan, -this.nearWidth/2)), add(this.target, mul(tan, -this.farWidth/2)), this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), [], this);
		}

		camera.drawStar(this.O, 7, 0.5, 0.5, 0, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), "rgba(255,255,0,0.8)");
	}
	
	this.hitTest = function(a, b, camera)
	{
		var dir = sub(this.target, this.O).unit();
		var tan = transpose(dir);

		var points = [];
		points.push(add(this.O, mul(tan, this.nearWidth/2)));
		points.push(add(this.target, mul(tan, this.farWidth/2)));
		points.push(add(this.target, mul(tan, -this.farWidth/2)));
		points.push(add(this.O, mul(tan, -this.nearWidth/2)));

		if (overlapRectLine(a, b, points[0], points[1]))	return true;
		if (overlapRectLine(a, b, points[1], points[2]))	return true;
		if (overlapRectLine(a, b, points[2], points[3]))	return true;
		if (overlapRectLine(a, b, points[3], points[0]))	return true;

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
		}

		points.push(add(this.O, mul(tan, this.nearWidth/2)));
		points.push(add(this.O, mul(tan, -this.nearWidth/2)));
		points.push(add(this.target, mul(tan, this.farWidth/2)));
		points.push(add(this.target, mul(tan, -this.farWidth/2)));

		return points;
	}

	this.drawDragPoint = function(camera, index, position, localSpace, alpha)
	{
		if (alpha == undefined)
			alpha = 1;

		var dir = sub(this.target, this.O).unit();
		var tan = transpose(dir);

		if (localSpace)
		{
			if (index == 0)
			{
				var a = this.O;
				var b1 = mad(dir, camera.invScale(30), a);
				var b2 = mad(dir.neg(), camera.invScale(30), a);

				camera.drawArrow(a, b1, 8, "rgba(255,0,0," + alpha + ")", 3);
				//camera.drawArrow(a, b2, 8, "rgba(255,0,0," + alpha + ")", 3);
			}
			else if (index==1)
			{
				var a = this.target;
				var b1 = mad(dir, camera.invScale(30), a);
				var b2 = mad(dir.neg(), camera.invScale(30), a);

				//camera.drawArrow(a, b1, 8, "rgba(255,0,0," + alpha + ")", 3);
				camera.drawArrow(a, b2, 8, "rgba(255,0,0," + alpha + ")", 3);
			}
		}
		else
		{
			if (index == 0)
			{
				camera.drawRectangle(this.O, camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
			}
			else if (index==1)
			{
				camera.drawRectangle(this.target, camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
			}
			else if (index==2)
			{
				var a = add(this.O, mul(tan, this.nearWidth / 2));
				var b1 = mad(tan, camera.invScale(30), a);
				var b2 = mad(tan.neg(), camera.invScale(30), a);

				camera.drawArrow(a, b1, 8, "rgba(255,0,0," + alpha + ")", 3);
				//camera.drawArrow(a, b2, 8, "rgba(255,0,0," + alpha + ")", 3);
			}
		}

		if (index==3)
		{
			var a = add(this.O, mul(tan, -this.nearWidth / 2));
			var b1 = mad(tan, camera.invScale(30), a);
			var b2 = mad(tan.neg(), camera.invScale(30), a);

			//camera.drawArrow(a, b1, 8, "rgba(255,0,0," + alpha + ")", 3);
			camera.drawArrow(a, b2, 8, "rgba(255,0,0," + alpha + ")", 3);
		}
		else if (index==4)
		{
			var a = add(this.target, mul(tan, this.farWidth / 2));
			var b1 = mad(tan, camera.invScale(30), a);
			var b2 = mad(tan.neg(), camera.invScale(30), a);

			camera.drawArrow(a, b1, 8, "rgba(255,0,0," + alpha + ")", 3);
			//camera.drawArrow(a, b2, 8, "rgba(255,0,0," + alpha + ")", 3);
		}
		else if (index==5)
		{
			var a = add(this.target, mul(tan, -this.farWidth / 2));
			var b1 = mad(tan, camera.invScale(30), a);
			var b2 = mad(tan.neg(), camera.invScale(30), a);

			//camera.drawArrow(a, b1, 8, "rgba(255,0,0," + alpha + ")", 3);
			camera.drawArrow(a, b2, 8, "rgba(255,0,0," + alpha + ")", 3);
		}
	}

	this.setDragPointPos = function(index, p, localSpace, dragStartPoint, camera)
	{
		var updateFOV = false;

		if (localSpace)
		{
			var dir = sub(this.target, this.O).unit();

			if (index==0)
			{
				this.O = add(this.target, mul(dot(sub(p, this.target), dir), dir));
				updateFOV = true;
			}
			else if (index==1)
			{
				this.target = add(this.O, mul(dot(sub(p, this.O), dir), dir));
				this.farWidth = this.nearWidth + Math.tan(this.fovDegrees/2*Math.PI/180) * sub(this.target, this.O).length() * 2;
			}
		}
		else
		{
			if (index==0)
			{
				this.O = p;
				updateFOV = true;
			}
			else if (index==1)
			{
				this.target = p;
				this.farWidth = this.nearWidth + Math.tan(this.fovDegrees/2*Math.PI/180) * sub(this.target, this.O).length() * 2;
			}
		}

		if (index==2 || index==3)
		{
			var dir = sub(this.target, this.O).unit();
			var tan = transpose(dir);

			this.nearWidth = Math.abs(dot(sub(p, this.O), tan))*2;

			updateFOV = true;
		}
		else if (index==4 || index==5)
		{
			var dir = sub(this.target, this.O).unit();
			var tan = transpose(dir);

			this.farWidth = Math.abs(dot(sub(p, this.target), tan))*2;

			updateFOV = true;
		}

		if (updateFOV)
		{
			var tanFOV = (this.farWidth - this.nearWidth) / 2 / distance(this.O, this.target);
			this.fovDegrees = Math.atan(tanFOV) * 2 * 180 / Math.PI;
		}

		if (camera != undefined)
		{
			if (updateFOV)
			{
				camera.drawText(this.target, "FOV: " + this.fovDegrees.toFixed(1) + "°", "#000000", "center", 0, "12px Arial");
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
		var appearanceControl = new PopoutContainer(undefined, "images/color_wheel.svg");
		{
			appearanceControl.addControl("", new AppearanceControl(this.appearance, true, false, function(){ this.onChange(); }.bind(this)) );
		}

		return	[
					{ name: "Appearance", control:appearanceControl },
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

	this.setSelected = function(selected)
	{
		this.selected = selected;
	}

	this.isSelected = function()
	{
		return this.selected;
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
	this.appearance			= new Appearance("#00C0FF", 1, 2);
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
		str += this.appearance.saveAsJavascript("light");
		str += "light.visible = " + this.visible + ";\n";
		str += "light.frozen = " + this.frozen + ";\n";

		str += "scene.addObject(light);\n";
		return str;
	}

	this.addChangeListener = function(listener)
	{
		this.onChangeListeners.push(listener);
	}

	this.onChange = function(changeDetails)
	{
		// Backwards compatibility
		this.appearance.SetFromOldProperties(this, false);

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
			this.onChangeListeners[i](this, changeDetails);
		}
	}

	this.draw = function(camera)
	{
		var tan = transpose(this.dir);

		if (this.collisionOutline)
		{
			var points = [];

			var stepCount = this.width / camera.invScale(20);
			var step = this.width / stepCount;

			points.push(add(this.O, mul(tan, -this.width / 2)));

			for (var x=-this.width/2; x<=this.width/2; x+=step)
			{
				var point = add(this.O, mul(tan, x));

				var bestHit = {tRay:1000};
			
				var bestHit = this.scene.rayHitTest(point, this.dir);

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

			this.boundsMin = new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
			this.boundsMax = new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

			for (var i=0; i!=points.length; ++i)
			{
				this.boundsMin = min(this.boundsMin, points[i]);
				this.boundsMax = max(this.boundsMax, points[i]);
			}

			camera.drawLineStrip(points, points.length>1, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected));
		}
		else
		{
			camera.drawLine(add(this.O, mul(tan, this.width/2)), add(this.O, mul(tan, -this.width/2)), this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected));
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

				camera.drawArrow(point, mad(this.dir, 2, point), 20, this.appearance.GetLineColor(), 2);
			}

			camera.drawArrow(this.O, mad(this.dir, 3, this.O), 20, this.appearance.GetLineColor(), 2);
		}

		camera.drawStar(this.O, 7, 0.5, 0.5, 0, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), "rgba(255,255,0,0.8)");
	}
	
	this.hitTest = function(a, b, camera)
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

	this.drawDragPoint = function(camera, index, position, localSpace, alpha)
	{
		if (alpha == undefined)
			alpha = 1;

		var tan = transpose(this.dir);

		if (index == 0)
		{
			camera.drawRectangle(this.O, camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
		}
		else if (index==1)
		{
			camera.drawArc(this.O, 3, toAngle(this.dir) - Math.PI/6, toAngle(this.dir) + Math.PI/6, "rgba(255,0,0," + alpha + ")", 2);
			camera.drawRectangle(add(this.O, mul(this.dir, 3)), camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
		}
		else if (index==2)
		{
			var a = add(this.O, mul(tan, this.width/2));
			var b = mad(tan, camera.invScale(30), a);
			camera.drawArrow(a, b, 8, "rgba(255,0,0," + alpha + ")", 3);
		}
		else if (index==3)
		{
			var a = add(this.O, mul(tan, -this.width/2));
			var b = mad(tan.neg(), camera.invScale(30), a);
			camera.drawArrow(a, b, 8, "rgba(255,0,0," + alpha + ")", 3);
		}
	}

	this.setDragPointPos = function(index, p, localSpace, dragStartPoint, camera)
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
		var appearanceControl = new PopoutContainer(undefined, "images/color_wheel.svg");
		{
			appearanceControl.addControl("", new AppearanceControl(this.appearance, true, false, function(){ this.onChange(); }.bind(this)) );
		}

		return	[
					{ name: "Appearance", control:appearanceControl },
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

	this.setSelected = function(selected)
	{
		this.selected = selected;
	}

	this.isSelected = function()
	{
		return this.selected;
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
	this.apexPoint			= O;
	this.target				= target;
	this.dir				= target;
	this.nearWidth			= 3;
	this.farWidth			= this.nearWidth + Math.tan(fovDegrees/2*Math.PI/180) * sub(target, O).length() * 2;
	this.fovDegrees			= fovDegrees;
	this.collisionOutline	= false;
	this.selected			= false;
	this.visible			= true;
	this.frozen				= false;
	this.appearance			= new Appearance("#39F4FF", 1, 2);
	this.pixelCount			= 4;
	this.showZBuffer		= false;
	this.showMinZBuffer		= false;
	this.showCenterLines	= true;
	this.spanCount			= 1;
	this.spanDistances		= [];
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
		str += this.appearance.saveAsJavascript("cam");
		str += "cam.pixelCount = " + this.pixelCount + ";\n";
		str += "cam.showZBuffer = " + this.showZBuffer + ";\n";
		str += "cam.showMinZBuffer = " + this.showMinZBuffer + ";\n";
		str += "cam.showCenterLines = " + this.showCenterLines + ";\n";
		str += "cam.spanCount = " + this.spanCount + ";\n";
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

	this.onChange = function(changeDetails)
	{
		// Backwards compatibility
		this.appearance.SetFromOldProperties(this);

		this.boundsMin = new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
		this.boundsMax = new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

		var tanFOV = (this.farWidth - this.nearWidth) / 2 / distance(this.O, this.target);

		//this.fovDegrees = Math.atan(tanFOV) * 2 * 180 / Math.PI;

		this.dir = sub(this.target, this.O).unit();
		var tan = transpose(this.dir);

		var apexDistance = this.nearWidth / tanFOV / 2;
		this.apexPoint = mad(this.dir, -apexDistance, this.O);

		var points = [];
		points.push(add(this.O, mul(tan, this.nearWidth/2)));
		points.push(add(this.target, mul(tan, this.farWidth/2)));
		points.push(add(this.target, mul(tan, -this.farWidth/2)));
		points.push(add(this.O, mul(tan, -this.nearWidth/2)));

		// spans
		{
			var totalLength = sub(this.target, this.O).length();

			var delta = totalLength / this.spanCount;

			for (var i=0; i!=this.spanCount; ++i)
			{
				this.spanDistances[i] = i * delta;
			}
		}

		for (var i = 0; i != points.length; ++i)
		{
			this.boundsMin = min(this.boundsMin, points[i]);
			this.boundsMax = max(this.boundsMax, points[i]);
		}

		for (var i=0; i!=this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this, changeDetails);
		}
	}

	this.draw = function(camera)
	{
		var tan = transpose(this.dir);

		var tanFOV = (this.farWidth - this.nearWidth) / 2 / distance(this.O, this.target);

		var minZValues = Array(this.pixelCount).fill(Number.MAX_VALUE);
		var pixelSizeFar = this.farWidth / this.pixelCount;

		if (this.collisionOutline || this.showMinZBuffer)
		{
			var points = [];

			var farStepCount = Math.round(this.farWidth / camera.invScale(20));
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

				var bestHit = this.scene.rayHitTest(pointNear, rayDir);

				if (bestHit.tRay<maxRayLength)
				{
					points.push(bestHit.P);

					var pixelIndex = Math.floor((fx - (-this.farWidth/2)) / pixelSizeFar);
					var zValue = dot(sub(bestHit.P, pointNear), this.dir);  // distance from near plane, so that we can cope with parallel cameras
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
				camera.drawLine(add(this.O, mul(tan, this.nearWidth/2)), add(this.O, mul(tan, -this.nearWidth/2)), this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), [5,5], this);
				camera.drawLine(add(this.target, mul(tan, this.farWidth/2)), add(this.target, mul(tan, -this.farWidth/2)), this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), [5,5], this);

				camera.drawLine(add(this.O, mul(tan, this.nearWidth/2)), add(this.target, mul(tan, this.farWidth/2)), this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), [5,5], this);
				camera.drawLine(add(this.O, mul(tan, -this.nearWidth/2)), add(this.target, mul(tan, -this.farWidth/2)), this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), [5,5], this);

				camera.drawLineStrip(points, true, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), []);
			}
		}

		// spans
		if (this.spanCount>1)
		{
			var totalLength = sub(this.target, this.O).length();

			for (var i=1; i!=this.spanCount; ++i)
			{
				var p = mad(this.dir, this.spanDistances[i], this.O);
				var spanWidth = lerp(this.nearWidth, this.farWidth, this.spanDistances[i] / totalLength);
				camera.drawLine(mad(tan, spanWidth/2, p), mad(tan, -spanWidth/2, p), this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), [], this);
			}
		}
	
		if (!this.collisionOutline)
		{
			camera.drawLine(add(this.O, mul(tan, this.nearWidth/2)), add(this.O, mul(tan, -this.nearWidth/2)), this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), [], this);
			camera.drawLine(add(this.target, mul(tan, this.farWidth/2)), add(this.target, mul(tan, -this.farWidth/2)), this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), [], this);

			camera.drawLine(add(this.O, mul(tan, this.nearWidth/2)), add(this.target, mul(tan, this.farWidth/2)), this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), [], this);
			camera.drawLine(add(this.O, mul(tan, -this.nearWidth/2)), add(this.target, mul(tan, -this.farWidth/2)), this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), [], this);
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
					if (this.showCenterLines)
					{
						camera.drawLine(pointNear, pointFar, "rgba(0,0,0,0.2)", this.appearance.GetLineWidth(this.selected), [10, 5, 2, 5], this);
					}

					if (this.showZBuffer)
					{
						var bestHit = this.scene.rayHitTest(pointNear, sub(pointFar,pointNear).unit());

						if (bestHit.tRay<distance(pointFar, pointNear))
						{
							var result0 = intersectRayLine(bestHit.P, tan, add(this.O, mul(tan, nx + nearStep)), add(this.target, mul(tan, fx + farStep)));
							var result1 = intersectRayLine(bestHit.P, tan.neg(), add(this.O, mul(tan, nx - nearStep)), add(this.target, mul(tan, fx - farStep)));

							camera.drawLine(result0.P, result1.P, "#FF0000", this.appearance.GetLineWidth(this.selected), [], this);
						}
					}

					if (this.showMinZBuffer)
					{
						var pixelIndex = fc/2-0.5;
						var minZ = minZValues[pixelIndex];

						//if (minZ<zFar)
						{
							var pixelDir = sub(pointFar, pointNear).unit();

							var P = mad(pixelDir, minZ / dot(pixelDir, this.dir), pointNear);
							var result0 = intersectRayLine(P, tan, add(this.O, mul(tan, nx + nearStep)), add(this.target, mul(tan, fx + farStep)));
							var result1 = intersectRayLine(P, tan.neg(), add(this.O, mul(tan, nx - nearStep)), add(this.target, mul(tan, fx - farStep)));

							camera.drawLine(result0.P, result1.P, "#00FF00", this.appearance.GetLineWidth(this.selected), [], this);
						}
					}
				}
				else
				{
					camera.drawLine(pointNear, pointFar, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), [], this);
				}
			}
		}

		// Eye
		{
			//camera.drawCross(this.apexPoint, camera.invScale(10), 0, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected));
			camera.drawLine(this.apexPoint, mad(fromAngle(toAngle(this.dir) + 30 * Math.PI / 180), camera.invScale(50), this.apexPoint), this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected));
			camera.drawLine(this.apexPoint, mad(fromAngle(toAngle(this.dir) + -30 * Math.PI / 180), camera.invScale(50), this.apexPoint), this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected));
			camera.drawArc(mad(this.dir, camera.invScale(30), this.apexPoint), camera.invScale(6), toAngle(this.dir) + 95 * Math.PI / 180, toAngle(this.dir) - 95 * Math.PI / 180, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), "rgba(0,0,0,0.7)");
			camera.drawArc(this.apexPoint, camera.invScale(30), toAngle(this.dir) - 30 * Math.PI / 180, toAngle(this.dir) + 30 * Math.PI / 180, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected));
		}
	}
	
	this.hitTest = function(a, b, camera)
	{
		var tan = transpose(this.dir);

		var points = [];
		points.push(add(this.O, mul(tan, this.nearWidth/2)));
		points.push(add(this.target, mul(tan, this.farWidth/2)));
		points.push(add(this.target, mul(tan, -this.farWidth/2)));
		points.push(add(this.O, mul(tan, -this.nearWidth/2)));

		if (overlapRectLine(a, b, points[0], points[1]))	return true;
		if (overlapRectLine(a, b, points[1], points[2]))	return true;
		if (overlapRectLine(a, b, points[2], points[3]))	return true;
		if (overlapRectLine(a, b, points[3], points[0]))	return true;

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
					if (this.showCenterLines)
					{
						if (overlapRectLine(a, b, pointNear, pointFar))	return true;
					}
				}
				else
				{
					if (overlapRectLine(a, b, pointNear, pointFar))	return true;
				}
			}
		}

		return false;
	}
	
	this.getSnapPoints = function()
	{
		var tan = transpose(this.dir);

		var tanFOV = (this.farWidth - this.nearWidth) / 2 / distance(this.O, this.target);

		var points = [	{ type: "node", p: this.O },
						{ type: "node", p: this.apexPoint },
						{ type: "node", p: this.target },
						{ type: "node", p: add(this.O, mul(tan, this.nearWidth/2))},
						{ type: "node", p: add(this.target, mul(tan, this.farWidth/2))},
						{ type: "node", p: add(this.target, mul(tan, -this.farWidth/2))},
						{ type: "node", p: add(this.O, mul(tan, -this.nearWidth/2))}
					];

		if (this.spanCount>1)
		{
			var totalLength = sub(this.target, this.O).length();

			for (var i=1; i!=this.spanCount; ++i)
			{
				var p = mad(this.dir, this.spanDistances[i], this.O);
				var spanWidth = lerp(this.nearWidth, this.farWidth, this.spanDistances[i] / totalLength);

				points.push({ type: "node", p: mad(tan, spanWidth/2, p)});
				points.push({ type: "node", p: mad(tan, -spanWidth/2, p)});
			}
		}

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

				if (this.spanCount>1)
				{
					var totalLength = sub(this.target, this.O).length();

					for (var i=1; i!=this.spanCount; ++i)
					{
						var p = lerp(pointNear, pointFar, this.spanDistances[i] / totalLength);
						points.push({ type: "node", p: p});
					}
				}
			}
		}

		return points;
	}

	this.getDragPoints = function(localSpace, camera)
	{
		if (this.isFrozen())
			return [];

		var points = [];
		
		var tan = transpose(this.dir);


		if (localSpace)
		{
			points.push( mad(this.dir, 0.5, this.O) );
			points.push( mad(this.dir, -0.5, this.target) );
		}
		else
		{
			points.push(this.O);
			points.push(this.target);
		}

		points.push(add(this.O, mul(tan, this.nearWidth / 2)));
		points.push(add(this.O, mul(tan, -this.nearWidth/2)));
		points.push(add(this.target, mul(tan, this.farWidth/2)));
		points.push(add(this.target, mul(tan, -this.farWidth/2)));

		return points;
	}

	this.drawDragPoint = function(camera, index, position, localSpace, alpha)
	{
		if (alpha == undefined)
			alpha = 1;

		var dir = this.dir;
		var tan = transpose(this.dir);

		if (localSpace)
		{
			if (index == 0)
			{
				var a = this.O;
				var b1 = mad(dir, camera.invScale(30), a);
				var b2 = mad(dir.neg(), camera.invScale(30), a);

				camera.drawArrow(a, b1, 8, "rgba(255,0,0," + alpha + ")", 3);
				//camera.drawArrow(a, b2, 8, "rgba(255,0,0," + alpha + ")", 3);
			}
			else if (index==1)
			{
				var a = this.target;
				var b1 = mad(dir, camera.invScale(30), a);
				var b2 = mad(dir.neg(), camera.invScale(30), a);

				//camera.drawArrow(a, b1, 8, "rgba(255,0,0," + alpha + ")", 3);
				camera.drawArrow(a, b2, 8, "rgba(255,0,0," + alpha + ")", 3);
			}
		}
		else
		{
			if (index == 0)
			{
				camera.drawRectangle(this.O, camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
			}
			else if (index==1)
			{
				camera.drawRectangle(this.target, camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
			}
		}

		if (index==2)
		{
			var a = add(this.O, mul(tan, this.nearWidth / 2));
			var b1 = mad(tan, camera.invScale(30), a);
			var b2 = mad(tan.neg(), camera.invScale(30), a);

			camera.drawArrow(a, b1, 8, "rgba(255,0,0," + alpha + ")", 3);
			//camera.drawArrow(a, b2, 8, "rgba(255,0,0," + alpha + ")", 3);
		}
		else if (index==3)
		{
			var a = add(this.O, mul(tan, -this.nearWidth / 2));
			var b1 = mad(tan, camera.invScale(30), a);
			var b2 = mad(tan.neg(), camera.invScale(30), a);

			//camera.drawArrow(a, b1, 8, "rgba(255,0,0," + alpha + ")", 3);
			camera.drawArrow(a, b2, 8, "rgba(255,0,0," + alpha + ")", 3);
		}
		else if (index==4)
		{
			var a = add(this.target, mul(tan, this.farWidth / 2));
			var b1 = mad(tan, camera.invScale(30), a);
			var b2 = mad(tan.neg(), camera.invScale(30), a);

			camera.drawArrow(a, b1, 8, "rgba(255,0,0," + alpha + ")", 3);
			//camera.drawArrow(a, b2, 8, "rgba(255,0,0," + alpha + ")", 3);
		}
		else if (index==5)
		{
			var a = add(this.target, mul(tan, -this.farWidth / 2));
			var b1 = mad(tan, camera.invScale(30), a);
			var b2 = mad(tan.neg(), camera.invScale(30), a);

			//camera.drawArrow(a, b1, 8, "rgba(255,0,0," + alpha + ")", 3);
			camera.drawArrow(a, b2, 8, "rgba(255,0,0," + alpha + ")", 3);
		}
	}

	this.setDragPointPos = function(index, p, localSpace, dragStartPoint, camera)
	{
		var updateFOV = false;

		if (localSpace)
		{
			if (index==0)
			{
				this.O = add(this.target, mul(dot(sub(p, this.target), this.dir), this.dir));
				updateFOV = true;
			}
			else if (index==1)
			{
				this.target = add(this.O, mul(dot(sub(p, this.O), this.dir), this.dir));
				this.farWidth = this.nearWidth + Math.tan(this.fovDegrees/2*Math.PI/180) * sub(this.target, this.O).length() * 2;
			}
		}
		else
		{
			if (index==0)
			{
				this.O = p;
				updateFOV = true;
			}
			else if (index==1)
			{
				this.target = p;
				this.farWidth = this.nearWidth + Math.tan(this.fovDegrees/2*Math.PI/180) * sub(this.target, this.O).length() * 2;
			}
			else if (index==2 || index==3)
			{
				var tan = transpose(this.dir);

				this.nearWidth = Math.abs(dot(sub(p, this.O), tan))*2;
				updateFOV = true;
			}
			else if (index==4 || index==5)
			{
				var tan = transpose(this.dir);

				this.farWidth = Math.abs(dot(sub(p, this.target), tan))*2;
				updateFOV = true;
			}
		}

		if (updateFOV)
		{
			var tanFOV = (this.farWidth - this.nearWidth) / 2 / distance(this.O, this.target);
			this.fovDegrees = Math.atan(tanFOV) * 2 * 180 / Math.PI;
		}

		if (camera != undefined)
		{
			if (updateFOV)
			{
				camera.drawText(this.target, "FOV: " + this.fovDegrees.toFixed(1) + "°", "#000000", "center", 0, "12px Arial");
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
		var appearanceControl = new PopoutContainer(undefined, "images/color_wheel.svg");
		{
			appearanceControl.addControl("", new AppearanceControl(this.appearance, true, false, function(){ this.onChange(); }.bind(this)) );
		}

		return	[
					{ name: "Appearance", control:appearanceControl },
					{ name: "FOV", control: new PopoutSlider(0, 180, this.fovDegrees, 5,	function (value) 
																					{
																						this.fovDegrees = value;
																						var tanFOV = Math.tan(this.fovDegrees * 0.5 * Math.PI / 180);
																						this.farWidth = this.nearWidth + 2 * tanFOV * distance(this.O, this.target);
																						this.onChange();
																					}.bind(this))
					},

					{ name: "Collision Outline", control: new TickBox(this.collisionOutline, function (value) { this.collisionOutline = value; this.onChange(); }.bind(this)) },
					{ name: "Span Count", control: new PopoutSlider(0, 10, this.spanCount, 1, function (value) { this.spanCount = value; this.onChange(); }.bind(this)) },
					{ name: "Pixel Count", control: new PopoutSlider(0, 20, this.pixelCount, 1, function (value) { this.pixelCount = value; this.onChange(); }.bind(this)) },
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

	this.setSelected = function(selected)
	{
		this.selected = selected;
	}

	this.isSelected = function()
	{
		return this.selected;
	}

	this.onChange();
}

// ----------------------------------------------------------------------------------------------------------------
// Line
// ----------------------------------------------------------------------------------------------------------------
var lastLineAppearance = new Appearance("#900090", 1, 2, "#000000", 0);

function Line(_points)
{
	this.scene				= null;
	this.points				= _points;
	this.closed				= false;
	this.selected			= false;
	this.visible			= true;
	this.frozen				= false;
	this.appearance			= lastLineAppearance.copy();
	this.pixelMip			= -1;
	this.arrowStart			= false;
	this.arrowEnd			= false;
	this.handDrawn			= false;
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
		str += this.appearance.saveAsJavascript("lineObject");
		str += "lineObject.pixelMip = " + this.pixelMip + ";\n";
		str += "lineObject.arrowStart = " + this.arrowStart + ";\n";
		str += "lineObject.arrowEnd = " + this.arrowEnd + ";\n";
		str += "lineObject.handDrawn = " + this.handDrawn + ";\n";
		str += "lineObject.visible = " + this.visible + ";\n";
		str += "lineObject.frozen = " + this.frozen + ";\n";

		str += "scene.addObject(lineObject);\n";
		return str;
	}

	this.addChangeListener = function (listener)
	{
		this.onChangeListeners.push(listener);
	}

	this.onChange = function(changeDetails)
	{
		// Backwards compatibility
		this.appearance.SetFromOldProperties(this);

		lastLineAppearance = this.appearance.copy();

		this.boundsMin = new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
		this.boundsMax = new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

		for (var i = 0; i != this.points.length; ++i)
		{
			this.boundsMin = min(this.boundsMin, this.points[i]);
			this.boundsMax = max(this.boundsMax, this.points[i]);
		}

		for (var i = 0; i != this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this, changeDetails);
		}
	}

	this.addPoint = function(point)
	{
		this.points.push(point);

		this.onChange();
	}

	this.draw = function (camera)
	{
		if (this.points.length < 2)
			return;

		var lastRand = (pseudoRandom.random(0)-0.5);

		for (var mip=0; mip<=this.pixelMip; ++mip)
		{
			var points = this.points.slice();

			if (this.closed)
				points.push(this.points[0]);

			var cellSize = Math.pow(2, mip);

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

					camera.drawRectangle(r0, r1, "#000000", 1, [], this.appearance.GetFillColor());

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
			// Truly lazy!
			camera.drawArrow(avg(this.points[0], this.points[1]), this.points[1], 20, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), this.appearance.GetLineDash(), this);
			camera.drawArrow(avg(this.points[0], this.points[1]), this.points[0], 20, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), this.appearance.GetLineDash(), this);
		}
		else
		{
			var points = this.points.slice();

			if (this.closed)
				points.push(this.points[0]);

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
				camera.drawArrow(points[points.length-2], points[points.length-1], 20, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), this.appearance.GetLineDash(), this);
			}

			if (this.arrowStart)
			{
				camera.drawArrow(points[1], points[0], 20, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), this.appearance.GetLineDash(), this);
			}

			if (this.arrowEnd)
			{
				points.splice(-1, 1);
			}

			if (this.arrowStart)
			{
				points.splice(0, 1);
			}

			camera.drawLineStrip(points, false, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), this.appearance.GetLineDash(), this.appearance.GetFillColor(), this);
		}
	}
	
	this.hitTest = function(a, b, camera)
	{
		var count = this.closed ? this.points.length : this.points.length - 1;

		for (var i = 0; i != count; ++i)
		{
			if (overlapRectLine(a, b, this.points[i], this.points[(i+1)%this.points.length]))
				return true;
		}

		return false;
	}
	
	this.getSnapPoints = function()
	{
		var snaps = [];

		var count = this.closed ? this.points.length : this.points.length - 1;

		for (var i = 0; i != count; ++i)
		{
			snaps.push({ type: "node", p: this.points[i]});
			snaps.push({ type: "midpoint", p: avg(this.points[i], this.points[(i+1)%this.points.length])});
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

	this.drawDragPoint = function(camera, index, position, localSpace, alpha)
	{
		if (alpha == undefined)
			alpha = 1;

		if (localSpace)
		{
			var index0 = Math.floor(index/2) + (index%2);
			var index1 = (index % 2) > 0 ? (index0 - 1) : (index0 + 1);

			var L = sub(this.points[index1], this.points[index0]).unit()

			camera.drawArrow(this.points[index0], mad(L, camera.invScale(50), this.points[index0]), 13, "rgba(255,0,0," + alpha + ")", 5);
		}
		else
		{
			camera.drawRectangle(this.points[index], camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
		}
	}

	this.drawDebugAngle = function(index, camera)
	{
		if (index <= 0 || index >= this.points.length-1)
			return;

		var vNext = sub(this.points[index+1], this.points[index]);
		var angleNext = toAngle(vNext);

		if (angleNext<0)
			angleNext += Math.PI*2;

		var vPrevious = sub(this.points[index-1], this.points[index]);
		var anglePrevious = toAngle(vPrevious);

		if (anglePrevious<0)
			anglePrevious += Math.PI*2;

		var deltaAngle = anglePrevious - angleNext;

		var textPoint = add(this.points[index], mul(fromAngle((angleNext+anglePrevious) * 0.5), camera.invScale(60)));
		camera.drawArc(this.points[index], camera.invScale(50), Math.min(anglePrevious, angleNext), Math.max(anglePrevious, angleNext), "#000000", 1, undefined, [5,5]);
		camera.drawText(textPoint, (Math.abs(deltaAngle) * 180/Math.PI).toFixed(1) + "°", "#000000", "center", 0, "12px Arial");
	}

	this.drawDebugLineInfo = function(index, camera)
	{
		if (index < 0 || index >= this.points.length-1)
			return;

		var vNext = sub(this.points[index+1], this.points[index]);
		var angleNext = toAngle(vNext);

		if (angleNext<0)
			angleNext += Math.PI*2;

		var offsetSign = 1;

		if (angleNext>=Math.PI/2 && angleNext<Math.PI*3/2)
		{
			angleNext += Math.PI;
			offsetSign = -1;
		}

		var textPoint = addv(this.points[index], mul(vNext, 0.5), mul(transpose(vNext).unit().neg(), offsetSign * camera.invScale(10)));
		camera.drawText(textPoint, "dx: " + vNext.x.toFixed(1) + " dy: " + vNext.y.toFixed(1) + " L: " + vNext.length().toFixed(1), "#000000", "center", angleNext, "12px Arial");
	}

	this.setDragPointPos = function(index, p, localSpace, dragStartPoint, camera)
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

		if (camera != undefined)
		{
			this.drawDebugAngle(index, camera);
			this.drawDebugAngle(index-1, camera);
			this.drawDebugAngle(index+1, camera);
			
			this.drawDebugLineInfo(index, camera);
			this.drawDebugLineInfo(index-1, camera);
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
		var appearanceControl = new PopoutContainer(undefined, "images/color_wheel.svg");
		{
			appearanceControl.addControl("", new AppearanceControl(this.appearance, true, true, function(){ this.onChange(); }.bind(this)) );
		}

		return	[
					{name: "Appearance", control:appearanceControl },
					{name: "Arrow Start", control: new TickBox(this.arrowStart, function (value) { this.arrowStart = value; this.onChange(); }.bind(this)) },
					{name: "Arrow End", control: new TickBox(this.arrowEnd, function (value) { this.arrowEnd = value; this.onChange(); }.bind(this)) },
					{name: "Hand Drawn", control: new TickBox(this.handDrawn, function (value) { this.handDrawn = value; this.onChange(); }.bind(this)) },
					{name: "Pixelate Mip", control: new PopoutSlider(-1, 5, this.pixelMip, 1, function (value) { this.pixelMip = value; this.onChange(); }.bind(this)) },
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

	this.setSelected = function(selected)
	{
		this.selected = selected;
	}

	this.isSelected = function()
	{
		return this.selected;
	}

	this.onChange();
}

// ----------------------------------------------------------------------------------------------------------------
// Rectangle
// ----------------------------------------------------------------------------------------------------------------
var lastRectAppearance = new Appearance("#900090", 1, 2);

function Rectangle(center)
{
	this.scene				= null;
	this.points				= [ center.copy(), center.copy(), center.copy(), center.copy() ];
	this.rows				= 1;
	this.columns			= 1;
	this.selected			= false;
	this.visible			= true;
	this.frozen				= false;
	this.appearance			= lastRectAppearance.copy();
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
		str += this.appearance.saveAsJavascript("rectObj");
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

	this.onChange = function(changeDetails)
	{
		// Backwards compatibility
		this.appearance.SetFromOldProperties(this);

		lastRectAppearance = this.appearance.copy();

		var center = avg(this.points[0], this.points[2]);
		var halfSize = abs(sub(this.points[0], center));

		this.boundsMin = sub(center, halfSize);
		this.boundsMax = add(center, halfSize);

		for (var i = 0; i != this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this, changeDetails);
		}
	}

	this.setSize = function(w,h)
	{
		var half = new Vector(w*0.5, h*0.5);

		var center = avg(this.points[0], this.points[2]);

		this.points[0] = add(center, new Vector(-w*0.5, +h*0.5));
		this.points[1] = add(center, new Vector(+w*0.5, +h*0.5));
		this.points[2] = add(center, new Vector(+w*0.5, -h*0.5));
		this.points[3] = add(center, new Vector(-w*0.5, -h*0.5));

		this.onChange();
	}

	this.draw = function(camera)
	{
		camera.drawLineStrip(this.points, true, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), this.appearance.GetLineDash(), this.appearance.GetFillColor(), this);

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

			camera.drawLines(points, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), [], this.appearance.GetFillColor(), this);
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
	
	this.hitTest = function(a, b, camera)
	{
		if (	overlapRectLine(a, b, this.points[0], this.points[1]) ||
				overlapRectLine(a, b, this.points[1], this.points[2]) ||
				overlapRectLine(a, b, this.points[2], this.points[3]) ||
				overlapRectLine(a, b, this.points[3], this.points[0]))
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

				if (overlapRectLine(a, b, pX0, pX1))
					return true;
			}

			for (var i = 1; i <= this.rows - 1; ++i)
			{
				var pY0 = mad(deltaY0, i, this.points[0]);
				var pY1 = mad(deltaY1, i, this.points[1]);

				if (overlapRectLine(a, b, pY0, pY1))
					return true;
			}
		}

		if (this.appearance.fillAlpha > 0)
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
						{ type: "midpoint", p: avg(this.points[3], this.points[0]) },
						{ type: "center", p: avg(this.points[0], this.points[2]) } ];

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

	this.drawDragPoint = function(camera, index, position, localSpace, alpha)
	{
		if (alpha == undefined)
			alpha = 1;

		if (index<4)
		{
			camera.drawRectangle(this.points[index], camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
		}
		else
		{
			var index0 = index-4;
			var index1 = (index0+1) % 4;

			var a = avg(this.points[index0], this.points[index1]);
			var dir = sub(this.points[index1], this.points[index0]).unit().neg();
			var tan = transpose(dir);
	
			var b = add(a, mul(tan, camera.invScale(30)));

			camera.drawArrow(a, b, 8, "rgba(255,0,0," + alpha + ")", 3);
		}
	}

	this.setDragPointPos = function(index, p, localSpace, dragStartPoint, camera)
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

		if (camera != undefined)
		{
			var p0 = this.points[0].copy();
			var p1 = this.points[2].copy();

			var delta = sub(p1, p0);

			var p = p1.copy();
			p.x += ((p1.x < p0.x) ? +1 : -1) * camera.invScale(10);
			p.y += camera.invScale(10);

			camera.drawText(p, "dx: " + delta.x.toFixed(1) + " dy: " + delta.y.toFixed(1), "#000000", (p1.x < p0.x) ? "left" : "right", 0, "12px Arial");
		}

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
		var appearanceControl = new PopoutContainer(undefined, "images/color_wheel.svg");
		{
			appearanceControl.addControl("", new AppearanceControl(this.appearance, true, true, function(){ this.onChange(); }.bind(this)) );
		}

		return	[
					{name: "Appearance", control:appearanceControl },
					{name: "Rows", control: new PopoutSlider(1, 16, this.rows, 1, function (value) { this.rows = value; this.onChange(); }.bind(this)) },
					{name: "Columns", control: new PopoutSlider(1, 16, this.columns, 1, function (value) { this.columns = value; this.onChange(); }.bind(this)) },
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

	this.setSelected = function(selected)
	{
		this.selected = selected;
	}

	this.isSelected = function()
	{
		return this.selected;
	}

	this.onChange();
}

// ----------------------------------------------------------------------------------------------------------------
// BRDFHemisphere
// ----------------------------------------------------------------------------------------------------------------
function BRDFHemisphere(centerPos, radius, normal)
{
	this.scene				= null;
	this.center				= centerPos;
	this.normal				= normal;
	this.radius				= radius;
	this.BRDF				= Phong;
	this.BRDFIndex			= 1;
	this.BRDFOptions		= [ Lambert, Phong, ConstantHemi ];
	this.metalness			= 0;
	this.roughness			= 0;
	this.intensity			= 1;
	this.showBRDF			= true;
	this.appearance			= new Appearance();
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
		var str = "var hemi = new BRDFHemisphere(";

		str += "new Vector(" + this.center.x + ", " + this.center.y + ")";
		str += ", " + this.radius;
		str += ", new Vector(" + this.normal.x + ", " + this.normal.y + ")";
		str += ");\n";

		str += this.appearance.saveAsJavascript("hemi");
		str += "hemi.visible = " + this.visible + ";\n";
		str += "hemi.frozen = " + this.frozen + ";\n";
		str += "hemi.showBRDF = " + this.showBRDF + ";\n";
		str += "hemi.metalness = " + this.metalness + ";\n";
		str += "hemi.roughness = " + this.roughness + ";\n";
		str += "hemi.intensity = " + this.intensity + ";\n";
		str += "hemi.BRDFIndex = " + this.BRDFIndex + ";\n";
		str += "hemi.onChange();\n";

		str += "scene.addObject(hemi);\n";
		return str;
	}

	this.addChangeListener = function(listener)
	{
		this.onChangeListeners.push(listener);
	}

	this.onChange = function(changeDetails)
	{
		// Backwards compatibility
		this.appearance.SetFromOldProperties(this);

		this.BRDF = this.BRDFOptions[this.BRDFIndex];

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
			this.onChangeListeners[i](this, changeDetails);
		}
	}
	
	this.draw = function(camera)
	{
		if (this.radius <= 0)
			return;

		if (this.showBRDF)
		{
			var F0 = 0.04 + this.metalness * (1 - 0.04);
			camera.drawBRDFGraph(this.BRDF, this.normal, this.normal, F0, false, this.roughness, this.center, this.intensity);
		}

		camera.drawArc(this.center, this.radius, this.startAngle, this.endAngle, "#F08000", this.appearance.GetLineWidth(this.selected));
		camera.drawArrow(this.center, mad(this.normal, this.radius * 0.5, this.center), 20, "#000000", this.appearance.GetLineWidth(this.selected));
		camera.drawText(mad(this.normal, this.radius * 0.5, this.center), "N", "#000000");
	}
	
	this.hitTest = function(a, b, camera)
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
		var v0 = add(this.center, rotate(new Vector(this.radius,0), this.startAngle));
		var v1 = add(this.center, rotate(new Vector(this.radius,0), this.endAngle));

		var points = [	{ type: "center", p: this.center },
						{ type: "node", p: v0 },
						{ type: "node", p: v1 } ];

		return points;
	}

	this.getDragPoints = function(localSpace, camera)
	{
		if (this.isFrozen())
			return [];

		var v0 = add(this.center, rotate(new Vector(this.radius,0), this.startAngle));
		var v1 = add(this.center, rotate(new Vector(this.radius,0), this.endAngle));

		var points = [ this.center, v0, v1 ];

		return points;
	}

	this.drawDragPoint = function(camera, index, position, localSpace, alpha)
	{
		if (alpha == undefined)
			alpha = 1;

		var points = this.getDragPoints(localSpace, camera);

		camera.drawRectangle(points[index], camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
	}

	this.setDragPointPos = function(index, p, localSpace, dragStartPoint, camera)
	{
		if (index == 0)
		{
			this.center = p;
		}
		else if (index == 1 || index == 2)
		{
			this.radius = sub(p, this.center).length();
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

	this.getProperties = function()
	{
		var appearanceControl = new PopoutContainer(undefined, "images/color_wheel.svg");
		{
			appearanceControl.addControl("", new AppearanceControl(this.appearance, true, false, function(){ this.onChange(); }.bind(this)) );
		}

		return	[
					{name: "Appearance", control:appearanceControl },
					{name: "Show BRDF", control: new TickBox(this.showBRDF, function (value) { this.showBRDF = value; this.onChange(); }.bind(this)) },
					{name: "Roughness", control: new PopoutSlider(0, 1, this.roughness, 0.1, function (value) { this.roughness = value; this.onChange(); }.bind(this)) },
					{name: "Metalness", control: new PopoutSlider(0, 1, this.metalness, 0.1, function (value) { this.metalness = value; this.onChange(); }.bind(this)) },
					{name: "Intensity", control: new PopoutSlider(0, 10, this.intensity, 0.1, function (value) { this.intensity = value; this.onChange(); }.bind(this)) },
					{name: "BRDF", control: new Dropdown(["Lambert", "Phong", "Constant"], this.BRDFIndex, function (value) { this.BRDFIndex = value; this.onChange(); }.bind(this)) },
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

	this.setSelected = function(selected)
	{
		this.selected = selected;
	}

	this.isSelected = function()
	{
		return this.selected;
	}

	this.onChange();
}

// Backwards compatibility
function Hemisphere(centerPos, radius, normal)
{
	return new BRDFHemisphere(centerPos, radius, normal)
}

// ----------------------------------------------------------------------------------------------------------------
// NGon
// ----------------------------------------------------------------------------------------------------------------
var lastNGonAppearance = new Appearance("#900090", 1, 2);

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
	this.appearance			= lastNGonAppearance.copy();
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
		str += this.appearance.saveAsJavascript("ngon");
		str += "ngon.visible = " + this.visible + ";\n";
		str += "ngon.frozen = " + this.frozen + ";\n";

		str += "scene.addObject(ngon);\n";
		return str;
	}

	this.addChangeListener = function(listener)
	{
		this.onChangeListeners.push(listener);
	}

	this.onChange = function(changeDetails)
	{
		// Backwards compatibility
		this.appearance.SetFromOldProperties(this);

		lastNGonAppearance = this.appearance.copy();

		this.boundsMin = sub(this.center, new Vector(this.radius, this.radius));
		this.boundsMax = add(this.center, new Vector(this.radius, this.radius));

		for (var i=0; i!=this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this, changeDetails);
		}
	}
	
	this.draw = function(camera)
	{
		if (this.radius <= 0)
			return;

		var points = [];

		var angleStep = Math.PI * 2 / this.sideCount;

		for (var a = 0; a <= Math.PI * 2; a += angleStep)
		{
			points.push(mad(fromAngle(a + this.rotationAngle), this.radius, this.center));
		}

		if (this.sideCount>=60)
		{
			camera.drawArc(this.center, this.radius, 0, Math.PI*2, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), this.appearance.GetFillColor(), this.appearance.GetLineDash(), this);
		}
		else
		{
			camera.drawLineStrip(points, true, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), this.appearance.GetLineDash(), this.appearance.GetFillColor(), this);
		}
	}
	
	this.hitTest = function(a, b, camera)
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

	this.drawDragPoint = function(camera, index, position, localSpace, alpha)
	{
		if (alpha == undefined)
			alpha = 1;

		if (index == 0)
		{
			camera.drawRectangle(this.center, camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
		}
		else
		{
			var angleStep = Math.PI * 2 / this.sideCount;

			var a = angleStep * (index-1);

			camera.drawRectangle( mad(fromAngle(a + this.rotationAngle), this.radius, this.center), camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
		}
	}

	this.setDragPointPos = function(index, p, localSpace, dragStartPoint, camera)
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

		if (camera != undefined)
		{
			var textPoint = p.copy();
			textPoint.x += ((p.x < this.center.x) ? +1 : -1) * camera.invScale(10);
			textPoint.y += camera.invScale(10);

			camera.drawText(textPoint, "R: " + this.radius.toFixed(1), "#000000", (p.x < this.center.x) ? "left" : "right", 0, "12px Arial");
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
		var appearanceControl = new PopoutContainer(undefined, "images/color_wheel.svg");
		{
			appearanceControl.addControl("", new AppearanceControl(this.appearance, true, true, function(){ this.onChange(); }.bind(this)) );
		}

		return	[
					{name: "Appearance", control:appearanceControl },
					{name: "Sides", control: new PopoutSlider(3, 60, this.sideCount, 1, function (value) { this.sideCount = value; this.onChange(); }.bind(this)) },
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

	this.setSelected = function(selected)
	{
		this.selected = selected;
	}

	this.isSelected = function()
	{
		return this.selected;
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
	this.appearance			= new Appearance();
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

		str += this.appearance.saveAsJavascript("dim");
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

	this.onChange = function(changeDetails)
	{
		// Backwards compatibility
		this.appearance.SetFromOldProperties(this);

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
			this.onChangeListeners[i](this, changeDetails);
		}
	}
	
	this.draw = function(camera)
	{
		if (this.A == undefined || this.B == undefined)
			return;

		if (this.center !== undefined)
		{
			var points = [this.A, this.center, this.B];

			camera.drawLineStrip(points, false, "#000000", this.appearance.GetLineWidth(this.selected));
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

			camera.drawLine(this.A, offsetA1, "#000000", this.appearance.GetLineWidth(this.selected));
			camera.drawLine(this.B, offsetB1, "#000000", this.appearance.GetLineWidth(this.selected));

			if (this.offsetX >= 0 && this.offsetX <= 1)
			{
				camera.drawArrow(avg(offsetA0, offsetB0), offsetA0, 20, "#000000", this.appearance.GetLineWidth(this.selected));
				camera.drawArrow(avg(offsetA0, offsetB0), offsetB0, 20, "#000000", this.appearance.GetLineWidth(this.selected));
			}
			else if (this.offsetX < 0)
			{
				camera.drawArrow(lerp(offsetA0, offsetB0, this.offsetX), offsetA0, 20, "#000000", this.appearance.GetLineWidth(this.selected));
				camera.drawLine(offsetA0, offsetB0, "#000000", this.appearance.GetLineWidth(this.selected));
				camera.drawArrow(mad(sub(offsetB0, offsetA0).unit(), camera.invScale(30), offsetB0), offsetB0, 20, "#000000", this.appearance.GetLineWidth(this.selected));

				textAlign = "left";
			}
			else if (this.offsetX > 1)
			{
				camera.drawArrow(lerp(offsetA0, offsetB0, this.offsetX), offsetB0, 20, "#000000", this.appearance.GetLineWidth(this.selected));
				camera.drawLine(offsetA0, offsetB0, "#000000", this.appearance.GetLineWidth(this.selected));
				camera.drawArrow(mad(sub(offsetA0, offsetB0).unit(), camera.invScale(30), offsetA0), offsetA0, 20, "#000000", this.appearance.GetLineWidth(this.selected));

				textAlign = "right";
			}


			camera.drawText(textAnchor, distance(this.A, this.B).toFixed(this.decimals), "#000000", textAlign, textAngle);
		}
	}
	
	this.hitTest = function(a, b, camera)
	{
		if (this.center !== undefined)
		{
			var points = [this.A, this.center, this.B];

			if (	overlapRectLine(a, b, this.A, this.center) ||
					overlapRectLine(a, b, this.center, this.B) )
				return true;
		}
		else
		{
			var tan = transpose(sub(this.B, this.A).unit());

			var offsetA0 = mad(tan, this.offset, this.A);
			var offsetB0 = mad(tan, this.offset, this.B);

			if (	overlapRectLine(a, b, offsetA0, offsetB0) ||
					overlapRectLine(a, b, offsetA0, this.A) ||
					overlapRectLine(a, b, offsetB0, this.B) )
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

	this.drawDragPoint = function(camera, index, position, localSpace, alpha)
	{
		if (alpha == undefined)
			alpha = 1;

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
				camera.drawRectangle(this.A, camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
			}
			else if (index == 1)
			{
				camera.drawRectangle(this.B, camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
			}
			else if (index == 2)
			{
				camera.drawRectangle(lerp(offsetA0, offsetB0, this.offsetX), camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
			}
		}
	}

	this.setDragPointPos = function(index, p, localSpace, dragStartPoint, camera)
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
		var appearanceControl = new PopoutContainer(undefined, "images/color_wheel.svg");
		{
			appearanceControl.addControl("", new AppearanceControl(this.appearance, true, false, function(){ this.onChange(); }.bind(this)) );
		}

		return	[
					{ name: "Appearance", control:appearanceControl },
					{ name: "Decimals", control: new PopoutSlider(0, 5, this.decimals, 1, function (value) { this.decimals = value; this.onChange(); }.bind(this)) },
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

	this.setSelected = function(selected)
	{
		this.selected = selected;
	}

	this.isSelected = function()
	{
		return this.selected;
	}

	this.onChange();
}

// ----------------------------------------------------------------------------------------------------------------
// BarChart
// ----------------------------------------------------------------------------------------------------------------
var lastBarChartAppearance = new Appearance("#900090", 1, 1, "#FFFFFF", 1);

function BarChart(A, B)
{
	this.scene				= null;
	this.selected			= false;
	this.A					= A;
	this.B					= B;
	this.values				= [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
	this.userValues			= [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined];
	this.valuesFunctionStr	= "return Math.sin(index)*10;";
	this.showMip			= 0;
	this.visible			= true;
	this.frozen				= false;
	this.appearance			= lastBarChartAppearance.copy();
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

		str += this.appearance.saveAsJavascript("bar");
		str += "bar.valuesFunctionStr = unescape(\"" + escape(this.valuesFunctionStr) + "\");\n";

		str += "bar.values = [";

		for (var i = 0; i != this.values.length; ++i)
			str += ((i > 0) ? ", " : "") + this.values[i];

		str += "];\n";

		str += "bar.userValues = [";

		for (var i = 0; i != this.values.length; ++i)
			str += ((i > 0) ? ", " : "") + this.userValues[i];

		str += "];\n";

		str += "bar.showMip = " + this.showMip + ";\n";

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

	this.onChange = function(changeDetails)
	{
		// Backwards compatibility
		this.appearance.SetFromOldProperties(this);

		lastBarChartAppearance = this.appearance.copy();

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
			this.onChangeListeners[i](this, changeDetails);
		}
	}
	
	this.draw = function(camera)
	{
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

				camera.drawLineStrip([min1, max1, max2, min2], true, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), [], "rgba(0,0,0,0.2)", this);
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

			camera.drawLineStrip(points, false, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), [], this.appearance.GetFillColor(), this);
		}
	}
	
	this.hitTest = function(a, b, camera)
	{
		if (overlapRectLine(a, b, this.A, this.B))
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

			if (overlapRectLine(a, b, p0, p1))
				return true;

			if (overlapRectLine(a, b, p1, p2))
				return true;

			if (overlapRectLine(a, b, p2, p3))
				return true;

			if (this.appearance.fillAlpha > 0)
			{
				if (overlapRectOBB(a,b, [p0,p1,p2,p3]))
				{
					return true;
				}
			}
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

	this.drawDragPoint = function(camera, index, position, localSpace, alpha)
	{
		if (alpha == undefined)
			alpha = 1;

		var unit = sub(this.B, this.A).unit();
		var tan = transpose(unit).neg();
		var delta = distance(this.A, this.B)/this.values.length;

		if (index == 0)
		{
			camera.drawRectangle(this.A, camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
		}
		else if (index == 1)
		{
			camera.drawRectangle(this.B, camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
		}
		else
		{
			var p = mad(tan, this.values[index-2], mad(unit, (index-2 + 0.5) * delta, this.A))
			var q;

			if (this.values[index-2]>=0)
				q = add(p, mul(tan, camera.invScale(30)));
			else
				q = add(p, mul(tan.neg(), camera.invScale(30)));

			//camera.drawRectangle(p, camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);

			camera.drawArrow(p, q, 8, "rgba(255,0,0," + alpha + ")", 3);
		}
	}

	this.setDragPointPos = function(index, p, localSpace, dragStartPoint, camera)
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
		//if (count == this.values.length)
		//	return;

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
		var appearanceControl = new PopoutContainer(undefined, "images/color_wheel.svg");
		{
			appearanceControl.addControl("", new AppearanceControl(this.appearance, true, true, function(){ this.onChange(); }.bind(this)) );
		}

		return	[
					{name: "Appearance", control:appearanceControl },
					{name: "Columns", control: new PopoutSlider(1, 20, this.values.length, 1, function (value) { this.setBarCount(value); }.bind(this)) },
					{name: "Show Mip", control: new PopoutSlider(0, 4, this.showMip, 1, function (value) { this.showMip = value; this.onChange(); }.bind(this)) },
					{name: "Values Function", control: new PopoutTextBox(this.valuesFunctionStr, "code", false, 0, function (value) { this.valuesFunctionStr = value; this.onChange(); }.bind(this)) }
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

	this.setSelected = function(selected)
	{
		this.selected = selected;
	}

	this.isSelected = function()
	{
		return this.selected;
	}

	this.onChange();
}

// ----------------------------------------------------------------------------------------------------------------
// Function Graph
// ----------------------------------------------------------------------------------------------------------------
var lastFunctionGraphAppearance = new Appearance("#4286f4", 1, 2, "#FF7F00", 0.5);

function FunctionGraph(origin)
{
	this.scene					= null;
	this.origin					= origin;
	this.xAxis					= new Vector(1,0);
	this.yAxis					= new Vector(0,1);
	this.coordinateType			= 0;
	this.xMin					= -5;
	this.xMax					= 5;
	this.yLimitMin				= -5;
	this.yLimitMax				= 5;
	this.evalStep				= 0.25;
	this.xLabel					= 0;
	this.showXAxis				= true;
	this.xLabelStep				= 1;
	this.xLabelDecimals			= 0;
	this.xGridlines				= false;
	this.yLabel					= 0;
	this.showYAxis				= true;
	this.yLabelStep				= 1;
	this.yLabelDecimals			= 0;
	this.yGridlines				= false;
	this.evaluateOnMouseCursor	= true;
	this.doConvolution			= false;
	this.doRayCasting			= true;
	this.graphOriginLocal		= new Vector(0,0);	// where is the graph (0,0) in local space coordinates relative the object origin
	this.graphOrigin;								// graph (0,0) expressed in world space coords
	this.selected				= false;
	this.visible				= true;
	this.frozen					= false;
	this.appearance				= lastFunctionGraphAppearance.copy();
	this.yFunction				= function() { return 1; };
	this.convolutionFunction	= function() { return 1; };
	this.graphFunction			= function() { return 1; };
	this.onChangeListeners		= [];
	this.boundsMin				= new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
	this.boundsMax				= new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);
	this.yFunctionValues		= undefined;
	this.convolutionFunctionValues	= undefined;

	this.functionStr			= 
		"// Type your function here, using valid JavaScript.\n"+
		"//\n" +
		"// Parameters:\n" +
		"// \tx: [Cartesian] The value on the X axis on which the function needs to be evaluated at.\n" +
		"// \tx: [Polar] The angle, in radians, which the function needs to be evaluated at.\n" +
		"//\n" +
		"// \thitDistance: [Cartesian] A ray is shot along the Y axis, starting at each evaluation position.\n" +
		"// \thitDistance: [Polar] A ray is shot for each evaluation direction.\n"+
		"//	\t			     If it hits something, hitDistance containts the distance to the hit.\n" +
		"//	\t			     If it doesn't hit anything, it's set to undefined.\n" +
		"//\n" +
		"// Expected Return:\n" +
		"// \tA single number (scalar float) that is the evalution of the function for the specified input.\n" +
		"\n" +
		"return Math.sin(x/3.14159*2)*5;";

	this.convolutionFunctionStr	= 
		"// Type your convolution function here, using valid JavaScript.\n"+
		"//\n" +
		"// Parameters:\n" +
		"// \tdx: [Cartesian] The distance along the X axis from the center value that the convolution function needs to be evaluated at." +
		"// \tdx: [Polar] The angle, in radians, from the center value that the convolution function needs to be evaluated at.\n" +
		"//\n" +
		"// Expected Return:\n" +
		"// \tA single number (scalar float) that is the evalution of the convolution function for the specified input.\n" +
		"\n" +
		"return 1-saturate(Math.abs(dx)/1);";

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
		var str = "var functionGraph = new FunctionGraph(";

		str += "new Vector(" + this.origin.x + ", " + this.origin.y + ")";
		str += ");\n";

		str += this.appearance.saveAsJavascript("functionGraph");
		str += "functionGraph.functionStr = unescape(\"" + escape(this.functionStr) + "\");\n";
		str += "functionGraph.convolutionFunctionStr = unescape(\"" + escape(this.convolutionFunctionStr) + "\");\n";
		str += "functionGraph.coordinateType = " + this.coordinateType + ";\n";
		str += "functionGraph.xAxis = new Vector(" + this.xAxis.x + ", " + this.xAxis.y + ");\n";
		str += "functionGraph.xMin = " + this.xMin + ";\n";
		str += "functionGraph.xMax = " + this.xMax + ";\n";
		str += "functionGraph.evalStep = " + this.evalStep + ";\n";
		str += "functionGraph.xLabel = " + this.xLabel + ";\n";
		str += "functionGraph.showXAxis = " + this.showXAxis + ";\n";
		str += "functionGraph.xLabelStep = " + this.xLabelStep + ";\n";
		str += "functionGraph.xLabelDecimals = " + this.xLabelDecimals + ";\n";
		str += "functionGraph.xGridlines = " + this.xGridlines + ";\n";
		str += "functionGraph.yLabel = " + this.yLabel + ";\n";
		str += "functionGraph.showYAxis = " + this.showYAxis + ";\n";
		str += "functionGraph.yLabelStep = " + this.yLabelStep + ";\n";
		str += "functionGraph.yLabelDecimals = " + this.yLabelDecimals + ";\n";
		str += "functionGraph.yGridlines = " + this.yGridlines + ";\n";
		str += "functionGraph.evaluateOnMouseCursor = " + this.evaluateOnMouseCursor + ";\n";
		str += "functionGraph.doConvolution = " + this.doConvolution + ";\n";
		str += "functionGraph.doRayCasting = " + this.doRayCasting + ";\n";
		str += "functionGraph.yLimitMin = " + this.yLimitMin + ";\n";
		str += "functionGraph.yLimitMax = " + this.yLimitMax + ";\n";
		str += "functionGraph.graphOriginLocal = new Vector(" + this.graphOriginLocal.x + ", " + this.graphOriginLocal.y + ");\n";
		str += "functionGraph.visible = " + this.visible + ";\n";
		str += "functionGraph.frozen = " + this.frozen + ";\n";

		str += "functionGraph.onChange();\n";
		str += "scene.addObject(functionGraph);\n";
		return str;
	}

	this.addChangeListener = function(listener)
	{
		this.onChangeListeners.push(listener);
	}

	this.precalculateValues = function()
	{
		if (this.scene == undefined)
		{
			this.yFunctionValues = undefined;
			this.convolutionFunctionValues = undefined;
			return;
		}

		var evalStep = Math.max(this.evalStep, 0.001);

		// Evaluate yFunction for all discrete steps and store the results
		this.yFunctionValues = new Array( Math.ceil( (this.xMax - this.xMin) / evalStep ) + 1);

		var index = 0;
		for (var x = this.xMin; x <= this.xMax; x += evalStep)
		{
			var hitDistance = undefined;

			if (this.coordinateType == 0)
			{
				var p = this.graphOrigin.copy();
				p = add(p, mul(this.xAxis, x));

				var bestHit = this.scene.rayHitTest(p, this.yAxis);

				if (bestHit.hit)
				{
					hitDistance = bestHit.tRay;
				}
			}
			else
			{
				var bestHit = this.scene.rayHitTest(this.graphOrigin, fromAngle(x));

				if (bestHit.hit)
				{
					hitDistance = bestHit.tRay;
				}
			}

			this.yFunctionValues[index] = this.yFunction(x, hitDistance);

			++index;
		}

		if (this.doConvolution)
		{
			// Evaluate convolution function for all discrete steps and store the results
			var dxMin = this.xMin-this.xMax;
			var dxMax = this.xMax-this.xMin;
			var count = Math.ceil((dxMax - dxMin) / evalStep) + 1;

			this.convolutionFunctionValues = new Array(count);

			var index = 0;
			for (var dx = this.xMin-this.xMax; dx <= this.xMax-this.xMin; dx += evalStep)
			{
				this.convolutionFunctionValues[index] = this.convolutionFunction(dx);
				++index;
			}
		}
	}

	this.onChange = function(changeDetails)
	{
		// Backwards compatibility
		this.appearance.SetFromOldProperties(this);

		try
		{
			this.yFunction = Function("x", "hitDistance", this.functionStr);
		}
		catch (e)
		{
			if (e instanceof SyntaxError) 
			{
				alert(e.message);
			}

			this.yFunction = function() { return 1; }
		}

		try
		{
			this.convolutionFunction = Function("dx", this.convolutionFunctionStr);
		}
		catch (e)
		{
			if (e instanceof SyntaxError) 
			{
				alert(e.message);
			}

			this.convolutionFunction = function() { return 1; }
		}

		this.graphFunction = function(x, useCache)
		{
			if (useCache == undefined)
				useCache = true;

			if (this.yFunctionValues.length == 0)
				useCache = false;

			var evalStep = Math.max(this.evalStep, 0.001);

			var result = 0;

			if (this.doConvolution)
			{
				var convolutionFunctionArea = 0;
				var evalStepLength = 0;

				var dxMin = this.xMin-this.xMax;
				var dxMax = this.xMax-this.xMin;

				// Run the convolution filter over the y values
				var index = 0;
				for (var xx = this.xMin; xx <= this.xMax; xx += evalStep)
				{
					var dx = xx - x;
				
					var weight = 0;

					if (useCache)
					{
						var convIndex = Math.ceil((dx - dxMin) / evalStep);
						weight = this.convolutionFunctionValues[convIndex] * evalStep;
					}
					else
					{
						weight = this.convolutionFunction(dx) * evalStep;
					}

					evalStepLength += evalStep;
					convolutionFunctionArea += weight;
					
					if (useCache)
					{
						result += this.yFunctionValues[index] * weight;
					}
					else
					{
						var hitDistance = undefined;

						if (!useCache)
						{
							if (this.coordinateType == 0)
							{
								var p = this.graphOrigin.copy();
								p = add(p, mul(this.xAxis, xx));

								var bestHit = this.scene.rayHitTest(p, this.yAxis);

								if (bestHit.hit)
								{
									hitDistance = bestHit.tRay;
								}
							}
							else
							{
								var bestHit = this.scene.rayHitTest(this.graphOrigin, fromAngle(xx));

								if (bestHit.hit)
								{
									hitDistance = bestHit.tRay;
								}
							}
						}

						result += this.yFunction(xx, hitDistance) * weight;
					}

					++index;
				}

				// Numerical integration normalization
				//result *= (this.xMax - this.xMin) / evalStepLength;
				
				if (convolutionFunctionArea>0)
				{
					// Normalized convolution factor (energy conservation)
					result *= 1 / convolutionFunctionArea; 
				}
			}
			else
			{
				var hitDistance = undefined;

				if (this.coordinateType == 0)
				{
					var p = this.graphOrigin.copy();
					p = add(p, mul(this.xAxis, x));

					var bestHit = this.scene.rayHitTest(p, this.yAxis);

					if (bestHit.hit)
					{
						hitDistance = bestHit.tRay;
					}
				}
				else
				{
					var bestHit = this.scene.rayHitTest(this.graphOrigin, fromAngle(x));

					if (bestHit.hit)
					{
						hitDistance = bestHit.tRay;
					}
				}

				result = this.yFunction(x, hitDistance);
			}

			return result;
		}

		this.precalculateValues();

		lastFunctionGraphAppearance = this.appearance.copy();

		this.yAxis = transpose(this.xAxis).neg();
		this.graphOrigin = add(this.origin, add( mul(this.xAxis, this.graphOriginLocal.x), mul(this.yAxis, this.graphOriginLocal.y) ));

		this.boundsMin = this.origin;
		this.boundsMax = this.origin;

		if (this.coordinateType == 0)
		{
			this.boundsMin = min(add(this.graphOrigin, add(mul(this.xAxis, this.xMin), mul(this.yAxis, this.yLimitMin)) ), this.boundsMin);
			this.boundsMax = max(add(this.graphOrigin, add(mul(this.xAxis, this.xMax), mul(this.yAxis, this.yLimitMax)) ), this.boundsMax);
		}
		else
		{
			this.boundsMin = min(sub(this.graphOrigin, add(mul(this.xAxis, this.yLimitMax), mul(this.yAxis, this.yLimitMax)) ), this.boundsMin);
			this.boundsMin = min(add(this.graphOrigin, add(mul(this.xAxis, this.yLimitMax), mul(this.yAxis, this.yLimitMax)) ), this.boundsMin);

			this.boundsMax = max(sub(this.graphOrigin, add(mul(this.xAxis, this.yLimitMax), mul(this.yAxis, this.yLimitMax)) ), this.boundsMax);
			this.boundsMax = max(add(this.graphOrigin, add(mul(this.xAxis, this.yLimitMax), mul(this.yAxis, this.yLimitMax)) ), this.boundsMax);
		}

		for (var i=0; i!=this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this, changeDetails);
		}
	}

	this.onChangeCoords = function()
	{
		if (this.coordinateType == 0)
		{
			this.xMin = -5;
			this.xMax = 5;
			this.graphOriginLocal.x = 0;
			this.graphOriginLocal.y = 0;
			this.yLimitMin = -5;
			this.yLimitMax = 5;
			this.evalStep = 0.25;
			this.xLabelStep = 1;
		}
		else
		{
			this.xMin = 0;
			this.xMax = Math.PI*2;
			this.graphOriginLocal.x = 0;
			this.graphOriginLocal.y = 0;
			this.yLimitMin = 0;
			//this.yLimitMax = 5;
			this.evalStep = 1 * Math.PI / 180;
			this.xLabelStep = 45 * Math.PI / 180;
		}

		this.onChange();
	}
	
	this.autoFit = function()
	{
		// work out function bounds
		var computed_yMin = Number.MAX_VALUE;
		var computed_yMax = -Number.MAX_VALUE;

		var evalStep = Math.max(this.evalStep, 0.001);

		for (var x = this.xMin; x <= this.xMax; x += evalStep)
		{
			y = this.graphFunction(x);

			computed_yMin = Math.min(computed_yMin, y);
			computed_yMax = Math.max(computed_yMax, y);
		}

		var yLabelStep = Math.max(0.01, this.yLabelStep);

		if (this.coordinateType == 0)
		{
			this.yLimitMin = Math.floor(computed_yMin / yLabelStep) * yLabelStep;
			this.yLimitMax = Math.ceil(computed_yMax / yLabelStep) * yLabelStep;
		}
		else
		{
			this.yLimitMax = Math.ceil(computed_yMax / yLabelStep) * yLabelStep;
		}
	}

	this.accumulationTimer = 0;
	this.onFrameTick = function(deltaTime_ms)
	{
		this.accumulationTimer += deltaTime_ms;

		if (this.accumulationTimer > 30)
		{
			this.accumulationTimer -= 30;
			return this.evaluateOnMouseCursor;
		}

		return false;
	}

	this.draw = function(camera, mousePos)
	{
		var evalStep = Math.max(this.evalStep, 0.001);
		var xLabelStep = Math.max(0.001, this.xLabelStep) * Math.ceil(camera.invScale(20) / Math.max(0.001, this.xLabelStep));
		var yLabelStep = Math.max(0.001, this.yLabelStep) * Math.ceil(camera.invScale(20) / Math.max(0.001, this.yLabelStep));

		if (this.coordinateType == 1)
		{
			var xLabelStep = Math.max(5, this.xLabelStep * 180/Math.PI) * Math.PI/180;
		}

		// Axes
		if (this.coordinateType == 0)
		{
			if (this.showXAxis)
			{
				camera.drawArrow(	add(this.origin, mul(this.xAxis, this.graphOriginLocal.x + this.xMin)), 
									add(this.origin, mul(this.xAxis, this.graphOriginLocal.x + this.xMax)), 
									15, "#000000", this.selected ? 2 : 1, [], this);
			}

			if (this.showYAxis)
			{
				camera.drawArrow(	add(this.origin, mul(this.yAxis, this.graphOriginLocal.y + this.yLimitMin)), 
									add(this.origin, mul(this.yAxis, this.graphOriginLocal.y + this.yLimitMax)), 
									15, "#000000", this.selected ? 2 : 1, [], this);
			}

			if (this.showXAxis && this.xGridlines)
			{
				var points = [];

				for (var y = this.graphOriginLocal.y; y >= this.yLimitMin; y -= yLabelStep)
				{
					var p0 = addv(this.origin, mul(this.xAxis, this.graphOriginLocal.x + this.xMin), mul(this.yAxis, this.graphOriginLocal.y + y));
					var p1 = addv(this.origin, mul(this.xAxis, this.graphOriginLocal.x + this.xMax), mul(this.yAxis, this.graphOriginLocal.y + y));

					points.push(p0);
					points.push(p1);
				}

				for (var y = this.graphOriginLocal.y; y <= this.yLimitMax; y += yLabelStep)
				{
					var p0 = addv(this.origin, mul(this.xAxis, this.graphOriginLocal.x + this.xMin), mul(this.yAxis, this.graphOriginLocal.y + y));
					var p1 = addv(this.origin, mul(this.xAxis, this.graphOriginLocal.x + this.xMax), mul(this.yAxis, this.graphOriginLocal.y + y));

					points.push(p0);
					points.push(p1);
				}

				camera.drawLines(points, "#000000", 1);
			}

			if (this.showYAxis && this.yGridlines)
			{
				var points = [];

				for (var x = this.graphOriginLocal.x; x >= this.xMin; x -= xLabelStep)
				{
					var p0 = addv(this.origin, mul(this.xAxis, this.graphOriginLocal.x + x), mul(this.yAxis, this.graphOriginLocal.y + this.yLimitMin));
					var p1 = addv(this.origin, mul(this.xAxis, this.graphOriginLocal.x + x), mul(this.yAxis, this.graphOriginLocal.y + this.yLimitMax));

					points.push(p0);
					points.push(p1);
				}

				for (var x = this.graphOriginLocal.x; x <= this.xMax; x += xLabelStep)
				{
					var p0 = addv(this.origin, mul(this.xAxis, this.graphOriginLocal.x + x), mul(this.yAxis, this.graphOriginLocal.y + this.yLimitMin));
					var p1 = addv(this.origin, mul(this.xAxis, this.graphOriginLocal.x + x), mul(this.yAxis, this.graphOriginLocal.y + this.yLimitMax));

					points.push(p0);
					points.push(p1);
				}

				camera.drawLines(points, "#000000", 1);
			}
		}
		else
		{
			if (this.showXAxis)
			{
				for (var a=0; a<Math.PI; a += xLabelStep)
				{
					var dir = mul( fromAngle(a), this.yLimitMax );

					camera.drawLine(	sub(this.origin, add( mul(this.xAxis, dir.x), mul(this.yAxis, dir.y) )),
										add(this.origin, add( mul(this.xAxis, dir.x), mul(this.yAxis, dir.y) )),
										"#000000", this.selected ? 2 : 1, [], this);
				}
			}

			if (this.showYAxis && this.yGridlines)
			{
				for (var y = yLabelStep; y <= this.yLimitMax; y += yLabelStep)
				{
					camera.drawArc(this.origin, y, 0, Math.PI*2, "#000000", 1);
				}
			}
		}

		// Axis labels
		{
			var points = [];

			// x axis
			if (this.coordinateType == 0 && this.xLabel != 2 && this.showXAxis)
			{
				var tan = mul(this.yAxis, camera.invScale(this.xLabel<1 ? -10 : 10));
				var textOffset = this.xLabel<1 ? 2.5 : 1.5;

				for (var x = -this.graphOriginLocal.x; x >= this.xMin; x -= xLabelStep)
				{
					var p0 = addv(this.origin, mul(this.xAxis, this.graphOriginLocal.x + x), mul(this.yAxis, 0));
					var p1 = addv(this.origin, mul(this.xAxis, this.graphOriginLocal.x + x), mul(this.yAxis, (this.xLabel==0 ? -1 : 1) * camera.invScale(10)));

					points.push(p0);
					points.push(p1);

					var textPoint = mad(tan, textOffset, p0);
					var value = x.toFixed(this.xLabelDecimals);
					camera.drawText(textPoint, value, "#000000", "center", 0);
				}

				for (var x = -this.graphOriginLocal.x; x <= this.xMax; x += xLabelStep)
				{
					var p0 = addv(this.origin, mul(this.xAxis, this.graphOriginLocal.x + x), mul(this.yAxis, 0));
					var p1 = addv(this.origin, mul(this.xAxis, this.graphOriginLocal.x + x), mul(this.yAxis, (this.xLabel==0 ? -1 : 1) * camera.invScale(10)));

					points.push(p0);
					points.push(p1);

					var textPoint = mad(tan, textOffset, p0);
					var value = x.toFixed(this.xLabelDecimals);
					camera.drawText(textPoint, value, "#000000", "center", 0);
				}
			}

			// y axis
			if (this.yLabel != 2 && this.showYAxis)
			{
				var tan = mul(this.xAxis, camera.invScale(this.yLabel<1 ? -10 : 10));
				var textOffset = this.yLabel<1 ? 2.5 : 1.5;

				for (var y = -this.graphOriginLocal.y; y >= this.yLimitMin; y -= yLabelStep)
				{
					var p0 = addv(this.origin, mul(this.xAxis, 0), mul(this.yAxis, this.graphOriginLocal.y + y));
					var p1 = addv(this.origin, mul(this.xAxis, (this.yLabel==0 ? -1 : 1) * camera.invScale(10)), mul(this.yAxis, this.graphOriginLocal.y + y));

					points.push(p0);
					points.push(p1);

					var textPoint = mad(tan, textOffset, p0);
					var value = y.toFixed(this.yLabelDecimals);
					camera.drawText(textPoint, value, "#000000", "center", 0);
				}

				for (var y = -this.graphOriginLocal.y; y <= this.yLimitMax; y += yLabelStep)
				{
					var p0 = addv(this.origin, mul(this.xAxis, 0), mul(this.yAxis, this.graphOriginLocal.y + y));
					var p1 = addv(this.origin, mul(this.xAxis, (this.yLabel==0 ? -1 : 1) * camera.invScale(10)), mul(this.yAxis, this.graphOriginLocal.y + y));

					points.push(p0);
					points.push(p1);

					var textPoint = mad(tan, textOffset, p0);
					var value = y.toFixed(this.yLabelDecimals);
					camera.drawText(textPoint, value, "#000000", "center", 0);
				}
			}

			camera.drawLines(points, "#000000", 1);
		}

		// Graph
		{
			// Note: We calculate the outline and the fill separately.
			//		 This is necessary when there is y clipping. We want the fill to
			//		 be clipped and show a straight line across the clip, but we don't
			//		 want the outline to show a straight line (because that would mean
			//		 the function is a straight line there).
			//
			//		 If no clipping occurs we can use the same calculation for both.

			var valuesClipped = false;

			if (this.appearance.NeedOutline() || this.appearance.fillAlpha>0)
			{
				var points = [];
				var previousX = 0;
				var previousY = 0;
				var previousOutside = false;

				for (var x = this.xMin; x <= this.xMax; x += evalStep)
				{
					var x = Math.min(this.xMax, x);
					var y = this.graphFunction(x);

					// Check if we need to do any clipping
					var outside = y>this.yLimitMax || y<this.yLimitMin;

					valuesClipped |= outside;

					if (outside && previousOutside)
					{
						if (this.coordinateType == 1 && y>this.yLimitMax)
						{
							var radial = mul(fromAngle(x), this.yLimitMax);
							var xCartesian = radial.x;
							var yCartesian = radial.y;

							var p = this.graphOrigin.copy();
							p = add(p, mul(this.xAxis, xCartesian));
							p = add(p, mul(this.yAxis, yCartesian));
							points.push(p);
						}

						previousOutside = true;
						previousX = x;
						previousY = y;
					}
					else if (outside && !previousOutside)
					{
						var yClipped = clamp(y, this.yLimitMin, this.yLimitMax);
						var xClipped = x;

						if (points.length>0)
						{
							var t = abs(yClipped-previousY) / abs(y-previousY);
							var xClipped = lerp(previousX, x, t);
						}


						var xCartesian = xClipped;
						var yCartesian = yClipped;

						if (this.coordinateType == 1)
						{
							var radial = mul(fromAngle(xClipped), yClipped);
							xCartesian = radial.x;
							yCartesian = radial.y;
						}

						var p = this.graphOrigin.copy();
						p = add(p, mul(this.xAxis, xCartesian));
						p = add(p, mul(this.yAxis, yCartesian));

						points.push(p);

						previousOutside = true;
						previousX = x;
						previousY = y;
					}
					else if (!outside && previousOutside)
					{
						var yClipped = clamp(previousY, this.yLimitMin, this.yLimitMax);
						var t = abs(yClipped-previousY) / abs(y-previousY);
						var xClipped = lerp(previousX, x, t);

						var xCartesian = xClipped;
						var yCartesian = yClipped;

						if (this.coordinateType == 1)
						{
							var radial = mul(fromAngle(xClipped), yClipped);
							xCartesian = radial.x;
							yCartesian = radial.y;
						}

						var p = this.graphOrigin.copy();
						p = add(p, mul(this.xAxis, xCartesian));
						p = add(p, mul(this.yAxis, yCartesian));
						points.push(p);

						var xCartesian = x;
						var yCartesian = y;

						if (this.coordinateType == 1)
						{
							var radial = mul(fromAngle(x), y);
							xCartesian = radial.x;
							yCartesian = radial.y;
						}

						var p = this.graphOrigin.copy();
						p = add(p, mul(this.xAxis, xCartesian));
						p = add(p, mul(this.yAxis, yCartesian));
						points.push(p);

						previousOutside = false;
						previousX = x;
						previousY = y;
					}
					else if (!outside && !previousOutside)
					{
						var xCartesian = x;
						var yCartesian = y;

						if (this.coordinateType == 1)
						{
							var radial = mul(fromAngle(x), y);
							xCartesian = radial.x;
							yCartesian = radial.y;
						}

						var p = this.graphOrigin.copy();
						p = add(p, mul(this.xAxis, xCartesian));
						p = add(p, mul(this.yAxis, yCartesian));
						points.push(p);

						previousOutside = false;
						previousX = x;
						previousY = y;
					}

					// Vertical line to close the shape
					if (this.coordinateType == 0 && points.length == 1)
					{
						var o = this.graphOrigin.copy();
						o = add(o, mul(this.xAxis, previousX));
						o = add(o, mul(this.yAxis, clamp(0, this.yLimitMin, this.yLimitMax)));
						points.splice(0, 0, o);
					}
				}

				// Vertical line to close the shape
				if (this.coordinateType == 0 && points.length > 0)
				{
					if (previousOutside)
					{
						var yClipped = clamp(previousY, this.yLimitMin, this.yLimitMax);

						var p = this.graphOrigin.copy();
						p = add(p, mul(this.xAxis, previousX));
						p = add(p, mul(this.yAxis, yClipped));
						points.push(p);
					}

					var o = this.graphOrigin.copy();
					o = add(o, mul(this.xAxis, previousX));
					o = add(o, mul(this.yAxis, clamp(0, this.yLimitMin, this.yLimitMax)));
					points.push(o);
				}

				if (valuesClipped)
				{
					// Draw fill only
					camera.drawLineStrip(points, false, undefined, 0, [], this.appearance.GetFillColor());
				}
				else if (this.coordinateType == 0)
				{
					// Draw fill
					camera.drawLineStrip(points, false, undefined, 0, [], this.appearance.GetFillColor());

					// Draw outline excluding the first & last points (which are there to form vertical lines for the fill shape)
					camera.drawLineStrip(points.slice(1, points.length-1), false, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), this.appearance.GetLineDash(), undefined, this);
				}
				else if (this.coordinateType == 1)
				{
					// Draw fill & outline
					camera.drawLineStrip(points, false, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), this.appearance.GetLineDash(), this.appearance.GetFillColor(), this);
				}
			}

			// Draw outline as line list (list rather than strip so that it can be discontinuous)
			if (this.appearance.NeedOutline() && valuesClipped)
			{
				var points = [];

				for (var x = this.xMin; x < this.xMax; x += evalStep)
				{
					var x0 = x;
					var x1 = Math.min(this.xMax, x + evalStep);

					var y0 = this.graphFunction(x0);
					var y1 = this.graphFunction(x1);

					// Check if we need to do any clipping
					var outside0 = y0>this.yLimitMax || y0<this.yLimitMin;
					var outside1 = y1>this.yLimitMax || y1<this.yLimitMin;

					if (outside0 && outside1)
					{
						continue;
					}

					var xCartesian0 = x0;
					var yCartesian0 = y0;
					var xCartesian1 = x1;
					var yCartesian1 = y1;

					if (this.coordinateType == 1)
					{
						var radial = mul(fromAngle(x0), y0);
						xCartesian0 = radial.x;
						yCartesian0 = radial.y;

						var radial = mul(fromAngle(x1), y1);
						xCartesian1 = radial.x;
						yCartesian1 = radial.y;
					}

					var p0 = this.graphOrigin.copy();
					p0 = add(p0, mul(this.xAxis, xCartesian0));
					p0 = add(p0, mul(this.yAxis, yCartesian0));

					var p1 = this.graphOrigin.copy();
					p1 = add(p1, mul(this.xAxis, xCartesian1));
					p1 = add(p1, mul(this.yAxis, yCartesian1));

					if (outside0)
					{
						var yc = clamp(y0, this.yLimitMin, this.yLimitMax);
						var t = abs(yc-y0) / abs(y1-y0);
						p0 = lerp(p0, p1, t);
					}
					else if (outside1)
					{
						var yc = clamp(y1, this.yLimitMin, this.yLimitMax);
						var t = abs(yc-y0) / abs(y1-y0);
						p1 = lerp(p0, p1, t);
					}

					points.push(p0);
					points.push(p1);
				}

				camera.drawLines(points, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), this.appearance.GetLineDash(), undefined, this);
			}
		}

		if (this.evaluateOnMouseCursor)
		{
			if (this.coordinateType == 0)
			{
				var mouseX = dot(sub(mousePos, this.origin), this.xAxis) - this.graphOriginLocal.x;
				var mouseY = this.graphFunction(mouseX, false);
				var mouseYclamp = clamp(mouseY, this.yLimitMin, this.yLimitMax);

				if (mouseX >= this.xMin && mouseX <= this.xMax)
				{
					var pX = this.graphOrigin.copy();
					pX = add(pX, mul(this.xAxis, mouseX));
					pX = add(pX, mul(this.yAxis, -this.graphOriginLocal.y));

					var pY = this.graphOrigin.copy();
					pY = add(pY, mul(this.yAxis, mouseYclamp));
					pY = add(pY, mul(this.xAxis, -this.graphOriginLocal.x));

					var p = this.graphOrigin.copy();
					p = add(p, mul(this.xAxis, mouseX));
					p = add(p, mul(this.yAxis, mouseYclamp));

					camera.drawLine(pX, p, "#000000", 1, [5,5]);

					if (mouseY == mouseYclamp)
					{
						camera.drawLine(pY, p, "#000000", 1, [5,5]);
						camera.drawArc(p, camera.invScale(5), 0, Math.PI*2, "#008000", 4);
					}

					var p = p.copy();
					p.x += ((mouseX>0) ? +1 : -1) * camera.invScale(10);
					p.y += camera.invScale(10);

					camera.drawText(p, "x: " + mouseX.toFixed(this.xLabelDecimals+2) + ", y: " + mouseY.toFixed(this.yLabelDecimals+2), "#000000", mouseX>0 ? "left" : "right", 0, "12px Arial");
				}
			}
			else
			{
				var mouseX = toAngle(sub(mousePos, this.graphOrigin)) - toAngle(this.xAxis);

				if (mouseX<0)
					mouseX += Math.PI*2;

				var mouseY = this.graphFunction(mouseX, false);
				var mouseYclamp = clamp(mouseY, this.yLimitMin, this.yLimitMax);

				if (mouseY>0)
				{
					var radial = mul(fromAngle(mouseX), mouseYclamp);

					var p = this.graphOrigin.copy();
					p = add(p, mul(this.xAxis, radial.x));
					p = add(p, mul(this.yAxis, radial.y));

					if (mouseY == mouseYclamp)
					{
						//camera.drawArc(this.origin, Math.min(mouseY, camera.invScale(50)), 0, mouseX, "#000000", 1, undefined, [5,5]);
						camera.drawArc(p, camera.invScale(5), 0, Math.PI*2, "#008000", 4);
						camera.drawArrow(this.origin, p, 8, "#000000", 1, [5,5]);
					}
					else
					{
						camera.drawLine(this.origin, p, "#000000", 1, [5,5]);
					}

					var right = (mouseX <= Math.PI/2) || (mouseX >= Math.PI*3/2);
					var bottom = (mouseX >= Math.PI);

					p = add(p, mul(camera.invScale(10), sub(mousePos, this.graphOrigin).unit()));
					p.y -= bottom ? camera.invScale(15) : 0;

					camera.drawText(p, "θ: " + (mouseX * 180 / Math.PI).toFixed(1) + "°, y: " + mouseY.toFixed(this.yLabelDecimals+2), "#000000", right ? "left" : "right", 0, "12px Arial");
				}
			}
		}
	}
	
	this.hitTest = function(a, b, camera)
	{
		return camera.hitTest(a,b,this);
	}

	this.getSnapPoints = function ()
	{
		var points = [];

		points.push( { type: "node", p: this.origin} );

		return points;
	}

	this.getDragPoints = function(localSpace, camera)
	{
		if (this.isFrozen())
			return [];

		var points = [this.origin];

		if (this.coordinateType == 0)
		{
			points.push(add(this.origin, mul(this.xAxis, this.graphOriginLocal.x + this.xMin - 0.01)));
			points.push(add(this.origin, mul(this.xAxis, this.graphOriginLocal.x + this.xMax + 0.01)));
			points.push(add(this.origin, mul(this.yAxis, this.graphOriginLocal.y + this.yLimitMin - 0.01)));
			points.push(add(this.origin, mul(this.yAxis, this.graphOriginLocal.y + this.yLimitMax + 0.01)));

			if (!localSpace)
			{
				points.push(add(this.origin, add( mul(this.xAxis, this.graphOriginLocal.x + this.xMin), mul(this.yAxis, this.graphOriginLocal.y + this.yLimitMin))  ));
				points.push(add(this.origin, add( mul(this.xAxis, this.graphOriginLocal.x + this.xMin), mul(this.yAxis, this.graphOriginLocal.y + this.yLimitMax))  ));
				points.push(add(this.origin, add( mul(this.xAxis, this.graphOriginLocal.x + this.xMax), mul(this.yAxis, this.graphOriginLocal.y + this.yLimitMax))  ));
				points.push(add(this.origin, add( mul(this.xAxis, this.graphOriginLocal.x + this.xMax), mul(this.yAxis, this.graphOriginLocal.y + this.yLimitMin))  ));
			}
		}
		else
		{
			points.push(add(this.origin, mul(this.xAxis, this.graphOriginLocal.x - this.yLimitMax)));
			points.push(add(this.origin, mul(this.xAxis, this.graphOriginLocal.x + this.yLimitMax)));
			points.push(add(this.origin, mul(this.yAxis, this.graphOriginLocal.y - this.yLimitMax)));
			points.push(add(this.origin, mul(this.yAxis, this.graphOriginLocal.y + this.yLimitMax)));
		}

		return points;
	}

	this.drawDragPoint = function(camera, index, position, localSpace, alpha)
	{
		if (alpha == undefined)
			alpha = 1;

		if (index == 1 || index == 2 || index == 3 || index == 4)
		{
			var axis = this.xAxis;

			if (index==1)
				axis = this.xAxis.neg();
			else if (index==2)
				axis = this.xAxis;
			else if (index==3)
				axis = this.yAxis.neg();
			else if (index==4)
				axis = this.yAxis;

			if (localSpace)
			{
				camera.drawRectangle(position, camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
			}
			else
			{
				camera.drawArrow(position, add(position, mul(axis, camera.invScale(30))), 8, "rgba(255,0,0," + alpha + ")", 3);
			}
		}
		else
		{
			camera.drawRectangle(position, camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
		}
	}

	this.setDragPointPos = function(index, p, localSpace, dragStartPoint, camera)
	{
		if (index == 0)
		{
			if (!localSpace || this.coordinateType == 1)
			{
				this.origin = p;
			}
			else
			{
				p = clamp(p, this.boundsMin, this.boundsMax);

				var delta = sub(p, this.origin);

				var deltaX = dot(delta, this.xAxis);
				var deltaY = dot(delta, this.yAxis);

				this.graphOriginLocal.x -= deltaX;
				this.graphOriginLocal.y -= deltaY;

				this.origin = p;
			}
		}
		
		if (this.coordinateType == 0)
		{
			if (index == 1 || index == 5 || index == 6)
			{
				var limit = Math.min(-this.graphOriginLocal.x, this.xMax - (this.xMax - this.xMin) / 10);

				this.xMin = dot(sub(p, this.origin), this.xAxis) - this.graphOriginLocal.x;
				//this.xMin = dot(sub(p, this.graphOrigin), this.xAxis);
				this.xMin = Math.min(this.xMin, limit);
			}
		
			if (index == 2 || index == 7 || index == 8)
			{
				var limit = Math.max(-this.graphOriginLocal.x, this.xMin + (this.xMax - this.xMin) / 10);

				this.xMax = dot(sub(p, this.origin), this.xAxis) - this.graphOriginLocal.x;
				//this.xMax = dot(sub(p, this.graphOrigin), this.xAxis);
				this.xMax = Math.max(this.xMax, limit);
			}
		
			if (index == 3 || index == 5 || index == 8)
			{
				var limit = Math.min(-this.graphOriginLocal.y, this.yLimitMax - (this.yLimitMax - this.yLimitMin) / 10);

				this.yLimitMin = dot(sub(p, this.graphOrigin), this.yAxis);
				this.yLimitMin = Math.min(this.yLimitMin, limit);
			}
		
			if (index == 4 || index == 6 || index == 7)
			{
				var limit = Math.max(-this.graphOriginLocal.y, this.yLimitMin + (this.yLimitMax - this.yLimitMin) / 10);

				this.yLimitMax = dot(sub(p, this.graphOrigin), this.yAxis);
				this.yLimitMax = Math.max(this.yLimitMax, limit);
			}
		}
		else
		{
			var limit = 0.01;

			this.yLimitMax = sub(p, this.graphOrigin).length();
			this.yLimitMax = Math.max(this.yLimitMax, limit);
		}

		this.onChange();
	}

	this.getOrigin = function()
	{
		return this.origin;
	}
	
	this.setOrigin = function(p)
	{
		this.origin = p;

		this.onChange();
	}

	this.getProperties = function()
	{
		var xAxis = new PopoutContainer(undefined, "images/distribute_horizontal.svg");
		{
			if (this.coordinateType == 0) 
			{
				xAxis.addControl("Eval Step", new Slider(0, 5, this.evalStep, 0.1, function (value) { this.evalStep = value; this.onChange(); }.bind(this)) );
			}
			else
			{
				xAxis.addControl("Eval Step", new Slider(0, 5, this.evalStep * 180 / Math.PI, 0.1, function (value) { this.evalStep = value * Math.PI/180; this.onChange(); }.bind(this)) );
			}

			xAxis.addControl("Show Axis", new TickBox(this.showXAxis, function (value) { this.showXAxis = value; this.onChange(); }.bind(this)) );

			if (this.coordinateType == 0) 
			{
				xAxis.addControl("Label", new Dropdown(["Below", "Above", "None"], this.xLabel, function (value) { this.xLabel = value; this.onChange(); }.bind(this)) );
			}

			if (this.coordinateType == 0)
			{
				xAxis.addControl("Label Step", new Slider(0.1, 5, this.xLabelStep, 0.1, function (value) { this.xLabelStep = value; this.onChange(); }.bind(this)) );
			}
			else
			{
				xAxis.addControl("Label Step", new Slider(5, 90, this.xLabelStep* 180/Math.PI, 5, function (value) { this.xLabelStep = value * Math.PI/180; this.onChange(); }.bind(this)) );
			}
			
			if (this.coordinateType == 0)
			{
				xAxis.addControl("Label Decimals", new Slider(0, 5, this.xLabelDecimals, 1, function (value) { this.xLabelDecimals = value; this.onChange(); }.bind(this)) );
			}

			xAxis.addControl("Grid Lines", new TickBox(this.xGridlines, function (value) { this.xGridlines = value; this.onChange(); }.bind(this)) );
		}

		var yAxis = new PopoutContainer(undefined, "images/distribute_horizontal.svg");
		{
			yAxis.addControl("Y Limits", new PlainButton("Auto Fit", function() { this.autoFit(); this.onChange(); }.bind(this)) );
			yAxis.addControl("Show Axis", new TickBox(this.showYAxis, function (value) { this.showYAxis = value; this.onChange(); }.bind(this)) );
			yAxis.addControl("Label", new Dropdown(["Left", "Right", "None"], this.yLabel, function (value) { this.yLabel = value; this.onChange(); }.bind(this)) );
			yAxis.addControl("Label Step", new Slider(0.1, 5, this.yLabelStep, 0.1, function (value) { this.yLabelStep = value; this.onChange(); }.bind(this)) );
			yAxis.addControl("Label Decimals", new Slider(0, 5, this.yLabelDecimals, 1, function (value) { this.yLabelDecimals = value; this.onChange(); }.bind(this)) );
			yAxis.addControl("Grid Lines", new TickBox(this.yGridlines, function (value) { this.yGridlines = value; this.onChange(); }.bind(this)) );
		}

		var appearanceControl = new PopoutContainer(undefined, "images/color_wheel.svg");
		{
			appearanceControl.addControl("", new AppearanceControl(this.appearance, true, true, function(){ this.onChange(); }.bind(this)) );
		}

		return	[
					{name: "Appearance", control:appearanceControl },
					{name: "Function", control: new PopoutTextBox(this.functionStr, "code", false, 0, function (value) { this.functionStr = value; this.onChange(); }.bind(this)) },
					this.doConvolution ? {name: "Convolution Function", control: new PopoutTextBox(this.convolutionFunctionStr, "code", false, 0, function (value) { this.convolutionFunctionStr = value; this.onChange(); }.bind(this)) } : undefined,
					{name: "Coordinates", control: new Dropdown(["Cartesian", "Polar"], this.coordinateType, function (value) { this.coordinateType = value; this.onChangeCoords(); }.bind(this)) },
					{name: "X Axis", control: xAxis},
					{name: "Y Axis", control: yAxis},
					{name: "Show Mouse", control: new TickBox(this.evaluateOnMouseCursor, function (value) { this.evaluateOnMouseCursor = value; this.onChange(); }.bind(this)) },
					{name: "Convolution", control: new TickBox(this.doConvolution, function (value) { this.doConvolution = value; this.onChange({refreshProperties:true}); }.bind(this)) },
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

	this.setSelected = function(selected)
	{
		this.selected = selected;
	}

	this.isSelected = function()
	{
		return this.selected;
	}

	this.onChange();
}

// ----------------------------------------------------------------------------------------------------------------
// BouncingBall
// ----------------------------------------------------------------------------------------------------------------
function BouncingBall(position)
{
	this.scene					= null;
	this.position				= position;
	this.radius					= 0.5;
	this.density				= 1;
	this.mass					= 1;
	this.bounceFactor			= 0.8;
	this.wrapAround				= true;
	this.applyGravity			= true;
	this.currentPosition		= position;
	this.currentVelocity		= new Vector(0,0);
	this.currentAcceleration	= new Vector(0,0);
	this.currentForce			= new Vector(0,0);
	this.impactPoint			= undefined;
	this.showImpactPoint		= false;
	this.externalDragActive		= false;
	this.externalDragVelocity	= new Vector(0,0);
	this.externalDragLastPos	= new Vector(0,0);
	this.externalDragLastTime	= 0;
	this.externalDragTimer		= undefined;
	this.selected				= false;
	this.visible				= true;
	this.frozen					= false;
	this.appearance				= new Appearance("#000000", 1, 2, "#FF0000", 0.5);
	this.onChangeListeners		= [];
	this.boundsMin				= new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
	this.boundsMax				= new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

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
		var str = "var bouncingBall = new BouncingBall(";

		str += "new Vector(" + this.position.x + ", " + this.position.y + ")";
		str += ");\n";

		str += "bouncingBall.radius = " + this.radius + ";\n";
		str += "bouncingBall.density = " + this.density + ";\n";
		str += "bouncingBall.bounceFactor = " + this.bounceFactor + ";\n";
		str += "bouncingBall.wrapAround = " + this.wrapAround + ";\n";
		str += "bouncingBall.applyGravity = " + this.applyGravity + ";\n";
		str += "bouncingBall.showImpactPoint = " + this.showImpactPoint + ";\n";
		str += this.appearance.saveAsJavascript("bouncingBall");
		str += "bouncingBall.visible = " + this.visible + ";\n";
		str += "bouncingBall.frozen = " + this.frozen + ";\n";

		str += "scene.addObject(bouncingBall);\n";
		return str;
	}

	this.addChangeListener = function(listener)
	{
		this.onChangeListeners.push(listener);
	}

	this.updateBounds = function()
	{
		this.boundsMin = new Vector(this.currentPosition.x - this.radius, this.currentPosition.y - this.radius);
		this.boundsMax = new Vector(this.currentPosition.x + this.radius, this.currentPosition.y + this.radius);
	}

	this.onChange = function(changeDetails)
	{
		// Backwards compatibility
		this.appearance.SetFromOldProperties(this);

		this.updateBounds();

		for (var i = 0; i != this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this, changeDetails);
		}

		this.mass = this.density * 4.0 / 3.0 * Math.PI * Math.pow(this.radius, 3);
	}

	this.onFrameTick = function(deltaTime_ms)
	{
		if (this.externalDragActive)
			return false;

		this.currentAcceleration = div(this.currentForce, this.mass);

		if (this.applyGravity)
		{
			this.currentAcceleration.y += -9.81;
		}
		this.currentVelocity = add(this.currentVelocity, mul(this.currentAcceleration, deltaTime_ms / 1000));

		this.currentVelocity = clamp(this.currentVelocity, -100, 100);

		if (this.currentVelocity.lengthSqr()>0)
		{
			var positionDelta = mul(this.currentVelocity, deltaTime_ms / 1000);

			// Collision check
			this.impactPoint = this.scene.rayHitTest(this.currentPosition, this.currentVelocity.unit(), this.radius);

			var impactFraction = saturate(this.impactPoint.tRay / length(positionDelta));

			// Are we going to hit something before the movement is done?
			if (this.impactPoint.hit && impactFraction<1)
			{
				this.currentPosition = add(this.currentPosition, mul(this.currentVelocity.unit(), this.impactPoint.tRay));
				this.currentVelocity = mul(reflect(this.currentVelocity, this.impactPoint.N), this.bounceFactor);

				// move the remainder of the delta with the new velocity (otherwise the ball 'sticks' on inclines due to penetration)
				positionDelta = mul(this.currentVelocity, (1-impactFraction) * deltaTime_ms / 1000);
			}

			this.currentPosition = add(this.currentPosition, positionDelta);

			//this.onChange();
			this.updateBounds();

			return true;
		}

		return false;
	}

	this.rayHitTest = function(rayPos, rayDir, rayRadius)
	{
		var results = [{N:rayDir, P:rayPos, hit:false, tRay:0}];

		// TODO

		return results;
	}

	this.draw = function(camera)
	{
		if (this.wrapAround)
		{
			var changed = false;

			if (this.currentPosition.x < (camera.getViewPosition().x - camera.getViewSize().x/2))
			{
				this.currentPosition.x = (camera.getViewPosition().x + camera.getViewSize().x/2)
				changed = true;
			}
			else if (this.currentPosition.x > (camera.getViewPosition().x + camera.getViewSize().x/2))
			{
				this.currentPosition.x = (camera.getViewPosition().x - camera.getViewSize().x/2)
				changed = true;
			}

			if (this.currentPosition.y < (camera.getViewPosition().y - camera.getViewSize().y/2))
			{
				this.currentPosition.y = (camera.getViewPosition().y + camera.getViewSize().y/2)
				changed = true;
			}
			else if (this.currentPosition.y > (camera.getViewPosition().y + camera.getViewSize().y/2))
			{
				this.currentPosition.y = (camera.getViewPosition().y - camera.getViewSize().y/2)
				changed = true;
			}

			if (changed)
			{
				this.onChange();
			}
		}

		camera.drawArc(this.currentPosition, this.radius, 0, 2*Math.PI, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), this.appearance.GetFillColor(), this.appearance.GetLineDash());

		if (this.showImpactPoint && this.impactPoint != undefined && this.impactPoint.hit)
		{
			camera.drawArrow(this.currentPosition, this.impactPoint.P, 8, "#FF0000", 2);
		}
	}	

	this.dragStart = function(p)
	{
		this.externalDragActive		= true;
		this.externalDragVelocity	= new Vector(0,0);
		this.externalDragLastPos	= new Vector(0,0);
		this.externalDragLastTime	= 0;
		this.externalDragTimer		= setInterval( function() { this.updateDragVelocity(); }.bind(this), 16);
	}

	this.dragStop = function()
	{
		clearInterval(this.externalDragTimer);
		this.externalDragTimer = undefined;

		this.currentVelocity = this.externalDragVelocity;

		this.externalDragActive		= false;
		this.externalDragVelocity	= new Vector(0,0);
		this.externalDragLastPos	= new Vector(0,0);
		this.externalDragLastTime	= 0;
	}

	this.updateDragVelocity = function()
	{
		if (this.externalDragActive)
		{
			if (this.externalDragLastTime == 0)
			{
				this.externalDragLastTime = performance.now();
				this.externalDragLastPos = this.currentPosition;
			}
			else
			{
				var currentTime = performance.now();
				var deltaTime = currentTime - this.externalDragLastTime;

				var deltaPos = sub(this.currentPosition, this.externalDragLastPos);

				var decay = 0.1;
				this.externalDragVelocity = lerp(mul(this.externalDragVelocity, decay), div( deltaPos, deltaTime / 1000), 1-decay);

				this.externalDragLastPos = this.currentPosition;
				this.externalDragLastTime = currentTime;
			}
		}
	}

	this.hitTest = function(a, b, camera)
	{
		var p = clamp(this.currentPosition, a, b);

		var d = distance(p, this.currentPosition);

		return (d <= this.radius);
	}

	this.getSnapPoints = function()
	{
		return [{ type: "node", p: this.currentPosition}];
	}

	this.getDragPoints = function(localSpace, camera)
	{
		if (this.isFrozen())
			return [];

		var points = [this.currentPosition];

		return points;
	}

	this.drawDragPoint = function(camera, index, position, localSpace, alpha)
	{
		if (alpha == undefined)
			alpha = 1;

		if (index==0)
		{
			camera.drawRectangle(this.currentPosition, camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
		}
	}

	this.setDragPointPos = function(index, p, localSpace, dragStartPoint, camera)
	{
		if (index==0)
		{
			//this.setOrigin(p);
		}

		if (this.externalDragTimer != undefined)
		{
			clearInterval(this.externalDragTimer);
			this.externalDragTimer = undefined;
		}

		if (camera != undefined)
		{
			var L = sub(p, dragStartPoint);
			var Lmag = L.length();

			var w = lerp(0, 10, saturate(Lmag/15));

			this.externalDragVelocity = mul(L.unit(), lerp(0, 150, saturate(Lmag/15)));

			camera.drawArrow(dragStartPoint, lerp(dragStartPoint, p, saturate(15/Lmag)), 8, "#FF0000", w);
		}

		this.onChange();
	}

	this.getOrigin = function()
	{
		return this.currentPosition;
	}
	
	this.setOrigin = function(p)
	{
		this.position = p;
		this.currentPosition = p;

		this.onChange();
	}

	this.getProperties = function()
	{
		var appearanceControl = new PopoutContainer(undefined, "images/color_wheel.svg");
		{
			appearanceControl.addControl("", new AppearanceControl(this.appearance, true, true, function(){ this.onChange(); }.bind(this)) );
		}

		return	[
					{ name: "Appearance", control:appearanceControl },
					{ name: "Radius", control: new PopoutSlider(0, 5, this.radius, 0.1, function (value) { this.radius = value; this.onChange(); }.bind(this)) },
					{ name: "Bounce Factor", control: new PopoutSlider(0, 1, this.bounceFactor, 0.1, function (value) { this.bounceFactor = value; this.onChange(); }.bind(this)) },
					{ name: "Apply Gravity", control: new TickBox(this.applyGravity, function (value) { this.applyGravity = value; this.onChange(); }.bind(this)) },
					{ name: "Show Impact Point", control: new TickBox(this.showImpactPoint, function (value) { this.showImpactPoint = value; this.onChange(); }.bind(this)) },
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

	this.setSelected = function(selected)
	{
		this.selected = selected;
	}

	this.isSelected = function()
	{
		return this.selected;
	}

	this.onChange();
}

// ----------------------------------------------------------------------------------------------------------------
// Text
// ----------------------------------------------------------------------------------------------------------------
function Text(anchorPoint, initialText)
{
	this.scene				= null;
	this.anchorPoint		= anchorPoint;
	this.text				= "";
	this.lines				= [];
	this.halign				= 1;
	this.valign				= 1;
	this.angle				= 0;
	this.lineSpacing		= 1.6;
	this.font				= "Arial";
	this.fontSize			= 1.0;
	this.maxWidth			= 0;
	this.totalHeight		= 0;
	this.appearance			= new Appearance();
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
		var str = "var text = new Text(";

		str += "new Vector(" + this.anchorPoint.x + ", " + this.anchorPoint.y + ")";
		str += ", unescape(\"" + escape(this.text) + "\")";
		str += ");\n";

		str += "text.halign = \"" + this.halign + "\";\n";
		str += "text.valign = \"" + this.valign + "\";\n";
		str += "text.font = \"" + this.font + "\";\n";
		str += "text.fontSize = " + this.fontSize + ";\n";
		str += this.appearance.saveAsJavascript("text");
		str += "text.angle = " + this.angle + ";\n";
		str += "text.lineSpacing = " + this.lineSpacing + ";\n";

		str += "text.visible = " + this.visible + ";\n";
		str += "text.frozen = " + this.frozen + ";\n";
		str += "text.maxWidth = " + this.maxWidth + ";\n";
		str += "text.totalHeight = " + this.totalHeight + ";\n";

		str += "scene.addObject(text);\n";
		return str;
	}

	this.setText = function(s)
	{
		this.text = s;
		this.lines = s.split("\n");
		this.onChange();
	}

	this.addChangeListener = function(listener)
	{
		this.onChangeListeners.push(listener);
	}

	this.updateBounds = function()
	{
		this.boundsMin = new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
		this.boundsMax = new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

		var xAxis = rotate(new Vector(1, 0), this.angle * Math.PI / 180);
		var yAxis = rotate(new Vector(0, 1), this.angle * Math.PI / 180);

		var vMin = 0;
		var vMax = 0;

		if (this.valign == 0)
		{
			vMin = -this.totalHeight;
			vMax = 0;
		}
		else if (this.valign == 1)
		{
			vMin = -this.totalHeight * 0.5;
			vMax = this.totalHeight * 0.5;
		}
		else if (this.valign == 2)
		{
			vMin = 0;
			vMax = this.totalHeight;
		}

		var hMin = 0;
		var hMax = 0;

		if (this.halign == 0)
		{
			hMin = 0;
			hMax = this.maxWidth;
		}
		else if (this.halign == 1)
		{
			hMin = -this.maxWidth * 0.5;
			hMax = this.maxWidth * 0.5;
		}
		else if (this.halign == 2)
		{
			hMin = -this.maxWidth;
			hMax = 0;
		}

		var corners = [ mad(yAxis, vMin, mad(xAxis, hMin, this.anchorPoint)),
						mad(yAxis, vMin, mad(xAxis, hMax, this.anchorPoint)),
						mad(yAxis, vMax, mad(xAxis, hMin, this.anchorPoint)),
						mad(yAxis, vMax, mad(xAxis, hMax, this.anchorPoint)) ];

		for (var i=0; i!=corners.length; ++i)
		{
			this.boundsMin = min(this.boundsMin, corners[i]);
			this.boundsMax = max(this.boundsMax, corners[i]);
		}
	}

	this.onChange = function(changeDetails)
	{
		// Backwards compatibility
		this.appearance.SetFromOldProperties(this);

		this.updateBounds();

		for (var i=0; i!=this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this, changeDetails);
		}
	}
	
	this.draw = function(camera)
	{
		this.maxWidth = 0;
		this.totalHeight = 0;

		var fontSize = camera.scale(this.fontSize);
		var font = fontSize + "px " + this.font;

		for (var i=0; i!=this.lines.length; ++i)
		{
			var lineSize = camera.measureText(this.lines[i], font);
			
			this.maxWidth = Math.max(this.maxWidth, lineSize.x);
			this.totalHeight += lineSize.y * this.lineSpacing;
		}

		this.updateBounds();

		var xAxis = rotate(new Vector(1, 0), this.angle * Math.PI / 180);
		var yAxis = rotate(new Vector(0, 1), this.angle * Math.PI / 180);

		if (this.selected)
		{
			camera.drawLine(this.anchorPoint, mad(xAxis, this.maxWidth, this.anchorPoint), this.appearance.GetLineColor(), 1, [3, 3]);
		}

		var vOffset = 0;

		if (this.valign == 0)
		{
			vOffset = 0;
		}
		else if (this.valign == 1)
		{
			vOffset = this.totalHeight * 0.5;
		}
		else if (this.valign == 2)
		{
			vOffset = this.totalHeight;
		}

		for (var i=0; i!=this.lines.length; ++i)
		{
			var lineSize = camera.measureText(this.lines[i], font);
			var hOffset = 0;

			if (this.halign == 0)
			{
				hOffset = 0;
			}
			else if (this.halign == 1)
			{
				hOffset = -lineSize.x * 0.5;
			}
			else if (this.halign == 2)
			{
				hOffset = -lineSize.x;
			}

			vOffset += -lineSize.y * this.lineSpacing;

			var p = mad(yAxis, vOffset, mad(xAxis, hOffset, this.anchorPoint));

			camera.drawText(p, this.lines[i], this.appearance.GetLineColor(), "left", this.angle * Math.PI / 180, font);
		}
	}
	
	this.hitTest = function(a, b, camera)
	{
		var xAxis = rotate(new Vector(1, 0), this.angle * Math.PI / 180);
		var yAxis = rotate(new Vector(0, 1), this.angle * Math.PI / 180);

		var hMin = 0;
		var hMax = 0;

		if (this.halign == 0)
		{
			hMin = 0;
			hMax = this.maxWidth;
		}
		else if (this.halign == 1)
		{
			hMin = -this.maxWidth * 0.5;
			hMax = this.maxWidth * 0.5;
		}
		else if (this.halign == 2)
		{
			hMin = -this.maxWidth;
			hMax = 0;
		}

		var vOffset = 0;

		if (this.valign == 0)
		{
			vOffset = 0;
		}
		else if (this.valign == 1)
		{
			vOffset = this.totalHeight * 0.5;
		}
		else if (this.valign == 2)
		{
			vOffset = this.totalHeight;
		}

		var lineHeight = this.totalHeight / this.lines.length;

		vOffset += lineHeight * 0.5;
		
		for (var i=0; i!=this.lines.length; ++i)
		{
			vOffset += -lineHeight;

			if (overlapRectLine(a, b, mad(yAxis, vOffset, mad(xAxis, hMin, this.anchorPoint)), mad(yAxis, vOffset, mad(xAxis, hMax, this.anchorPoint))))
			{
				return true;
			}
		}


		return false;
	}

	this.getSnapPoints = function ()
	{
		var points = [	{ type: "center", p: this.anchorPoint } ];
		return points;
	}

	this.getDragPoints = function(localSpace, camera)
	{
		if (this.isFrozen())
			return [];

		var xAxis = rotate(new Vector(1, 0), this.angle * Math.PI / 180);
		var yAxis = rotate(new Vector(0, 1), this.angle * Math.PI / 180);

		var points = [ this.anchorPoint, mad(xAxis, this.maxWidth, this.anchorPoint) ];

		return points;
	}

	this.drawDragPoint = function(camera, index, position, localSpace, alpha)
	{
		if (alpha == undefined)
			alpha = 1;

		var points = this.getDragPoints(localSpace, camera);

		camera.drawRectangle(points[index], camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
	}

	this.setDragPointPos = function(index, p, localSpace, dragStartPoint, camera)
	{
		if (index == 0)
		{
			this.anchorPoint = p;
		}
		else
		{
			this.angle = toAngle(sub(p, this.anchorPoint)) * 180 / Math.PI;
		}

		this.onChange();
	}

	this.getOrigin = function()
	{
		return this.anchorPoint;
	}
	
	this.setOrigin = function(p)
	{
		this.anchorPoint = p;
		this.onChange();
	}

	this.getProperties = function()
	{
		var appearanceControl = new PopoutContainer(undefined, "images/color_wheel.svg");
		{
			appearanceControl.addControl("", new AppearanceControl(this.appearance, true, false, function(){ this.onChange(); }.bind(this)) );
		}

		return	[
					{name: "Appearance", control:appearanceControl },
					{name: "Text", control:new TextBox(this.text, false, true, 0, function(value){ this.setText(value); this.onChange(); }.bind(this) )},
					{name: "Font", control:new TextBox(this.font, true, false, 32, function(value){ this.font = value; this.onChange(); }.bind(this) )},
					{name: "Font Size", control: new PopoutSlider(0.1, 5.0, this.fontSize, 0.1, function (value) { this.fontSize = value; this.onChange(); }.bind(this)) },
					{name: "Line Spacing", control: new PopoutSlider(0.1, 5.0, this.lineSpacing, 0.1, function (value) { this.lineSpacing = value; this.onChange(); }.bind(this)) },
					{name: "H Align", control: new Dropdown(["left", "center", "right"], this.halign, function (value) { this.halign = value; this.onChange(); }.bind(this) )},
					{name: "V Align", control: new Dropdown(["top", "center", "bottom"], this.valign, function (value) { this.valign = value; this.onChange(); }.bind(this) )},
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

	this.setSelected = function(selected)
	{
		this.selected = selected;
	}

	this.isSelected = function()
	{
		return this.selected;
	}

	this.setText(initialText);
}

// ----------------------------------------------------------------------------------------------------------------
// Page Outline
// ----------------------------------------------------------------------------------------------------------------
function PageOutline(origin)
{
	this.scene				= null;
	this.origin				= origin;
	this.sizeIndex			= 1;
	this.sizeLabels			= [ "A5", "A4", "A3", "A2", "A1", "A0", "B5", "B4", "B3", "B2", "B1", "B0" ];
	this.sizes				= [ [14.8, 21.0], [21.0, 29.7], [29.7, 42.0], [42.0, 59.4], [59.4, 84.1], [84.1, 118.9], [17.6, 25.0], [25.0, 35.3], [35.3, 50.0], [50.0, 70.7], [70.7, 100.0], [100.0, 141.4] ];
	this.portrait			= 1;
	this.appearance			= new Appearance("#000000", 1, 2);
	this.margin				= 2.5;
	this.selected			= false;
	this.visible			= true;
	this.frozen				= false;
	this.onChangeListeners	= [];
	this.boundsMin			= new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
	this.boundsMax			= new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);
	this.points				= [];

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
		var str = "var pageOutline = new PageOutline(";

		str += "new Vector(" + this.origin.x + ", " + this.origin.y + ")";
		str += ");\n";

		str += this.appearance.saveAsJavascript("pageOutline");
		str += "pageOutline.sizeIndex = " + this.sizeIndex + ";\n";
		str += "pageOutline.visible = " + this.visible + ";\n";
		str += "pageOutline.frozen = " + this.frozen + ";\n";
		str += "pageOutline.portrait = " + this.portrait + ";\n";
		str += "pageOutline.margin = " + this.margin + ";\n";
		str += "pageOutline.onChange();\n";

		str += "scene.addObject(pageOutline);\n";
		return str;
	}

	this.addChangeListener = function (listener)
	{
		this.onChangeListeners.push(listener);
	}

	this.onChange = function(changeDetails)
	{
		// Backwards compatibility
		this.appearance.SetFromOldProperties(this);

		this.boundsMin = this.origin;
		this.boundsMax = add(this.origin, new Vector(this.sizes[this.sizeIndex][this.portrait ^ 1], this.sizes[this.sizeIndex][this.portrait]));

		this.points[0] = new Vector(this.origin.x,													this.origin.y);
		this.points[1] = new Vector(this.origin.x + this.sizes[this.sizeIndex][this.portrait ^ 1],	this.origin.y);
		this.points[2] = new Vector(this.origin.x + this.sizes[this.sizeIndex][this.portrait ^ 1],	this.origin.y + this.sizes[this.sizeIndex][this.portrait]);
		this.points[3] = new Vector(this.origin.x,													this.origin.y + this.sizes[this.sizeIndex][this.portrait]);

		for (var i=0; i!=this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this, changeDetails);
		}
	}

	this.draw = function(camera)
	{
		camera.drawRectangle(this.boundsMin, this.boundsMax, "#000000", this.appearance.GetLineWidth(this.selected));

		if (this.margin>0)
		{
			var a = add(this.boundsMin, this.margin);
			var b = sub(this.boundsMax, this.margin);

			camera.drawRectangle(a, b, "#000000", this.appearance.GetLineWidth(this.selected)/2, [5,5]);
		}
	}
	
	this.hitTest = function(a, b, camera)
	{
		if (	overlapRectLine(a, b, this.points[0], this.points[1]) ||
				overlapRectLine(a, b, this.points[1], this.points[2]) ||
				overlapRectLine(a, b, this.points[2], this.points[3]) ||
				overlapRectLine(a, b, this.points[3], this.points[0]))
		{
			return true;
		}

		return false;
	}
	
	this.getSnapPoints = function()
	{
		return [
			{ type: "node", p: this.points[0]},
			{ type: "node", p: this.points[1]},
			{ type: "node", p: this.points[2]},
			{ type: "node", p: this.points[3]},
			{ type: "midpoint", p: avg(this.points[0], this.points[1])},
			{ type: "midpoint", p: avg(this.points[1], this.points[2])},
			{ type: "midpoint", p: avg(this.points[2], this.points[3])},
			{ type: "midpoint", p: avg(this.points[3], this.points[0])},
			{ type: "center", p: avg(this.points[0], this.points[2])},
		];
	}

	this.getDragPoints = function(localSpace, camera)
	{
		if (this.isFrozen())
			return [];

		return [this.origin];
	}

	this.drawDragPoint = function(camera, index, position, localSpace, alpha)
	{
		if (alpha == undefined)
			alpha = 1;

		camera.drawRectangle(this.origin, camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
	}

	this.setDragPointPos = function(index, p, localSpace, dragStartPoint, camera)
	{
		this.origin = p;

		this.onChange();
	}

	this.getOrigin = function()
	{
		return this.origin;
	}
	
	this.setOrigin = function(p)
	{
		this.origin = p;

		this.onChange();
	}

	this.getProperties = function()
	{
		var appearanceControl = new PopoutContainer(undefined, "images/color_wheel.svg");
		{
			appearanceControl.addControl("", new AppearanceControl(this.appearance, true, true, function(){ this.onChange(); }.bind(this)) );
		}

		return	[
					{ name: "Appearance", control:appearanceControl },
					{ name: "Size", control: new Dropdown(this.sizeLabels, this.sizeIndex, function (value) { this.sizeIndex = value; this.onChange(); }.bind(this)) },
					{ name: "Portrait", control: new TickBox(this.portrait, function (value) { this.portrait = value ? 1 : 0; this.onChange(); }.bind(this)) },
					{ name: "Margin", control: new PopoutSlider(0, 5, this.margin, 0.25, function (value) { this.margin = value; this.onChange(); }.bind(this)) },
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

	this.setSelected = function(selected)
	{
		this.selected = selected;
	}

	this.isSelected = function()
	{
		return this.selected;
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
		var objName = "g_" + Math.floor(Math.random() * 100000);
		var str = "var " + objName + " = new Group([]);\n";

		for (var i = 0; i != this.objects.length; ++i)
		{
			str += this.objects[i].saveAsJavascript();
			str += objName + ".addObject(scene.objects[scene.objects.length-1]);\n";
		}

		str += objName + ".visible = " + this.visible + ";\n";
		str += objName + ".frozen = " + this.frozen + ";\n";

		str += "scene.addObject(" + objName + ");\n";
		return str;
	}

	this.addChangeListener = function(listener)
	{
		this.onChangeListeners.push(listener);
	}

	this.onChange = function(changeDetails)
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
			this.onChangeListeners[i](this, changeDetails);
		}
	}
	
	this.draw = function(camera)
	{
		for (var i=0; i<this.objects.length; ++i)
		{
			this.objects[i].selected = this.selected;
			this.objects[i].draw(camera);
		}
	}
	
	this.hitTest = function(a, b, camera)
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

	this.drawDragPoint = function(camera, index, position, localSpace, alpha)
	{
		if (alpha == undefined)
			alpha = 1;

	}

	this.setDragPointPos = function(index, p, localSpace, dragStartPoint, camera)
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

	this.setSelected = function(selected)
	{
		this.selected = selected;
	}

	this.isSelected = function()
	{
		return this.selected;
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
	this.appearance	= new Appearance("#99D9EA", 0.5);
	this.type		= 0;//"cartesian";
	
	//this.saveAsJavascript = function()
	//{
	//	var str = "var grid = new Grid(";

	//	str += "new Vector(" + this.O.x + ", " + this.O.y + ")";
	//	str += ", " + this.spacing;
	//	str += ", \"" + this.appearance.GetLineColor() + "\"";
	//	str += ", " + this.width;
	//	str += ", [" + this.dash + "]";
	//	str += ");\n";

	//	str += "scene.addObject(grid);\n";
	//	return str;
	//}

	this.getSnapPoint = function(p)
	{
		var result;

		if (this.type == 0)//"cartesian")
		{
			result = mul(round(div(p, this.spacing)), this.spacing);
		}
		else if (this.type == 1)//"isometric")
		{
			var axis1 = fromAngle(30 * Math.PI / 180);
			var axis2 = fromAngle(150 * Math.PI / 180);
			var dotAxis1 = fromAngle(60 * Math.PI / 180);
			var dotAxis2 = fromAngle(120 * Math.PI / 180);
			var dotSpacing = this.spacing * Math.cos(30 * Math.PI / 180);

			result = new Vector(0, 0);
			result = mad(axis1, Math.round(dot(p, dotAxis1) / dotSpacing) * this.spacing, result);
			result = mad(axis2, Math.round(dot(p, dotAxis2) / dotSpacing) * this.spacing, result);
		}
		else if (this.type == 2)//"radial")
		{
			var radius = Math.round(length(p) / this.spacing) * this.spacing;

			var angleStep = Math.min(5, 20 / this.spacing);

			var angle = toAngle(p) * 180 / Math.PI;

			angle = Math.round(angle / angleStep) * angleStep;

			result = mad(fromAngle(angle * Math.PI / 180), radius, this.O);
		}

		return result;
	}

	this.draw = function(camera)
	{
		var l = Math.floor( (this.O.x + camera.getViewPosition().x - camera.getViewSize().x/2) / this.spacing ) * this.spacing;
		var r = Math.floor( (this.O.x + camera.getViewPosition().x + camera.getViewSize().x/2) / this.spacing + 1) * this.spacing;
		var b = Math.floor( (this.O.y + camera.getViewPosition().y - camera.getViewSize().y/2) / this.spacing ) * this.spacing;
		var t = Math.floor( (this.O.y + camera.getViewPosition().y + camera.getViewSize().y/2) / this.spacing + 1) * this.spacing;

		if (this.type == 0)//"cartesian")
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

			camera.drawLines(points, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected));
			camera.drawLine(new Vector(l, this.O.y), new Vector(r, this.O.y), this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected)*2);
			camera.drawLine(new Vector(this.O.x, b), new Vector(this.O.x, t), this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected)*2);
		}
		else if (this.type == 1)//"isometric")
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

			camera.drawLines(points, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected));

			axis = fromAngle(60 * Math.PI / 180);

			camera.drawLine(new Vector(this.O.x + (this.O.y - Math.floor(b / stepY) * stepY) / axis.x * axis.y, Math.floor(b / stepY) * stepY),
								new Vector(Math.floor(l/stepX)*stepX, this.O.y + (this.O.x-Math.floor(l/stepX)*stepX)/axis.y*axis.x), 
								this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected)*2);

			camera.drawLine(	new Vector(this.O.x - (this.O.y-Math.floor(b/stepY)*stepY)/axis.x*axis.y, Math.floor(b/stepY)*stepY),
								new Vector(Math.ceil(r/stepX)*stepX, this.O.y + (Math.ceil(r/stepX)*stepX-this.O.x)/axis.y*axis.x), 
								this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected)*2);
		}
		else if (this.type == 2)//"radial")
		{
			var TL = new Vector(l, t);
			var TR = new Vector(r, t);
			var BL = new Vector(l, b);
			var BR = new Vector(r, b);

			var maxRadius = Math.max(Math.max(length(TL), length(TR)), Math.max(length(BL), length(BR)));

			maxRadius = Math.round(maxRadius / this.spacing) * this.spacing;

			for (var r=this.spacing; r<=maxRadius; r+=this.spacing)
			{
				camera.drawArc(this.O, r, 0, Math.PI*2, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected));
			}

			var angleStep = Math.min(5, 20 / this.spacing);

			var points = [];

			for (var a = 0; a <= 360; a += angleStep)
			{
				points.push(this.O);
				points.push(mad(fromAngle(a*Math.PI/180), maxRadius, this.O));
			}

			camera.drawLines(points, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected));

			camera.drawCross(this.O, camera.invScale(10), 0, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected)*2);
		}
	}
}

// ----------------------------------------------------------------------------------------------------------------
// Axis
// ----------------------------------------------------------------------------------------------------------------
function Axis(firstPoint)
{
	this.scene				= null;
	this.orientation		= "horizontal";
	this.p0					= firstPoint;
	this.p1					= firstPoint;
	this.length				= 1;
	this.spacing			= 1;
	this.textLabel			= 0;
	this.absolute			= false;	// absolute shows the coordinates of the ticks themselves, i.e. doesn't necessarily start at 0
	this.appearance			= new Appearance("#000000", 1, 2);
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
		var str = "var axis = new Axis(";
		str += "new Vector(" + this.p0.x  + ", " + this.p0.y + ")";
		str += ");\n";

		str += "text.p0 = new Vector(" + this.p0.x  + ", " + this.p0.y + ");\n";
		str += "text.p1 = new Vector(" + this.p1.x  + ", " + this.p1.y + ");\n";
		str += "text.length = " + this.length + ";\n";
		str += "text.orientation = \"" + this.orientation + "\";\n";
		str += "text.textLabel = " + this.textLabel + ";\n";
		str += "text.spacing = " + this.spacing + ";\n";
		str += "text.absolute = " + this.absolute + ";\n";

		str += this.appearance.saveAsJavascript("text");
		str += "text.visible = " + this.visible + ";\n";
		str += "text.frozen = " + this.frozen + ";\n";
		str += "text.maxWidth = " + this.maxWidth + ";\n";
		str += "text.totalHeight = " + this.totalHeight + ";\n";

		str += "scene.addObject(axis);\n";
		return str;
	}

	this.addChangeListener = function(listener)
	{
		this.onChangeListeners.push(listener);
	}

	this.onChange = function(changeDetails)
	{
		// Backwards compatibility
		this.appearance.SetFromOldProperties(this);

		this.boundsMin = this.p0;
		this.boundsMax = this.p1;

		for (var i=0; i!=this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this, changeDetails);
		}
	}
	
	this.draw = function(camera)
	{
		camera.drawLine(this.p0, this.p1, "#000000", this.appearance.GetLineWidth(this.selected));

		var v0;
		var v1;
		var p0;
		var tan;

		var dir = sub(this.p1, this.p0).unit();
		var textAlign;
		var textOffset;

		if (this.orientation == "horizontal")
		{
			v0 = this.p0.x;
			v1 = this.p1.x;
			p0 = new Vector(0, this.p0.y);
			tan = mul(transpose(dir), camera.invScale(this.textLabel<2 ? 10 : -10));
			textAlign = "center";
			textOffset = this.textLabel<2 ? 2.5 : 1.5;
		}
		else
		{
			v0 = this.p0.y;
			v1 = this.p1.y;
			p0 = new Vector(this.p0.x, 0);
			tan = mul(transpose(dir), camera.invScale(this.textLabel<2 ? -10 : 10));
			textAlign = this.textLabel<2 ? "right" : "left";
			textOffset = this.textLabel<2 ? 2.5 : 2.5;
		}

		var i0 = Math.ceil(v0 / this.spacing);
		var i1 = Math.floor(v1 / this.spacing);

		var points = [];

		for (var i = i0; i<=i1; ++i)
		{
			points.push(mad(i * this.spacing, dir, p0));
			points.push(add(tan, mad(i * this.spacing, dir, p0)));

			var textPoint = mad(tan, textOffset, mad(i * this.spacing, dir, p0));

			if (this.textLabel != 1)
			{
				if (this.absolute)
				{
					camera.drawText(textPoint, i * this.spacing, "#000000", "center", 0);
				}
				else
				{
					camera.drawText(textPoint, (i-i0) * this.spacing, "#000000", "center", 0);
				}
			}
		}

		camera.drawLines(points, "#000000", 1);
	}
	
	this.hitTest = function(a, b, camera)
	{
		if (overlapRectLine(a, b, this.p0, this.p1))
		{
			return true;
		}

		return false;
	}

	this.getSnapPoints = function ()
	{
		var points = [	{ type: "node", p: this.p0 }, { type: "node", p: this.p1 } ];
		return points;
	}

	this.getDragPoints = function(localSpace, camera)
	{
		if (this.isFrozen())
			return [];

		var points = [ this.p0, this.p1 ];

		return points;
	}

	this.drawDragPoint = function(camera, index, position, localSpace, alpha)
	{
		if (alpha == undefined)
			alpha = 1;

		var points = this.getDragPoints(localSpace, camera);

		camera.drawRectangle(points[index], camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
	}

	this.setDragPointPos = function(index, p, localSpace, dragStartPoint, camera)
	{
		if (index == 0)
		{
			this.p0 = p;
			this.p1 = mad(this.length, sub(this.p1, this.p0).unit(), this.p0);
		}
		else
		{
			this.p1 = p;
		}

		var v = sub(this.p1, this.p0);

		if (v.lengthSqr()>0)
		{
			if (Math.abs(v.x) >= Math.abs(v.y))
			{
				this.orientation = "horizontal";

				this.p1.y = this.p0.y;
			
				if (this.p1.x < this.p0.x)
				{
					this.p1.x = this.p0.x + 1;
				}
			}
			else
			{
				this.orientation = "vertical";
			
				this.p1.x = this.p0.x;
			
				if (this.p1.y < this.p0.y)
				{
					this.p1.y = this.p0.y + 1;
				}
			}

			this.length = sub(this.p1, this.p0).length();

			this.onChange();
		}
	}

	this.getOrigin = function()
	{
		return this.p0;
	}
	
	this.setOrigin = function(p)
	{
		this.setDragPointPos(0, p, false);
	}

	this.getProperties = function()
	{
		var appearanceControl = new PopoutContainer(undefined, "images/color_wheel.svg");
		{
			appearanceControl.addControl("", new AppearanceControl(this.appearance, true, false, function(){ this.onChange(); }.bind(this)) );
		}

		return	[
					{ name: "Appearance", control:appearanceControl },
					{name: "Spacing", control: new PopoutSlider(0.5, 10, this.spacing, 0.5, function (value) { this.spacing = Math.max(0.1,value); this.onChange(); }.bind(this)) },
					{name: "Text Label", control: new Dropdown(["Below", "None", "Above"], this.textLabel, function (value) { this.textLabel = value; this.onChange(); }.bind(this)) },
					{name: "Absolute Coords", control: new TickBox(this.absolute, function (value) { this.absolute = value; this.onChange(); }.bind(this)) },
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

	this.setSelected = function(selected)
	{
		this.selected = selected;
	}

	this.isSelected = function()
	{
		return this.selected;
	}
}

// ----------------------------------------------------------------------------------------------------------------
// Bitmap
// ----------------------------------------------------------------------------------------------------------------
function Bitmap(origin, pixelWidth, pixelHeight, pixelValues)
{
	this.scene				= null;
	this.origin				= origin;
	this.img				= undefined;
	this.drawWidth			= 1;
	this.drawHeight			= this.drawWidth * pixelHeight / pixelWidth;
	this.pixelWidth			= pixelWidth;
	this.pixelHeight		= pixelHeight;
	this.rotation			= 0;
	this.alpha				= 1;

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
		var str = "var image = new Image();\n";


		str += "text.visible = " + this.visible + ";\n";
		str += "text.frozen = " + this.frozen + ";\n";
		str += "text.maxWidth = " + this.maxWidth + ";\n";
		str += "text.totalHeight = " + this.totalHeight + ";\n";

		str += "scene.addObject(axis);\n";
		return str;
	}

	this.setPixelData = function(pixelWidth, pixelHeight, pixelValues)
	{
		this.pixelWidth = pixelWidth;
		this.pixelHeight = pixelHeight;

		var canvas = document.createElement("canvas");
		canvas.width = pixelWidth;
		canvas.height = pixelHeight;
		var ctx = canvas.getContext("2d");
		
		var imageData = ctx.createImageData(pixelWidth, pixelHeight);

		var i = 0;

		if (pixelValues.length == (pixelWidth * pixelHeight * 1))
		{
			for (var y=0; y<pixelHeight; ++y)
			{
				for (var x=0; x<pixelWidth; ++x)
				{
					imageData.data[y*pixelWidth*4 + x*4 + 0] = pixelValues[i];
					imageData.data[y*pixelWidth*4 + x*4 + 1] = pixelValues[i];
					imageData.data[y*pixelWidth*4 + x*4 + 2] = pixelValues[i];
					imageData.data[y*pixelWidth*4 + x*4 + 3] = 255;
					++i;
				}
			}
		}
		else if (pixelValues.length == (pixelWidth * pixelHeight * 3))
		{
			for (var y=0; y<pixelHeight; ++y)
			{
				for (var x=0; x<pixelWidth; ++x)
				{
					imageData.data[y*pixelWidth*4 + x*4 + 0] = pixelValues[i+0];
					imageData.data[y*pixelWidth*4 + x*4 + 1] = pixelValues[i+1];
					imageData.data[y*pixelWidth*4 + x*4 + 2] = pixelValues[i+2];
					imageData.data[y*pixelWidth*4 + x*4 + 3] = 255;
					i+=3;
				}
			}
		}
		else if (pixelValues.length == (pixelWidth * pixelHeight * 4))
		{
			for (var y=0; y<pixelHeight; ++y)
			{
				for (var x=0; x<pixelWidth; ++x)
				{
					imageData.data[y*pixelWidth*4 + x*4 + 0] = pixelValues[i+0];
					imageData.data[y*pixelWidth*4 + x*4 + 1] = pixelValues[i+1];
					imageData.data[y*pixelWidth*4 + x*4 + 2] = pixelValues[i+2];
					imageData.data[y*pixelWidth*4 + x*4 + 3] = pixelValues[i+3];
					i+=4;
				}
			}
		}
		else
		{
			for (var y=0; y<pixelHeight; ++y)
			{
				for (var x=0; x<pixelWidth; ++x)
				{
					imageData.data[y*pixelWidth*4 + x*4 + 0] = 0;
					imageData.data[y*pixelWidth*4 + x*4 + 1] = 0;
					imageData.data[y*pixelWidth*4 + x*4 + 2] = 0;
					imageData.data[y*pixelWidth*4 + x*4 + 3] = 255;
					i+=4;
				}
			}
		}

		ctx.putImageData(imageData, 0, 0);

		this.image = new Image();
		this.image.onload = function () { this.onChange(); }.bind(this);
		this.image.src = canvas.toDataURL("image/png");
	}

	this.addChangeListener = function(listener)
	{
		this.onChangeListeners.push(listener);
	}

	this.onChange = function(changeDetails)
	{
		for (var i=0; i!=this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this, changeDetails);
		}
	}
	
	this.draw = function(camera)
	{
		camera.drawImage(this.origin, this.image, this.drawWidth, this.drawHeight, this.rotation, this.alpha);
	}
	
	this.hitTest = function(a, b, camera)
	{
		//overlapRectOBB(a,b, [p0,p1,p2,p3]))

		return false;
	}

	this.getSnapPoints = function ()
	{
		var points = [ ];
		return points;
	}

	this.getDragPoints = function(localSpace, camera)
	{
		return [];
	}

	this.drawDragPoint = function(camera, index, position, localSpace, alpha)
	{
		if (alpha == undefined)
			alpha = 1;

	}

	this.setDragPointPos = function(index, p, localSpace, dragStartPoint, camera)
	{
	}

	this.getOrigin = function()
	{
		return this.origin;
	}
	
	this.setOrigin = function(p)
	{
		this.origin = p;
	}

	this.getProperties = function()
	{
		return	[];
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

	this.setSelected = function(selected)
	{
		this.selected = selected;
	}

	this.isSelected = function()
	{
		return this.selected;
	}

	this.setPixelData(pixelWidth, pixelHeight, pixelValues);
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

// ----------------------------------------------------------------------------------------------------------------
// ScreenshotArea
// ----------------------------------------------------------------------------------------------------------------
function ScreenshotArea(p, okCallback, cancelCallback)
{
	this.points			= [p.copy(), p.copy(), p.copy(), p.copy()];
	this.scene			= null;
	this.selected		= false;
	this.DPI			= 96;
	this.formatIndex	= 0;
	this.CMperUnit		= 0.5;
	this.copiesRows		= 1;
	this.copiesColumns	= 1;
	this.includeGridlines = true;

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

	this.hitTest = function(a, b, camera)
	{
		if (	overlapRectLine(a, b, this.points[0], this.points[1]) ||
				overlapRectLine(a, b, this.points[1], this.points[2]) ||
				overlapRectLine(a, b, this.points[2], this.points[3]) ||
				overlapRectLine(a, b, this.points[3], this.points[0]))
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

	this.drawDragPoint = function(camera, index, position, localSpace, alpha)
	{
		if (alpha == undefined)
			alpha = 1;

		if (index<4)
		{
			camera.drawRectangle(this.points[index], camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
		}
		else
		{
			var index0 = index-4;
			var index1 = (index0+1) % 4;

			var a = avg(this.points[index0], this.points[index1]);
			var dir = sub(this.points[index1], this.points[index0]).unit();
			var tan = transpose(dir);
	
			var b = add(a, mul(tan, camera.invScale(30)));

			camera.drawArrow(a, b, 8, "rgba(255,0,0," + alpha + ")", 3);
		}
	}

	this.setDragPointPos = function(index, p, localSpace, dragStartPoint, camera)
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

		if (camera != undefined)
		{
			var p0 = this.points[0].copy();
			var p1 = this.points[2].copy();

			var delta = sub(p1, p0);

			var p = p1.copy();
			p.x += ((p1.x < p0.x) ? +1 : -1) * camera.invScale(10);
			p.y += camera.invScale(10);

			camera.drawText(p, "dx: " + delta.x.toFixed(1) + " dy: " + delta.y.toFixed(1), "#000000", (p1.x < p0.x) ? "left" : "right", 0, "12px Arial");
		}
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
					{ name: "Format", control: new Dropdown(["PNG", "SVG"], this.formatIndex, function (value) { this.formatIndex = value; }.bind(this)) },
					{ name: "DPI", control: new PopoutSlider(40, 256, this.DPI, 8, function (value) { this.DPI = value; }.bind(this)) },
					{ name: "cm per Unit", control: new PopoutSlider(0.25, 4, this.CMperUnit, 0.25, function (value) { this.CMperUnit = value; }.bind(this)) },
					{ name: "Copies - Rows", control: new PopoutSlider(1, 4, this.copiesRows, 1, function (value) { this.copiesRows = value; }.bind(this)) },
					{ name: "Copies - Columns", control: new PopoutSlider(1, 4, this.copiesColumns, 1, function (value) { this.copiesColumns = value; }.bind(this)) },
					{ name: "Include Gridlines", control: new TickBox(this.includeGridlines, function (value) { this.includeGridlines = value; }.bind(this)) },
					{ name: undefined, control: new Divider() },
					{ name: undefined, control: new PlainButton("Popup", function () { this.onPopupClicked(); }.bind(this)) },
					{ name: undefined, control: new PlainButton("Save", function () { this.onSaveClicked(); }.bind(this)) },
					{ name: undefined, control: new PlainButton("Cancel", cancelCallback) },
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

	this.setSelected = function(selected)
	{
		this.selected = selected;
	}

	this.isSelected = function()
	{
		return this.selected;
	}

	this.onPopupClicked = function()
	{
		okCallback(this.formatIndex, true, this.includeGridlines);
	}

	this.onSaveClicked = function()
	{
		okCallback(this.formatIndex, false, this.includeGridlines);
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

		camera.drawArrow(this.pivot, add(this.pivot, rotate(new Vector(camera.invScale(70), 0), this.angle * Math.PI / 180)), 20, "#FF0000", 2);
		camera.drawArrow(this.pivot, add(this.pivot, rotate(new Vector(0, camera.invScale(70)), this.angle * Math.PI / 180)), 20, "#00FF00", 2);
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

	this.drawDragPoint = function(camera, index, position, localSpace, alpha)
	{
		if (alpha == undefined)
			alpha = 1;

		var points = this.getDragPoints(localSpace, camera);

		camera.drawRectangle(points[index], camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);

		if (index>=9 && index<17)
		{
			camera.drawArc(this.pivot, camera.invScale(70), 0, Math.PI*2, "rgba(255,0,0," + alpha + ")", 2, undefined, [5,5]);
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

				this.angle = toAngle(sub(p, this.pivot)) * 180 / Math.PI;
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


	this.setSelected = function(selected)
	{}

	this.isSelected = function()
	{
		return false;
	}

	this.updateExtents(true);
}
