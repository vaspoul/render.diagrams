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
