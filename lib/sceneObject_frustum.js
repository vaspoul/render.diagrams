// ----------------------------------------------------------------------------------------------------------------
// Frustum
// ----------------------------------------------------------------------------------------------------------------
function Frustum()
{
	this.scene				= null;
	this.O					= new Vector(0,0);
	this.target				= new Vector(10,0);
	this.nearZ				= 2;
	this.fovDegrees			= 30;

	this.dir				= new Vector(1,0);
	this.farZ;
	this.nearWidth			= 3;
	this.farWidth			= this.nearWidth + Math.tan(this.fovDegrees/2*Math.PI/180) * distance(this.target, this.O) * 2;

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

	this.saveAsJavascriptBase = function(objectName, str)
	{
		str += objectName + ".O = new Vector(" + this.O.x + ", " + this.O.y + ");\n";
		str += objectName + ".target = new Vector(" + this.target.x + ", " + this.target.y + ");\n";
		str += objectName + ".nearZ = " + this.nearZ + ";\n";
		str += objectName + ".fovDegrees = " + this.fovDegrees + ";\n";
		str += objectName + ".collisionOutline = " + this.collisionOutline + ";\n";
		str += this.appearance.saveAsJavascript(objectName);
		str += objectName + ".pixelCount = " + this.pixelCount + ";\n";
		str += objectName + ".showZBuffer = " + this.showZBuffer + ";\n";
		str += objectName + ".showMinZBuffer = " + this.showMinZBuffer + ";\n";
		str += objectName + ".showCenterLines = " + this.showCenterLines + ";\n";
		str += objectName + ".spanCount = " + this.spanCount + ";\n";
		str += objectName + ".visible = " + this.visible + ";\n";
		str += objectName + ".frozen = " + this.frozen + ";\n";
		str += objectName + ".onChange();\n";

		str += "scene.addObject(" + objectName + ");\n";
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

		this.dir = sub(this.target, this.O).unit();
		var tan = transpose(this.dir);

		this.farZ = dot( sub(this.target, this.O), this.dir );

		var tanFOV = Math.tan( toRadians(this.fovDegrees) / 2 );

		this.nearWidth	= tanFOV * this.nearZ * 2;
		this.farWidth	= tanFOV * this.farZ * 2;

		var points = [];
		points.push(this.O);
		points.push(mad(tan, this.nearWidth/2, mad(this.dir, this.nearZ, this.O)));
		points.push(mad(tan, this.farWidth/2, mad(this.dir, this.farZ, this.O)));
		points.push(mad(tan, -this.farWidth/2, mad(this.dir, this.farZ, this.O)));
		points.push(mad(tan, -this.nearWidth/2, mad(this.dir, this.nearZ, this.O)));

		// spans
		{
			var totalLength = sub(this.target, this.O).length() - this.nearZ;

			var delta = totalLength / this.spanCount;

			for (var i=0; i!=this.spanCount; ++i)
			{
				this.spanDistances[i] = i * delta + this.nearZ;
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

		var nearCenterP = mad(this.dir, this.nearZ, this.O);

		var minZValues = Array(this.pixelCount).fill(Number.MAX_VALUE);
		var pixelSizeFar = this.farWidth / this.pixelCount;

		if (this.collisionOutline || this.showMinZBuffer)
		{
			var points = [];

			var farStepCount = Math.round(this.farWidth / camera.invScale(20));
			var farStep = this.farWidth / farStepCount;
			var nearStep = this.nearWidth / farStepCount;

			points.push(add(nearCenterP, mul(tan, -this.nearWidth/2)));

			var testDistances = [];

			// Add fixed steps
			for (var fc=0, nx = -this.nearWidth/2; fc<=farStepCount; ++fc, nx+=nearStep)
			{
				testDistances.push(nx);
			}

			// Add steps at each snap point so that we don't miss any corners
			if (this.collisionOutline)
			{
				var snapPoints = this.scene.getRayHitTestPoints();

				for (var p=0; p<snapPoints.length; ++p)
				{
					var z = dot(sub(snapPoints[p], this.O), this.dir);

					var d = dot(sub(snapPoints[p], this.O), tan);
					
					var nearD = this.nearZ / z * d;

					if (Math.abs(nearD) > (this.nearWidth * 0.5) )
						continue;

					testDistances.push(nearD);
				}
			}

			testDistances.sort(function(a,b) { return a-b; });

			var previousWasHit = false;
			var previousFar;

			for (var i=0; i!=testDistances.length; ++i)
			{
				var nx = testDistances[i];
				var fx = this.farZ / this.nearZ * nx;

				var pointNear = add(nearCenterP, mul(tan, nx));
				var pointFar = add(this.target, mul(tan, fx));

				var rayDir = sub(pointFar, pointNear);
				var maxRayLength = rayDir.length();
				rayDir = div(rayDir, maxRayLength);

				var bestHit = this.scene.rayHitTest(pointNear, rayDir);

				if (bestHit.tRay<maxRayLength)
				{
					if (!previousWasHit)
						points.push(pointFar);

					points.push(bestHit.P);

					var pixelIndex = Math.floor((fx - (-this.farWidth/2)) / pixelSizeFar);
					var zValue = dot(sub(bestHit.P, pointNear), this.dir);  // distance from near plane, so that we can cope with parallel cameras
					minZValues[pixelIndex] = Math.min(minZValues[pixelIndex], zValue);

					previousWasHit = true;
				}
				else
				{
					if (previousWasHit)
						points.push(previousFar);

					points.push(pointFar);
					previousWasHit = false;
				}

				previousFar = pointFar.copy();
			}

			points.push(add(nearCenterP, mul(tan, this.nearWidth / 2)));

			if (this.collisionOutline)
			{
				camera.drawLine(add(nearCenterP, mul(tan, this.nearWidth/2)), add(nearCenterP, mul(tan, -this.nearWidth/2)), this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), [5,5], this);
				camera.drawLine(add(this.target, mul(tan, this.farWidth/2)), add(this.target, mul(tan, -this.farWidth/2)), this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), [5,5], this);

				camera.drawLine(add(nearCenterP, mul(tan, this.nearWidth/2)), add(this.target, mul(tan, this.farWidth/2)), this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), [5,5], this);
				camera.drawLine(add(nearCenterP, mul(tan, -this.nearWidth/2)), add(this.target, mul(tan, -this.farWidth/2)), this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), [5,5], this);

				camera.drawLineStrip(points, true, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), []);
			}
		}

		// spans
		if (this.spanCount>1)
		{
			var totalLength = sub(this.target, nearCenterP).length() - this.nearZ;

			for (var i=1; i!=this.spanCount; ++i)
			{
				var p = mad(this.dir, this.spanDistances[i], this.O);
				var spanWidth = lerp(this.nearWidth, this.farWidth, i / this.spanCount);
				camera.drawLine(mad(tan, spanWidth/2, p), mad(tan, -spanWidth/2, p), this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), [], this);
			}
		}
	
		if (!this.collisionOutline)
		{
			camera.drawLine(add(nearCenterP, mul(tan, this.nearWidth/2)), add(nearCenterP, mul(tan, -this.nearWidth/2)), this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), [], this);
			camera.drawLine(add(this.target, mul(tan, this.farWidth/2)), add(this.target, mul(tan, -this.farWidth/2)), this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), [], this);

			camera.drawLine(add(nearCenterP, mul(tan, this.nearWidth/2)), add(this.target, mul(tan, this.farWidth/2)), this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), [], this);
			camera.drawLine(add(nearCenterP, mul(tan, -this.nearWidth/2)), add(this.target, mul(tan, -this.farWidth/2)), this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), [], this);
		}

		if (this.pixelCount > 0)
		{
			var farStep = this.farWidth / this.pixelCount / 2;
			var nearStep = this.nearWidth / this.pixelCount / 2;

			for (var fc=1, fx=-this.farWidth/2+farStep, nx = -this.nearWidth/2+nearStep; fc<this.pixelCount*2; ++fc, fx+=farStep, nx+=nearStep)
			{
				var pointNear = add(nearCenterP, mul(tan, nx));
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
							var result0 = intersectRayLine(bestHit.P, tan, add(nearCenterP, mul(tan, nx + nearStep)), add(this.target, mul(tan, fx + farStep)));
							var result1 = intersectRayLine(bestHit.P, tan.neg(), add(nearCenterP, mul(tan, nx - nearStep)), add(this.target, mul(tan, fx - farStep)));

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
							var result0 = intersectRayLine(P, tan, add(nearCenterP, mul(tan, nx + nearStep)), add(this.target, mul(tan, fx + farStep)));
							var result1 = intersectRayLine(P, tan.neg(), add(nearCenterP, mul(tan, nx - nearStep)), add(this.target, mul(tan, fx - farStep)));

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
	}
	
	this.hitTest = function(a, b, camera)
	{
		var tan = transpose(this.dir);

		var nearCenterP = mad(this.dir, this.nearZ, this.O);

		var points = [];
		points.push(add(nearCenterP, mul(tan, this.nearWidth/2)));
		points.push(add(this.target, mul(tan, this.farWidth/2)));
		points.push(add(this.target, mul(tan, -this.farWidth/2)));
		points.push(add(nearCenterP, mul(tan, -this.nearWidth/2)));

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
				var pointNear = add(nearCenterP, mul(tan, nx));
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

		var points = [	{ type: "node", p: this.O },
						{ type: "node", p: this.target },
						{ type: "node", p: mad(tan, this.nearWidth/2, mad(this.dir, this.nearZ, this.O)) },
						{ type: "node", p: mad(tan, this.farWidth/2, mad(this.dir, this.farZ, this.O)) },
						{ type: "node", p: mad(tan, -this.farWidth/2, mad(this.dir, this.farZ, this.O)) },
						{ type: "node", p: mad(tan, -this.nearWidth/2, mad(this.dir, this.nearZ, this.O)) },
					];

		if (this.spanCount>1)
		{
			var totalLength = sub(this.target, this.O).length() - this.nearZ;

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

		var nearCenterP = mad(this.dir, this.nearZ, this.O);

		var farAway = new Vector(1e20, 1e20);

		points.push((this.nearZ <= 0.1) ? farAway : this.O);
		points.push(this.target);
		points.push(nearCenterP);
		points.push((this.nearZ <= 0.1) ? farAway : add(nearCenterP, mul(tan, this.nearWidth/2)));
		points.push((this.nearZ <= 0.1) ? farAway : add(nearCenterP, mul(tan, -this.nearWidth/2)));
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
		var nearCenterP = mad(this.dir, this.nearZ, this.O);

		if (index <= 1)
		{
			if (localSpace)
			{
				if (index == 0)
				{
					var a = this.O;
					var b = mad(dir, camera.invScale(30), a);

					camera.drawArrow(a, b, 8, "rgba(255,0,0," + alpha + ")", 3);
				}
				else if (index == 1)
				{
					var a = this.target;
					var b = mad(dir.neg(), camera.invScale(30), a);

					camera.drawArrow(a, b, 8, "rgba(255,0,0," + alpha + ")", 3);
				}
			}
			else
			{
				camera.drawRectangle(position, camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
			}
		}

		if (index == 2)
		{
			if (localSpace)
			{
				var a = nearCenterP;
				var b = mad(dir, camera.invScale(30), a);

				camera.drawArrow(a, b, 8, "rgba(255,0,0," + alpha + ")", 3);
			}
			else
			{
				camera.drawRectangle(position, camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
			}
		}
		else if (index==3)
		{
			var a = add(nearCenterP, mul(tan, this.nearWidth / 2));
			var b = mad(tan, camera.invScale(30), a);

			camera.drawArrow(a, b, 8, "rgba(255,0,0," + alpha + ")", 3);
		}
		else if (index==4)
		{
			var a = add(nearCenterP, mul(tan, -this.nearWidth / 2));
			var b = mad(tan.neg(), camera.invScale(30), a);

			camera.drawArrow(a, b, 8, "rgba(255,0,0," + alpha + ")", 3);
		}
		else if (index==5)
		{
			var a = add(this.target, mul(tan, this.farWidth / 2));
			var b = mad(tan, camera.invScale(30), a);

			camera.drawArrow(a, b, 8, "rgba(255,0,0," + alpha + ")", 3);
		}
		else if (index==6)
		{
			var a = add(this.target, mul(tan, -this.farWidth / 2));
			var b = mad(tan.neg(), camera.invScale(30), a);

			camera.drawArrow(a, b, 8, "rgba(255,0,0," + alpha + ")", 3);
		}
	}

	this.setDragPointPos = function(index, p, localSpace, dragStartPoint, camera)
	{
		var nearCenterP = mad(this.dir, this.nearZ, this.O);
		var tan = transpose(this.dir);

		var updatedFOV = false;

		if (index==0)
		{
			if (localSpace)
			{
				// Move along dir
				this.O = mad(this.dir, dot(sub(p, this.target), this.dir), this.target);

				// Change FOV to keep farWidth constant
				var tanFOV = this.farWidth / 2 / distance(this.O, this.target);

				this.fovDegrees = toDegrees( Math.atan(tanFOV) * 2 );
				updatedFOV = true;
			}
			else
			{
				this.O = p;
			}
		}
		else if (index==1)
		{
			if (localSpace)
			{
				// Move along dir

				var farZ = max(this.nearZ + 1, dot(sub(p, this.O), this.dir));

				this.target = mad(this.dir, farZ, this.O);

				// Keep FOV constant

			//	// Change FOV to keep farWidth constant
			//	var tanFOV = this.farWidth / 2 / distance(this.O, this.target);

			//	this.fovDegrees = toDegrees( Math.atan(tanFOV) * 2 );
			//	updatedFOV = true;
			}
			else
			{
				this.target = p;
			}
		}
		else if (index==2)
		{
			if (localSpace)
			{
				this.nearZ = Math.max(0.1, min( distance(this.O, this.target) - 1, max(0, dot( sub(p, this.O), this.dir ))));
			}
			else
			{
				this.O = mad(this.dir, -this.nearZ, p);
			}
		}
		else if (index==3 || index==4)
		{
			if (localSpace)
			{
				// Change nearWidth while keeping farWidth constant

				this.nearWidth = min(this.farWidth - 0.1, Math.abs(dot(sub(p, nearCenterP), tan))*2);

				var tanFOV = (this.farWidth - this.nearWidth) / 2 / distance(this.target, nearCenterP);

				// Move this.O to keep near plane position constant
				this.nearZ = this.nearWidth / 2 / tanFOV;
				
				this.O = mad(this.dir, -this.nearZ, nearCenterP);
				
				this.fovDegrees = toDegrees( Math.atan(tanFOV) * 2 );

				updatedFOV = true;
			}
			else
			{
				// Change nearWidth while keeping FOV constant

				this.nearWidth = Math.abs(dot(sub(p, nearCenterP), tan))*2;

				var tanFOV = Math.tan( toRadians(this.fovDegrees) / 2 );

				var nearFar = this.farZ - this.nearZ;

				this.nearZ = this.nearWidth * 0.5 / tanFOV;
				this.farZ = this.nearZ + nearFar;
				this.O = mad(this.dir, -this.nearZ, nearCenterP);
			}
		}
		else if (index==5 || index==6)
		{
			if (localSpace)
			{
				// Change farWidth while keeping nearWidth constant
				this.farWidth = max(this.nearWidth + 0.1, Math.abs(dot(sub(p, nearCenterP), tan))*2);

				var tanFOV = (this.farWidth - this.nearWidth) / 2 / distance(this.target, nearCenterP);

				// Move this.O to keep near plane position constant
				this.nearZ = this.nearWidth / 2 / tanFOV;
				
				this.O = mad(this.dir, -this.nearZ, nearCenterP);
				
				this.fovDegrees = toDegrees( Math.atan(tanFOV) * 2 );

				updatedFOV = true;
			}
			else
			{
				// Change nearWidth while keeping nearZ constant

				this.farWidth = Math.abs(dot(sub(p, this.target), tan))*2;
				
				var tanFOV = this.farWidth / 2 / distance(this.O, this.target);

				this.fovDegrees = toDegrees( Math.atan(tanFOV) * 2 );
				updatedFOV = true;
			}
		}

		if (camera != undefined)
		{
			if (updatedFOV)
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
																						this.farWidth = this.nearWidth + 2 * tanFOV * distance(nearCenterP, this.target);
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
