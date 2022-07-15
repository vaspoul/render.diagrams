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
