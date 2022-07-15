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
