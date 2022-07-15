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

		if (changeDetails == undefined)
			changeDetails = {};

		changeDetails.blockersMoved = 1;

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
		var newVisible = (v!==undefined) ? v : !this.visible;
		if (this.visible != newVisible)
		{
			this.visible = newVisible;
			this.onChange();
		}
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
