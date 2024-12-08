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
	this.allowSelfSnap		= true;

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

		if (this.name != undefined)
		{
			str += "w.name = \"" + this.name + "\";\n";
		}

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

		if (changeDetails == undefined)
			changeDetails = {};

		changeDetails.blockersMoved = 1;

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

				//hitResult.color = this.appearance.GetLineColorHex();
				hitResult.roughness = this.roughness;
				hitResult.metalness = this.metalness;
				hitResult.intensity = this.intensity;
				hitResult.BRDF = this.BRDF;
				results.push(hitResult);
			}
		}

		return results;
	}

	this.getSnapPoints = function(currentDragPointIndex, localSpace)
	{
		var snaps = [];

		var count = this.closed ? this.points.length : this.points.length - 1;

		for (var i = 0; i != count; ++i)
		{
			if (localSpace == false && currentDragPointIndex == i)
				continue;

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
