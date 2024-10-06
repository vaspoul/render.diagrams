// ----------------------------------------------------------------------------------------------------------------
// NGon
// ----------------------------------------------------------------------------------------------------------------
var lastNGonAppearance = new Appearance("#900090", 1, 2);

function NGon(centerPos, radius)
{
	this.scene				= null;
	this.center				= centerPos;
	this.startAngle			= toRadians(0);
	this.endAngle			= toRadians(360);
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
		str += "ngon.startAngle = " + this.startAngle + ";\n";
		str += "ngon.endAngle = " + this.endAngle + ";\n";

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

		var minAngleIndex = Math.floor(this.startAngle/angleStep);
		var maxAngleIndex = Math.ceil(this.endAngle/angleStep);

		for (var ai = minAngleIndex; ai <= maxAngleIndex; ++ai)
		{
			a = ai * angleStep;

			var clampedAngle = clamp(a, this.startAngle, this.endAngle);

			var phi = (Math.PI - angleStep) / 2;
			var radiusFactor = Math.sin(phi) / Math.sin(phi + clampedAngle - Math.floor(clampedAngle/angleStep) * angleStep);
			var pointRadius = this.radius * radiusFactor;

			points.push(mad(fromAngle(clampedAngle + this.rotationAngle), pointRadius, this.center));
		}

		if (this.sideCount>=60)
		{
			camera.drawArc(this.center, this.radius, this.startAngle + this.rotationAngle, this.endAngle + this.rotationAngle, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), this.appearance.GetFillColor(), this.appearance.GetLineDash(), false, false, this);
		}
		else
		{
			camera.drawLineStrip(points, IsClosedLoop(this.startAngle, this.endAngle), this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), this.appearance.GetLineDash(), this.appearance.GetFillColor(), this);
		}
	}
	
	this.hitTest = function(a, b, camera)
	{
		var rectMin = min(a, b);
		var rectMax = max(a, b);
		
		return overlapRectArc(rectMin, rectMax, this.center, this.radius, this.startAngle + this.rotationAngle, this.endAngle + this.rotationAngle);
	}

	this.getSnapPoints = function ()
	{
		var points = [	{ type: "center", p: this.center } ];

		var angleStep = Math.PI * 2 / this.sideCount;

		var minAngleIndex = Math.floor(this.startAngle/angleStep);
		var maxAngleIndex = Math.ceil(this.endAngle/angleStep);

		for (var ai = minAngleIndex; ai <= maxAngleIndex; ++ai)
		{
			a = ai * angleStep;

			var clampedAngle = clamp(a, this.startAngle, this.endAngle);

			var phi = (Math.PI - angleStep) / 2;
			var radiusFactor = Math.sin(phi) / Math.sin(phi + clampedAngle - Math.floor(clampedAngle/angleStep) * angleStep);
			var pointRadius = this.radius * radiusFactor;

			points.push( { type:"node", p: mad(fromAngle(clampedAngle + this.rotationAngle), pointRadius, this.center)} );
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
			var angleStep = Math.PI * 2 / this.sideCount;
			var phi = (Math.PI - angleStep) / 2;

			var radiusFactor = Math.sin(phi) / Math.sin(phi + this.startAngle - Math.floor(this.startAngle/angleStep) * angleStep);
			var pointRadius = this.radius * radiusFactor;
			points.push( mad(fromAngle(this.startAngle + this.rotationAngle), pointRadius, this.center) );

			var radiusFactor = Math.sin(phi) / Math.sin(phi + this.endAngle - Math.floor(this.endAngle/angleStep) * angleStep);
			var pointRadius = this.radius * radiusFactor;
			points.push( mad(fromAngle(this.endAngle + this.rotationAngle), pointRadius, this.center) );
		}
		else
		{
			points.push(this.center);

			var angleStep = Math.PI * 2 / this.sideCount;

			var minAngleIndex = Math.floor(this.startAngle/angleStep);
			var maxAngleIndex = Math.ceil(this.endAngle/angleStep);

			for (var ai = minAngleIndex; ai <= maxAngleIndex; ++ai)
			{
				a = ai * angleStep;

				var clampedAngle = clamp(a, this.startAngle, this.endAngle);

				var phi = (Math.PI - angleStep) / 2;
				var radiusFactor = Math.sin(phi) / Math.sin(phi + clampedAngle - Math.floor(clampedAngle/angleStep) * angleStep);
				var pointRadius = this.radius * radiusFactor;

				points.push( mad(fromAngle(clampedAngle + this.rotationAngle), pointRadius, this.center) );
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
			var angleStep = Math.PI * 2 / this.sideCount;

			var phi = (Math.PI - angleStep) / 2;

			var pointAngle = (index == 0) ? this.startAngle : this.endAngle;

			var radiusFactor = Math.sin(phi) / Math.sin(phi + pointAngle - Math.floor(pointAngle/angleStep) * angleStep);
			var pointRadius = this.radius * radiusFactor;

			var arcLength = camera.invScale(80);
			var arcAngle = Math.asin(arcLength/2 / pointRadius) * 2;

			if (index == 0)
				camera.drawArc(this.center, pointRadius, this.rotationAngle + pointAngle + ((index == 0) ? 0 : -1) * arcAngle, this.rotationAngle + pointAngle + ((index == 0) ? +1 : 0) * arcAngle, "rgba(0,255,0," + alpha + ")", 8, undefined, undefined, index == 1, index == 0);
			else
				camera.drawArc(this.center, pointRadius, this.rotationAngle + pointAngle + ((index == 0) ? 0 : -1) * arcAngle, this.rotationAngle + pointAngle + ((index == 0) ? +1 : 0) * arcAngle, "rgba(255,0,0," + alpha + ")", 8, undefined, undefined, index == 1, index == 0);
		}
		else
		{
			camera.drawRectangle( position, camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
		}
	}

	this.setDragPointPos = function(index, p, localSpace, dragStartPoint, camera)
	{
		if (localSpace)
		{
			if (index == 0)
			{
				this.startAngle = toAngle(sub(p, this.center)) - this.rotationAngle;
			}
			else
			{
				this.endAngle = toAngle(sub(p, this.center)) - this.rotationAngle;
			}

			if (this.startAngle < 0)
				this.startAngle += Math.PI*2;

			if (this.endAngle < 0)
				this.endAngle += Math.PI*2;
			
			if (this.endAngle > Math.PI * 2)
				this.endAngle -= Math.PI*2;

			if (this.endAngle<=this.startAngle)
			{
				this.endAngle += Math.PI * 2;
			}

			var angleStep = Math.PI * 2 / this.sideCount;

			console.log("Start = " + toDegrees(this.startAngle).toFixed() + " : " + (this.startAngle/angleStep).toFixed(2) + ", End = " + toDegrees(this.endAngle).toFixed() + " : " + (this.endAngle/angleStep).toFixed(2) );
		}
		else
		{
			if (index == 0)
			{
				this.center = p;
			}
			else if (index<0)
			{
				this.radius = sub(p, this.center).length();

				var pointAngle = toAngle(sub(p, this.center));

				this.rotationAngle = pointAngle;
			}
			else
			{
				this.radius = sub(p, this.center).length();

				var angleStep = Math.PI * 2 / this.sideCount;

				var dragPointAngle = angleStep * (index-1);

				dragPointAngle = Math.min(this.endAngle, Math.max(this.startAngle, dragPointAngle));

				var dragPoint = mad(fromAngle(dragPointAngle + this.rotationAngle), this.radius, this.center);

				var pointAngle = toAngle(sub(p, this.center));

				this.rotationAngle += pointAngle - (dragPointAngle + this.rotationAngle);
			}
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
